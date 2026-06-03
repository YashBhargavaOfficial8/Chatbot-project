const express = require("express");
const cors = require("cors");
const path = require("path");
const dotenv = require("dotenv");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const OPENROUTER_MODEL =
  process.env.OPENROUTER_MODEL || "openrouter/free";
const OPENROUTER_FALLBACK_MODEL = process.env.OPENROUTER_FALLBACK_MODEL || "";
const OPENROUTER_BASE_URL =
  process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1";
const MIN_QUOTA_COOLDOWN_SECONDS = Number(
  process.env.MIN_QUOTA_COOLDOWN_SECONDS || 30
);

app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

const apiKey = process.env.OPENROUTER_API_KEY;
let quotaCooldownUntil = 0;

function parseRetrySeconds(errorMessage) {
  const retryMatch = String(errorMessage || "").match(/retry in\s+([\d.]+)s/i);
  return retryMatch ? Math.ceil(Number(retryMatch[1])) : null;
}

function isQuotaOrRateLimitError(error) {
  const errorMessage = String(error?.message || "").toLowerCase();
  return (
    error?.status === 429 ||
    errorMessage.includes("rate limit") ||
    errorMessage.includes("quota") ||
    errorMessage.includes("too many requests")
  );
}

const SYSTEM_PROMPT = `
You are NOVA AI, an intelligent chatbot for university students.
Your task:
1) Answer student queries in a simple, friendly and professional style.
2) Focus on common areas: admission, fee payment, scholarship, exam schedule, attendance, hostel, transport, placement.
3) If information is uncertain, clearly mention it and suggest contacting the university office.
4) Keep answers short, clear, and actionable.
5) Do not provide legal/medical/financial guarantees.
6) Do not mention the developer unless the user explicitly asks who is Yash or who is Yash Bhargava.
`.trim();

function isYashCreditQuestion(message) {
  const text = String(message || "").toLowerCase();
  return (
    text.includes("yash bhargava") ||
    /\bwho\s+is\s+yash\b/.test(text) ||
    /\bwho'?s\s+yash\b/.test(text)
  );
}

function getYashCreditReply() {
  return "Yash Bhargava is a talented developer and the creator of Nova AI — this university intelligence assistant. Credit: Developed By HasTeOP.";
}

function getFallbackReply(studentMessage) {
  const text = String(studentMessage || "").toLowerCase();

  if (isYashCreditQuestion(studentMessage)) {
    return getYashCreditReply();
  }

  if (text.includes("admission") || text.includes("apply")) {
    return "Admission help: Check eligibility, keep required documents ready, and submit the online form before the deadline. For exact dates and seat availability, contact the admissions office.";
  }

  if (text.includes("fee") || text.includes("payment")) {
    return "Fee support: Check your student portal for due amount and deadline. Keep payment receipt/screenshot safely. If payment fails or is pending, contact accounts section with your enrollment number.";
  }

  if (text.includes("scholarship")) {
    return "Scholarship guidance: Verify eligibility, required documents, and last date in the scholarship notice. Submit applications early and track status through the student portal or scholarship cell.";
  }

  if (text.includes("exam") || text.includes("timetable")) {
    return "Exam update: Follow official exam notices for timetable, hall ticket, and reporting time. Confirm your subject codes and contact exam cell if there is any mismatch.";
  }

  if (text.includes("attendance")) {
    return "Attendance help: Check your latest attendance percentage in the portal and identify subjects below required criteria. Contact your class mentor/HOD for shortage-related process.";
  }

  if (text.includes("hostel")) {
    return "Hostel support: For room allotment, fees, and rules, contact the hostel office/warden. Keep your student ID, admission receipt, and emergency contact details ready.";
  }

  if (text.includes("transport") || text.includes("bus")) {
    return "Transport help: Check route list, pickup timings, and fee details from transport section notices. For route change requests, apply early with your student details.";
  }

  if (text.includes("placement") || text.includes("internship")) {
    return "Placement support: Keep your resume updated, monitor placement cell notices, and complete registration for drives. Practice aptitude, communication, and interview basics regularly.";
  }

  return "I am in limited mode due to API limits. Please ask about admissions, fees, scholarship, exams, attendance, hostel, transport, or placements. For urgent or official confirmation, contact university office.";
}

