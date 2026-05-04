// Unit tests for lib/auth/validation.ts.
// Run with: `npm test`
// (uses node:test via tsx; no test framework needed beyond Node 20+).

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { PASSWORD_QUALITY_LEVELS } from '../constants';
import {
  getPasswordQuality,
  getPasswordQualityData,
  isPasswordValid,
  isVerificationCodeValid,
  normalizeEmail,
  validateEmail,
  validatePassword,
  validatePasswordsMatch,
  validateVerificationCode,
} from '../validation';

describe('validateEmail', () => {
  it('accepts canonical addresses', () => {
    assert.equal(validateEmail('user@example.com'), true);
    assert.equal(validateEmail('first.last@sub.example.co.uk'), true);
    assert.equal(validateEmail("a+b'c@example.com"), true);
  });

  it('rejects empty / whitespace / malformed', () => {
    assert.equal(validateEmail(''), false);
    assert.equal(validateEmail(' user@example.com'), false);
    assert.equal(validateEmail('user@example.com '), false);
    assert.equal(validateEmail('user@'), false);
    assert.equal(validateEmail('@example.com'), false);
    assert.equal(validateEmail('user@example'), false); // no TLD dot
  });
});

describe('validatePassword', () => {
  it('flags empty', () => {
    assert.equal(validatePassword(''), 'EMPTY');
  });

  it('flags spaces', () => {
    assert.equal(validatePassword('has space1'), 'CONTAINS_SPACES');
  });

  it('flags too short (7) and accepts boundary 8', () => {
    assert.equal(validatePassword('1234567'), 'TOO_SHORT');
    assert.equal(validatePassword('12345678'), null);
  });

  it('flags too long (101) and accepts boundary 100', () => {
    assert.equal(validatePassword('a'.repeat(100)), null);
    assert.equal(validatePassword('a'.repeat(101)), 'TOO_LONG');
  });

  it('isPasswordValid mirrors validatePassword', () => {
    assert.equal(isPasswordValid('12345678'), true);
    assert.equal(isPasswordValid('short'), false);
  });
});

describe('validatePasswordsMatch', () => {
  it('flags empty repeated', () => {
    assert.equal(validatePasswordsMatch('abc', ''), 'EMPTY');
  });

  it('flags mismatch', () => {
    assert.equal(validatePasswordsMatch('abc12345', 'abc123456'), 'NOT_MATCH');
  });

  it('accepts equal', () => {
    assert.equal(validatePasswordsMatch('abc12345', 'abc12345'), null);
  });
});

describe('validateVerificationCode', () => {
  it('flags empty', () => {
    assert.equal(validateVerificationCode(''), 'EMPTY');
  });

  it('flags too-short, contains-spaces, non-digits, accepts 6-digit', () => {
    assert.equal(validateVerificationCode('12345'), 'TOO_SHORT');
    assert.equal(validateVerificationCode('1 2345'), 'CONTAINS_SPACES');
    assert.equal(validateVerificationCode('12abcd'), 'INVALID_FORMAT');
    assert.equal(validateVerificationCode('123456'), null);
  });

  it('isVerificationCodeValid mirrors validator', () => {
    assert.equal(isVerificationCodeValid('123456'), true);
    assert.equal(isVerificationCodeValid('123'), false);
  });
});

describe('getPasswordQuality', () => {
  it('LOW for too-short input', () => {
    assert.equal(getPasswordQuality('Aa1!'), PASSWORD_QUALITY_LEVELS.LOW);
  });

  it('LOW when fewer than 3 categories', () => {
    assert.equal(getPasswordQuality('aaaaaaaa'), PASSWORD_QUALITY_LEVELS.LOW);
    assert.equal(getPasswordQuality('aaaaaaaA'), PASSWORD_QUALITY_LEVELS.LOW);
  });

  it('MEDIUM at exactly 3 categories', () => {
    assert.equal(getPasswordQuality('aaaaA1bb'), PASSWORD_QUALITY_LEVELS.MEDIUM);
  });

  it('HIGH with all 4 categories', () => {
    assert.equal(getPasswordQuality('aaaA1!bb'), PASSWORD_QUALITY_LEVELS.HIGH);
  });

  it('getPasswordQualityData returns expected i18n key + icon', () => {
    const high = getPasswordQualityData('aaaA1!bb');
    assert.equal(high.level, PASSWORD_QUALITY_LEVELS.HIGH);
    assert.equal(high.i18nKey, 'AUTHORIZATION.PASSWORD.QUALITY.HIGH');
    assert.equal(high.icon, '/images/shield-green.svg');

    const low = getPasswordQualityData('aaaaaaaa');
    assert.equal(low.level, PASSWORD_QUALITY_LEVELS.LOW);
    assert.equal(low.i18nKey, 'AUTHORIZATION.PASSWORD.QUALITY.LOW');
  });
});

describe('normalizeEmail', () => {
  it('trims and lowercases', () => {
    assert.equal(normalizeEmail('  USER@Example.COM  '), 'user@example.com');
  });
});
