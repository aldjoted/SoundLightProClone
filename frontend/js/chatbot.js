import { API_BASE_URL } from './config.js';
import { apiFetch } from './apiService.js';
/**
 * chatbot.js
 *
 * Manages the chatbot widget, including UI interactions and API communication.
 * Features a security-hardened markdown-to-HTML renderer to prevent XSS.
 */

/**
 * @param {string} markdown - The markdown text from the API.
 * @returns {DocumentFragment} A document fragment containing the safe HTML structure.
 */
function secureMarkdownToHtml(markdown) {
    const fragment = document.createDocumentFragment();
    const lines = markdown.split('\n');
    let currentList = null;

    lines.forEach(line => {
        // Bold and Italic using a safer, iterative approach
        const processInlineFormatting = (text) => {
            const container = document.createDocumentFragment();
            // Use split to handle nested or overlapping cases more safely
            const parts = text.split(/(\*\*.*?\*\*|\*.*?\*)/g);
            parts.forEach(part => {
                if (part.startsWith('**') && part.endsWith('**')) {
                    const strong = document.createElement('strong');
                    strong.textContent = part.slice(2, -2);
                    container.appendChild(strong);
                } else if (part.startsWith('*') && part.endsWith('*')) {
                    const em = document.createElement('em');
                    em.textContent = part.slice(1, -1);
                    container.appendChild(em);
                } else {
                    container.appendChild(document.createTextNode(part));
                }
            });
            return container;
        };
        
        // List items
        if (line.trim().startsWith('- ')) {
            if (!currentList) {
                currentList = document.createElement('ul');
            }
            const li = document.createElement('li');
            li.appendChild(processInlineFormatting(line.trim().substring(2)));
            currentList.appendChild(li);
        } else {
            // End of a list
            if (currentList) {
                fragment.appendChild(currentList);
                currentList = null;
            }
            // Normal paragraph/line
            if (line.trim()) {
                const p = document.createElement('p');
                p.appendChild(processInlineFormatting(line));
                fragment.appendChild(p);
            }
        }
    });

    // Append any list that's still open at the end
    if (currentList) {
        fragment.appendChild(currentList);
    }
    
    return fragment;
}

document.addEventListener('DOMContentLoaded', () => {
    const chatbotToggler = document.querySelector(".chatbot-toggler");
    const closeBtn = document.querySelector(".close-btn");
    const chatbox = document.querySelector(".chatbox");
    const chatInput = document.querySelector(".chat-input textarea");
    const sendChatBtn = document.querySelector(".chat-input button");

    if (!chatbotToggler || !closeBtn || !chatbox || !chatInput || !sendChatBtn) {
        return; // Fail gracefully if chatbot elements aren't present
    }

    const API_URL = `${API_BASE_URL}/chatbot/`;

    const createChatLi = (content, className) => {
        const chatLi = document.createElement("li");
        chatLi.classList.add("chat", className);
        const p = document.createElement('p');
        
        if (className === "outgoing") {
            p.textContent = content; // User input is always treated as plain text
            chatLi.appendChild(p);
        } else {
            const icon = document.createElement('span');
            icon.className = 'chat-icon';
            icon.innerHTML = '<i class="fas fa-robot"></i>';
            chatLi.appendChild(icon);
            // Content can be a string for "Thinking..." or a DocumentFragment for the response
            if (typeof content === 'string') {
                // Only allow known-safe typing indicator template
                const tmp = document.createElement('div');
                tmp.className = 'chat typing';
                tmp.appendChild(document.createElement('span'));
                tmp.appendChild(document.createElement('span'));
                tmp.appendChild(document.createElement('span'));
                p.appendChild(tmp);
            } else {
                p.appendChild(content); // Append the secure DocumentFragment
            }
            chatLi.appendChild(p);
        }
        return chatLi;
    };

    const generateResponse = async (incomingChatLi) => {
        const messageElement = incomingChatLi.querySelector("p");
        const userMessage = chatInput.value.trim();

        try {
            const data = await apiFetch(`/chatbot/`, {
                method: 'POST',
                body: JSON.stringify({ message: userMessage })
            });

            if (data.reply) {
                messageElement.innerHTML = ''; // Clear typing indicator
                messageElement.appendChild(secureMarkdownToHtml(data.reply));
            } else {
                throw new Error(data.error || "No reply in response.");
            }
        } catch (error) {
            console.error("Chatbot API error:", error);
            messageElement.textContent = "Oops! I'm having trouble connecting. Please try again later.";
            messageElement.classList.add("error");
        } finally {
            chatbox.scrollTo(0, chatbox.scrollHeight);
        }
    };

    const handleChat = () => {
        const userMessage = chatInput.value.trim();
        if (!userMessage) return;

        chatInput.value = "";
        chatInput.style.height = 'auto';

        chatbox.appendChild(createChatLi(userMessage, "outgoing"));
        chatbox.scrollTo(0, chatbox.scrollHeight);

        setTimeout(() => {
            const incomingChatLi = createChatLi('typing', "incoming");
            chatbox.appendChild(incomingChatLi);
            chatbox.scrollTo(0, chatbox.scrollHeight);
            generateResponse(incomingChatLi);
        }, 600);
    };

    chatInput.addEventListener("input", () => {
        chatInput.style.height = 'auto';
        chatInput.style.height = `${chatInput.scrollHeight}px`;
    });

    chatInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.shiftKey && window.innerWidth > 800) {
            e.preventDefault();
            handleChat();
        }
    });

    sendChatBtn.addEventListener("click", handleChat);
    closeBtn.addEventListener("click", () => document.body.classList.remove("show-chatbot"));
    chatbotToggler.addEventListener("click", () => document.body.classList.toggle("show-chatbot"));
});