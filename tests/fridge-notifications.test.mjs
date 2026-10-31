import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
const exports = {};
new Function('exports', ts.transpileModule(readFileSync(new URL('../src/features/notifications/fridgeNoticePolicy.ts', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText)(exports);
const { chooseFridgeNotice, registrationNoticeMessage, maskNoticeEmail, noticeDay, isFridgeReentry } = exports;
const base = { anonymous: true, verified: false, enabled: false, google: false, count: 1, sessionSeen: false, daySeen: false };
test('only a return to the fridge triggers prompts, not registration completion or fridge subtabs', () => {
  assert.equal(isFridgeReentry('home', 'fridge'), true);
  assert.equal(isFridgeReentry('recipe', 'fridge-food'), true);
  for (const previous of ['fridge', 'fridge-food', 'fridge-registered', 'manual-entry', 'recognition-result']) assert.equal(isFridgeReentry(previous, 'fridge'), false);
  assert.equal(isFridgeReentry('fridge', 'home'), false);
});
test('empty fridges never prompt; unverified email prompts at most once per session', () => {
  assert.equal(chooseFridgeNotice({ ...base, count: 0 }), null);
  assert.equal(chooseFridgeNotice(base), 'email');
  assert.equal(chooseFridgeNotice({ ...base, sessionSeen: true }), null);
});
test('disabled reminders prompt once per local day, taking priority over Google connection', () => {
  assert.equal(chooseFridgeNotice({ ...base, verified: true, count: 2 }), 'enable');
  assert.equal(chooseFridgeNotice({ ...base, verified: true, daySeen: true }), null);
  assert.notEqual(noticeDay(new Date(2026, 9, 31, 23, 59)), noticeDay(new Date(2026, 10, 1, 0, 0)));
});
test('Google connection needs verified enabled email and two ingredients; never prompt connected users', () => {
  const enabled = { ...base, verified: true, enabled: true };
  assert.equal(chooseFridgeNotice(enabled), null);
  assert.equal(chooseFridgeNotice({ ...enabled, count: 2 }), 'google');
  assert.equal(chooseFridgeNotice({ ...enabled, count: 2, sessionSeen: true }), null);
  assert.equal(chooseFridgeNotice({ ...enabled, count: 2, google: true }), null);
});
test('notice email masks personal part, including short addresses, without inventing an address', () => {
  assert.equal(maskNoticeEmail('kokjip@example.com'), 'ko***@example.com');
  assert.equal(maskNoticeEmail('ab@example.com'), 'a***@example.com');
  assert.equal(maskNoticeEmail(''), '');
});
test('Google-connected and non-anonymous users never receive the anonymous signup prompt', () => {
  assert.equal(chooseFridgeNotice({ ...base, anonymous: false, google: true }), null);
  assert.equal(chooseFridgeNotice({ ...base, anonymous: false }), null);
  assert.equal(chooseFridgeNotice({ ...base, google: true }), null);
});
test('Figma registration toast only promises reminders with verified email and enabled preferences', () => {
  assert.equal(registrationNoticeMessage(true, true), '소비기한이 다가오면 알려드릴게요');
  assert.equal(registrationNoticeMessage(false, true), null);
  assert.equal(registrationNoticeMessage(true, false), null);
  assert.equal(registrationNoticeMessage(false, false), null);
});
