import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import cookieParser from "cookie-parser";
import fs from "fs";
import "./src/env";
import { amConfig } from "./src/env";

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());
app.use(cookieParser());

// Persistent settings path
const SETTINGS_PATH = path.join(process.cwd(), "settings.json");

// Load settings
let siteStatus: "open" | "closed" = "open";
if (fs.existsSync(SETTINGS_PATH)) {
  try {
    const settings = JSON.parse(fs.readFileSync(SETTINGS_PATH, "utf-8"));
    siteStatus = settings.siteStatus || "open";
  } catch (e) {
    console.error("Failed to load settings:", e);
  }
}

// In-memory cache (matching bot logic)
const emailCache: Record<string, string> = {};

const ADMIN_USER = {
  id: "admin-default",
  username: "andrison",
  role: "Admin",
  limit: 999999,
  todayCount: 0,
  lastReset: new Date().toISOString(),
};

// Site Status Middleware
const checkSiteOpen = async (req: any, res: any, next: any) => {
  if (siteStatus === 'closed') {
    const username = req.cookies.username;
    if (username === 'andrison') {
      return next();
    }
    return res.status(503).json({ error: "Website is currently closed by Administrator." });
  }
  next();
};

// API Routes
app.post("/api/admin/toggle-site", (req, res) => {
  const username = req.cookies.username;
  if (username !== "andrison") {
    console.log(`Unauthorized toggle attempt by ${username}`);
    return res.status(403).json({ error: "Forbidden: Admin only" });
  }
  
  const { status } = req.body;
  siteStatus = status;
  
  // Save settings
  try {
    fs.writeFileSync(SETTINGS_PATH, JSON.stringify({ siteStatus }));
    console.log(`Site status updated to: ${siteStatus}`);
  } catch (e) {
    console.error("Failed to save settings:", e);
  }
  
  res.json({ status: "ok", siteStatus: status });
});

app.get("/api/site-status", (req, res) => {
  res.json({ status: siteStatus });
});

app.post("/api/auth/login", (req, res) => {
  const { username, password } = req.body;
  
  if (username === "andrison" && password === "andrison777") {
    res.cookie("username", username, { httpOnly: true, maxAge: 86400000, sameSite: 'lax', path: '/' });
    return res.json({ user: ADMIN_USER });
  }

  res.status(401).json({ error: "Invalid credentials" });
});

app.post("/api/auth/logout", (req, res) => {
  res.clearCookie("username", { path: '/' });
  res.json({ status: "ok" });
});

app.get("/api/user/status", (req, res) => {
  const username = req.cookies.username;
  if (username === "andrison") {
    return res.json({ user: ADMIN_USER });
  }
  res.status(401).json({ error: "Unauthorized" });
});

app.post("/api/am/send", checkSiteOpen, async (req, res) => {
  const { email } = req.body;
  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: "Format email salah" });
  }

  try {
    const response = await fetch(`${amConfig.apiUrl}/api/am?action=send&apikey=${amConfig.apiKey}&email=${encodeURIComponent(email)}`);
    const data = await response.json();

    if (data.status) {
      const clientId = req.ip || "guest";
      emailCache[clientId] = email;
      res.json({ status: "ok", email });
    } else {
      res.status(400).json({ error: data.error || data.message || "Gagal mengirim magic link" });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/am/verif", checkSiteOpen, async (req, res) => {
  const { url } = req.body;
  const clientId = req.ip || "guest";
  const email = emailCache[clientId];

  if (!email) {
    return res.status(400).json({ error: "Email tidak ditemukan. Kirim magic link dulu." });
  }

  try {
    const response = await fetch(`${amConfig.apiUrl}/api/am?action=verif&apikey=${amConfig.apiKey}&email=${encodeURIComponent(email)}&url=${encodeURIComponent(url)}`);
    const data = await response.json();

    if (data.status) {
      delete emailCache[clientId];
      res.json({ status: "ok", codeorder: data.codeorder });
    } else {
      res.status(400).json({ error: data.error || data.message || "Verifikasi gagal" });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  if (!process.env.VERCEL) {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  }
}

startServer();

export default app;
