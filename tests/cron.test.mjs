import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validCronAuthorization } from '../lib/cron-auth.ts';

test('cron requires an exact bearer token and fails closed without config', () => {
  const secret = 'unit-test-token';
  assert.equal(validCronAuthorization('Bearer ' + secret, secret), true);
  for (const header of [null, '', secret, 'Basic ' + secret, 'Bearer unit-test-tokeN']) {
    assert.equal(validCronAuthorization(header, secret), false);
  }
  assert.equal(validCronAuthorization('Bearer ' + secret, undefined), false);
});

test('Hobby deployment omits Vercel Cron and Supabase schedules a Vault-backed GET', () => {
  const read = (path) => readFileSync(path, 'utf8');
  assert.ok(!('crons' in JSON.parse(read('vercel.json'))));
  const sql = read('supabase/cron.sql');
  assert.match(sql, /cron\.schedule\(\s*'classmate-notifications',\s*'\* \* \* \* \*'/);
  assert.match(sql, /net\.http_get/);
  assert.match(sql, /'Authorization', 'Bearer ' \|\| s\.decrypted_secret/);
  assert.match(sql, /YOUR_DOMAIN/);
  assert.match(sql, /YOUR_CRON_SECRET/);
});
