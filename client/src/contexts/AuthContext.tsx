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
  const [progress, setProgress] = useState(() => {
    const saved = localStorage.getItem("sap-btp-ai-hub-progress");
    return saved ? JSON.parse(saved) : { completedTutorials: [] };
  });

  useEffect(() => {
    const initAuth = async () => {
      const currentUser = authService.getCurrentUser();
      setUser(currentUser);
      
      if (currentUser) {
        const savedProgress = await authService.getProgress(currentUser.id, !!currentUser.isDemo);
        setProgress(savedProgress);
      } else {
        const saved = localStorage.getItem("sap-btp-ai-hub-progress");
        if (saved) setProgress(JSON.parse(saved));
      }
      setLoading(false);
    };
    initAuth();
  }, []);

  useEffect(() => {
    if (user) {
      authService.saveProgress(user.id, !!user.isDemo, progress);
    } else {
      localStorage.setItem("sap-btp-ai-hub-progress", JSON.stringify(progress));
    }
  }, [progress, user]);

  const markAsCompleted = (tutorialId: number) => {
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
      setUser(result.user);
    }
    return result;
  };

  const logout = () => {
    authService.logout();
    setUser(null);
  };

  const register = (email: string, password: string, name: string) => {
    return authService.register(email, password, name);
  };

  const requestPasswordReset = (email: string) => {
    return authService.requestPasswordReset(email);
  };

  const resetPassword = (token: string, newPassword: string) => {
    return authService.resetPassword(token, newPassword);
  };

  const updateProfile = (updates: Partial<Pick<User, 'name' | 'avatar'>>) => {
    if (!user) return { success: false, error: 'Not authenticated' };
    const result = authService.updateProfile(user.id, updates);
    if (result.success && result.user) {
      setUser(result.user);
    }
    return result;
  };

  const changePassword = (currentPassword: string, newPassword: string) => {
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