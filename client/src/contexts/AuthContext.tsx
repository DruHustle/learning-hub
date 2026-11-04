import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  createAccountProgress,
  type AccountProgressState,
} from "@/lib/accountProgress";

type Coordinator = ReturnType<typeof createAccountProgress>;
type AuthContextType = AccountProgressState &
  Pick<
    Coordinator,
    | "login"
    | "logout"
    | "register"
    | "requestPasswordReset"
    | "resetPassword"
    | "updateProfile"
    | "changePassword"
    | "markAsCompleted"
    | "retryAccount"
    | "retryProgress"
  > & { isAuthenticated: boolean };

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [coordinator] = useState(createAccountProgress);
  const state = useSyncExternalStore(
    coordinator.subscribe,
    coordinator.getSnapshot,
    coordinator.getSnapshot
  );

  useEffect(() => {
    void coordinator.start();
    return () => coordinator.stop();
  }, [coordinator]);

  const value = useMemo(
    () => ({
      ...state,
      isAuthenticated: !!state.user,
      login: coordinator.login,
      logout: coordinator.logout,
      register: coordinator.register,
      requestPasswordReset: coordinator.requestPasswordReset,
      resetPassword: coordinator.resetPassword,
      updateProfile: coordinator.updateProfile,
      changePassword: coordinator.changePassword,
      markAsCompleted: coordinator.markAsCompleted,
      retryAccount: coordinator.retryAccount,
      retryProgress: coordinator.retryProgress,
    }),
    [coordinator, state]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}
