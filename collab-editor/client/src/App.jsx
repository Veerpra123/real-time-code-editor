// src/App.jsx
import React, { useEffect, useRef, useState } from "react";
import "./styles.css";
import io from "socket.io-client";
import CodeMirror from "@uiw/react-codemirror";
import { javascript } from "@codemirror/lang-javascript";
import { python } from "@codemirror/lang-python";
import { html } from "@codemirror/lang-html";
import { css } from "@codemirror/lang-css";
import { cpp } from "@codemirror/lang-cpp";

import { dracula } from "@uiw/codemirror-theme-dracula";
import { githubLight } from "@uiw/codemirror-theme-github";

const SERVER = import.meta.env.VITE_WS_URL || "http://localhost:4000";
const CODE_DEBOUNCE_MS = 500;
const MAX_CODE_SIZE = 500_000;

function safeString(s = "", max = MAX_CODE_SIZE) {
  if (typeof s !== "string") return "";
  return s.length > max ? s.slice(0, max) : s;
}

function getQueryParams() {
  try {
    const qp = new URLSearchParams(window.location.search);
    return { room: qp.get("room") || "", name: qp.get("name") || "" };
  } catch {
    return { room: "", name: "" };
  }
}

const LS_KEYS = { ROOM: "collab_room", NAME: "collab_name", ASSIGNED: "collab_assigned" };
function saveToLocal(room, name, assigned) {
  try {
    if (room !== null && room !== undefined) localStorage.setItem(LS_KEYS.ROOM, room);
    if (name !== null && name !== undefined) localStorage.setItem(LS_KEYS.NAME, name);
    if (assigned !== null && assigned !== undefined) localStorage.setItem(LS_KEYS.ASSIGNED, assigned);
  } catch (e) {}
}
function readFromLocal() {
  try {
    return {
      room: localStorage.getItem(LS_KEYS.ROOM) || "",
      name: localStorage.getItem(LS_KEYS.NAME) || "",
      assigned: localStorage.getItem(LS_KEYS.ASSIGNED) || ""
    };
  } catch (e) {
    return { room: "", name: "", assigned: "" };
  }
}

