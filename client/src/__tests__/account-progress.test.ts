import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { User } from "../lib/auth";

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
  create: vi.fn(),
}));
vi.mock("axios", () => ({ default: { create: mocks.create } }));

const alice: User = {
  id: "alice",
  email: "alice@example.test",
  name: "Alice",
  role: "user",
};
const bob: User = {
  id: "bob",
  email: "bob@example.test",
  name: "Bob",
  role: "user",
};
const reply = (completedTutorials: number[]) => ({
  data: { completedTutorials },
});
const acknowledgement = { data: { success: true } };

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

const settle = () => new Promise<void>(resolve => setImmediate(resolve));
const posts = (url: string) =>
  mocks.post.mock.calls.filter(([path]) => path === url);
const gets = (url: string) =>
  mocks.get.mock.calls.filter(([path]) => path === url);
const coordinators: Array<{ stop: () => void }> = [];

async function create(user: User | null = alice) {
  const auth = await import("../lib/auth");
  auth.rememberUser(user);
  const { createAccountProgress } = await import("../lib/accountProgress");
  const store = createAccountProgress();
  coordinators.push(store);
  return { store, auth };
}

beforeEach(() => {
  vi.resetModules();
  vi.stubEnv("VITE_API_URL", "https://accounts.example.test");
  mocks.create
    .mockReset()
    .mockReturnValue({ get: mocks.get, post: mocks.post });
  mocks.get.mockReset().mockImplementation(async (path: string) => {
    if (path === "/api/me") return { data: { user: alice } };
    if (path === "/api/progress/alice") return reply([1]);
    if (path === "/api/progress/bob") return reply([8]);
    throw new Error(`Unexpected GET ${path}`);
  });
  mocks.post
    .mockReset()
    .mockImplementation(async (path: string, body?: { email?: string }) => {
      if (path === "/api/login")
        return {
          data: {
            success: true,
            user: body?.email === bob.email ? bob : alice,
          },
        };
      if (path === "/api/logout") return { status: 204 };
      return acknowledgement;
    });
});

