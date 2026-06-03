# AI Powered University Student Chatbot (OpenRouter API)

Basic-level major project for college submission.

## Project Overview

This project is an AI powered chatbot that answers student-related university queries such as:
- admissions
- fees and payments
- scholarships
- exam timetable and attendance
- hostel and transport
- placements

The chatbot uses [OpenRouter](https://openrouter.ai/) (many free models available) and a simple web interface.

## Tech Stack

- Frontend: HTML, CSS, JavaScript
- Backend: Node.js, Express
- AI: OpenRouter Chat Completions API
- Environment configuration: dotenv

## Features

- Clean dark-themed chat UI for students
- Backend API endpoint for chatbot responses
- Prompt design focused on university/student support
- Offline FAQ fallback when API rate limits hit
- Basic error handling and health check API

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

4. Create `.env` from `.env.example`
5. Get an API key from [OpenRouter Keys](https://openrouter.ai/keys) and add:

   `OPENROUTER_API_KEY=your_actual_api_key`

6. (Optional) Pick a model from [OpenRouter Models](https://openrouter.ai/models) — free models often end with `:free`

   `OPENROUTER_MODEL=meta-llama/llama-3.2-3b-instruct:free`

7. Start the server:

   `npm start`

8. Open browser:

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
3. AI Integration (OpenRouter API)
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
