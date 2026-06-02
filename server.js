const express = require("express");
const cors = require("cors");
const path = require("path");
const dotenv = require("dotenv");
const { GoogleGenAI } = require("@google/genai");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.0-flash";

app.use(cors());
app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

const apiKey = process.env.GEMINI_API_KEY;
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

const SYSTEM_PROMPT = `
You are UniAssist, an AI chatbot for university students.
Your task:
1) Answer student queries in a simple, friendly and professional style.
2) Focus on common areas: admission, fee payment, scholarship, exam schedule, attendance, hostel, transport, placement.
3) If information is uncertain, clearly mention it and suggest contacting the university office.
4) Keep answers short, clear, and actionable.
5) Do not provide legal/medical/financial guarantees.
`;

function getFallbackReply(studentMessage) {
  const text = String(studentMessage || "").toLowerCase();

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

  return "I am in limited mode due to API quota. Please ask about admissions, fees, scholarship, exams, attendance, hostel, transport, or placements. For urgent or official confirmation, contact university office.";
}

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    service: "student-chatbot",
    aiConfigured: Boolean(apiKey),
    model: GEMINI_MODEL,
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

    if (!ai) {
      return res.status(500).json({
        error:
          "Gemini API key is missing. Set GEMINI_API_KEY in your .env file.",
      });
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

    const historyText = normalizedHistory
      .map((item) => `${item.role.toUpperCase()}: ${item.text}`)
      .join("\n");

    const prompt = `
${SYSTEM_PROMPT}

Previous chat:
${historyText || "No previous chat"}

Student question:
${userMessage}
`;

    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
    });

    const text =
      response?.text?.trim() ||
      "I could not generate a response right now. Please try again.";

    return res.json({ reply: text });
  } catch (error) {
    console.error("Chat error:", error);

    const errorMessage = String(error?.message || "");
    const isQuotaOrRateLimit =
      error?.status === 429 ||
      errorMessage.includes("RESOURCE_EXHAUSTED") ||
      errorMessage.toLowerCase().includes("quota exceeded");

    if (isQuotaOrRateLimit) {
      const retryMatch = errorMessage.match(/retry in\s+([\d.]+)s/i);
      const retrySeconds = retryMatch ? Math.ceil(Number(retryMatch[1])) : null;
      const retryHint = retrySeconds
        ? ` Please try again in about ${retrySeconds} seconds.`
        : " Please try again after a short wait.";

      return res.json({
        reply:
          getFallbackReply(userMessage) +
          " Note: Gemini free API quota is temporarily exhausted." +
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
