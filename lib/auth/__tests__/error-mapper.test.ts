import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { isTwoFactorCodeArrayError, mapAuthError } from '../error-mapper';

describe('mapAuthError', () => {
  it('register: known email-already-exists code maps to email field', () => {
    const r = mapAuthError('register', 'AUTH.EMAIL.EMAIL_ALREADY_EXIST');
    assert.equal(r.field, 'email');
    assert.equal(r.i18nKey, 'AUTHORIZATION.EMAIL.EMAIL_ALREADY_EXIST');
    assert.notEqual(r.unknown, true);
  });

  it('login: invalid credentials → password field, ACCOUNT_NOT_FOUND key', () => {
    const r = mapAuthError('login', 'Invalid credentials');
    assert.equal(r.field, 'password');
    assert.equal(r.i18nKey, 'AUTHORIZATION.ACCOUNT_NOT_FOUND');
  });

  it('google: EMAIL_ALREADY_EXISTS marks redirectsForm', () => {
    const r = mapAuthError('google', 'GOOGLE_AUTH.FOUND_USER_NOT_ALLOWED');
    assert.equal(r.redirectsForm, true);
  });

  it('2fa: legacy TWO_FACTOR.INVALID_CODE unified to AUTHORIZATION.INVALID_CODE', () => {
    const r = mapAuthError('2fa', 'TWO_FACTOR.INVALID_CODE');
    assert.equal(r.i18nKey, 'AUTHORIZATION.INVALID_CODE');
    assert.equal(r.field, 'verificationCode');
  });

  it('unknown code → fallback SERVER_ERROR + unknown=true', () => {
    const r = mapAuthError('login', 'WHATEVER.NEW.CODE');
    assert.equal(r.i18nKey, 'AUTHORIZATION.SERVER_ERROR');
    assert.equal(r.unknown, true);
  });

  it('null/undefined message → fallback', () => {
    assert.equal(mapAuthError('login', null).unknown, true);
    assert.equal(mapAuthError('login', undefined).unknown, true);
  });
});

describe('isTwoFactorCodeArrayError', () => {
  it('matches array containing TO_LONG / NOT_MATCH', () => {
    assert.equal(
      isTwoFactorCodeArrayError(['TWO_FACTOR_CODE.TO_LONG']),
      true,
    );
    assert.equal(
      isTwoFactorCodeArrayError(['TWO_FACTOR_CODE.NOT_MATCH', 'OTHER']),
      true,
    );
  });

  it('rejects non-arrays and unrelated arrays', () => {
    assert.equal(isTwoFactorCodeArrayError('TWO_FACTOR_CODE.TO_LONG'), false);
    assert.equal(isTwoFactorCodeArrayError(['OTHER']), false);
    assert.equal(isTwoFactorCodeArrayError(null), false);
  });
});
