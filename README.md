# 🚀 Real-Time Code Editor  

![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)
![Tech](https://img.shields.io/badge/Stack-MERN%20%7C%20Socket.IO%20%7C%20Judge0-blue)
![Status](https://img.shields.io/badge/Status-Active-success)

A real-time collaborative code editor that allows multiple users to write, edit, and execute code simultaneously in a shared environment.

---

## ✨ Overview

This project enables developers to collaborate on code in real time, similar to Google Docs but designed specifically for coding. It supports multiple programming languages, live updates, and instant code execution.

---

## 🎯 Key Features

- Real-time collaborative editing using WebSockets  
- Multi-user room-based collaboration  
- Built-in chat system for communication  
- Code execution support (40+ languages)  
- Light/Dark theme support  
- Unique room sharing via link  
- Fast and responsive UI  

---

## 🛠️ Tech Stack

### Frontend
- React.js  
- CodeMirror 6  
- Socket.IO Client  

### Backend
- Node.js  
- Express.js  
- Socket.IO  

### Code Execution
- Judge0 API  

### Tools & Technologies
- WebSockets  
- REST APIs  
- Git & GitHub  

---

## ⚙️ System Workflow

### Real-Time Sync
- User writes code → event emitted via Socket.IO  
- Server receives and broadcasts changes  
- All connected users receive updates instantly  

### Code Execution Flow
- Code sent from frontend → backend  
- Backend sends request to Judge0 API  
- Output returned and displayed to user  

### Room-Based Architecture
- Each session uses a unique Room ID  
- Users join using shared links  
- Communication restricted within room  

---

collab-editor/
│
├── backend/
│ ├── server.js
│ ├── package.json
│ └── test.js
│
├── client/
│ ├── public/
│ ├── src/
│ │ ├── App.jsx
│ │ ├── index.js
│ │ └── styles.css
│ └── package.json
│
└── README.md


---

## 🚀 Getting Started

### 1. Clone Repository
```bash
git clone https://github.com/your-username/real-time-code-editor.git
cd real-time-code-editor

## 📂 Project Structure
