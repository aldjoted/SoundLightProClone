// A safer markdown to HTML converter
function escapeHtml(str) {
    return str.replace(/[&<>"']/g, s => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[s]));
}

function simpleMarkdownToHtml(markdown) {
    // Convert bold/italic
    let text = markdown.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                       .replace(/\*(.*?)\*/g, '<em>$1</em>');
    // Split lines and detect list items
    const lines = text.split('\n');
    let html = '';
    let inList = false;
    for (const line of lines) {
        if (/^\s*-\s+/.test(line)) {
            if (!inList) { html += '<ul>'; inList = true; }
            html += `<li>${line.replace(/^\s*-\s+/, '')}</li>`;
        } else {
            if (inList) { html += '</ul>'; inList = false; }
            html += `${line}<br>`;
        }
    }
    if (inList) html += '</ul>';
    html = html.replace(/(<br>)+$/,''); // trim trailing breaks
    return html;
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
        if (className === "outgoing") {
            const p = document.createElement('p');
            p.textContent = message; // escape user text
            chatLi.appendChild(p);
        } else {
            chatLi.innerHTML = `<span class="chat-icon"><i class="fas fa-robot"></i></span><p>${simpleMarkdownToHtml(message)}</p>`;
        }
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