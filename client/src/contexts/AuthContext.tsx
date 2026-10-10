import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import * as authService from '@/lib/auth';
import type { User } from '@/lib/auth';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  register: (email: string, password: string, name: string) => Promise<{ success: boolean; error?: string }>;
  requestPasswordReset: (email: string) => Promise<{ success: boolean; token?: string; error?: string }>;
  resetPassword: (token: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
  updateProfile: (updates: Partial<Pick<User, 'name' | 'avatar'>>) => Promise<{ success: boolean; error?: string }>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
  progress: any;
  markAsCompleted: (tutorialId: number) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [progressChanged, setProgressChanged] = useState(false);
  const [progress, setProgress] = useState(() => authService.readProgress("learning-hub-progress"));

  useEffect(() => {
    const initAuth = async () => {
      const currentUser = await authService.restoreCurrentUser();
      setUser(currentUser);
      
      if (currentUser) {
        const savedProgress = await authService.getProgress(currentUser.id, !!currentUser.isDemo);
        setProgress(savedProgress);
      } else {
        setProgress(authService.readProgress("learning-hub-progress"));
      }
      setLoading(false);
    };
    initAuth();
  }, []);

  useEffect(() => {
    if (loading) return;
    if (user && progressChanged) {
      authService.saveProgress(user.id, !!user.isDemo, progress);
    } else if (!user) {
      try { localStorage.setItem("learning-hub-progress", JSON.stringify(progress)); } catch { /* Storage may be unavailable. */ }
    }
  }, [progress, user, loading, progressChanged]);

  const markAsCompleted = (tutorialId: number) => {
    setProgressChanged(true);
    setProgress((prev: any) => {
      if (prev.completedTutorials.includes(tutorialId)) return prev;
      return {
        ...prev,
        completedTutorials: [...prev.completedTutorials, tutorialId],
      };
    });
  };

  // Return a Promise
  const login = async (email: string, password: string) => {
    const result = await authService.login(email, password); 
    if (result.success && result.user) {
      setProgressChanged(false);
      setProgress(await authService.getProgress(result.user.id, !!result.user.isDemo));
      setUser(result.user);
    }
    return result;
  };

  const logout = () => {
    authService.logout();
    setProgressChanged(false);
    setProgress(authService.readProgress("learning-hub-progress"));
    setUser(null);
  };

  const register = (email: string, password: string, name: string) => {
    return authService.register(email, password, name);
  };

  const requestPasswordReset = async (email: string) => {
    return authService.requestPasswordReset(email);
  };

  const resetPassword = async (token: string, newPassword: string) => {
    return authService.resetPassword(token, newPassword);
  };

  const updateProfile = async (updates: Partial<Pick<User, 'name' | 'avatar'>>) => {
    if (!user) return { success: false, error: 'Not authenticated' };
    const result = authService.updateProfile(user.id, updates);
    if (result.success && result.user) {
      setProgressChanged(false);
      setProgress(await authService.getProgress(result.user.id, !!result.user.isDemo));
      setUser(result.user);
    }
    return result;
  };

  const changePassword = async (currentPassword: string, newPassword: string) => {
    if (!user) return { success: false, error: 'Not authenticated' };
    return authService.changePassword(user.id, currentPassword, newPassword);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        loading,
        login,
        logout,
        register,
        requestPasswordReset,
        resetPassword,
        updateProfile,
        changePassword,
        progress,
        markAsCompleted,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}