const chatWindow = document.getElementById("chat-window");
const chatForm = document.getElementById("chat-form");
const messageInput = document.getElementById("message-input");
const sendBtn = document.getElementById("send-btn");
const attachBtn = document.getElementById("attach-btn");
const micBtn = document.getElementById("mic-btn");
const topicChips = document.querySelectorAll(".topic-chip");
const starfieldCanvas = document.getElementById("starfield");
const particlesContainer = document.getElementById("particles");

const chatHistory = [];
let typingNode = null;
let typewriterAbort = null;

function scrollToBottom(smooth = true) {
  chatWindow.scrollTo({
    top: chatWindow.scrollHeight,
    behavior: smooth ? "smooth" : "auto",
  });
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function charDelay(char, base = 12) {
  if (char === "\n") return base * 2;
  if (".!?".includes(char)) return base * 4;
  if (",;:".includes(char)) return base * 2;
  if (char === " ") return base * 0.35;
  return base + Math.random() * 6;
}

async function typewriterReveal(textEl, cursorEl, text, signal) {
  textEl.textContent = "";
  if (cursorEl) cursorEl.classList.remove("is-hidden");

  for (let i = 0; i < text.length; i++) {
    if (signal?.aborted) {
      textEl.textContent = text;
      break;
    }
    textEl.textContent += text[i];
    scrollToBottom(false);
    await delay(charDelay(text[i]));
  }

  if (cursorEl) {
    await delay(300);
    cursorEl.classList.add("is-hidden");
  }
}

function createNovaAvatar() {
  const avatar = document.createElement("div");
  avatar.className = "nova-avatar";
  avatar.setAttribute("aria-hidden", "true");
  avatar.innerHTML = '<span class="nova-avatar__glow"></span>';
  return avatar;
}

function appendUserMessage(text) {
  const row = document.createElement("div");
  row.className = "message-row message-row--user";
  row.innerHTML = `<div class="bubble bubble--user"></div>`;
  row.querySelector(".bubble").textContent = text;
  chatWindow.appendChild(row);
  scrollToBottom();
}

function createBotMessageRow() {
  const row = document.createElement("div");
  row.className = "message-row message-row--bot";
  row.appendChild(createNovaAvatar());

  const bubble = document.createElement("div");
  bubble.className = "bubble bubble--bot";
  bubble.innerHTML = `
    <div class="bubble-content">
      <span class="jarvis-text"></span>
      <span class="jarvis-cursor" aria-hidden="true"></span>
    </div>
  `;
  row.appendChild(bubble);
  return row;
}

async function appendBotMessage(text, { instant = false } = {}) {
  if (typewriterAbort) typewriterAbort.abort();
  typewriterAbort = new AbortController();

  const row = createBotMessageRow();
  const textEl = row.querySelector(".jarvis-text");
  const cursorEl = row.querySelector(".jarvis-cursor");

  chatWindow.appendChild(row);
  scrollToBottom();

  if (instant) {
    textEl.textContent = text;
    cursorEl?.classList.add("is-hidden");
    return;
  }

  await typewriterReveal(textEl, cursorEl, text, typewriterAbort.signal);
}

function showTypingIndicator() {
  if (typingNode) return;

  typingNode = document.createElement("div");
  typingNode.className = "message-row message-row--bot typing-row";
  typingNode.setAttribute("aria-label", "Nova is typing");
  typingNode.innerHTML = `
    <div class="nova-avatar" aria-hidden="true"><span class="nova-avatar__glow"></span></div>
    <div class="typing-indicator glass">
      <span class="typing-indicator__label">Nova is typing...</span>
      <span class="typing-dots" aria-hidden="true">
        <span></span><span></span><span></span>
      </span>
    </div>
  `;

  chatWindow.appendChild(typingNode);
  scrollToBottom();
}

function hideTypingIndicator() {
  if (!typingNode) return;
  typingNode.remove();
  typingNode = null;
}

function setLoading(loading) {
  sendBtn.disabled = loading;
  messageInput.disabled = loading;
  sendBtn.classList.toggle("is-loading", loading);
  if (!loading) messageInput.focus();
}

async function sendMessage(message) {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, chatHistory }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || "Failed to fetch response.");
  }

  return response.json();
}

async function handleSend(message) {
  const trimmed = message.trim();
  if (!trimmed) return;

  appendUserMessage(trimmed);
  chatHistory.push({ role: "user", text: trimmed });

  messageInput.value = "";
  setLoading(true);
  showTypingIndicator();

  try {
    const data = await sendMessage(trimmed);
    const reply =
      typeof data.reply === "string" && data.reply.trim()
        ? data.reply.trim()
        : "I couldn't process that right now. Please try again.";

    hideTypingIndicator();
    await appendBotMessage(reply);
    chatHistory.push({ role: "assistant", text: reply });
  } catch (error) {
    hideTypingIndicator();
    await appendBotMessage(`Something went wrong: ${error.message}`);
  } finally {
    setLoading(false);
  }
}

function initPlaceholderActions() {
  const notify = () => {
    messageInput.placeholder = "Feature coming soon — type your message";
    setTimeout(() => {
      messageInput.placeholder = "Message Nova AI...";
    }, 2000);
  };
  attachBtn?.addEventListener("click", notify);
  micBtn?.addEventListener("click", notify);
}

function initStarfield() {
  if (!starfieldCanvas) return;
  const ctx = starfieldCanvas.getContext("2d");
  let stars = [];
  let w = 0;
  let h = 0;

  function resize() {
    w = starfieldCanvas.width = window.innerWidth;
    h = starfieldCanvas.height = window.innerHeight;
    const count = Math.floor((w * h) / 9000);
    stars = Array.from({ length: count }, () => ({
      x: Math.random() * w,
      y: Math.random() * h,
      r: Math.random() * 1.2 + 0.2,
      a: Math.random() * 0.5 + 0.2,
      speed: Math.random() * 0.15 + 0.05,
    }));
  }

  function draw() {
    ctx.clearRect(0, 0, w, h);
    for (const s of stars) {
      s.y += s.speed;
      if (s.y > h) s.y = 0;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${s.a})`;
      ctx.fill();
    }
    requestAnimationFrame(draw);
  }

  resize();
  draw();
  window.addEventListener("resize", resize);
}

function initParticles() {
  if (!particlesContainer) return;
  const count = window.innerWidth < 768 ? 18 : 32;
  for (let i = 0; i < count; i++) {
    const p = document.createElement("span");
    p.className = "particle";
    p.style.left = `${Math.random() * 100}%`;
    p.style.top = `${Math.random() * 100}%`;
    p.style.animationDuration = `${12 + Math.random() * 18}s`;
    p.style.animationDelay = `${Math.random() * 8}s`;
    p.style.width = p.style.height = `${2 + Math.random() * 4}px`;
    particlesContainer.appendChild(p);
  }
}

chatForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  await handleSend(messageInput.value);
});

topicChips.forEach((chip) => {
  chip.addEventListener("click", () => {
    messageInput.value = chip.dataset.prompt || "";
    messageInput.focus();
  });
});

messageInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    chatForm.requestSubmit();
  }
});

initPlaceholderActions();
initStarfield();
initParticles();
