# 🚀 Real-Time Code Editor

A powerful real-time collaborative code editor where multiple users can write, edit, and execute code together instantly.

---

---

## 📌 Features

- 👨‍💻 Real-time collaborative coding
- 💬 Built-in chat system
- ⚡ Multi-language code execution (40+ languages)
- 🎨 Light/Dark theme toggle
- 🔗 Share room via unique link
- 💾 Session persistence
- 🔐 Secure room-based collaboration

---

## 🛠️ Tech Stack

### 🔹 Frontend
- React.js
- CodeMirror 6
- Socket.IO Client
- CSS

### 🔹 Backend
- Node.js
- Express.js
- Socket.IO
- Judge0 API

### 🔹 Other Tools
- WebSockets
- REST APIs
- Git & GitHub

---

## 📂 Project Structure

collab-editor/
│
├── backend/
│   ├── server.js
│   ├── package.json
│   └── test.js
│
├── client/
│   ├── public/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── index.js
│   │   └── styles.css
│   └── package.json
│
└── README.md

---

## ⚙️ How It Works

### 🔁 Real-Time Collaboration
- Uses Socket.IO for real-time communication
- When a user types:
  - Event is sent to server
  - Server broadcasts to all users in the same room
  - All users see updates instantly

### 🧠 Code Execution
- Code is sent to Judge0 API
- Backend processes the request
- Output is returned and displayed on UI

### 🏠 Room System
- Each session has a unique Room ID
- Users join using a shared link
- Only users in the same room can collaborate

---

## 🔌 Installation & Setup

### 1️⃣ Clone Repository
```bash
git clone https://github.com/your-username/real-time-code-editor.git
cd real-time-code-editor
