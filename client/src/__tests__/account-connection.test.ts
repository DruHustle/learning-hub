import { afterEach, beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  post: vi.fn(),
  get: vi.fn(),
  create: vi.fn(),
}));
vi.mock("axios", () => ({ default: { create: mocks.create } }));
const user = {
  id: "test-user",
  email: "test@example.invalid",
  name: "Test",
  role: "user",
};
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(yes => {
    resolve = yes;
  });
  return { promise, resolve };
}
const ready = () => ({ ok: true, json: async () => ({ status: "ready" }) });
const settle = () => new Promise<void>(resolve => setImmediate(resolve));
beforeEach(() => {
  vi.resetModules();
  vi.stubEnv("VITE_API_URL", "https://accounts.example.test");
  mocks.post.mockReset().mockResolvedValue({ data: { success: true, user } });
  mocks.get.mockReset().mockResolvedValue({ data: { user } });
  mocks.create
    .mockReset()
    .mockReturnValue({ post: mocks.post, get: mocks.get });
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.useRealTimers();
});
it("waits visibly for one read-only request before sending login exactly once", async () => {
  const connection = deferred<ReturnType<typeof ready>>();
  const fetch = vi.fn().mockReturnValue(connection.promise);
  vi.stubGlobal("fetch", fetch);
  const auth = await import("../lib/auth");
  const state = await import("../lib/accountConnection");
  const login = auth.login(user.email, "test-only-password");
  await settle();
  expect(state.accountConnectionStatus()).toBe("connecting");
  expect(mocks.post).not.toHaveBeenCalled();
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(fetch).toHaveBeenCalledWith(
    "https://accounts.example.test/ready",
    expect.objectContaining({ method: "GET", credentials: "omit" })
  );
  connection.resolve(ready());
  expect(await login).toEqual({ success: true, user });
  expect(mocks.post).toHaveBeenCalledTimes(1);
  expect(state.accountConnectionStatus()).toBe("ready");
});
it("does not send credentials when readiness fails", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));
  const { login } = await import("../lib/auth");
  expect(await login(user.email, "test-only-password")).toEqual({
    success: false,
    error: expect.stringContaining("taking longer"),
  });
  expect(mocks.post).not.toHaveBeenCalled();
  expect(fetch).toHaveBeenCalledTimes(1);
});
it("never retries a mutation after an unknown network outcome", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(ready()));
  mocks.post.mockRejectedValue(new Error("connection lost after request"));
  const { login } = await import("../lib/auth");
  expect((await login(user.email, "test-only-password")).success).toBe(false);
  expect(mocks.post).toHaveBeenCalledTimes(1);
});
it("coalesces readiness and cancels only the abandoned account read", async () => {
  const connection = deferred<ReturnType<typeof ready>>();
  vi.stubGlobal("fetch", vi.fn().mockReturnValue(connection.promise));
  const { restoreCurrentUser, login } = await import("../lib/auth");
  const controller = new AbortController();
  const restore = restoreCurrentUser(controller.signal);
  const failure = expect(restore).rejects.toMatchObject({ name: "AbortError" });
  const signingIn = login(user.email, "test-only-password");
  await settle();
  controller.abort();
  await failure;
  expect(mocks.get).not.toHaveBeenCalled();
  connection.resolve(ready());
  expect((await signingIn).success).toBe(true);
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(mocks.post).toHaveBeenCalledTimes(1);
});
it("has a bounded connection deadline and never keeps an idle service awake", async () => {
  vi.useFakeTimers();
  const fetch = vi.fn(
    (_url, options) =>
      new Promise((_resolve, reject) =>
        options.signal.addEventListener("abort", () =>
          reject(new Error("aborted"))
        )
      )
  );
  vi.stubGlobal("fetch", fetch);
  const { ensureAccountConnection, accountConnectionStatus } = await import(
    "../lib/accountConnection"
  );
  const pending = ensureAccountConnection("https://accounts.example.test");
  const failure = expect(pending).rejects.toThrow("taking longer");
  await vi.advanceTimersByTimeAsync(120_000);
  await failure;
  expect(accountConnectionStatus()).toBe("error");
  await vi.advanceTimersByTimeAsync(60 * 60_000);
  expect(fetch).toHaveBeenCalledTimes(1);
});
it("checks readiness again after idle before writing progress once", async () => {
  vi.useFakeTimers();
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(ready()));
  const { ensureAccountConnection } = await import("../lib/accountConnection");
  await ensureAccountConnection("https://accounts.example.test");
  await vi.advanceTimersByTimeAsync(16 * 60_000);
  const { saveProgress } = await import("../lib/auth");
  await saveProgress(user.id, false, { completedTutorials: [1] });
  expect(fetch).toHaveBeenCalledTimes(2);
  expect(mocks.post).toHaveBeenCalledTimes(1);
  expect(mocks.post).toHaveBeenCalledWith("/api/progress/test-user", {
    completedTutorials: [1],
    merge: true,
  });
});
