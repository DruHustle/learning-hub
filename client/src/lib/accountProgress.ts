import * as auth from "./auth";
import type { Progress, User } from "./auth";

export interface AccountProgressState {
  user: User | null;
  loading: boolean;
  accountError: string | null;
  accountRetryLabel: string;
  progress: Progress;
  progressStatus: "loading" | "ready" | "error";
  progressError: string | null;
  saving: boolean;
  pendingCount: number;
}

const GUEST_KEY = "learning-hub-progress";
const emptyProgress = (): Progress => ({ completedTutorials: [] });
const combine = (...lists: number[][]): Progress => ({
  completedTutorials: [...new Set(lists.flat())],
});

/** One coordinator per provider; snapshots change only when state changes. */
export function createAccountProgress() {
  const listeners = new Set<() => void>();
  const pending = new Map<string, { ids: number[]; needsRetry: boolean }>();
  const writes = new Map<
    string,
    { generation: number; requestId: symbol; promise: Promise<void> }
  >();
  let generation = 0;
  let active = true;
  let started = false;
  let verified = false;
  let baselineKnown = false;
  let accountRead:
    | { generation: number; abort: AbortController; promise: Promise<void> }
    | undefined;
  let progressRead:
    | { generation: number; abort: AbortController; promise: Promise<void> }
    | undefined;
  let accountMutation: Promise<unknown> | undefined;
  let retryLogout = false;

  function journal(user: User) {
    let entry = pending.get(user.id);
    if (!entry) {
      const ids = auth.readPendingProgress(user.id).completedTutorials;
      // A previous page may have closed during a POST. Read recovery is safe,
      // but another write requires an explicit retry after that ambiguity.
      entry = { ids: [...new Set(ids)], needsRetry: ids.length > 0 };
      pending.set(user.id, entry);
    }
    return entry;
  }

  const cached = auth.getCurrentUser();
  let baseline =
    cached && !cached.isDemo
      ? emptyProgress()
      : auth.readProgress(cached ? `progress_${cached.id}` : GUEST_KEY);
  let state: AccountProgressState = {
    user: cached,
    loading: true,
    accountError: null,
    accountRetryLabel: "Retry account check",
    progress: combine(
      baseline.completedTutorials,
      cached && !cached.isDemo ? journal(cached).ids : []
    ),
    progressStatus: cached ? "loading" : "ready",
    progressError: null,
    saving: false,
    pendingCount: cached && !cached.isDemo ? journal(cached).ids.length : 0,
  };

  function publish(patch: Partial<AccountProgressState>) {
    const next = { ...state, ...patch };
    const ids = next.user && !next.user.isDemo ? journal(next.user).ids : [];
    state = {
      ...next,
      progress: combine(baseline.completedTutorials, ids),
      pendingCount: ids.length,
    };
    listeners.forEach(listener => listener());
  }

  const current = (token: number) => active && token === generation;
  const owns = (token: number, user: User) =>
    current(token) && state.user?.id === user.id && !state.user.isDemo;

  function invalidate() {
    generation++;
    accountRead?.abort.abort();
    progressRead?.abort.abort();
    accountRead = undefined;
    progressRead = undefined;
    verified = false;
    baselineKnown = false;
    if (state.user && !state.user.isDemo && writes.has(state.user.id)) {
      journal(state.user).needsRetry = true;
    }
    return generation;
  }

  function persist(user: User) {
    auth.savePendingProgress(user.id, {
      completedTutorials: journal(user).ids,
    });
  }

  function requireAccountCheck(error: unknown): boolean {
    if (!auth.isSessionRejection(error)) return false;
    verified = false;
    baselineKnown = false;
    retryLogout = false;
    publish({
      saving: false,
      progressStatus: "error",
      progressError: null,
      accountRetryLabel: "Retry account check",
      accountError:
        "Your account session needs checking before progress can sync.",
    });
    return true;
  }

  function flush(user: User, token: number): Promise<void> {
    const entry = journal(user);
    if (
      !owns(token, user) ||
      !verified ||
      !baselineKnown ||
      progressRead ||
      entry.needsRetry ||
      !entry.ids.length
    ) {
      return Promise.resolve();
    }
    const existing = writes.get(user.id);
    if (existing) return existing.promise;
    const sentIds = [...entry.ids];
    const sent = combine(baseline.completedTutorials, sentIds);
    const requestId = Symbol("progress write");
    publish({ saving: true, progressError: null });
    const request: Promise<void> = (async () => {
      let succeeded = false;
      try {
        await auth.saveProgress(user.id, false, sent);
        if (!owns(token, user)) return;
        baseline = sent;
        // Completions added during this write belong to the next serialized save.
        entry.ids = entry.ids.filter(id => !sentIds.includes(id));
        persist(user);
        publish({ saving: false, progressStatus: "ready" });
        succeeded = true;
      } catch (error) {
        if (!owns(token, user)) return;
        baselineKnown = false;
        entry.needsRetry = true;
        if (requireAccountCheck(error)) return;
        publish({
          saving: false,
          progressStatus: "error",
          progressError:
            "We couldn't confirm the progress save. Your new completions are still waiting to sync.",
        });
      } finally {
        if (writes.get(user.id)?.requestId === requestId)
          writes.delete(user.id);
      }
      // Continue only after acknowledgement, never after an ambiguous failure.
      if (succeeded && owns(token, user) && entry.ids.length)
        await flush(user, token);
    })();
    writes.set(user.id, { generation: token, requestId, promise: request });
    return request;
  }

  function loadProgress(
    user: User,
    token: number,
    explicitRetry = false
  ): Promise<void> {
    if (!owns(token, user) || !verified) return Promise.resolve();
    if (progressRead?.generation === token) return progressRead.promise;
    const abort = new AbortController();
    publish({ progressStatus: "loading", progressError: null });
    const request: Promise<void> = (async () => {
      try {
        // Returning to the same account must not race an older in-flight save.
        await writes.get(user.id)?.promise;
        if (!owns(token, user)) return;
        const saved = await auth.getProgress(user.id, false, abort.signal);
        if (!owns(token, user)) return;
        baseline = saved;
        baselineKnown = true;
        const entry = journal(user);
        entry.ids = entry.ids.filter(
          id => !saved.completedTutorials.includes(id)
        );
        persist(user);
        if (explicitRetry || !entry.ids.length) entry.needsRetry = false;
        publish({ progressStatus: "ready", progressError: null });
        if (progressRead?.abort === abort) progressRead = undefined;
        if (!entry.needsRetry) await flush(user, token);
      } catch (error) {
        if (!owns(token, user)) return;
        baselineKnown = false;
        if (requireAccountCheck(error)) return;
        publish({
          progressStatus: "error",
          progressError:
            "We couldn't load your saved progress. New completions will wait until you retry.",
        });
      } finally {
        if (progressRead?.abort === abort) progressRead = undefined;
      }
    })();
    progressRead = { generation: token, abort, promise: request };
    return request;
  }

  function acceptAccount(user: User | null) {
    verified = true;
    baselineKnown = !user || !!user.isDemo;
    baseline = baselineKnown
      ? auth.readProgress(user ? `progress_${user.id}` : GUEST_KEY)
      : emptyProgress();
    retryLogout = false;
    auth.rememberUser(user);
    publish({
      user,
      loading: false,
      accountError: null,
      accountRetryLabel: "Retry account check",
      progressStatus: baselineKnown ? "ready" : "loading",
      progressError: null,
      saving: false,
    });
  }

  function restore(): Promise<void> {
    if (accountRead?.generation === generation) return accountRead.promise;
    const token = invalidate();
    const abort = new AbortController();
    retryLogout = false;
    publish({
      loading: true,
      accountError: null,
      accountRetryLabel: "Retry account check",
      saving: false,
    });
    const request: Promise<void> = (async () => {
      try {
        const user = await auth.restoreCurrentUser(abort.signal);
        if (!current(token)) return;
        acceptAccount(user);
        if (user && !user.isDemo) await loadProgress(user, token);
      } catch {
        if (!current(token)) return;
        publish({
          loading: false,
          progressStatus: state.user && !state.user.isDemo ? "error" : "ready",
          accountError:
            "We couldn't check your account. You can keep learning; account progress will wait until you retry.",
        });
      } finally {
        if (accountRead?.abort === abort) accountRead = undefined;
      }
    })();
    accountRead = { generation: token, abort, promise: request };
    return request;
  }

  async function login(email: string, password: string) {
    if (!active)
      return {
        success: false,
        error: "This account view is no longer active.",
      };
    const token = invalidate();
    publish({ loading: true, accountError: null, saving: false });
    const request = auth.login(email, password);
    accountMutation = request;
    try {
      const result = await request;
      if (!current(token))
        return {
          success: false,
          error: "A newer account action replaced this sign-in.",
        };
      if (result.success && result.user) {
        acceptAccount(result.user);
        if (!result.user.isDemo) void loadProgress(result.user, token);
      } else {
        retryLogout = false;
        publish({
          loading: false,
          accountRetryLabel: "Retry account check",
          accountError:
            "Sign-in was not confirmed. Check your account before syncing progress.",
        });
      }
      return result;
    } finally {
      if (accountMutation === request) accountMutation = undefined;
    }
  }

  async function logout() {
    if (!active) return;
    const token = invalidate();
    // Clear local identity immediately; the awaited request still precedes any
    // subsequent login in auth.ts's cookie-mutation queue.
    auth.rememberUser(null);
    baseline = auth.readProgress(GUEST_KEY);
    publish({
      user: null,
      loading: true,
      accountError: null,
      progressError: null,
      progressStatus: "ready",
      saving: false,
    });
    const request = auth.logout();
    accountMutation = request;
    try {
      await request;
      if (current(token)) acceptAccount(null);
    } catch {
      if (!current(token)) return;
      retryLogout = true;
      publish({
        loading: false,
        accountRetryLabel: "Retry sign out",
        accountError:
          "Sign-out could not be confirmed. Retry sign out when the connection is available.",
      });
    } finally {
      if (accountMutation === request) accountMutation = undefined;
    }
  }

  function markAsCompleted(tutorialId: number) {
    if (
      !active ||
      !Number.isInteger(tutorialId) ||
      tutorialId < 0 ||
      state.progress.completedTutorials.includes(tutorialId)
    )
      return;
    const user = state.user;
    if (!user || user.isDemo) {
      baseline = combine(baseline.completedTutorials, [tutorialId]);
      auth.saveLocalProgress(
        user ? `progress_${user.id}` : GUEST_KEY,
        baseline
      );
      publish({});
      return;
    }
    journal(user).ids.push(tutorialId);
    persist(user);
    publish({});
    void flush(user, generation);
  }

  return {
    getSnapshot: () => state,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    start: () => {
      active = true;
      if (started) return accountRead?.promise ?? Promise.resolve();
      started = true;
      return restore();
    },
    stop: () => {
      active = false;
      started = false;
      invalidate();
    },
    login,
    logout,
    retryAccount: async () => {
      if (!active) return;
      if (accountMutation) {
        await accountMutation.catch(() => undefined);
        return;
      }
      await (retryLogout ? logout() : restore());
    },
    retryProgress: async () => {
      if (!active || !verified || !state.user || state.user.isDemo) return;
      const writing = writes.get(state.user.id);
      if (writing?.generation === generation) {
        await writing.promise;
        return;
      }
      await loadProgress(state.user, generation, true);
    },
    markAsCompleted,
    register: async (email: string, password: string, name: string) => {
      if (!active)
        return {
          success: false,
          error: "This account view is no longer active.",
        };
      const token = generation;
      const result = await auth.register(email, password, name);
      return current(token)
        ? result
        : {
            success: false,
            error:
              "Account state changed. Sign in separately if registration completed.",
          };
    },
    requestPasswordReset: async (email: string) =>
      auth.requestPasswordReset(email),
    resetPassword: async (token: string, password: string) =>
      auth.resetPassword(token, password),
    updateProfile: async (updates: Partial<Pick<User, "name" | "avatar">>) => {
      if (!active || !state.user)
        return { success: false, error: "Not authenticated" };
      const result = auth.updateProfile(state.user.id, updates);
      if (result.success && result.user) {
        auth.rememberUser(result.user);
        publish({ user: result.user });
      }
      return result;
    },
    changePassword: async (currentPassword: string, password: string) =>
      state.user
        ? auth.changePassword(state.user.id, currentPassword, password)
        : { success: false, error: "Not authenticated" },
  };
}
