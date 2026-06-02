const chatWindow = document.getElementById("chat-window");
const chatForm = document.getElementById("chat-form");
const messageInput = document.getElementById("message-input");
const sendBtn = document.getElementById("send-btn");

const chatHistory = [];
let typingNode = null;

function appendMessage(role, text) {
  const article = document.createElement("article");
  article.className = `bubble ${role}`;
  article.textContent = text;
  chatWindow.appendChild(article);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

function showTypingIndicator() {
  if (typingNode) return;

  typingNode = document.createElement("article");
  typingNode.className = "bubble bot typing";
  typingNode.setAttribute("aria-label", "Bot is typing");
  typingNode.innerHTML = `
    <span class="typing-dot"></span>
    <span class="typing-dot"></span>
    <span class="typing-dot"></span>
  `;

  chatWindow.appendChild(typingNode);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

function hideTypingIndicator() {
  if (!typingNode) return;
  typingNode.remove();
  typingNode = null;
}

async function sendMessage(message) {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      message,
      chatHistory,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to fetch response.");
  }

  return response.json();
}

chatForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const message = messageInput.value.trim();
  if (!message) return;

  appendMessage("user", message);
  chatHistory.push({ role: "user", text: message });

  messageInput.value = "";
  sendBtn.disabled = true;
  showTypingIndicator();

  try {
    const data = await sendMessage(message);
    const reply =
      typeof data.reply === "string" && data.reply.trim()
        ? data.reply.trim()
        : "I am sorry, I could not answer right now.";

    appendMessage("bot", reply);
    chatHistory.push({ role: "assistant", text: reply });
  } catch (error) {
    appendMessage("bot", `Error: ${error.message}`);
  } finally {
    hideTypingIndicator();
    sendBtn.disabled = false;
    messageInput.focus();
  }
});
