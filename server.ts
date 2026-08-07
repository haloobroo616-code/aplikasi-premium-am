import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import cookieParser from "cookie-parser";
import pkg from "bcryptjs";
const bcrypt = pkg;
import dotenv from "dotenv";
import "./src/env";
import { firebaseConfig } from "./src/env";

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());
app.use(cookieParser());

// Debug log for environment
console.log("Initializing server with Project ID:", firebaseConfig.projectId);

// Helper to fetch from Firestore REST API
const firestoreRest = async (method: string, path: string, body?: any, silent = false) => {
  if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
    throw new Error("Firebase configuration is missing. Please set VITE_FIREBASE_API_KEY and VITE_FIREBASE_PROJECT_ID in your environment variables.");
  }
  const url = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/${firebaseConfig.firestoreDatabaseId}/documents/${path}?key=${firebaseConfig.apiKey}`;
  const options: any = {
    method,
    headers: { 'Content-Type': 'application/json' }
  };
  if (body) options.body = JSON.stringify(body);
  
  const res = await fetch(url, options);
  const data = await res.json();
  if (!res.ok) {
    if (!silent) {
      console.error(`Firestore error (${method} ${path}):`, data);
    }
    const error = new Error(data.error?.message || JSON.stringify(data));
    (error as any).status = res.status;
    throw error;
  }
  return data;
};

// Helper to get site status
const getSiteStatus = async () => {
  try {
    const res = await firestoreRest('GET', 'settings/site', null, true);
    return res.fields?.status?.stringValue || 'open';
  } catch (e: any) {
    // If not exists (404), try to create it silently
    if (e.status === 404) {
      try {
        await firestoreRest('PATCH', 'settings/site', {
          fields: { status: { stringValue: 'open' } }
        }, true);
      } catch (err) {}
    }
    return 'open';
  }
};

const ADMIN_USER = {
  id: "admin-default",
  username: "andrison",
  password: "hardcoded-login-only", // Not used for bcrypt, but keeps types happy
  role: "Admin",
  limit: 999999,
  todayCount: 0,
  lastReset: new Date().toISOString(),
  points: 0,
  referralCount: 0,
  joinedAt: new Date().toISOString(),
};

// Helper to get user from REST API
const getUserData = async (username: string) => {
  if (username === "andrison") return ADMIN_USER;
  try {
    if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
      console.error("Missing Firebase config for getUserData");
      return null;
    }
    const queryBody = {
      structuredQuery: {
        from: [{ collectionId: "users" }],
        where: {
          fieldFilter: {
            field: { fieldPath: "username" },
            op: "EQUAL",
            value: { stringValue: username }
          }
        },
        limit: 1
      }
    };
    
    const url = `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/${firebaseConfig.firestoreDatabaseId}/documents:runQuery?key=${firebaseConfig.apiKey}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(queryBody)
    });
    const data = await res.json();
    
    if (!data || !data[0] || !data[0].document) return null;
    
    const doc = data[0].document;
    const fields = doc.fields;
    
    return {
      id: doc.name.split('/').pop(),
      username: fields.username?.stringValue,
      password: fields.password?.stringValue,
      role: fields.role?.stringValue,
      limit: Number(fields.limit?.integerValue || fields.limit?.doubleValue || 0),
      todayCount: Number(fields.todayCount?.integerValue || fields.todayCount?.doubleValue || 0),
      lastReset: fields.lastReset?.stringValue,
      points: Number(fields.points?.integerValue || fields.points?.doubleValue || 0),
      referralCount: Number(fields.referralCount?.integerValue || fields.referralCount?.doubleValue || 0),
      joinedAt: fields.joinedAt?.stringValue,
    };
  } catch (err) {
    console.error("getUserData error:", err);
    return null;
  }
};

// Auth Middleware
const auth = async (req: any, res: any, next: any) => {
  const username = req.cookies.username;
  if (!username) return res.status(401).json({ error: "Unauthorized" });
  const user = await getUserData(username);
  if (!user) return res.status(401).json({ error: "Unauthorized" });
  req.user = user;
  next();
};

// Admin Only Middleware
const adminOnly = async (req: any, res: any, next: any) => {
  const username = req.cookies.username;
  if (!username) return res.status(401).json({ error: "Unauthorized" });
  const user = await getUserData(username);
  if (!user || user.role !== 'Admin') return res.status(403).json({ error: "Forbidden: Admin only" });
  req.user = user;
  next();
};

// Site Status Middleware
const checkSiteOpen = async (req: any, res: any, next: any) => {
  // Always try to populate user if cookie exists
  const username = req.cookies.username;
  if (username) {
    const user = await getUserData(username);
    if (user) req.user = user;
  }

  const status = await getSiteStatus();
  if (status === 'closed') {
    // Admins can still access even if site is closed
    if (req.user && req.user.role === 'Admin') {
      return next();
    }
    return res.status(503).json({ error: "Website is currently closed by Administrator." });
  }
  next();
};

// API Routes
app.get("/api/health", async (req, res) => {
  try {
    const siteStatus = await getSiteStatus();
    res.json({ 
      status: "ok", 
      siteStatus,
      database: firebaseConfig.firestoreDatabaseId,
      project: firebaseConfig.projectId
    });
  } catch (err: any) {
    console.error("Health check error:", err);
    res.status(500).json({ 
      error: err.message, 
      project: firebaseConfig.projectId,
      database: firebaseConfig.firestoreDatabaseId
    });
  }
});

