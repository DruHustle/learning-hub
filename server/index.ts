import express from "express";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";
import { db, connection } from "./db";
import { users, progress } from "./schema";
import { and, eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";
import { hashPassword, verifyPassword, signSession, verifySession } from "./security";
import type { Request, Response, NextFunction } from "express";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const isProduction = process.env.NODE_ENV === "production";
  const secret = process.env.SESSION_SECRET || (isProduction ? "" : "local-learning-hub-development-secret");
  if (isProduction && (!db || secret.length < 32 || !process.env.ALLOWED_ORIGINS)) {
    throw new Error("Production requires DATABASE_URL, SESSION_SECRET (32+ characters), and ALLOWED_ORIGINS");
  }
  const origins = (process.env.ALLOWED_ORIGINS || "http://localhost:3000").split(",").map(value => value.trim());
  app.disable("x-powered-by");
  app.set("trust proxy", isProduction ? 1 : false);
  app.use(cors({ origin: origins, credentials: true }));
  app.use(express.json({ limit: "100kb" }));
  app.use((req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    if (req.path.startsWith("/api/")) res.setHeader("Cache-Control", "private, no-store");
    if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method) && /(?:^|;\s*)learning_session=/.test(req.headers.cookie || "")) {
      if (!req.headers.origin || !origins.includes(req.headers.origin)) return res.status(403).json({ error: "Cross-site request blocked" });
    }
    next();
  });
  const cookieOptions = { httpOnly: true, secure: isProduction, sameSite: isProduction ? "none" as const : "lax" as const, path: "/", maxAge: 15 * 60_000 };
  const authenticate = (req: Request, res: Response, next: NextFunction) => {
    const token = req.headers.cookie?.split(";").map(value => value.trim()).find(value => value.startsWith("learning_session="))?.slice("learning_session=".length);
    const userId = token ? verifySession(token, secret) : null;
    if (!userId) return res.status(401).json({ error: "Authentication required" });
    if (req.params.userId && req.params.userId !== userId) return res.status(403).json({ error: "Forbidden" });
    res.locals.userId = userId;
    next();
  };
  const publicUser = (user: typeof users.$inferSelect) => ({ id: user.id, email: user.email, name: user.name, role: user.role, avatar: user.avatar });
  const emailSchema = z.string().trim().email().max(255).transform(value => value.toLowerCase());
  const attempts = new Map<string, { count: number; resetAt: number }>();
  const authLimiter = (req: Request, res: Response, next: NextFunction) => {
    const now = Date.now();
    for (const [key, entry] of attempts) if (entry.resetAt <= now) attempts.delete(key);
    const key = req.ip || "unknown";
    if (!attempts.has(key) && attempts.size >= 10000) return res.status(429).json({ error: "Too many requests" });
    const entry = attempts.get(key) || { count: 0, resetAt: now + 15 * 60_000 };
    attempts.set(key, entry);
    if (++entry.count > 10) { res.setHeader("Retry-After", String(Math.ceil((entry.resetAt - now) / 1000))); return res.status(429).json({ error: "Too many requests" }); }
    next();
  };
  
  const server = createServer(app);

  // API Routes
  app.post("/api/register", authLimiter, async (req, res) => {
    if (!db) return res.status(500).json({ error: "Database not connected" });
    const input = z.object({ email: emailSchema, password: z.string().min(12).max(128), name: z.string().trim().min(2).max(255) }).safeParse(req.body);
    if (!input.success) return res.status(400).json({ error: "Invalid registration details" });
    const { email, password, name } = input.data;
    try {
      const id = nanoid();
      const normalizedEmail = email.trim().toLowerCase();
      const passwordHash = await hashPassword(password);
      await db.transaction(async transaction => {
        await transaction.insert(users).values({ id, email: normalizedEmail, password: passwordHash, name });
        await transaction.insert(progress).values({ userId: id, completedTutorials: [] });
      });
      res.status(201).json({ success: true });
    } catch (error: any) {
      res.status(400).json({ error: "Registration failed. Please check your details." });
    }
  });

  app.post("/api/login", authLimiter, async (req, res) => {
    if (!db) return res.status(500).json({ error: "Database not connected" });
    const input = z.object({ email: emailSchema, password: z.string().min(1).max(128) }).safeParse(req.body);
    if (!input.success) return res.status(400).json({ error: "Invalid login details" });
    const { email, password } = input.data;
    try {
      const [user] = await db.select().from(users).where(eq(users.email, email.trim().toLowerCase()));
      if (!user || !(await verifyPassword(password, user.password))) {
        return res.status(401).json({ error: "Invalid credentials" });
      }
      if (user.password.split(":").length === 3) {
        await db.update(users).set({ password: await hashPassword(password) }).where(eq(users.id, user.id));
      }
      res.cookie("learning_session", signSession(user.id, secret), cookieOptions);
      res.json({ success: true, user: publicUser(user) });
    } catch (error: any) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.get("/api/me", authenticate, async (_req, res) => {
    if (!db) return res.status(503).json({ error: "Database unavailable" });
    try {
      const [user] = await db.select().from(users).where(eq(users.id, res.locals.userId));
      if (!user) return res.status(401).json({ error: "Authentication required" });
      res.json({ user: publicUser(user) });
    } catch { res.status(500).json({ error: "Internal server error" }); }
  });
  app.post("/api/logout", (_req, res) => {
    res.clearCookie("learning_session", cookieOptions);
    res.status(204).end();
  });
  app.get("/health", (_req, res) => res.json({ status: "ok" }));
  app.get("/ready", async (_req, res) => {
    try { if (!connection) throw new Error(); await connection.query("SELECT 1"); res.json({ status: "ready" }); }
    catch { res.status(503).json({ status: "not-ready" }); }
  });
  app.get("/api/progress/:userId", authenticate, async (req, res) => {
    if (!db) return res.status(500).json({ error: "Database not connected" });
    try {
      const [userProgress] = await db.select().from(progress).where(eq(progress.userId, req.params.userId));
      res.json(userProgress || { completedTutorials: [] });
    } catch (error: any) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.post("/api/progress/:userId", authenticate, async (req, res) => {
    if (!db) return res.status(500).json({ error: "Database not connected" });
    const input = z.object({ completedTutorials: z.array(z.number().int().nonnegative()).max(10000), lastVisited: z.number().int().nonnegative().optional() }).safeParse(req.body);
    if (!input.success) return res.status(400).json({ error: "Invalid progress" });
    const { completedTutorials, lastVisited } = input.data;
    try {
      await db.update(progress)
        .set({ completedTutorials, lastVisited })
        .where(eq(progress.userId, req.params.userId));
      res.json({ success: true });
    } catch (error: any) {
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.use("/api", (_req, res) => res.status(404).json({ error: "Not found" }));
  // The Vite output is isolated from the server bundle.
  const staticPath =
    process.env.NODE_ENV === "production"
      ? path.resolve(__dirname, "..", "dist")
      : path.resolve(__dirname, "..", "dist");

  app.use(express.static(staticPath));

  // Handle client-side routing - serve index.html for all routes
  app.get("*", (_req, res) => {
    res.sendFile(path.join(staticPath, "index.html"));
  });

  app.use((error: Error & { status?: number }, _req: Request, res: Response, next: NextFunction) => {
    if (res.headersSent) return next(error);
    res.status(error.status === 400 || error.status === 413 ? error.status : 500).json({ error: "Request failed" });
  });
  // Upgrade legacy plaintext records before accepting any authentication requests.
  if (db) {
    const records = await db.select({ id: users.id, password: users.password }).from(users);
    for (const record of records) {
      if (!record.password.startsWith("scrypt:")) {
        await db.update(users).set({ password: await hashPassword(record.password) })
          .where(and(eq(users.id, record.id), eq(users.password, record.password)));
      }
    }
  }
  const port = process.env.PORT || 3001;

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(error => { console.error(error.message); process.exitCode = 1; });
