import assert from 'node:assert/strict';
import { describe, it, beforeEach } from 'node:test';

import { POST_AUTH_RELOAD, resolvePostAuthTarget } from '../post-auth';

describe('resolvePostAuthTarget — server side', () => {
  it('default → /pro/balance', () => {
    assert.equal(resolvePostAuthTarget(), '/pro/balance');
  });

  it('honours allow-listed ?next', () => {
    const sp = new URLSearchParams({ next: '/pro/cashback' });
    assert.equal(resolvePostAuthTarget({ searchParams: sp }), '/pro/cashback');
  });

  it('rejects non-allow-listed ?next, falls back to /pro/balance', () => {
    const sp = new URLSearchParams({ next: '/exchange' });
    assert.equal(resolvePostAuthTarget({ searchParams: sp }), '/pro/balance');
  });

  it('rejects open-redirect ?next=//evil.com', () => {
    const sp = new URLSearchParams({ next: '//evil.com/pro/balance' });
    assert.equal(resolvePostAuthTarget({ searchParams: sp }), '/pro/balance');
  });

  it('rejects ?next=https://evil.com', () => {
    const sp = new URLSearchParams({ next: 'https://evil.com/pro/balance' });
    assert.equal(resolvePostAuthTarget({ searchParams: sp }), '/pro/balance');
  });

  it('locale prefix prepended', () => {
    assert.equal(
      resolvePostAuthTarget({ localePrefix: '/ru' }),
      '/ru/pro/balance',
    );
    const sp = new URLSearchParams({ next: '/pro/cashback' });
    assert.equal(
      resolvePostAuthTarget({ searchParams: sp, localePrefix: '/ru' }),
      '/ru/pro/cashback',
    );
  });

  it('proExchangeMode forwarded only for /pro/exchange target', () => {
    const sp = new URLSearchParams({ next: '/pro/exchange' });
    assert.equal(
      resolvePostAuthTarget({ searchParams: sp, proExchangeMode: true }),
      '/pro/exchange?proExchangeMode=true',
    );
    // Default target /pro/balance — flag must not be appended (E12).
    assert.equal(
      resolvePostAuthTarget({ proExchangeMode: true }),
      '/pro/balance',
    );
  });

  it('crypto-loan returns reload sentinel', () => {
    assert.equal(
      resolvePostAuthTarget({ fromPathname: '/crypto-loan' }),
      POST_AUTH_RELOAD,
    );
  });

  it('accepts /pro/loan/<id> with id', () => {
    const sp = new URLSearchParams({ next: '/pro/loan/abc-123' });
    assert.equal(resolvePostAuthTarget({ searchParams: sp }), '/pro/loan/abc-123');
  });

  it('rejects /pro/loan with no id', () => {
    const sp = new URLSearchParams({ next: '/pro/loan' });
    assert.equal(resolvePostAuthTarget({ searchParams: sp }), '/pro/balance');
  });
});

// ─── Client side resolver ────────────────────────────────────────────────

// Mock minimal window.sessionStorage for node:test. We avoid touching the
// `window` global type (which clashes with @types/react-dom) and instead
// install a per-test `globalThis.sessionStorage` + a thin `window` proxy.
class MockSessionStorage implements Storage {
  private store = new Map<string, string>();
  get length(): number {
    return this.store.size;
  }
  key(i: number): string | null {
    return Array.from(this.store.keys())[i] ?? null;
  }
  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null;
  }
  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
  removeItem(key: string): void {
    this.store.delete(key);
  }
  clear(): void {
    this.store.clear();
  }
}

const installWindow = (): MockSessionStorage => {
  const storage = new MockSessionStorage();
  // The post-auth.client module guards every access with `typeof window` so
  // a partial shim is enough.
  (globalThis as Record<string, unknown>).window = { sessionStorage: storage };
  return storage;
};

let storage: MockSessionStorage;
beforeEach(() => {
  storage = installWindow();
});

describe('resolveClientPostAuthTarget — sessionStorage flags', () => {
  it('clears stuck isOpenFromFiatMode flag after consuming it (E1 fix)', async () => {
    const { resolveClientPostAuthTarget } = await import('../post-auth.client');
    storage.setItem('isOpenFromFiatMode', 'true');
    const result = resolveClientPostAuthTarget();
    assert.equal(result, '/pro/exchange');
    // Atomic: flag must be removed, so a SECOND login routes to default.
    assert.equal(storage.getItem('isOpenFromFiatMode'), null);
  });

  it('default → server target (or /pro/balance)', async () => {
    const { resolveClientPostAuthTarget } = await import('../post-auth.client');
    assert.equal(
      resolveClientPostAuthTarget({ serverTarget: '/pro/balance' }),
      '/pro/balance',
    );
  });

  it('predictions context wins over fiat flag and is consumed', async () => {
    const { resolveClientPostAuthTarget, setPredictionsRedirectContext } =
      await import('../post-auth.client');
    setPredictionsRedirectContext({ eventId: 'E1', optionId: 'O', outcomeIndex: 0 });
    storage.setItem('isOpenFromFiatMode', 'true');
    const result = resolveClientPostAuthTarget();
    assert.match(result as string, /^\/pro\/predictions\?eventId=E1/);
    assert.equal(storage.getItem('predictions-redirect-context'), null);
    assert.equal(storage.getItem('isOpenFromFiatMode'), null);
  });

  it('explicit ?next (via serverTarget) overrides sessionStorage flags', async () => {
    const { resolveClientPostAuthTarget } = await import('../post-auth.client');
    storage.setItem('isOpenFromFiatMode', 'true');
    const result = resolveClientPostAuthTarget({ serverTarget: '/pro/cashback' });
    assert.equal(result, '/pro/cashback');
    // Flag still consumed so next login is clean.
    assert.equal(storage.getItem('isOpenFromFiatMode'), null);
  });

  it('crypto-loan → reload sentinel', async () => {
    const { resolveClientPostAuthTarget, POST_AUTH_RELOAD: reloadToken } =
      await import('../post-auth.client');
    assert.equal(
      resolveClientPostAuthTarget({ fromPathname: '/crypto-loan' }),
      reloadToken,
    );
  });
});