app.post("/api/admin/toggle-site", adminOnly, async (req, res) => {
  const { status } = req.body; // 'open' or 'closed'
  try {
    await firestoreRest('PATCH', 'settings/site', {
      fields: { status: { stringValue: status } }
    });
    res.json({ status: "ok", siteStatus: status });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/site-status", async (req, res) => {
  const status = await getSiteStatus();
  res.json({ status });
});

app.post("/api/auth/register", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: "Missing fields" });

  try {
    const existing = await getUserData(username);
    if (existing) return res.status(400).json({ error: "User already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = {
      username,
      password: hashedPassword,
      role: "Member",
      limit: 1,
      todayCount: 0,
      lastReset: new Date().toISOString(),
      points: 0,
      referralCount: 0,
      joinedAt: new Date().toISOString(),
    };

    await firestoreRest('POST', 'users', {
      fields: {
        username: { stringValue: newUser.username },
        password: { stringValue: newUser.password },
        role: { stringValue: newUser.role },
        limit: { integerValue: newUser.limit },
        todayCount: { integerValue: newUser.todayCount },
        lastReset: { stringValue: newUser.lastReset },
        points: { integerValue: newUser.points },
        referralCount: { integerValue: newUser.referralCount },
        joinedAt: { stringValue: newUser.joinedAt }
      }
    });
    res.json({ status: "ok" });
  } catch (err: any) {
    console.error("Registration error:", err);
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/auth/login", async (req, res) => {
  const { username, password } = req.body;
  console.log(`Login attempt for: ${username}`);
  
  try {
    // Check for hardcoded admin first
    if (username === "andrison" && password === "andrison777") {
      res.cookie("username", username, { httpOnly: true, maxAge: 86400000, sameSite: 'lax', path: '/' });
      return res.json({ user: ADMIN_USER });
    }

    const user = await getUserData(username);
    if (!user) {
      console.log("User not found");
      return res.status(400).json({ error: "Invalid credentials" });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      console.log("Invalid password");
      return res.status(400).json({ error: "Invalid credentials" });
    }

    res.cookie("username", username, { httpOnly: true, maxAge: 86400000, sameSite: 'lax', path: '/' });
    res.json({ user });
  } catch (err: any) {
    console.error("Login error:", err);
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/auth/logout", (req, res) => {
  res.clearCookie("username", { path: '/' });
  res.json({ status: "ok" });
});

app.get("/api/user/status", auth, async (req: any, res) => {
  const user = req.user;
  const now = new Date();
  const lastReset = new Date(user.lastReset);
  const hoursDiff = (now.getTime() - lastReset.getTime()) / (1000 * 60 * 60);
  
  if (hoursDiff >= 30) {
    user.todayCount = 0;
    user.lastReset = now.toISOString();
    await firestoreRest('PATCH', `users/${user.id}?updateMask.fieldPaths=todayCount&updateMask.fieldPaths=lastReset`, {
      fields: {
        todayCount: { integerValue: 0 },
        lastReset: { stringValue: user.lastReset }
      }
    });
  }
  
  res.json({ user });
});

app.post("/api/am/send", checkSiteOpen, async (req: any, res) => {
  const { email } = req.body;
  const user = req.user;

  if (user && user.role !== 'Admin' && user.todayCount >= user.limit) {
    return res.status(400).json({ error: "Limit reached. Wait for reset (30 hours)." });
  }

  try {
    const apiUrl = process.env.AM_API_URL;
    const apiKey = process.env.AM_API_KEY;
    
    if (!apiUrl || !apiKey) {
      throw new Error("API configuration missing. Set AM_API_URL and AM_API_KEY.");
    }

    const response = await fetch(`${apiUrl}/api/am?action=send&apikey=${apiKey}&email=${encodeURIComponent(email)}`);
    const data = await response.json();

    if (data.status) {
      if (user) {
        await firestoreRest('PATCH', `users/${user.id}?updateMask.fieldPaths=todayCount`, {
          fields: {
            todayCount: { integerValue: user.todayCount + 1 }
          }
        });
      }
      res.json({ status: "ok", email });
    } else {
      res.status(400).json({ error: data.error || data.message || "Failed to send magic link" });
    }
  } catch (err: any) {
    console.error("AM send error:", err);
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/am/verif", checkSiteOpen, async (req: any, res) => {
  const { email, url } = req.body;

  try {
    const apiUrl = process.env.AM_API_URL;
    const apiKey = process.env.AM_API_KEY;

    if (!apiUrl || !apiKey) {
      throw new Error("API configuration missing. Set AM_API_URL and AM_API_KEY.");
    }

    const response = await fetch(`${apiUrl}/api/am?action=verif&apikey=${apiKey}&email=${encodeURIComponent(email)}&url=${encodeURIComponent(url)}`);
    const data = await response.json();

    if (data.status) {
      const user = req.user;
      if (user && user.role !== 'Admin') {
        await firestoreRest('PATCH', `users/${user.id}?updateMask.fieldPaths=role`, {
          fields: {
            role: { stringValue: "Premium" }
          }
        });
      }
      res.json({ status: "ok" });
    } else {
      res.status(400).json({ error: data.error || data.message || "Verification failed" });
    }
  } catch (err: any) {
    console.error("AM verif error:", err);
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

