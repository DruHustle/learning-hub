/**
 * Client-side authentication service
 * Uses localStorage for demo accounts and API for real users
 */
import { safeLocalStorage } from "./storage";
import axios from "axios";
import {
  AccountConnectionError,
  ensureAccountConnection,
} from "./accountConnection";

export interface User {
  id: string;
  email: string;
  name: string;
  role: "admin" | "user";
  avatar?: string;
  isDemo?: boolean;
}

export interface Progress {
  completedTutorials: number[];
}

const SESSION_KEY = "imsop_session";
const API_URL = (
  import.meta.env.VITE_API_URL ??
  (import.meta.env.PROD ? "https://learning-api.152-70-22-84.sslip.io" : "")
).replace(/\/+$/, "");
const api = axios.create({
  baseURL: API_URL,
  timeout: 10_000,
  withCredentials: true,
});

// Cookie-changing requests must finish in order. In particular, a late logout
// response must not clear the cookie established by a subsequent login.
let accountMutations: Promise<void> = Promise.resolve();
function sequenceAccountMutation<T>(request: () => Promise<T>): Promise<T> {
  const result = accountMutations.then(request);
  accountMutations = result.then(
    () => undefined,
    () => undefined
  );
  return result;
}

function isUser(value: unknown): value is User {
  if (!value || typeof value !== "object") return false;
  const user = value as User;
  return (
    typeof user.id === "string" &&
    user.id.length > 0 &&
    typeof user.email === "string" &&
    typeof user.name === "string" &&
    (user.role === "admin" || user.role === "user")
  );
}

function parseServerProgress(value: unknown): Progress {
  const ids = (value as Progress | null)?.completedTutorials;
  if (
    !Array.isArray(ids) ||
    ids.length > 10_000 ||
    ids.some(id => !Number.isInteger(id) || id < 0)
  ) {
    throw new Error("The server returned invalid progress. Please retry.");
  }
  return { completedTutorials: [...new Set(ids)] };
}

export function isSessionRejection(error: unknown): boolean {
  const status = (error as { response?: { status?: unknown } } | null)?.response
    ?.status;
  return status === 401 || status === 403;
}

// Demo users
const DEMO_USERS = [
  {
    id: "1",
    email: "admin@sap.com",
    password: "admin123",
    name: "Admin",
    role: "admin",
    isDemo: true,
  },
  {
    id: "4",
    email: "demo@sap.com",
    password: "demo123",
    name: "Demo",
    role: "user",
    isDemo: true,
  },
];

export function login(
  email: string,
  password: string
): Promise<{ success: boolean; user?: User; error?: string }> {
  return sequenceAccountMutation(async () => {
    // Check demo users first
    const demoUser = DEMO_USERS.find(
      u =>
        u.email.trim().toLowerCase() === email.trim().toLowerCase() &&
        u.password === password
    );
    if (demoUser) {
      const { password: _, ...sessionUser } = demoUser;
      return { success: true, user: sessionUser as User };
    }

    if (!API_URL)
      return {
        success: false,
        error: "Account sign-in is unavailable. Please use a demo account.",
      };

    // Try API for real users
    try {
      const connection = ensureAccountConnection(API_URL);
      if (connection) await connection;
      const response = await api.post(`/api/login`, { email, password });
      if (response.data.success && isUser(response.data.user)) {
        return { success: true, user: response.data.user };
      }
      return { success: false, error: "Invalid credentials" };
    } catch (error: any) {
      return {
        success: false,
        error:
          error instanceof AccountConnectionError
            ? error.message
            : error.response?.data?.error || "Login failed",
      };
    }
  });
}

export function logout(): Promise<void> {
  return sequenceAccountMutation(async () => {
    if (API_URL) {
      const connection = ensureAccountConnection(API_URL);
      if (connection) await connection;
      await api.post("/api/logout");
    }
  });
}

// Only the coordinator commits identity after checking its current generation.
// Network responses must never write a stale account into the session cache.
export function rememberUser(user: User | null): void {
  if (user) safeLocalStorage.setItem(SESSION_KEY, JSON.stringify(user));
  else safeLocalStorage.removeItem(SESSION_KEY);
}

export function getCurrentUser(): User | null {
  const session = safeLocalStorage.getItem(SESSION_KEY);
  if (!session) return null;
  try {
    const user = JSON.parse(session);
    return isUser(user) ? user : null;
  } catch {
    return null;
  }
}