function buildMessages(chatHistory, userMessage) {
  const messages = [{ role: "system", content: SYSTEM_PROMPT }];

  for (const entry of chatHistory) {
    const role = entry.role === "assistant" ? "assistant" : "user";
    messages.push({ role, content: entry.text });
  }

  messages.push({ role: "user", content: userMessage });
  return messages;
}

async function chatWithOpenRouter(messages, model) {
  const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.APP_URL || `http://localhost:${PORT}`,
      "X-Title": "NOVA AI Student Chatbot",
    },
    body: JSON.stringify({ model, messages }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message =
      data?.error?.message ||
      data?.error ||
      `OpenRouter API error (${response.status})`;
    const error = new Error(
      typeof message === "string" ? message : JSON.stringify(message)
    );
    error.status = response.status;
    throw error;
  }

  const text = data?.choices?.[0]?.message?.content?.trim();
  if (!text) {
    throw new Error("OpenRouter returned an empty response.");
  }

  return text;
}

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    service: "student-chatbot",
    provider: "openrouter",
    aiConfigured: Boolean(apiKey),
    model: OPENROUTER_MODEL,
  });
});

app.post("/api/chat", async (req, res) => {
  let userMessage = "";

  try {
    const { message, chatHistory = [] } = req.body || {};
    userMessage = String(message || "");

    if (!userMessage) {
      return res.status(400).json({ error: "Message is required." });
    }

    if (!apiKey) {
      return res.status(500).json({
        error:
          "OpenRouter API key is missing. Set OPENROUTER_API_KEY in your .env file.",
      });
    }

    if (isYashCreditQuestion(userMessage)) {
      return res.json({ reply: getYashCreditReply() });
    }

    const normalizedHistory = Array.isArray(chatHistory)
      ? chatHistory
          .filter(
            (entry) =>
              entry &&
              typeof entry.role === "string" &&
              typeof entry.text === "string"
          )
          .slice(-10)
      : [];

    const messages = buildMessages(normalizedHistory, userMessage);

    const now = Date.now();
    if (now < quotaCooldownUntil) {
      const remainingSeconds = Math.max(
        1,
        Math.ceil((quotaCooldownUntil - now) / 1000)
      );
      return res.json({
        reply:
          getFallbackReply(userMessage) +
          ` Note: API rate limit active. Please try again in about ${remainingSeconds} seconds.`,
      });
    }

    let reply;
    try {
      reply = await chatWithOpenRouter(messages, OPENROUTER_MODEL);
    } catch (primaryError) {
      if (isQuotaOrRateLimitError(primaryError) && OPENROUTER_FALLBACK_MODEL) {
        reply = await chatWithOpenRouter(messages, OPENROUTER_FALLBACK_MODEL);
      } else {
        throw primaryError;
      }
    }

    return res.json({ reply });
  } catch (error) {
    console.error("Chat error:", error);

    const errorMessage = String(error?.message || "");
    const isQuotaOrRateLimit = isQuotaOrRateLimitError(error);

    if (isQuotaOrRateLimit) {
      const retrySeconds = parseRetrySeconds(errorMessage);
      const cooldownSeconds = Math.max(
        MIN_QUOTA_COOLDOWN_SECONDS,
        retrySeconds || 0
      );
      quotaCooldownUntil = Date.now() + cooldownSeconds * 1000;
      const retryHint = retrySeconds
        ? ` Please try again in about ${retrySeconds} seconds.`
        : " Please try again after a short wait.";

      return res.json({
        reply:
          getFallbackReply(userMessage) +
          " Note: OpenRouter rate limit reached." +
          retryHint,
      });
    }

    return res.status(500).json({
      error: "Something went wrong while generating response.",
    });
  }
});

app.use((req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
