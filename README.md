# AI Powered University Student Chatbot (Gemini API)

Basic-level major project for college submission.

## Project Overview

This project is an AI powered chatbot that answers student-related university queries such as:
- admissions
- fees and payments
- scholarships
- exam timetable and attendance
- hostel and transport
- placements

The chatbot uses the free Google Gemini API and a simple web interface.

## Tech Stack

- Frontend: HTML, CSS, JavaScript
- Backend: Node.js, Express
- AI Model: Google Gemini (`@google/genai`)
- Environment configuration: dotenv

## Features

- Clean chat UI for students
- Backend API endpoint for chatbot responses
- Prompt design focused on university/student support
- Basic error handling and health check API
- Easy setup for local demo and viva

## Project Structure

```
chatbot/
  public/
    index.html
    styles.css
    app.js
  server.js
  .env.example
  .gitignore
  package.json
```

## Setup Instructions

1. Install Node.js (v18+ recommended)
2. Clone/download this project
3. Install dependencies:

   `npm install`

4. Create `.env` file from `.env.example`
5. Add your Gemini API key:

   `GEMINI_API_KEY=your_actual_api_key`

6. Start the server:

   `npm start`

7. Open browser:

   [http://localhost:3000](http://localhost:3000)

## API Endpoints

- `GET /api/health` -> returns service status
- `POST /api/chat` -> accepts student message and returns AI reply

### Example `POST /api/chat` body

```json
{
  "message": "What is the fee payment deadline for semester 3?",
  "chatHistory": [
    { "role": "user", "text": "Hi" },
    { "role": "assistant", "text": "Hello! How can I help?" }
  ]
}
```

## Sample Major Project Modules (for report)

1. Requirement Analysis
2. System Design and Architecture
3. AI Integration (Gemini API)
4. Frontend Chat Interface
5. Backend API Development
6. Testing and Validation
7. Future Enhancements

## Future Scope

- Role-based login (student/admin)
- Query categories and analytics dashboard
- Multi-language support
- University database integration
- Document upload + RAG based answers

## Author Note

This project is intentionally basic and can be extended based on college major project requirements.
