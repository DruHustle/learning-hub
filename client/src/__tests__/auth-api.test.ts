import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ post: vi.fn(), create: vi.fn() }));
vi.mock('axios', () => ({ default: { create: mocks.create } }));

describe('account API hosting', () => {
  beforeEach(() => {
    vi.resetModules();
    mocks.post.mockReset();
    mocks.create.mockReset().mockReturnValue({ post: mocks.post });
    vi.stubEnv('VITE_API_URL', undefined);
  });
  afterEach(() => vi.unstubAllEnvs());

  it('uses Oracle for production sign-in and retains credentialed requests', async () => {
    vi.stubEnv('PROD', true);
    const user = { id: 'real-account', email: 'person@example.test', name: 'Person', role: 'user' };
    mocks.post.mockResolvedValue({ data: { success: true, user } });
    const { login } = await import('../lib/auth');
    expect(await login(user.email, 'test-only-password')).toEqual({ success: true, user });
    expect(mocks.create).toHaveBeenCalledWith({
      baseURL: 'https://learning-api.152-70-22-84.sslip.io',
      timeout: 10_000, withCredentials: true,
    });
    expect(mocks.post).toHaveBeenCalledWith('/api/login', { email: user.email, password: 'test-only-password' });
  });

  it('preserves explicit API overrides', async () => {
    vi.stubEnv('PROD', true);
    vi.stubEnv('VITE_API_URL', 'https://custom.example.test/');
    await import('../lib/auth');
    expect(mocks.create).toHaveBeenCalledWith(expect.objectContaining({ baseURL: 'https://custom.example.test' }));
  });

  it.each([false, true])('keeps demo-only mode without sending credentials when explicitly disabled (production=%s)', async production => {
    vi.stubEnv('PROD', production);
    vi.stubEnv('VITE_API_URL', '');
    const { login } = await import('../lib/auth');
    expect((await login('person@example.test', 'test-only-password')).success).toBe(false);
    expect((await login('demo@sap.com', 'demo123')).success).toBe(true);
    expect(mocks.post).not.toHaveBeenCalled();
  });

  it('keeps unconfigured development local', async () => {
    vi.stubEnv('PROD', false);
    const { login } = await import('../lib/auth');
    expect((await login('person@example.test', 'test-only-password')).success).toBe(false);
    expect(mocks.post).not.toHaveBeenCalled();
  });
});
