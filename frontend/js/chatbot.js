// A simple markdown to HTML converter
function simpleMarkdownToHtml(markdown) {
    // Bold **text**
    markdown = markdown.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    // Italic *text*
    markdown = markdown.replace(/\*(.*?)\*/g, '<em>$1</em>');
    // Unordered list - item
    markdown = markdown.replace(/^- (.*$)/g, '<li>$1</li>');
    markdown = markdown.replace(/<\/li><li>/g, '</li>\n<li>'); // Fix spacing
    markdown = `<ul>\n${markdown}\n</ul>`;
    markdown = markdown.replace(/<\/ul>\n<ul>/g, ''); // Combine lists
    
    // Convert newlines to <br>
    markdown = markdown.replace(/\n/g, '<br>');
    
    // Clean up list formatting artifacts
    markdown = markdown.replace(/<br><ul>/g, '<ul>');
    markdown = markdown.replace(/<\/ul><br>/g, '</ul>');
    markdown = markdown.replace(/<br><li>/g, '<li>');
    return markdown;
}


document.addEventListener('DOMContentLoaded', () => {
    const chatbotToggler = document.querySelector(".chatbot-toggler");
    const closeBtn = document.querySelector(".close-btn");
    const chatbox = document.querySelector(".chatbox");
    const chatInput = document.querySelector(".chat-input textarea");
    const sendChatBtn = document.querySelector(".chat-input button");

    const API_URL = "http://127.0.0.1:8000/api/v1/chatbot/";

    const createChatLi = (message, className) => {
        const chatLi = document.createElement("li");
        chatLi.classList.add("chat", className);
        let chatContent = className === "outgoing" 
            ? `<p>${message}</p>`
            : `<span class="chat-icon"><i class="fas fa-robot"></i></span><p>${simpleMarkdownToHtml(message)}</p>`;
        chatLi.innerHTML = chatContent;
        return chatLi;
    }

    const generateResponse = (incomingChatLi) => {
        const messageElement = incomingChatLi.querySelector("p");
        const userMessage = chatInput.value.trim();

        const requestOptions = {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ message: userMessage })
        };

        fetch(API_URL, requestOptions)
            .then(res => res.json())
            .then(data => {
                if (data.reply) {
                    messageElement.innerHTML = simpleMarkdownToHtml(data.reply);
                } else {
                    messageElement.textContent = data.error || "Oops! Something went wrong.";
                    messageElement.classList.add("error");
                }
            })
            .catch((error) => {
                messageElement.textContent = "Oops! Something went wrong. Please try again.";
                messageElement.classList.add("error");
            })
            .finally(() => chatbox.scrollTo(0, chatbox.scrollHeight));
    }

    const handleChat = () => {
        const userMessage = chatInput.value.trim();
        if (!userMessage) return;

        chatInput.value = "";
        chatInput.style.height = 'auto';

        chatbox.appendChild(createChatLi(userMessage, "outgoing"));
        chatbox.scrollTo(0, chatbox.scrollHeight);

        setTimeout(() => {
            const incomingChatLi = createChatLi("Thinking...", "incoming");
            chatbox.appendChild(incomingChatLi);
            chatbox.scrollTo(0, chatbox.scrollHeight);
            // Replace "Thinking..." with a typing animation
            const p = incomingChatLi.querySelector("p");
            p.innerHTML = '<div class="chat typing"><span></span><span></span><span></span></div>';

            generateResponse(incomingChatLi);
        }, 600);
    }

    chatInput.addEventListener("input", () => {
        // Adjust the height of the input textarea based on its content
        chatInput.style.height = 'auto';
        chatInput.style.height = `${chatInput.scrollHeight}px`;
    });

    chatInput.addEventListener("keydown", (e) => {
        // If Enter key is pressed without Shift key and the window is wide enough, handle the chat
        if (e.key === "Enter" && !e.shiftKey && window.innerWidth > 800) {
            e.preventDefault();
            handleChat();
        }
    });

    sendChatBtn.addEventListener("click", handleChat);
    closeBtn.addEventListener("click", () => document.body.classList.remove("show-chatbot"));
    chatbotToggler.addEventListener("click", () => document.body.classList.toggle("show-chatbot"));
});