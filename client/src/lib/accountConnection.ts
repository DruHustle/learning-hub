/** One read-only readiness request before account traffic after an idle period. */
export type AccountConnectionStatus = "idle" | "connecting" | "ready" | "error";
export class AccountConnectionError extends Error {
  constructor() {
    super("The account service is taking longer to connect. Please try again.");
    this.name = "AccountConnectionError";
  }
}
let status: AccountConnectionStatus = "idle";
let readyUntil = 0;
let pending: Promise<void> | undefined;
const listeners = new Set<() => void>();
export const accountConnectionStatus = () => status;
export function subscribeAccountConnection(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
function update(next: AccountConnectionStatus) {
  status = next;
  listeners.forEach(listener => listener());
}
function cancelled(signal?: AbortSignal) {
  if (signal?.aborted)
    throw new DOMException("Account request cancelled", "AbortError");
}
function waitForConnection(
  request: Promise<void>,
  signal?: AbortSignal
): Promise<void> {
  if (!signal) return request;
  cancelled(signal);
  return new Promise((resolve, reject) => {
    const abort = () =>
      reject(new DOMException("Account request cancelled", "AbortError"));
    signal.addEventListener("abort", abort, { once: true });
    request
      .then(resolve, reject)
      .finally(() => signal.removeEventListener("abort", abort));
  });
}
export function ensureAccountConnection(
  origin: string,
  signal?: AbortSignal
): Promise<void> | undefined {
  cancelled(signal);
  if (Date.now() < readyUntil) return;
  if (!pending) {
    update("connecting");
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 120_000);
    pending = (async () => {
      try {
        // This may wait for a sleeping free host. Same-origin access cookies
        // retain preview protection; cross-origin readiness sends no cookies.
        // It never retries a mutation or keeps the service awake in the background.
        const response = await fetch(`${origin}/ready`, {
          method: "GET",
          credentials: "same-origin",
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok || (await response.json()).status !== "ready")
          throw new AccountConnectionError();
        readyUntil = Date.now() + 5 * 60_000;
        update("ready");
      } catch {
        readyUntil = 0;
        update("error");
        throw new AccountConnectionError();
      } finally {
        clearTimeout(timer);
      }
    })().finally(() => {
      pending = undefined;
    });
  }
  return waitForConnection(pending, signal).then(() => cancelled(signal));
}
