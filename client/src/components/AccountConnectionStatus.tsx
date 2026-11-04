import { useSyncExternalStore } from "react";
import {
  accountConnectionStatus,
  subscribeAccountConnection,
} from "../lib/accountConnection";

export function AccountConnectionStatus() {
  const status = useSyncExternalStore(
    subscribeAccountConnection,
    accountConnectionStatus,
    () => "idle"
  );
  if (status !== "connecting" && status !== "error") return null;
  return (
    <div
      role="status"
      aria-live="polite"
      className="border-b bg-muted px-4 py-3 text-center text-sm"
    >
      {status === "connecting"
        ? "Connecting to your account. This may take up to two minutes."
        : "The account service is taking longer to connect. Please try your action again."}
    </div>
  );
}
