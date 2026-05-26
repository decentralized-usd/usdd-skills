import { test } from 'node:test';
import assert from 'node:assert/strict';
import { USDDClient, USDDApiError } from './usdd_api.mjs';

test('USDDClient._fetchWithRetry returns JSON on 200', async () => {
  const calls = [];
  const fakeFetch = async (url) => {
    calls.push(url);
    return {
      ok: true,
      status: 200,
      json: async () => ({ hello: 'world' }),
    };
  };
  const client = new USDDClient({ fetchImpl: fakeFetch });
  const data = await client._fetchWithRetry('/test');
  assert.deepEqual(data, { hello: 'world' });
  assert.equal(calls.length, 1);
  assert.equal(calls[0], 'https://openapi.usdd.io/test');
});

test('USDDClient._fetchWithRetry retries on 500 then succeeds', async () => {
  let n = 0;
  const fakeFetch = async () => {
    n += 1;
    if (n < 3) return { ok: false, status: 500 };
    return { ok: true, status: 200, json: async () => ({ ok: true }) };
  };
  const client = new USDDClient({ fetchImpl: fakeFetch, sleepImpl: async () => {} });
  const data = await client._fetchWithRetry('/x');
  assert.deepEqual(data, { ok: true });
  assert.equal(n, 3);
});

test('USDDClient._fetchWithRetry throws USDDApiError after 3 failures', async () => {
  const fakeFetch = async () => ({ ok: false, status: 502 });
  const client = new USDDClient({ fetchImpl: fakeFetch, sleepImpl: async () => {} });
  await assert.rejects(
    () => client._fetchWithRetry('/y'),
    (err) => err instanceof USDDApiError && err.status === 502 && err.endpoint === '/y'
  );
});
