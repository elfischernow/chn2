import type { MouseEvent } from 'react';

import type { Currency } from '@/lib/api/currencies';

/** Pattern of a partially- or fully-typed positive decimal. Allows the
 *  transient states `""`, `"."`, `"0."`, `".5"` etc. without rejecting them
 *  in the controlled-input handler. Rejects scientific notation, locale
 *  separators (commas), spaces, and pasted multi-dot junk like "1.5.5". */
export const DECIMAL_RE = /^\d*\.?\d*$/;

/**
 * Map an amount string to a `data-size` token consumed by CSS to step the
 * font down on long numbers (e.g. converting ETH into KISHU yields 17+
 * digits — the default 32px overflows the field).
 */
export const amountSizeAttr = (raw: string): 'md' | 'sm' | undefined => {
  const len = raw.length;
  if (len > 18) return 'sm';
  if (len > 14) return 'md';
  return undefined;
};

/**
 * Click anywhere on a field's chrome (label gutter, padding, border) to
 * focus the inner amount input — mirrors the affordance professional
 * calculators have. Skips when the click landed on an actual interactive
 * child (picker pill, fees pill, the input itself) so we don't fight
 * their own click handlers.
 */
export const focusFieldInput = (
  e: MouseEvent<HTMLDivElement>,
  input: HTMLInputElement | null,
): void => {
  const target = e.target as HTMLElement;
  if (target.closest('button, input, a, [role="dialog"], [role="tooltip"], .cur, .fees-pill')) {
    return;
  }
  input?.focus();
};

/**
 * Resolve the "open the calculator with N pre-filled" amount for a given
 * currency. Mirrors the legacy `defaultAmountSelector`: admin-set
 * `manualDefaultValue` wins, then catalog `defaultValue`, otherwise null
 * (callers fall back to a hardcoded mode-level default like 0.1 BTC).
 *
 * Numbers come back as numbers — the FROM field renders strings, so format
 * once at the call site (`formatDefaultSeed`) instead of stringifying here.
 */
export const currencyDefaultAmount = (c: Currency | undefined): number | null => {
  if (!c) return null;
  return c.manualDefaultValue ?? c.defaultValue ?? null;
};

/**
 * Stringify a default amount for use as the seed value in the FROM input.
 * Plain decimal, no thousands grouping — the input's DECIMAL_RE rejects
 * the thin-space separator that `formatAmount` injects, and the URL-hash
 * round-trip can't survive it either. Trailing zeros from `toFixed` are
 * stripped so 0.1 stays "0.1" and not "0.10000000".
 */
export const formatDefaultSeed = (n: number): string => {
  if (!Number.isFinite(n) || n <= 0) return '';
  // Round to 8 decimals — covers BTC's smallest unit and dodges float
  // drift like 0.30000000000000004 from `manualDefaultValue: 0.3`.
  const rounded = Number(n.toFixed(8));
  return rounded.toString();
};

/**
 * Compare a string-from-the-input against a numeric default, tolerating
 * trailing-zero / format mismatches (`"0.1"` vs `0.10000000`). Returns
 * true when the input *looks like* the resolved default — used to decide
 * whether to overwrite the FROM amount on currency switch and whether to
 * emit `?amount=` into the URL hash.
 */
export const amountMatchesDefault = (raw: string, def: number | null): boolean => {
  if (def == null || raw === '') return false;
  const n = Number(raw);
  if (!Number.isFinite(n)) return false;
  // Direct equality first (cheap), then a tiny epsilon for the
  // 0.1+0.2-style float drift if the catalog ever ships such values.
  return n === def || Math.abs(n - def) < 1e-9;
};
