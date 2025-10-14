// server.js - CommonJS
// Run: node server.js
// Backend deps: express cors socket.io node-fetch@2 dotenv
// npm i express cors socket.io node-fetch@2 dotenv

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const fetch = require("node-fetch");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json({ limit: "200kb" }));

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_ORIGIN || "*",
    methods: ["GET", "POST"],
  },
});

let rooms = {};

io.on("connection", (socket) => {
  console.log("⚡ User connected:", socket.id);

  socket.on("joinRoom", ({ roomId, username }) => {
    if (!roomId || !username) return;
    socket.join(roomId);
    socket.data.username = username;
    socket.data.roomId = roomId;

    if (!rooms[roomId]) rooms[roomId] = { code: "", language: "javascript", users: [] };
    // avoid duplicate usernames
    if (!rooms[roomId].users.includes(username)) rooms[roomId].users.push(username);

    socket.emit("init", rooms[roomId]);
    socket.to(roomId).emit("userJoined", { username, socketId: socket.id });
    console.log(`${username} joined room ${roomId}`);
  });

  socket.on("codeChange", ({ roomId, code }) => {
    if (!roomId) return;
    if (!rooms[roomId]) rooms[roomId] = { code: "", language: "javascript", users: [] };
    rooms[roomId].code = code;
    socket.to(roomId).emit("codeChange", code);
  });

  socket.on("languageChange", ({ roomId, language }) => {
    if (!roomId) return;
    if (!rooms[roomId]) rooms[roomId] = { code: "", language: "javascript", users: [] };
    rooms[roomId].language = language;
    socket.to(roomId).emit("languageChange", language);
  });

  socket.on("chatMessage", ({ roomId, user, message }) => {
    if (!roomId) return;
    io.to(roomId).emit("chatMessage", { user, message });
  });

  // Signaling
  socket.on("offer", ({ roomId, offer }) => {
    // relay offer to room (others). Server attaches 'from' implicitly via socket.id when forwarding.
    socket.to(roomId).emit("offer", { offer, from: socket.id });
  });

  socket.on("answer", ({ to, answer }) => {
    if (to) {
      io.to(to).emit("answer", { answer, from: socket.id });
    }
  });

  socket.on("ice-candidate", ({ to, candidate }) => {
    if (to) {
      io.to(to).emit("ice-candidate", { candidate, from: socket.id });
    }
  });

  socket.on("disconnect", () => {
    const username = socket.data.username;
    const roomId = socket.data.roomId;
    console.log("❌ User disconnected:", socket.id, username || "(unknown)");
    if (roomId && rooms[roomId]) {
      rooms[roomId].users = rooms[roomId].users.filter((u) => u !== username);
      socket.to(roomId).emit("userLeft", { username, socketId: socket.id });
      if (rooms[roomId].users.length === 0) delete rooms[roomId];
    }
  });
});

// Judge0 proxy endpoint
app.post("/run-code", async (req, res) => {
  const { source_code, language_id, stdin } = req.body;

  if (!process.env.JUDGE0_KEY) {
    return res.status(500).json({ error: "Judge0 API key not configured" });
  }

  try {
    const r = await fetch(
      "https://judge0-ce.p.rapidapi.com/submissions?base64_encoded=false&wait=true",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-RapidAPI-Host": "judge0-ce.p.rapidapi.com",
          "X-RapidAPI-Key": process.env.JUDGE0_KEY,
        },
        body: JSON.stringify({ source_code, language_id, stdin }),
      }
    );
    const data = await r.json();
    res.json(data);
  } catch (err) {
    console.error("Judge0 API error:", err);
    res.status(500).json({ error: "Judge0 API error" });
  }
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log(`🚀 Backend running on port ${PORT}`));
