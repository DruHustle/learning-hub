import express from "express";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";
import { db, connection } from "./db";
import { users, progress } from "./schema";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  app.use(express.json());
  app.use(cors());
  
  const server = createServer(app);

  // API Routes
  app.post("/api/register", async (req, res) => {
    if (!db) return res.status(500).json({ error: "Database not connected" });
    const { email, password, name } = req.body;
    try {
      const id = nanoid();
      const normalizedEmail = email.trim().toLowerCase();
      await db.insert(users).values({ id, email: normalizedEmail, password, name });
      // Initialize progress
      await db.insert(progress).values({ userId: id, completedTutorials: [] });
      res.json({ success: true, user: { id, email, name, role: "user" } });
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Registration failed" });
    }
  });

  app.post("/api/login", async (req, res) => {
    if (!db) return res.status(500).json({ error: "Database not connected" });
    const { email, password } = req.body;
    try {
      const [user] = await db.select().from(users).where(eq(users.email, email.trim().toLowerCase()));
      if (!user || user.password !== password) {
        return res.status(401).json({ error: "Invalid credentials" });
      }
      res.json({ success: true, user: { id: user.id, email: user.email, name: user.name, role: user.role, avatar: user.avatar } });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get("/api/progress/:userId", async (req, res) => {
    if (!db) return res.status(500).json({ error: "Database not connected" });
    try {
      const [userProgress] = await db.select().from(progress).where(eq(progress.userId, req.params.userId));
      res.json(userProgress || { completedTutorials: [] });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post("/api/progress/:userId", async (req, res) => {
    if (!db) return res.status(500).json({ error: "Database not connected" });
    const { completedTutorials, lastVisited } = req.body;
    try {
      await db.update(progress)
        .set({ completedTutorials, lastVisited })
        .where(eq(progress.userId, req.params.userId));
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Serve static files from dist/public in production
  const staticPath =
    process.env.NODE_ENV === "production"
      ? path.resolve(__dirname, "public")
      : path.resolve(__dirname, "..", "dist", "public");

  app.use(express.static(staticPath));

  // Handle client-side routing - serve index.html for all routes
  app.get("*", (_req, res) => {
    res.sendFile(path.join(staticPath, "index.html"));
  });

  const port = process.env.PORT || 3000;

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
