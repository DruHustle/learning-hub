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
const API_URL = import.meta.env.VITE_API_URL || '';

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

  // Try API for real users
  try {
    const response = await axios.post(`${API_URL}/api/login`, { email, password });
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

export async function register(email: string, password: string, name: string): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await axios.post(`${API_URL}/api/register`, { email, password, name });
    return { success: response.data.success };
  } catch (error: any) {
    return { success: false, error: error.response?.data?.error || 'Registration failed' };
  }
}

export function requestPasswordReset(email: string): { success: boolean; token?: string; error?: string } {
  return { success: true }; // Mock for now
}

export function resetPassword(token: string, newPassword: string): { success: boolean; error?: string } {
  return { success: true }; // Mock for now
}

export function updateProfile(userId: string, updates: any): { success: boolean; user?: User; error?: string } {
  return { success: true }; // Mock for now
}

export function changePassword(userId: string, currentPassword: string, newPassword: string): { success: boolean; error?: string } {
  return { success: true }; // Mock for now
}

export async function getProgress(userId: string, isDemo: boolean) {
  if (isDemo) {
    const saved = safeLocalStorage.getItem(`progress_${userId}`);
    return saved ? JSON.parse(saved) : { completedTutorials: [] };
  }
  try {
    const response = await axios.get(`${API_URL}/api/progress/${userId}`);
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
    await axios.post(`${API_URL}/api/progress/${userId}`, progress);
  } catch (error) {
    console.error('Failed to save progress to API', error);
  }
}