export default function App() {
  const qp = getQueryParams();

  const [roomId, setRoomId] = useState(qp.room || "");
  const [username, setUsername] = useState(qp.name || "");
  const [assignedName, setAssignedName] = useState(null);
  const [joined, setJoined] = useState(false);

  const [code, setCode] = useState("// Start coding...");
  const [language, setLanguage] = useState("javascript");
  const [users, setUsers] = useState([]);
  const [chat, setChat] = useState([]);
  const [message, setMessage] = useState("");
  const [stdin, setStdin] = useState("");
  const [output, setOutput] = useState("");
  const [theme, setTheme] = useState(() => localStorage.getItem("ui_theme") || "light");
  const [chatMinimized, setChatMinimized] = useState(false);

  const socketRef = useRef(null);
  const debounceRef = useRef(null);
  const isUnloadingRef = useRef(false);
  const manualLeaveRef = useRef(false);

  const languageMap = {
    javascript: 63,
    python: 71,
    java: 62,
    cpp: 54,
    c: 50,
    ruby: 72,
    go: 60,
    rust: 73,
    php: 68,
    kotlin: 78,
    swift: 83,
    typescript: 74
  };

  useEffect(() => {
    const stored = readFromLocal();
    const r = qp.room || stored.room;
    const n = qp.name || stored.name;
    if (r && n) {
      setRoomId(r);
      setUsername(n);
      setTimeout(() => joinRoom(r, n), 100);
    }
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("ui_theme", theme);

    const beforeUnload = () => {
      isUnloadingRef.current = true;
      try {
        socketRef.current?.emit?.("leaveRoom", { roomId });
      } catch (e) {}
    };
    window.addEventListener("beforeunload", beforeUnload);

    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("ui_theme", theme);
  }, [theme]);

  function connectSocket(roomToJoin, nameToUse) {
    if (socketRef.current) return socketRef.current;
    const socket = io(SERVER, {
      transports: ["websocket"],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000
    });
    socketRef.current = socket;

    const doJoin = () => {
      socket.emit("joinRoom", { roomId: roomToJoin, username: nameToUse }, (res) => {
        if (res && res.username) {
          setAssignedName(res.username);
          saveToLocal(roomToJoin, nameToUse, res.username);
        }
      });
    };

    socket.on("connect", () => {
      if (!isUnloadingRef.current) {
        doJoin();
      }
    });

    socket.on("reconnect", (attemptNumber) => {
      if (!isUnloadingRef.current) {
        doJoin();
        setChat((c) => [...c, { user: "System", message: `Reconnected (attempt ${attemptNumber})`, system: true, time: Date.now() }]);
      }
    });

    socket.on("connect_error", (err) => {
      console.warn("connect_error", err);
      setChat((c) => [...c, { user: "System", message: `Connection error: ${err?.message || err}`, system: true, time: Date.now() }]);
    });

    socket.on("init", (payload = {}) => {
      setCode(safeString(payload.code || ""));
      setLanguage(payload.language || "javascript");
      setUsers(payload.users || []);
      setChat(payload.chat || []);
      if (payload.username) {
        setAssignedName(payload.username);
        saveToLocal(roomToJoin, nameToUse, payload.username);
      }
    });

    socket.on("presence", ({ users: usersList } = {}) => setUsers(usersList || []));

    socket.on("userJoined", ({ name } = {}) => {
      setChat((c) => [...c, { user: "System", message: `${name} joined`, system: true, time: Date.now() }]);
    });

    socket.on("userLeft", ({ name } = {}) => {
      setChat((c) => [...c, { user: "System", message: `${name} left`, system: true, time: Date.now() }]);
    });

    socket.on("systemMessage", ({ text } = {}) => {
      if (text) setChat((c) => [...c, { user: "System", message: text, system: true, time: Date.now() }]);
    });

    socket.on("chatMessage", (msg = {}) => {
      setChat((c) => [...c, msg]);
      setTimeout(() => {
        const el = document.querySelector(".chat-messages");
        if (el) el.scrollTop = el.scrollHeight;
      }, 50);
    });

    socket.on("codeChange", (remoteCode) => {
      if (typeof remoteCode === "string") {
        setCode((cur) => (cur === remoteCode ? cur : safeString(remoteCode)));
      }
    });

    socket.on("languageChange", (lang) => { if (lang) setLanguage(lang); });

    socket.on("disconnect", (reason) => {
      if (isUnloadingRef.current || manualLeaveRef.current) {
        isUnloadingRef.current = false;
        manualLeaveRef.current = false;
      } else {
        setChat((c) => [...c, { user: "System", message: `Disconnected (${reason})`, system: true, time: Date.now() }]);
      }
    });

    return socket;
  }

  function joinRoom(roomToJoin = roomId, nameToUse = username) {
    if (!roomToJoin || !nameToUse) {
      alert("Please enter room ID and username");
      return;
    }
    saveToLocal(roomToJoin, nameToUse, null);
    const socket = connectSocket(roomToJoin, nameToUse);

    if (socket?.connected) {
      setJoined(true);
    } else {
      socket.once("connect", () => {
        setJoined(true);
      });
    }

    const url = new URL(window.location.href);
    url.searchParams.set("room", roomToJoin);
    url.searchParams.set("name", nameToUse);
    window.history.replaceState({}, "", url.toString());
  }

  function leaveRoom() {
    try {
      manualLeaveRef.current = true;
      socketRef.current?.emit("leaveRoom", { roomId });
      socketRef.current?.disconnect();
    } catch (e) {}
    socketRef.current = null;
    setJoined(false);
    setUsers([]);
  }

  function sendCodeChange(newCode) {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      try {
        const socket = socketRef.current;
        if (!socket || !socket.connected) return;
        const safe = safeString(newCode);
        socket.emit("codeChange", { roomId, code: safe });
      } catch (err) { console.error("emit codeChange failed", err); }
    }, CODE_DEBOUNCE_MS);
  }

  async function runCode() {
    setOutput("⏳ Running...");
    try {
      const langId = languageMap[language] || languageMap.javascript;
      const resp = await fetch(`${SERVER}/run-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source_code: code, language_id: langId, stdin })
      });
      const data = await resp.json();
      const out = data.stdout || data.stderr || data.compile_output || (data.status && data.status.description) || JSON.stringify(data);
      setOutput(out);
    } catch (err) {
      console.error("runCode error", err);
      setOutput("❌ Error calling backend");
    }
  }

  function handleSendChat() {
    const msg = (message || "").trim();
    if (!msg || !socketRef.current) return;
    const payload = { roomId, user: assignedName || username, message: msg };
    socketRef.current.emit("chatMessage", payload);
    setChat((c) => [...c, { user: assignedName || username, message: msg }]);
    setMessage("");
    setTimeout(() => { const el = document.querySelector(".chat-messages"); if (el) el.scrollTop = el.scrollHeight; }, 50);
  }

  function handleLanguageChange(e) {
    const lang = e.target.value.toLowerCase();
    setLanguage(lang);
    socketRef.current?.emit("languageChange", { roomId, language: lang });
  }

  function downloadCode() {
    const ext = language === "python" ? "py" : language === "java" ? "java" : "js";
    const filename = `${roomId || "code"}.${ext}`;
    const blob = new Blob([code || ""], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  }

  function copyLink() {
    const u = new URL(window.location.href); u.searchParams.set("room", roomId); u.searchParams.set("name", assignedName || username);
    navigator.clipboard.writeText(u.toString()).then(() => alert("Link copied!"));
  }

  return (
    <div className={`app ${theme}`}>
      <header className="header fade-in">
        <div className="left">
          <div className="room">Room: <strong>{roomId || "—"}</strong></div>
          <div className="meta">You: <strong>{assignedName || username || "—"}</strong></div>
        </div>
        <div className="right">
          <button className="btn blue" onClick={copyLink}>Copy Link</button>
          <button className="btn green" onClick={downloadCode}>Download</button>
          <button className="btn orange" onClick={() => setTheme((t) => (t === "light" ? "dark" : "light"))}>
            {theme === "light" ? "🌙 Dark" : "☀️ Light"}
          </button>
          <button className="btn red" onClick={leaveRoom}>Leave</button>
        </div>
      </header>

      {!joined ? (
        <div className="join-screen">
          <div className="card fade-in">
            <h1>Real-time Code Editor</h1>
            <input placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} />
            <div className="row" style={{display:'flex',gap:8,marginTop:8}}>
              <input placeholder="Room ID (or generate)" value={roomId} onChange={(e) => setRoomId(e.target.value)} />
              <button className="btn purple" onClick={() => setRoomId("room-" + Math.random().toString(36).slice(2, 9))}>Generate</button>
            </div>
            <div className="row spaced" style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:12}}>
              <button onClick={() => joinRoom()} className="btn green">Join Room</button>
              <button className="btn pink" onClick={() => { setRoomId(""); setUsername(""); }}>Clear</button>
            </div>
            <p className="muted" style={{marginTop:10}}>Tip: share the room link after joining.</p>
          </div>
        </div>
      ) : (
        <>
          <div className="main">
            <div className="editor-pane">
              <div className="editor-toolbar">
                <select value={language} onChange={handleLanguageChange}>
                  {Object.keys(languageMap).map((k) => <option key={k} value={k}>{k.toUpperCase()}</option>)}
                </select>
                <div className="editor-actions">
                  <button className="btn orange" onClick={() => setCode("// New file\n")}>New</button>
                  <button className="btn pink" onClick={() => setCode((c) => c + "\n// Edited")}>Append</button>
                  <button onClick={runCode} className="btn green">Run</button>
                </div>
              </div>

              <CodeMirror
                value={code}
                height="60vh"
                extensions={[
                  language === "javascript" ? javascript({ jsx: true })
                    : language === "python" ? python()
                    : language === "html" ? html()
                    : language === "css" ? css()
                    : language === "cpp" ? cpp()
                    : javascript({ jsx: true })
                ]}
                onChange={(value) => { setCode(value); sendCodeChange(value); }}
                theme={theme === "dark" ? dracula : githubLight}
                basicSetup={{ foldGutter: true }}
              />

              <div className="stdin-run">
                <textarea placeholder="Custom input (stdin)" value={stdin} onChange={(e) => setStdin(e.target.value)} rows={3} />
                <div className="run-row">
                  <button onClick={runCode} className="btn blue">Run</button>
                  <div className="output-label" style={{marginLeft:12}}>Output:</div>
                </div>
                <pre className="output-area">{output}</pre>
              </div>
            </div>

            <aside className={`sidebar ${chatMinimized ? "min" : ""}`}>
              <div className="users-panel">
                <h4>Users ({users.length})</h4>
                <div className="user-list">
                  {users.map((u) => (
                    <div key={u.name} className="user-item slide-in-left">
                      <img src={u.avatar} alt={u.name} />
                      <span>{u.name}{u.name === (assignedName || username) ? " (you)" : ""}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="chat-panel">
                <div className="chat-header">
                  <h4>Chat</h4>
                  <div>
                    <button className="btn purple" onClick={() => setChatMinimized((s) => !s)}>{chatMinimized ? "▲" : "▼"}</button>
                  </div>
                </div>

                <div className="chat-messages" style={{ height: chatMinimized ? 80 : 240 }}>
                  {chat.map((m, i) => (
                    <div key={i} className={`chat-line enter ${m.system ? "system" : (m.user === (assignedName || username) ? "me" : "other")}`}>
                      {m.system ? <em>{m.message}</em> : <><strong>{m.user}:</strong> {m.message}</>}
                    </div>
                  ))}
                </div>

                <div className="chat-input">
                  <input placeholder="Message..." value={message} onChange={(e) => setMessage(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleSendChat(); }}} />
                  <button className="btn red" onClick={handleSendChat}>Send</button>
                </div>
              </div>
            </aside>
          </div>
        </>
      )}

      <footer className="footer">
        <div>Collaborative Editor • Room: <strong>{roomId}</strong></div>
      </footer>
    </div>
  );
}