export async function restoreCurrentUser(
  signal?: AbortSignal
): Promise<User | null> {
  await accountMutations;
  if (signal?.aborted) throw new Error("Account check cancelled");
  const cached = getCurrentUser();
  if (
    cached?.isDemo &&
    DEMO_USERS.some(
      user => user.id === cached.id && user.email === cached.email
    )
  )
    return cached;
  if (!API_URL) return null;
  try {
    const connection = ensureAccountConnection(API_URL, signal);
    if (connection) await connection;
    const user = (await api.get("/api/me", { signal })).data.user;
    if (user === null) return null;
    if (!isUser(user))
      throw new Error("The account response could not be verified.");
    return user;
  } catch (error: any) {
    if (error.response?.status === 401) return null;
    throw error;
  }
}

export function readProgress(key: string): Progress {
  try {
    const saved = JSON.parse(safeLocalStorage.getItem(key) || "null");
    if (saved && Array.isArray(saved.completedTutorials))
      return {
        completedTutorials: saved.completedTutorials.filter(
          (id: unknown) => Number.isInteger(id) && Number(id) >= 0
        ),
      };
  } catch {
    /* Recover from an interrupted or corrupt local write. */
  }
  return { completedTutorials: [] };
}

export function saveLocalProgress(key: string, progress: Progress): void {
  safeLocalStorage.setItem(key, JSON.stringify(progress));
}

const pendingKey = (userId: string) =>
  `learning-hub-pending-progress-v1:${encodeURIComponent(userId)}`;

export function readPendingProgress(userId: string): Progress {
  return readProgress(pendingKey(userId));
}

export function savePendingProgress(userId: string, progress: Progress): void {
  if (progress.completedTutorials.length)
    saveLocalProgress(pendingKey(userId), progress);
  else safeLocalStorage.removeItem(pendingKey(userId));
}

export async function register(
  email: string,
  password: string,
  name: string
): Promise<{ success: boolean; error?: string }> {
  if (!API_URL)
    return { success: false, error: "Account registration is unavailable." };
  try {
    const connection = ensureAccountConnection(API_URL);
    if (connection) await connection;
    const response = await api.post(`/api/register`, { email, password, name });
    return { success: response.data.success };
  } catch (error: any) {
    return {
      success: false,
      error:
        error instanceof AccountConnectionError
          ? error.message
          : error.response?.data?.error || "Registration failed",
    };
  }
}

export function requestPasswordReset(email: string): {
  success: boolean;
  token?: string;
  error?: string;
} {
  return { success: false, error: "This account feature is not configured." };
}

export function resetPassword(
  token: string,
  newPassword: string
): { success: boolean; error?: string } {
  return { success: false, error: "This account feature is not configured." };
}

export function updateProfile(
  userId: string,
  updates: Partial<Pick<User, "name" | "avatar">>
): { success: boolean; user?: User; error?: string } {
  const user = getCurrentUser();
  if (user?.isDemo && user.id === userId) {
    const updated = {
      ...user,
      name: updates.name || user.name,
      avatar: updates.avatar || user.avatar,
    };
    return { success: true, user: updated };
  }
  return { success: false, error: "This account feature is not configured." };
}

export function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string
): { success: boolean; error?: string } {
  return { success: false, error: "This account feature is not configured." };
}

export async function getProgress(
  userId: string,
  isDemo: boolean,
  signal?: AbortSignal
): Promise<Progress> {
  if (isDemo) {
    return readProgress(`progress_${userId}`);
  }
  const connection = ensureAccountConnection(API_URL, signal);
  if (connection) await connection;
  const response = await api.get(
    `/api/progress/${encodeURIComponent(userId)}`,
    { signal }
  );
  return parseServerProgress(response.data);
}

export async function saveProgress(
  userId: string,
  isDemo: boolean,
  progress: Progress
): Promise<Progress | undefined> {
  if (isDemo) {
    saveLocalProgress(`progress_${userId}`, progress);
    return;
  }
  const submitted = parseServerProgress(progress);
  const connection = ensureAccountConnection(API_URL);
  if (connection) await connection;
  const response = await api.post(
    `/api/progress/${encodeURIComponent(userId)}`,
    // Old servers ignore merge and still replace the full list. Upgrade the API
    // before relying on atomic merging across devices during a staged rollout.
    { ...submitted, merge: true }
  );
  if (response.data?.success !== true)
    throw new Error("The progress save could not be confirmed.");
  if (Object.prototype.hasOwnProperty.call(response.data, "progress")) {
    const saved = parseServerProgress(response.data.progress);
    const acknowledged = new Set(saved.completedTutorials);
    if (submitted.completedTutorials.some(id => !acknowledged.has(id)))
      throw new Error("The server did not confirm all submitted completions.");
    return saved;
  }
  // Keep compatibility with a legacy API's { success: true } acknowledgement.
  return undefined;
}
