// Pure validation. Ported from:
//   legacy-projects/changenow-frontend/src/react-ssr/components/authorization/authorization.jsx
//     (handleEmailChange, addPasswordError, handlePasswordChange,
//      handleVerificationCodeChange, checkVerificationCode)
//   legacy-projects/changenow-frontend/src/react-ssr/utils/checking-for-spaces.js
//   legacy-projects/changenow-frontend/src/react-ssr/utils/is-length.js
//   legacy-projects/changenow-frontend/src/react-ssr/helpers/test-password.js
//   legacy-projects/changenow-frontend/src/react-ssr/helpers/check-two-factor-valid.js
//
// Rules are intentionally identical to legacy. Any tightening (e.g. enforced
// password complexity, stricter email validator) must be a separate decision
// agreed with product — see edge cases E15, E25 in docs/auth-migration-plan.md.

import {
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  PASSWORD_QUALITY_LEVELS,
  type PasswordQualityLevel,
  VERIFICATION_CODE_LENGTH,
  VERIFICATION_CODE_PATTERN,
} from './constants';

// Mirrors `email-validator` package (RFC-ish): single @, dotted domain, no
// stray spaces, length sanity. Legacy uses the npm package directly; we keep
// equivalent behaviour without adding a runtime dependency. Tested against
// the canonical edge cases in __tests__/validation.test.ts.
const EMAIL_RE =
  /^[A-Za-z0-9!#$%&'*+/=?^_`{|}~.-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+$/;

export function validateEmail(value: string): boolean {
  if (typeof value !== 'string') return false;
  if (value.length === 0 || value.length > 254) return false;
  if (/\s/.test(value)) return false;
  if (value.includes('..')) return false;
  // Local part (before @) max 64 chars per RFC 5321.
  const at = value.indexOf('@');
  if (at < 0 || at > 64) return false;
  return EMAIL_RE.test(value);
}

export type PasswordError =
  | 'EMPTY'
  | 'CONTAINS_SPACES'
  | 'TOO_SHORT'
  | 'TOO_LONG'
  | null;

export function validatePassword(value: string): PasswordError {
  if (!value) return 'EMPTY';
  if (value.includes(' ')) return 'CONTAINS_SPACES';
  if (value.length < PASSWORD_MIN_LENGTH) return 'TOO_SHORT';
  if (value.length > PASSWORD_MAX_LENGTH) return 'TOO_LONG';
  return null;
}

export function isPasswordValid(value: string): boolean {
  return validatePassword(value) === null;
}

export type RepeatedPasswordError = 'EMPTY' | 'NOT_MATCH' | null;

export function validatePasswordsMatch(
  password: string,
  repeated: string,
): RepeatedPasswordError {
  if (!repeated) return 'EMPTY';
  if (repeated !== password) return 'NOT_MATCH';
  return null;
}

export type VerificationCodeError =
  | 'EMPTY'
  | 'CONTAINS_SPACES'
  | 'TOO_SHORT'
  | 'INVALID_FORMAT'
  | null;

// 2FA / device-confirm code rule. Legacy normalises by stripping spaces in
// the change-handler, then validates length === 6 and digits-only. Match that
// — but expose both "is the current value valid?" (used to enable submit) and
// the specific error code (used to show messages on submit).
export function validateVerificationCode(value: string): VerificationCodeError {
  if (!value) return 'EMPTY';
  if (value.includes(' ')) return 'CONTAINS_SPACES';
  if (value.length < VERIFICATION_CODE_LENGTH) return 'TOO_SHORT';
  if (!VERIFICATION_CODE_PATTERN.test(value)) return 'INVALID_FORMAT';
  return null;
}

export function isVerificationCodeValid(value: string): boolean {
  return validateVerificationCode(value) === null;
}

// Checked password quality bands — visual indicator only, never blocks submit.
// Same heuristic as legacy test-password.js:
//   - <8 chars → LOW (regardless of categories)
//   - count of present categories (lowercase, uppercase, digit, special) ∈ [3] → MEDIUM
//   - all 4 categories → HIGH
//   - else → LOW
const lowerCaseRe = /[a-z]/;
const upperCaseRe = /[A-Z]/;
const numberRe = /\d/;
const specialSymbolRe = /[-+_!@#$%^&*.,?]/;

export function getPasswordQuality(password: string): PasswordQualityLevel {
  if (password.length < PASSWORD_MIN_LENGTH) return PASSWORD_QUALITY_LEVELS.LOW;

  let approveCount = 0;
  if (lowerCaseRe.test(password)) approveCount += 1;
  if (upperCaseRe.test(password)) approveCount += 1;
  if (numberRe.test(password)) approveCount += 1;
  if (specialSymbolRe.test(password)) approveCount += 1;

  if (approveCount === 4) return PASSWORD_QUALITY_LEVELS.HIGH;
  if (approveCount === 3) return PASSWORD_QUALITY_LEVELS.MEDIUM;
  return PASSWORD_QUALITY_LEVELS.LOW;
}

export interface PasswordQualityData {
  level: PasswordQualityLevel;
  i18nKey: string;
  icon: string;
}

// i18n keys + icons match legacy test-password.js getPasswordQualityData.
// Caller resolves i18nKey through whatever t() they have.
export function getPasswordQualityData(password: string): PasswordQualityData {
  const level = getPasswordQuality(password);
  switch (level) {
    case PASSWORD_QUALITY_LEVELS.HIGH:
      return {
        level,
        i18nKey: 'AUTHORIZATION.PASSWORD.QUALITY.HIGH',
        icon: '/images/shield-green.svg',
      };
    case PASSWORD_QUALITY_LEVELS.MEDIUM:
      return {
        level,
        i18nKey: 'AUTHORIZATION.PASSWORD.QUALITY.MEDIUM',
        icon: '/images/warning-yellow-circle.svg',
      };
    default:
      return {
        level: PASSWORD_QUALITY_LEVELS.LOW,
        i18nKey: 'AUTHORIZATION.PASSWORD.QUALITY.LOW',
        icon: '/images/error-sign.svg',
      };
  }
}

// Convenience: legacy registers email as lowercase and trims; login does NOT
// trim/lowercase (edge case E15). The new code unifies both — always normalise.
export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}
