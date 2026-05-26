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

test('USDDClient.getEarnApy fetches /external/earn-apy and attaches meta', async () => {
  const payload = { tron: 6.5, eth: 5.1, bsc: 4.8 };
  const fakeFetch = async (url) => {
    assert.equal(url, 'https://openapi.usdd.io/external/earn-apy');
    return { ok: true, status: 200, json: async () => payload };
  };
  const client = new USDDClient({ fetchImpl: fakeFetch });
  const data = await client.getEarnApy();
  assert.equal(data.tron, 6.5);
  assert.equal(data._meta.source, 'openapi.usdd.io');
  assert.match(data._meta.dataTime, /^\d{4}-\d{2}-\d{2}T/);
});

test('USDDClient.getSusddSupply fetches /external/total-supply/susdd', async () => {
  const payload = { tron: '1234567', eth: '7654321', bsc: '111111' };
  const fakeFetch = async (url) => {
    assert.equal(url, 'https://openapi.usdd.io/external/total-supply/susdd');
    return { ok: true, status: 200, json: async () => payload };
  };
  const client = new USDDClient({ fetchImpl: fakeFetch });
  const data = await client.getSusddSupply();
  assert.equal(data.tron, '1234567');
  assert.equal(data._meta.source, 'openapi.usdd.io');
});

test('USDDClient.getSupplyHistory fetches supply-value-history', async () => {
  const payload = { points: [{ date: '2026-05-20', tron: 100, eth: 50, bsc: 20 }] };
  const fakeFetch = async (url) => {
    assert.equal(url, 'https://openapi.usdd.io/data-platform/overview/supply-value-history');
    return { ok: true, status: 200, json: async () => payload };
  };
  const client = new USDDClient({ fetchImpl: fakeFetch });
  const data = await client.getSupplyHistory();
  assert.equal(data.points.length, 1);
  assert.equal(data._meta.source, 'openapi.usdd.io');
});

test('USDDClient.getCollateralHistory fetches collateral-value-history', async () => {
  const payload = { points: [{ date: '2026-05-20', total: 1.2e9 }] };
  const fakeFetch = async (url) => {
    assert.equal(url, 'https://openapi.usdd.io/data-platform/overview/collateral-value-history');
    return { ok: true, status: 200, json: async () => payload };
  };
  const client = new USDDClient({ fetchImpl: fakeFetch });
  const data = await client.getCollateralHistory();
  assert.equal(data.points.length, 1);
  assert.equal(data._meta.source, 'openapi.usdd.io');
});

test('USDDClient.getCirculatingSupply fetches /circulatingSupply as number', async () => {
  const fakeFetch = async (url) => {
    assert.equal(url, 'https://openapi.usdd.io/circulatingSupply');
    return { ok: true, status: 200, json: async () => 720000000.5 };
  };
  const client = new USDDClient({ fetchImpl: fakeFetch });
  const data = await client.getCirculatingSupply();
  assert.equal(data.value, 720000000.5);
  assert.equal(data._meta.source, 'openapi.usdd.io');
});

test('USDDClient.getTotalSupply fetches /totalSupply as number', async () => {
  const fakeFetch = async (url) => {
    assert.equal(url, 'https://openapi.usdd.io/totalSupply');
    return { ok: true, status: 200, json: async () => 725000000 };
  };
  const client = new USDDClient({ fetchImpl: fakeFetch });
  const data = await client.getTotalSupply();
  assert.equal(data.value, 725000000);
  assert.equal(data._meta.source, 'openapi.usdd.io');
});