afterEach(() => {
  coordinators.splice(0).forEach(store => store.stop());
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("account progress recovery", () => {
  it("retains completion intent during a failed read and never posts an empty replacement", async () => {
    const read = deferred<ReturnType<typeof reply>>();
    mocks.get.mockImplementation((path: string) =>
      path === "/api/me"
        ? Promise.resolve({ data: { user: alice } })
        : read.promise
    );
    const { store, auth } = await create();
    auth.saveLocalProgress("learning-hub-progress", {
      completedTutorials: [99],
    });
    const initial = store.start();
    await settle();
    store.markAsCompleted(4);
    expect(store.getSnapshot().progressStatus).toBe("loading");
    expect(store.getSnapshot().progress.completedTutorials).toEqual([4]);
    expect(posts("/api/progress/alice")).toHaveLength(0);
    read.reject(new Error("Read timed out"));
    await initial;
    expect(store.getSnapshot().progressStatus).toBe("error");
    expect(store.getSnapshot().progressError).toMatch(/load/);
    expect(auth.readPendingProgress(alice.id).completedTutorials).toEqual([4]);
    expect(posts("/api/progress/alice")).toHaveLength(0);

    mocks.get.mockResolvedValue(reply([1, 2]));
    await store.retryProgress();
    expect(posts("/api/progress/alice")).toEqual([
      ["/api/progress/alice", { completedTutorials: [1, 2, 4], merge: true }],
    ]);
    expect(store.getSnapshot().progress.completedTutorials).toEqual([1, 2, 4]);
    expect(store.getSnapshot().pendingCount).toBe(0);
    expect(auth.readPendingProgress(alice.id).completedTutorials).toEqual([]);
    expect(
      auth.readProgress("learning-hub-progress").completedTutorials
    ).toEqual([99]);
  });

  it("merges fresh server state on explicit retry and retains later intent after an ambiguous write", async () => {
    const write = deferred<typeof acknowledgement>();
    const { store, auth } = await create();
    await store.start();
    mocks.post.mockImplementation((path: string) =>
      path === "/api/progress/alice"
        ? write.promise
        : Promise.resolve(acknowledgement)
    );
    store.markAsCompleted(2);
    store.markAsCompleted(3);
    expect(posts("/api/progress/alice")).toHaveLength(1);
    expect(auth.readPendingProgress(alice.id).completedTutorials).toEqual([
      2, 3,
    ]);
    write.reject(new Error("Acknowledgement lost"));
    await settle();
    store.markAsCompleted(4);
    await settle();
    expect(posts("/api/progress/alice")).toHaveLength(1);
    expect(store.getSnapshot().progressError).toMatch(/confirm/);
    expect(store.getSnapshot().progress.completedTutorials).toEqual([
      1, 2, 3, 4,
    ]);

    // The first write may already have applied; another acknowledged completion
    // may also be present. Retry must read before sending the remaining intent.
    mocks.get.mockResolvedValue(reply([1, 2, 7]));
    mocks.post.mockResolvedValue(acknowledgement);
    await store.retryProgress();
    expect(posts("/api/progress/alice").at(-1)?.[1]).toEqual({
      completedTutorials: [1, 2, 7, 3, 4],
      merge: true,
    });
    expect(posts("/api/progress/alice")).toHaveLength(2);
    expect(store.getSnapshot().pendingCount).toBe(0);
    expect(store.getSnapshot().progressError).toBeNull();
  });

  it("serializes successful writes and includes completions added while the first write is pending", async () => {
    const first = deferred<typeof acknowledgement>();
    const second = deferred<typeof acknowledgement>();
    const { store } = await create();
    await store.start();
    mocks.post
      .mockImplementationOnce(() => first.promise)
      .mockImplementationOnce(() => second.promise);
    store.markAsCompleted(2);
    store.markAsCompleted(3);
    store.markAsCompleted(3);
    expect(posts("/api/progress/alice")).toHaveLength(1);
    expect(posts("/api/progress/alice")[0][1]).toEqual({
      completedTutorials: [1, 2],
      merge: true,
    });
    first.resolve(acknowledgement);
    await settle();
    expect(posts("/api/progress/alice")).toHaveLength(2);
    expect(posts("/api/progress/alice")[1][1]).toEqual({
      completedTutorials: [1, 2, 3],
      merge: true,
    });
    second.resolve(acknowledgement);
    await settle();
    expect(store.getSnapshot()).toMatchObject({
      saving: false,
      pendingCount: 0,
    });
  });

  it("uses authoritative merged progress before saving completions added during the request", async () => {
    const first = deferred<{
      data: { success: boolean; progress: { completedTutorials: number[] } };
    }>();
    const second = deferred<typeof acknowledgement>();
    const { store, auth } = await create();
    await store.start();
    mocks.post
      .mockReturnValueOnce(first.promise)
      .mockReturnValueOnce(second.promise);
    store.markAsCompleted(2);
    store.markAsCompleted(3);
    expect(posts("/api/progress/alice")).toHaveLength(1);

    // Another device completed 7 while this request was pending.
    first.resolve({
      data: { success: true, progress: { completedTutorials: [1, 2, 7] } },
    });
    await settle();
    expect(posts("/api/progress/alice")[1][1]).toEqual({
      completedTutorials: [1, 2, 7, 3],
      merge: true,
    });
    expect(auth.readPendingProgress(alice.id).completedTutorials).toEqual([3]);
    second.resolve(acknowledgement);
    await settle();
    expect(store.getSnapshot().progress.completedTutorials).toEqual([
      1, 2, 7, 3,
    ]);
    expect(store.getSnapshot().pendingCount).toBe(0);
  });

  it.each([
    null,
    { completedTutorials: "invalid" },
    { completedTutorials: [1, "2"] },
    { completedTutorials: [1] },
  ])(
    "retains intent without retrying a malformed or incomplete acknowledgement: %j",
    async progress => {
      const { store, auth } = await create();
      await store.start();
      mocks.post.mockResolvedValueOnce({ data: { success: true, progress } });
      store.markAsCompleted(2);
      await settle();
      store.markAsCompleted(3);
      await settle();
      expect(posts("/api/progress/alice")).toHaveLength(1);
      expect(auth.readPendingProgress(alice.id).completedTutorials).toEqual([
        2, 3,
      ]);
      expect(store.getSnapshot()).toMatchObject({
        progress: { completedTutorials: [1, 2, 3] },
        progressStatus: "error",
        pendingCount: 2,
        saving: false,
      });
      expect(store.getSnapshot().progressError).toMatch(/couldn't confirm/);
    }
  );

  it("does not automatically replay a pending journal from an earlier page", async () => {
    const { store, auth } = await create();
    auth.savePendingProgress(alice.id, { completedTutorials: [2] });
    // Use a new coordinator, as after a page reload, without losing the journal.
    store.stop();
    const { createAccountProgress } = await import("../lib/accountProgress");
    const reopened = createAccountProgress();
    coordinators.push(reopened);
    await reopened.start();
    expect(reopened.getSnapshot().pendingCount).toBe(1);
    expect(posts("/api/progress/alice")).toHaveLength(0);
    await reopened.retryProgress();
    expect(posts("/api/progress/alice")).toHaveLength(1);
    expect(reopened.getSnapshot().pendingCount).toBe(0);
  });

  it("deduplicates account/progress reads and repeated retry clicks", async () => {
    const read = deferred<ReturnType<typeof reply>>();
    mocks.get.mockImplementation((path: string) =>
      path === "/api/me"
        ? Promise.resolve({ data: { user: alice } })
        : read.promise
    );
    const { store } = await create();
    const initial = store.start();
    const secondStart = store.start();
    await settle();
    const retryOne = store.retryProgress();
    const retryTwo = store.retryProgress();
    expect(gets("/api/me")).toHaveLength(1);
    expect(gets("/api/progress/alice")).toHaveLength(1);
    read.resolve(reply([1]));
    await Promise.all([initial, secondStart, retryOne, retryTwo]);
    expect(store.getSnapshot().progress.completedTutorials).toEqual([1]);
  });

  it.each([
    {},
    { completedTutorials: "invalid" },
    { completedTutorials: [1, -1] },
    { completedTutorials: [1, "2"] },
  ])(
    "rejects malformed server progress instead of treating it as empty: %j",
    async value => {
      mocks.get.mockImplementation(async (path: string) =>
        path === "/api/me" ? { data: { user: alice } } : { data: value }
      );
      const { store } = await create();
      await store.start();
      store.markAsCompleted(2);
      expect(store.getSnapshot().progressStatus).toBe("error");
      expect(store.getSnapshot().pendingCount).toBe(1);
      expect(posts("/api/progress/alice")).toHaveLength(0);
    }
  );

  it("allows a confirmed empty server history to receive the first completion", async () => {
    mocks.get.mockImplementation(async (path: string) =>
      path === "/api/me" ? { data: { user: alice } } : reply([])
    );
    const { store } = await create();
    await store.start();
    store.markAsCompleted(2);
    await settle();
    expect(posts("/api/progress/alice")[0][1]).toEqual({
      completedTutorials: [2],
      merge: true,
    });
    expect(store.getSnapshot().pendingCount).toBe(0);
  });
});

describe("account transitions", () => {
  it("recovers an expired progress session through account verification without discarding pending completions", async () => {
    const { store, auth } = await create();
    await store.start();
    mocks.post.mockRejectedValueOnce({ response: { status: 401 } });
    store.markAsCompleted(2);
    await settle();
    expect(store.getSnapshot().accountError).toMatch(/session needs checking/);
    store.markAsCompleted(3);
    const readCount = gets("/api/progress/alice").length;
    await store.retryProgress();
    expect(gets("/api/progress/alice")).toHaveLength(readCount);
    expect(posts("/api/progress/alice")).toHaveLength(1);

    mocks.get.mockRejectedValueOnce({ response: { status: 401 } });
    await store.retryAccount();
    expect(store.getSnapshot().user).toBeNull();
    expect(auth.getCurrentUser()).toBeNull();
    expect(auth.readPendingProgress(alice.id).completedTutorials).toEqual([
      2, 3,
    ]);

    await store.login(alice.email, "test-password");
    await settle();
    expect(posts("/api/progress/alice")).toHaveLength(1);
    await store.retryProgress();
    expect(posts("/api/progress/alice").at(-1)?.[1]).toEqual({
      completedTutorials: [1, 2, 3],
      merge: true,
    });
    expect(store.getSnapshot().pendingCount).toBe(0);
  });

  it("rechecks ownership after a 403 read and never applies the previous account's pending IDs to the confirmed owner", async () => {
    mocks.get.mockImplementation(async (path: string) => {
      if (path === "/api/me") return { data: { user: alice } };
      throw { response: { status: 403 } };
    });
    const { store, auth } = await create();
    await store.start();
    store.markAsCompleted(2);
    expect(store.getSnapshot().accountError).toMatch(/session needs checking/);
    mocks.get.mockImplementation(async (path: string) =>
      path === "/api/me" ? { data: { user: bob } } : reply([8])
    );
    await store.retryAccount();
    expect(store.getSnapshot()).toMatchObject({
      user: bob,
      progress: { completedTutorials: [8] },
      pendingCount: 0,
    });
    expect(auth.readPendingProgress(alice.id).completedTutorials).toEqual([2]);
    expect(auth.getCurrentUser()).toEqual(bob);
    expect(mocks.post).not.toHaveBeenCalled();
  });

  it("preserves a cached identity after a transient account check but requires ownership verification before writing", async () => {
    mocks.get.mockRejectedValueOnce(new Error("Offline"));
    const { store, auth } = await create();
    await store.start();
    expect(store.getSnapshot()).toMatchObject({ user: alice, loading: false });
    expect(store.getSnapshot().accountError).toMatch(/check your account/);
    expect(auth.getCurrentUser()).toEqual(alice);
    store.markAsCompleted(2);
    expect(posts("/api/progress/alice")).toHaveLength(0);
    await store.retryAccount();
    expect(posts("/api/progress/alice")[0][1]).toEqual({
      completedTutorials: [1, 2],
      merge: true,
    });
  });

  it("treats a confirmed 401 as signed out without copying account intent into guest progress", async () => {
    const { store, auth } = await create();
    auth.saveLocalProgress("learning-hub-progress", {
      completedTutorials: [99],
    });
    store.markAsCompleted(2);
    mocks.get.mockRejectedValueOnce({ response: { status: 401 } });
    await store.start();
    expect(store.getSnapshot()).toMatchObject({
      user: null,
      progress: { completedTutorials: [99] },
    });
    expect(auth.getCurrentUser()).toBeNull();
    expect(auth.readPendingProgress(alice.id).completedTutorials).toEqual([2]);
    expect(mocks.post).not.toHaveBeenCalled();
  });

  it("ignores an older account restoration after a newer login, including cache writes", async () => {
    const restore = deferred<{ data: { user: User } }>();
    mocks.get.mockImplementation((path: string) =>
      path === "/api/me" ? restore.promise : Promise.resolve(reply([8]))
    );
    const { store, auth } = await create(null);
    const initial = store.start();
    await settle();
    await store.login(bob.email, "test-password");
    await settle();
    restore.resolve({ data: { user: alice } });
    await initial;
    expect(store.getSnapshot()).toMatchObject({
      user: bob,
      progress: { completedTutorials: [8] },
    });
    expect(auth.getCurrentUser()).toEqual(bob);
    expect(gets("/api/me")[0][1].signal.aborted).toBe(true);
  });

  it("keeps delayed progress reads and write failures out of the next account", async () => {
    const write = deferred<typeof acknowledgement>();
    const { store, auth } = await create();
    await store.start();
    mocks.post.mockImplementation((path: string, body?: { email?: string }) => {
      if (path === "/api/progress/alice") return write.promise;
      return Promise.resolve({
        data: { success: true, user: body?.email === bob.email ? bob : alice },
      });
    });
    store.markAsCompleted(2);
    await store.login(bob.email, "test-password");
    await settle();
    write.reject(new Error("Old account write failed"));
    await settle();
    expect(store.getSnapshot()).toMatchObject({
      user: bob,
      progress: { completedTutorials: [8] },
      progressError: null,
      pendingCount: 0,
    });
    expect(auth.getCurrentUser()).toEqual(bob);
    expect(auth.readPendingProgress(alice.id).completedTutorials).toEqual([2]);

    const oldRead = deferred<ReturnType<typeof reply>>();
    mocks.get.mockImplementation((path: string) =>
      path === "/api/progress/alice"
        ? oldRead.promise
        : Promise.resolve(reply([8]))
    );
    await store.login(alice.email, "test-password");
    await settle();
    await store.login(bob.email, "test-password");
    await settle();
    oldRead.resolve(reply([1, 2]));
    await settle();
    expect(store.getSnapshot().user).toEqual(bob);
    expect(store.getSnapshot().progress.completedTutorials).toEqual([8]);
    expect(auth.readPendingProgress(alice.id).completedTutorials).toEqual([2]);
  });

  it("waits for logout before issuing a later login and never lets the logout clear the newer cache", async () => {
    const signingOut = deferred<{ status: number }>();
    const { store, auth } = await create();
    await store.start();
    mocks.post.mockImplementation((path: string) =>
      path === "/api/logout"
        ? signingOut.promise
        : Promise.resolve({ data: { success: true, user: bob } })
    );
    const logout = store.logout();
    const login = store.login(bob.email, "test-password");
    await settle();
    expect(posts("/api/logout")).toHaveLength(1);
    expect(posts("/api/login")).toHaveLength(0);
    expect(auth.getCurrentUser()).toBeNull();
    signingOut.resolve({ status: 204 });
    await Promise.all([logout, login]);
    await settle();
    expect(posts("/api/login")).toHaveLength(1);
    expect(store.getSnapshot().user).toEqual(bob);
    expect(auth.getCurrentUser()).toEqual(bob);
  });

  it("cannot restore a stale login into the cache after a newer logout intent", async () => {
    const signingIn = deferred<{ data: { success: boolean; user: User } }>();
    const { store, auth } = await create(null);
    mocks.post.mockImplementation((path: string) =>
      path === "/api/login"
        ? signingIn.promise
        : Promise.resolve({ status: 204 })
    );
    const login = store.login(alice.email, "test-password");
    await settle();
    const logout = store.logout();
    signingIn.resolve({ data: { success: true, user: alice } });
    expect((await login).success).toBe(false);
    await logout;
    expect(auth.getCurrentUser()).toBeNull();
    expect(store.getSnapshot().user).toBeNull();
    expect(posts("/api/logout")).toHaveLength(1);
  });

  it("exposes an uncertain logout without automatically repeating the mutation", async () => {
    const { store, auth } = await create();
    await store.start();
    mocks.post.mockRejectedValueOnce(new Error("Sign-out timed out"));
    await store.logout();
    await settle();
    expect(store.getSnapshot()).toMatchObject({
      user: null,
      loading: false,
      accountRetryLabel: "Retry sign out",
    });
    expect(store.getSnapshot().accountError).toMatch(/not be confirmed/);
    expect(auth.getCurrentUser()).toBeNull();
    expect(posts("/api/logout")).toHaveLength(1);
    await store.retryAccount();
    expect(posts("/api/logout")).toHaveLength(2);
    expect(store.getSnapshot().accountError).toBeNull();
  });

  it("waits for an earlier write before reading an account that has been revisited", async () => {
    const write = deferred<typeof acknowledgement>();
    const { store } = await create();
    await store.start();
    mocks.post.mockImplementation((path: string, body?: { email?: string }) =>
      path === "/api/progress/alice"
        ? write.promise
        : Promise.resolve({
            data: {
              success: true,
              user: body?.email === bob.email ? bob : alice,
            },
          })
    );
    store.markAsCompleted(2);
    await store.login(bob.email, "test-password");
    await store.login(alice.email, "test-password");
    await settle();
    store.markAsCompleted(3);
    expect(gets("/api/progress/alice")).toHaveLength(1);
    expect(posts("/api/progress/alice")).toHaveLength(1);
    mocks.get.mockResolvedValue(reply([1, 2]));
    write.resolve(acknowledgement);
    await settle();
    expect(gets("/api/progress/alice")).toHaveLength(2);
    expect(store.getSnapshot().progress.completedTutorials).toEqual([1, 2, 3]);
    expect(store.getSnapshot().pendingCount).toBe(1);
    expect(posts("/api/progress/alice")).toHaveLength(1);
    mocks.post.mockResolvedValue(acknowledgement);
    await store.retryProgress();
    expect(posts("/api/progress/alice").at(-1)?.[1]).toEqual({
      completedTutorials: [1, 2, 3],
      merge: true,
    });
  });

  it("ignores responses after provider disposal and preserves unsaved intent", async () => {
    const read = deferred<ReturnType<typeof reply>>();
    mocks.get.mockImplementation((path: string) =>
      path === "/api/me"
        ? Promise.resolve({ data: { user: alice } })
        : read.promise
    );
    const { store, auth } = await create();
    const initial = store.start();
    await settle();
    store.markAsCompleted(2);
    const listener = vi.fn();
    store.subscribe(listener);
    store.stop();
    read.resolve(reply([1, 2]));
    await initial;
    expect(listener).not.toHaveBeenCalled();
    expect(auth.readPendingProgress(alice.id).completedTutorials).toEqual([2]);
    expect(posts("/api/progress/alice")).toHaveLength(0);
    expect((await store.login(bob.email, "test-password")).success).toBe(false);
    expect(mocks.post).not.toHaveBeenCalled();
  });
});

describe("local learning and retry presentation", () => {
  it("retains an existing demo baseline when a completion arrives before restoration finishes", async () => {
    vi.stubEnv("VITE_API_URL", "");
    const auth = await import("../lib/auth");
    auth.saveLocalProgress("progress_4", { completedTutorials: [3] });
    const { store } = await create({
      id: "4",
      email: "demo@sap.com",
      name: "Demo",
      role: "user",
      isDemo: true,
    });
    store.markAsCompleted(4);
    await store.start();
    expect(store.getSnapshot().progress.completedTutorials).toEqual([3, 4]);
    expect(auth.readProgress("progress_4").completedTutorials).toEqual([3, 4]);
    expect(mocks.post).not.toHaveBeenCalled();
  });

  it("keeps guest and demo progress independent without account requests", async () => {
    vi.stubEnv("VITE_API_URL", "");
    const { store, auth } = await create(null);
    auth.saveLocalProgress("progress_4", { completedTutorials: [3] });
    await store.start();
    store.markAsCompleted(1);
    await store.login("demo@sap.com", "demo123");
    store.markAsCompleted(4);
    expect(auth.readProgress("progress_4").completedTutorials).toEqual([3, 4]);
    await store.logout();
    expect(store.getSnapshot().progress.completedTutorials).toEqual([1]);
    expect(mocks.get).not.toHaveBeenCalled();
    expect(mocks.post).not.toHaveBeenCalled();
  });

  it("keeps intent in memory when storage is blocked and shows honest unsaved/retry UI", async () => {
    const blockedStorage = {
      getItem: vi.fn(() => {
        throw new Error("Storage blocked");
      }),
      setItem: vi.fn(() => {
        throw new Error("Storage full");
      }),
      removeItem: vi.fn(),
    };
    vi.stubGlobal("window", {
      localStorage: blockedStorage,
      sessionStorage: blockedStorage,
    });
    vi.stubGlobal("localStorage", blockedStorage);
    const { store, auth } = await create();
    await store.start();
    mocks.post.mockRejectedValueOnce(new Error("Offline"));
    store.markAsCompleted(2);
    await settle();
    expect(auth.readPendingProgress(alice.id).completedTutorials).toEqual([2]);
    expect(store.getSnapshot().pendingCount).toBe(1);
    // Render only the status component; no DOM dependency or browser is required.
    vi.unstubAllGlobals();
    const { createElement } = await import("react");
    const { renderToStaticMarkup } = await import("react-dom/server");
    const { AccountProgressNotice } = await import("../components/Layout");
    const html = renderToStaticMarkup(
      createElement(AccountProgressNotice, {
        ...store.getSnapshot(),
        retryAccount: store.retryAccount,
        retryProgress: store.retryProgress,
      })
    );
    expect(html).toContain('role="alert"');
    expect(html).toContain("Keep this page open until your progress syncs.");
    expect(html).toContain("Retry progress sync");
    expect(html).not.toContain("saved on this device");
  });
});
