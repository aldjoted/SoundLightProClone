import { apiFetch } from './apiService.js';
import { debounce } from './utils.js';

/**
 * Chatbot Module
 *
 * A comprehensive chatbot widget with security-hardened markdown rendering,
 * accessibility features, performance optimizations, and responsive design.
 * 
 * Features:
 * - XSS-protected markdown-to-HTML conversion
 * - Full accessibility support (ARIA, keyboard navigation, screen readers)
 * - Performance optimizations (debouncing, RAF, caching)
 * - Rate limiting and input validation
 * - Responsive design with proper focus management
 */

const ChatbotModule = (() => {
    // Configuration constants
    const CONFIG = {
        TYPING_DELAY: 600,
        DEBOUNCE_DELAY: 150,
        RATE_LIMIT_DELAY: 1000,
        MAX_MESSAGE_LENGTH: 1000,
        MOBILE_BREAKPOINT: '--mobile-breakpoint',
        API_ENDPOINT: '/chatbot/',
        
        SELECTORS: {
            toggler: '.chatbot-toggler',
            closeBtn: '.close-btn',
            chatbox: '.chatbox',
            chatInput: '.chat-input textarea',
            sendBtn: '.chat-input button',
            liveRegion: '#chatbot-live-region'
        },
        
        CLASSES: {
            chat: 'chat',
            outgoing: 'outgoing',
            incoming: 'incoming',
            typing: 'typing',
            error: 'error',
            showChatbot: 'show-chatbot'
        },
        
        ARIA: {
            liveRegion: 'aria-live',
            label: 'aria-label',
            expanded: 'aria-expanded',
            hidden: 'aria-hidden',
            describedBy: 'aria-describedby'
        }
    };

    // Module state
    let elements = {};
    let lastRequestTime = 0;
    let isInitialized = false;

    /**
     * Enhanced security-hardened markdown-to-HTML converter
     * @param {string} markdown - The markdown text from the API
     * @returns {DocumentFragment} Safe HTML structure
     */
    function secureMarkdownToHtml(markdown) {
        // Input validation
        if (typeof markdown !== 'string' || !markdown.trim()) {
            return document.createDocumentFragment();
        }

        // Sanitize input to prevent basic XSS attempts
        const sanitizedMarkdown = markdown
            .replace(/<script[^>]*>.*?<\/script>/gi, '')
            .replace(/<iframe[^>]*>.*?<\/iframe>/gi, '')
            .replace(/javascript:/gi, '')
            .replace(/on\w+\s*=/gi, '');

        const fragment = document.createDocumentFragment();
        const lines = sanitizedMarkdown.split('\n');
        let currentList = null;

        const processInlineFormatting = (text) => {
            const container = document.createDocumentFragment();
            // Enhanced regex for better markdown parsing
            const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
            
            parts.forEach(part => {
                if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
                    const strong = document.createElement('strong');
                    strong.textContent = part.slice(2, -2);
                    container.appendChild(strong);
                } else if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
                    const em = document.createElement('em');
                    em.textContent = part.slice(1, -1);
                    container.appendChild(em);
                } else {
                    container.appendChild(document.createTextNode(part));
                }
            });
            return container;
        };

        lines.forEach(line => {
            const trimmedLine = line.trim();
            
            if (trimmedLine.startsWith('- ')) {
                if (!currentList) {
                    currentList = document.createElement('ul');
                    currentList.setAttribute('role', 'list');
                }
                const li = document.createElement('li');
                li.setAttribute('role', 'listitem');
                li.appendChild(processInlineFormatting(trimmedLine.substring(2)));
                currentList.appendChild(li);
            } else {
                if (currentList) {
                    fragment.appendChild(currentList);
                    currentList = null;
                }
                
                if (trimmedLine) {
                    const p = document.createElement('p');
                    p.appendChild(processInlineFormatting(trimmedLine));
                    fragment.appendChild(p);
                }
            }
        });

        if (currentList) {
            fragment.appendChild(currentList);
        }

        return fragment;
    }

    /**
     * Create typing indicator with accessibility support
     * @returns {DocumentFragment} Typing indicator element
     */
    function createTypingIndicator() {
        const container = document.createDocumentFragment();
        const typingDiv = document.createElement('div');
        typingDiv.className = CONFIG.CLASSES.typing;
        typingDiv.setAttribute(CONFIG.ARIA.label, 'Chatbot is typing');
        
        // Create three animated dots
        for (let i = 0; i < 3; i++) {
            const span = document.createElement('span');
            span.setAttribute('aria-hidden', 'true');
            typingDiv.appendChild(span);
        }
        
        container.appendChild(typingDiv);
        return container;
    }

    /**
     * Enhanced chat message creation with accessibility features
     * @param {string|DocumentFragment} content - Message content
     * @param {string} className - Message type class
     * @returns {HTMLLIElement} Chat message element
     */
    function createChatMessage(content, className) {
        const chatLi = document.createElement('li');
        chatLi.classList.add(CONFIG.CLASSES.chat, className);
        chatLi.setAttribute('role', 'listitem');
        
        if (className === CONFIG.CLASSES.outgoing) {
            chatLi.setAttribute(CONFIG.ARIA.label, 'Your message');
        } else {
            chatLi.setAttribute(CONFIG.ARIA.label, 'Chatbot response');
        }

        const messageContainer = document.createElement('div');
        messageContainer.className = 'message-container';

        if (className === CONFIG.CLASSES.outgoing) {
            const p = document.createElement('p');
            p.textContent = content;
            messageContainer.appendChild(p);
        } else {
            const icon = document.createElement('span');
            icon.className = 'chat-icon';
            icon.setAttribute('aria-hidden', 'true');
            icon.innerHTML = '<i class="fas fa-robot"></i>';
            
            const p = document.createElement('p');
            p.className = 'message-content';
            
            if (typeof content === 'string') {
                p.appendChild(createTypingIndicator());
            } else {
                p.appendChild(content);
            }
            
            messageContainer.appendChild(icon);
            messageContainer.appendChild(p);
        }

        chatLi.appendChild(messageContainer);
        return chatLi;
    }

    /**
     * Smooth scroll to bottom using requestAnimationFrame
     */
    function smoothScrollToBottom() {
        requestAnimationFrame(() => {
            elements.chatbox.scrollTo({
                top: elements.chatbox.scrollHeight,
                behavior: 'smooth'
            });
        });
    }

    /**
     * Announce message to screen readers
     * @param {string} message - Message to announce
     */
    function announceToScreenReader(message) {
        if (elements.liveRegion) {
            elements.liveRegion.textContent = message;
            // Clear after announcement
            setTimeout(() => {
                elements.liveRegion.textContent = '';
            }, 1000);
        }
    }

    /**
     * Validate user input
     * @param {string} message - User message to validate
     * @returns {boolean} Whether message is valid
     */
    function validateInput(message) {
        if (!message || typeof message !== 'string') return false;
        if (message.length > CONFIG.MAX_MESSAGE_LENGTH) return false;
        if (message.trim().length === 0) return false;
        
        // Basic XSS prevention
        const dangerousPatterns = [
            /<script/i,
            /javascript:/i,
            /on\w+\s*=/i,
            /<iframe/i
        ];
        
        return !dangerousPatterns.some(pattern => pattern.test(message));
    }

    /**
     * Check rate limiting
     * @returns {boolean} Whether request is allowed
     */
    function checkRateLimit() {
        const now = Date.now();
        if (now - lastRequestTime < CONFIG.RATE_LIMIT_DELAY) {
            return false;
        }
        lastRequestTime = now;
        return true;
    }

    /**
     * Generate API response with enhanced error handling
     * @param {HTMLElement} incomingChatLi - Incoming message element
     * @param {string} userMessage - The user's message to send to the API
     */
    async function generateResponse(incomingChatLi, userMessage) {
        const messageElement = incomingChatLi.querySelector('.message-content');

        try {
            if (!validateInput(userMessage)) {
                throw new Error('Invalid input message');
            }

            if (!checkRateLimit()) {
                throw new Error('Please wait before sending another message');
            }

            const data = await apiFetch(CONFIG.API_ENDPOINT, {
                method: 'POST',
                body: JSON.stringify({ message: userMessage })
            });

            if (data?.reply) {
                messageElement.innerHTML = '';
                messageElement.appendChild(secureMarkdownToHtml(data.reply));
                announceToScreenReader('Chatbot responded');
            } else {
                throw new Error('No response received');
            }
        } catch (error) {
            console.error('Chatbot API error:', error);
            
            messageElement.innerHTML = '';
            const errorP = document.createElement('p');
            errorP.textContent = 'I apologize, but I\'m having trouble responding right now. Please try again in a moment.';
            errorP.className = CONFIG.CLASSES.error;
            messageElement.appendChild(errorP);
            
            announceToScreenReader('Chatbot encountered an error');
        } finally {
            smoothScrollToBottom();
        }
    }

    /**
     * Handle chat submission with validation
     */
    function handleChatSubmission() {
        const userMessage = elements.chatInput.value.trim();
        
        if (!validateInput(userMessage)) {
            announceToScreenReader('Please enter a valid message');
            return;
        }

        // Clear input and reset height
        elements.chatInput.value = '';
        elements.chatInput.style.height = 'auto';

        // Add user message
        const userChatLi = createChatMessage(userMessage, CONFIG.CLASSES.outgoing);
        elements.chatbox.appendChild(userChatLi);
        announceToScreenReader('Message sent');
        smoothScrollToBottom();

        // Add bot response with delay
        setTimeout(() => {
            const botChatLi = createChatMessage('typing', CONFIG.CLASSES.incoming);
            elements.chatbox.appendChild(botChatLi);
            smoothScrollToBottom();
            generateResponse(botChatLi, userMessage);
        }, CONFIG.TYPING_DELAY);
    }

    /**
     * Debounced input handler for performance
     */
    const debouncedInputHandler = debounce(() => {
        elements.chatInput.style.height = 'auto';
        elements.chatInput.style.height = `${elements.chatInput.scrollHeight}px`;
    }, CONFIG.DEBOUNCE_DELAY);

    /**
     * Get responsive breakpoint from CSS
     * @returns {number} Breakpoint value in pixels
     */
    function getResponsiveBreakpoint() {
        const value = getComputedStyle(document.documentElement)
            .getPropertyValue(CONFIG.MOBILE_BREAKPOINT);
        return parseInt(value) || 800;
    }

    /**
     * Toggle chatbot visibility with accessibility
     */
    function toggleChatbot() {
        const isVisible = document.body.classList.contains(CONFIG.CLASSES.showChatbot);
        
        if (isVisible) {
            closeChatbot();
        } else {
            openChatbot();
        }
    }

    /**
     * Open chatbot with focus management
     */
    function openChatbot() {
        document.body.classList.add(CONFIG.CLASSES.showChatbot);
        elements.toggler.setAttribute(CONFIG.ARIA.expanded, 'true');
        
        // Focus management
        setTimeout(() => {
            elements.chatInput.focus();
        }, 100);
        
        announceToScreenReader('Chatbot opened');
    }

    /**
     * Close chatbot with focus management
     */
    function closeChatbot() {
        document.body.classList.remove(CONFIG.CLASSES.showChatbot);
        elements.toggler.setAttribute(CONFIG.ARIA.expanded, 'false');
        elements.toggler.focus();
        
        announceToScreenReader('Chatbot closed');
    }

    /**
     * Enhanced keyboard event handler
     * @param {KeyboardEvent} e - Keyboard event
     */
    function handleKeydown(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            const breakpoint = getResponsiveBreakpoint();
            if (window.innerWidth > breakpoint) {
                e.preventDefault();
                handleChatSubmission();
            }
        } else if (e.key === 'Escape') {
            closeChatbot();
        }
    }

    /**
     * Initialize live region for screen readers
     */
    function initializeLiveRegion() {
        let liveRegion = document.getElementById('chatbot-live-region');
        if (!liveRegion) {
            liveRegion = document.createElement('div');
            liveRegion.id = 'chatbot-live-region';
            liveRegion.setAttribute('aria-live', 'polite');
            liveRegion.setAttribute('aria-atomic', 'true');
            liveRegion.style.cssText = 'position: absolute; left: -10000px; width: 1px; height: 1px; overflow: hidden;';
            document.body.appendChild(liveRegion);
        }
        elements.liveRegion = liveRegion;
    }

    /**
     * Cache DOM elements with error handling
     * @returns {boolean} Whether initialization was successful
     */
    function cacheElements() {
        try {
            elements.toggler = document.querySelector(CONFIG.SELECTORS.toggler);
            elements.closeBtn = document.querySelector(CONFIG.SELECTORS.closeBtn);
            elements.chatbox = document.querySelector(CONFIG.SELECTORS.chatbox);
            elements.chatInput = document.querySelector(CONFIG.SELECTORS.chatInput);
            elements.sendBtn = document.querySelector(CONFIG.SELECTORS.sendBtn);

            // Validate required elements
            const requiredElements = [elements.toggler, elements.closeBtn, elements.chatbox, elements.chatInput, elements.sendBtn];
            if (requiredElements.some(el => !el)) {
                console.warn('Chatbot: Some required elements not found');
                return false;
            }

            return true;
        } catch (error) {
            console.error('Chatbot: Error caching elements', error);
            return false;
        }
    }

    /**
     * Set up accessibility attributes
     */
    function setupAccessibility() {
        // Chatbot toggler
        elements.toggler.setAttribute(CONFIG.ARIA.label, 'Open chatbot');
        elements.toggler.setAttribute(CONFIG.ARIA.expanded, 'false');

        // Close button
        elements.closeBtn.setAttribute(CONFIG.ARIA.label, 'Close chatbot');

        // Chat input
        elements.chatInput.setAttribute(CONFIG.ARIA.label, 'Type your message');
        elements.chatInput.setAttribute('placeholder', 'Type your message here...');

        // Send button
        elements.sendBtn.setAttribute(CONFIG.ARIA.label, 'Send message');

        // Chatbox
        elements.chatbox.setAttribute('role', 'log');
        elements.chatbox.setAttribute(CONFIG.ARIA.label, 'Chat conversation');
        elements.chatbox.setAttribute('aria-live', 'polite');
    }

    /**
     * Attach event listeners
     */
    function attachEventListeners() {
        // Input events
        elements.chatInput.addEventListener('input', debouncedInputHandler);
        elements.chatInput.addEventListener('keydown', handleKeydown);

        // Button events
        elements.sendBtn.addEventListener('click', handleChatSubmission);
        elements.closeBtn.addEventListener('click', closeChatbot);
        elements.toggler.addEventListener('click', toggleChatbot);

        // Accessibility: Allow Enter key on buttons
        [elements.sendBtn, elements.closeBtn, elements.toggler].forEach(btn => {
            btn.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    btn.click();
                }
            });
        });
    }

    /**
     * Initialize the chatbot module
     * @returns {boolean} Whether initialization was successful
     */
    function init() {
        if (isInitialized) {
            console.warn('Chatbot: Already initialized');
            return true;
        }

        try {
            if (!cacheElements()) {
                return false;
            }

            initializeLiveRegion();
            setupAccessibility();
            attachEventListeners();
            
            isInitialized = true;
            console.log('Chatbot: Successfully initialized');
            return true;
        } catch (error) {
            console.error('Chatbot: Initialization failed', error);
            return false;
        }
    }

    /**
     * Cleanup function for destroying the chatbot
     */
    function destroy() {
        if (!isInitialized) return;

        // Remove event listeners
        Object.values(elements).forEach(element => {
            if (element && element.removeEventListener) {
                element.removeEventListener('input', debouncedInputHandler);
                element.removeEventListener('keydown', handleKeydown);
                element.removeEventListener('click', handleChatSubmission);
                element.removeEventListener('click', closeChatbot);
                element.removeEventListener('click', toggleChatbot);
            }
        });

        // Remove live region
        if (elements.liveRegion && elements.liveRegion.parentNode) {
            elements.liveRegion.parentNode.removeChild(elements.liveRegion);
        }

        // Clear cached elements
        elements = {};
        isInitialized = false;
    }

    // Public API
    return {
        init,
        destroy,
        openChatbot,
        closeChatbot,
        toggleChatbot
    };
})();

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    ChatbotModule.init();
});

// Export for potential external use
if (typeof window !== 'undefined') {
    window.ChatbotModule = ChatbotModule;
}