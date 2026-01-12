# DocChat Backend 🧠📄

This is the backend service for **DocChat**, responsible for:
- User authentication
- Document upload and storage
- Text extraction from documents
- AI-powered chat per document
- Managing chat history

The backend exposes a REST API consumed by the DocChat frontend.

---

## 🚀 Features

- JWT-based authentication
- Upload and process PDF and image files
- Text extraction from documents
- Store and retrieve documents metadata
- AI chat per document
- Persistent chat history
- Secure file download

---

## 🛠 Tech Stack

> Adjust this list if needed to match your implementation

- **Node.js**
- **TypeScript**
- **NestJS** (or Express/Fastify)
- **JWT Authentication**
- **Multer** (file uploads)
- **Database** (PostgreSQL / MongoDB / SQLite)
- **AI Provider** (OpenAI / other LLM)
- **Prisma / TypeORM / Mongoose**

---

## 📦 Prerequisites

Make sure you have installed:

- **Node.js** >= 18
- **npm**, **yarn**, or **pnpm**
- A configured database instance
- An Hugging Face Token

---

## 📂 Project Structure (example)
```
src/
├── auth/
│ ├── auth.controller.ts
│ ├── auth.service.ts
│ └── jwt.strategy.ts
├── documents/
│ ├── documents.controller.ts
│ ├── documents.service.ts
│ └── dto/
├── messages/
│ ├── messages.controller.ts
│ └── messages.service.ts
├── common/
├── app.module.ts
└── main.ts
```

---

## ⚙️ Environment Variables

Create a `.env` file in the project root:

```env
JWT_SECRET=super-secret-key

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/docchat

# AI Provider
HF_TOKEN=your_hugging
```

## 📥 Installation

Clone the repository and install dependencies:

```
git clone https://github.com/jvictormo/chat-docs-backend
cd chat-docs-backend
npm install
```

---

## ▶️ Running the Server

```
npm run start
```

Server will start at:

```
http://localhost:4000
```

The swagger will start at:

```
http://localhost:4000/api
```

---

## 🔐 Authentication

Authentication is handled using JWT.

- After login, the backend issues a JWT token.

- The frontend must send this token in the `Authorization` header:

```
Authorization: Bearer <token>
```

- Protected routes will reject requests without a valid token.

---

## 📡 API Endpoints

### Auth

- `POST /auth/login`

- `POST /auth/register`

### Documents

- `GET /documents`

- `POST /documents/upload`

- `PATCH /documents/:id`

- `DELETE /documents/:id`

- `GET /documents/:id/download`

### Messages

- `GET /documents/:id/messages`

- `POST /documents/:id/messages`

---

## 📄 File Upload Rules

- Supported formats: PDF, PNG, JPG, JPEG

- Maximum file size: 10MB

- Files are validated before processing

- Extracted text is stored and reused for chat context

---

## 🧠 AI Chat Flow

1. User sends a message related to a document

2. Backend loads extracted document text

3. Backend sends context + question to the AI provider

4. AI response is stored as an assistant message

5. Response is returned to the frontend

---

## 🧪 Notes

- Make sure CORS is enabled for the frontend origin

- Large documents may increase AI response time

- Token expiration should be handled on the frontend