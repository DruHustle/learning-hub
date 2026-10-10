/**
 * Client-side authentication service
 * Uses localStorage for demo accounts and API for real users
 */
import { safeLocalStorage } from './storage';
import axios from 'axios';

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
  avatar?: string;
  isDemo?: boolean;
}

const SESSION_KEY = 'imsop_session';
const API_URL = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');
const api = axios.create({ baseURL: API_URL, timeout: 10_000, withCredentials: true });

// Demo users
const DEMO_USERS = [
  { id: '1', email: 'admin@sap.com', password: 'admin123', name: 'Admin', role: 'admin', isDemo: true },
  { id: '4', email: 'demo@sap.com', password: 'demo123', name: 'Demo', role: 'user', isDemo: true },
];

export async function login(email: string, password: string): Promise<{ success: boolean; user?: User; error?: string }> {
  // Check demo users first
  const demoUser = DEMO_USERS.find(u => u.email.trim().toLowerCase() === email.trim().toLowerCase() && u.password === password);
  if (demoUser) {
    const { password: _, ...sessionUser } = demoUser;
    safeLocalStorage.setItem(SESSION_KEY, JSON.stringify(sessionUser));
    return { success: true, user: sessionUser as User };
  }

  if (!API_URL) return { success: false, error: 'Account sign-in is unavailable. Please use a demo account.' };

  // Try API for real users
  try {
    const response = await api.post(`/api/login`, { email, password });
    if (response.data.success) {
      safeLocalStorage.setItem(SESSION_KEY, JSON.stringify(response.data.user));
      return { success: true, user: response.data.user };
    }
    return { success: false, error: 'Invalid credentials' };
  } catch (error: any) {
    return { success: false, error: error.response?.data?.error || 'Login failed' };
  }
}

export function logout(): void {
  if (API_URL) void api.post("/api/logout").catch(() => undefined);
  safeLocalStorage.removeItem(SESSION_KEY);
}

export function getCurrentUser(): User | null {
  const session = safeLocalStorage.getItem(SESSION_KEY);
  if (!session) return null;
  try {
    return JSON.parse(session);
  } catch {
    return null;
  }
}

export async function restoreCurrentUser(): Promise<User | null> {
  const cached = getCurrentUser();
  if (cached?.isDemo && DEMO_USERS.some(user => user.id === cached.id && user.email === cached.email)) return cached;
  if (!API_URL) return null;
  try { return (await api.get('/api/me')).data.user; }
  catch { safeLocalStorage.removeItem(SESSION_KEY); return null; }
}

export function readProgress(key: string): { completedTutorials: number[] } {
  try {
    const saved = JSON.parse(safeLocalStorage.getItem(key) || 'null');
    if (saved && Array.isArray(saved.completedTutorials)) return { completedTutorials: saved.completedTutorials.filter((id: unknown) => Number.isInteger(id) && Number(id) >= 0) };
  } catch { /* Recover from an interrupted or corrupt local write. */ }
  return { completedTutorials: [] };
}

export async function register(email: string, password: string, name: string): Promise<{ success: boolean; error?: string }> {
  if (!API_URL) return { success: false, error: 'Account registration is unavailable.' };
  try {
    const response = await api.post(`/api/register`, { email, password, name });
    return { success: response.data.success };
  } catch (error: any) {
    return { success: false, error: error.response?.data?.error || 'Registration failed' };
  }
}

export function requestPasswordReset(email: string): { success: boolean; token?: string; error?: string } {
  return { success: false, error: 'This account feature is not configured.' };
}

export function resetPassword(token: string, newPassword: string): { success: boolean; error?: string } {
  return { success: false, error: 'This account feature is not configured.' };
}

export function updateProfile(userId: string, updates: Partial<Pick<User, 'name' | 'avatar'>>): { success: boolean; user?: User; error?: string } {
  const user = getCurrentUser();
  if (user?.isDemo && user.id === userId) {
    const updated = { ...user, name: updates.name || user.name, avatar: updates.avatar || user.avatar };
    safeLocalStorage.setItem(SESSION_KEY, JSON.stringify(updated));
    return { success: true, user: updated };
  }
  return { success: false, error: 'This account feature is not configured.' };
}

export function changePassword(userId: string, currentPassword: string, newPassword: string): { success: boolean; error?: string } {
  return { success: false, error: 'This account feature is not configured.' };
}

export async function getProgress(userId: string, isDemo: boolean) {
  if (isDemo) {
    return readProgress(`progress_${userId}`);
  }
  try {
    const response = await api.get(`/api/progress/${userId}`);
    return response.data;
  } catch {
    return { completedTutorials: [] };
  }
}

export async function saveProgress(userId: string, isDemo: boolean, progress: any) {
  if (isDemo) {
    safeLocalStorage.setItem(`progress_${userId}`, JSON.stringify(progress));
    return;
  }
  try {
    await api.post(`/api/progress/${userId}`, progress);
  } catch (error) {
    console.error('Failed to save progress to API', error);
  }
}
