import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

dotenv.config();

const API_HOST = 'https://openapi.usdd.io';
const DEFAULT_REQUEST_TIMEOUT_MS = 10_000;
const SUPPORTED_CHAINS = new Set(['tron', 'eth', 'bsc']);
const SUPPORTED_INTERVALS = new Set(['WEEKLY', 'MONTHLY', 'BIANNUAL', 'ANNUAL']);

export class USDDApiError extends Error {
  constructor(message, { endpoint, status } = {}) {
    super(message);
    this.name = 'USDDApiError';
    this.endpoint = endpoint;
    this.status = status;
  }
}

export class USDDClient {
  constructor({
    baseUrl = API_HOST,
    fetchImpl,
    sleepImpl,
    requestTimeoutMs = DEFAULT_REQUEST_TIMEOUT_MS,
  } = {}) {
    if (!Number.isFinite(requestTimeoutMs) || requestTimeoutMs <= 0) {
      throw new TypeError('requestTimeoutMs must be a positive finite number');
    }
    this.baseUrl = baseUrl;
    this.fetchImpl = fetchImpl || globalThis.fetch;
    this.sleepImpl = sleepImpl || ((ms) => new Promise((r) => setTimeout(r, ms)));
    this.requestTimeoutMs = requestTimeoutMs;
  }

  async _fetchWithRetry(path) {
    const url = `${this.baseUrl}${path}`;
    const delays = [0, 200, 600];
    let lastErr;
    for (const delay of delays) {
      if (delay > 0) await this.sleepImpl(delay);
      try {
        const { resp, json } = await this._fetchJsonWithTimeout(url, path);
        if (!resp.ok) {
          lastErr = new USDDApiError(
            `openapi.usdd.io ${resp.status} on ${path}`,
            { endpoint: path, status: resp.status }
          );
          continue;
        }
        if (json && typeof json === 'object' && 'code' in json && json.code !== 0) {
          lastErr = new USDDApiError(
            `openapi.usdd.io business error ${json.code} on ${path}: ${json.message || 'Unknown error'}`,
            { endpoint: path, status: resp.status }
          );
          continue;
        }
        return json;
      } catch (err) {
        if (err instanceof USDDApiError) {
          lastErr = err;
          continue;
        }
        lastErr = new USDDApiError(
          `openapi.usdd.io unreachable on ${path}: ${err.message}`,
          { endpoint: path }
        );
      }
    }
    throw lastErr;
  }

  async _fetchJsonWithTimeout(url, path) {
    const controller = new AbortController();
    let timeoutId;
    const timeoutPromise = new Promise((_, reject) => {
      timeoutId = setTimeout(() => {
        const error = new USDDApiError(
          `openapi.usdd.io timed out after ${this.requestTimeoutMs}ms on ${path}`,
          { endpoint: path }
        );
        reject(error);
        controller.abort(error);
      }, this.requestTimeoutMs);
    });

    try {
      return await Promise.race([
        (async () => {
          const resp = await this.fetchImpl(url, { signal: controller.signal });
          return {
            resp,
            json: resp.ok ? await resp.json() : undefined,
          };
        })(),
        timeoutPromise,
      ]);
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async getEarnApy() {
    const raw = await this._fetchWithRetry('/api/v1/external/earn-apy');
    return this._withMeta(raw);
  }

  async getSusddSupply() {
    const raw = await this._fetchWithRetry('/api/v1/external/total-supply/susdd');
    return this._withMeta(raw);
  }

  async getUsddSupply() {
    const raw = await this._fetchWithRetry('/api/v1/external/total-supply/usdd');
    return this._withMeta(raw);
  }

  async getSupplyHistory() {
    const raw = await this._fetchWithRetry('/api/v1/data-platform/overview/supply-value-history');
    return this._withMeta(raw);
  }

  async getCollateralHistory() {
    const raw = await this._fetchWithRetry('/api/v1/data-platform/overview/collateral-value-history');
    return this._withMeta(raw);
  }

  async getCirculatingSupply() {
    const raw = await this._fetchWithRetry('/circulatingSupply');
    return this._withMeta({ value: parseSupplyNumber(raw, '/circulatingSupply') });
  }

  async getTotalSupply() {
    const raw = await this._fetchWithRetry('/totalSupply');
    return this._withMeta({ value: parseSupplyNumber(raw, '/totalSupply') });
  }

  async getPublicProtocolOverview() {
    const raw = await this._fetchWithRetry('/api/v1/market-site/overview');
    return this._withMeta(raw);
  }

  async getPublicProtocolOverviewInfo() {
    const raw = await this._fetchWithRetry('/api/v1/data-platform/overview/info');
    return this._withMeta(raw);
  }

  async getPublicDsrApy() {
    const raw = await this._fetchWithRetry('/api/v1/market-site/overview/apy');
    return this._withMeta(raw);
  }

  async getVaultCollaterals() {
    const raw = await this._fetchWithRetry('/api/v1/vault/collaterals');
    return this._withMeta(raw);
  }

  async getLatestCollateral(chain) {
    const normalized = normalizeChain(chain);
    const raw = await this._fetchWithRetry(`/api/v1/data-platform/latest-collateral?chain=${normalized}`);
    return this._withMeta(raw);
  }

  async getChainCollateralHistory(chain, interval) {
    const normalizedChain = normalizeChain(chain);
    const normalizedInterval = normalizeInterval(interval);
    const raw = await this._fetchWithRetry(`/api/v1/data-platform/collateral-history?chain=${normalizedChain}&interval=${normalizedInterval}`);
    return this._withMeta(raw);
  }

  async getSmartAllocatorDetail() {
    const raw = await this._fetchWithRetry('/api/v1/smart-allocator/detail-overview');
    return this._withMeta(raw);
  }

  _withMeta(data) {
    const meta = {
      dataTime: new Date().toISOString(),
      source: 'openapi.usdd.io',
    };
    if (Array.isArray(data)) {
      return { data, _meta: meta };
    }
    return {
      ...data,
      _meta: meta,
    };
  }
}

export default USDDClient;

function normalizeChain(chain) {
  if (!chain) throw new TypeError('chain is required');
  const normalized = String(chain).trim().toLowerCase();
  if (!SUPPORTED_CHAINS.has(normalized)) {
    throw new TypeError(`chain must be one of: ${Array.from(SUPPORTED_CHAINS).join(', ')}`);
  }
  return normalized;
}

function normalizeInterval(interval) {
  if (!interval) throw new TypeError('interval is required');
  const normalized = String(interval).trim().toUpperCase();
  if (!SUPPORTED_INTERVALS.has(normalized)) {
    throw new TypeError(`interval must be one of: ${Array.from(SUPPORTED_INTERVALS).join(', ')}`);
  }
  return normalized;
}

function parseSupplyNumber(raw, endpoint) {
  const value = typeof raw === 'number' ? raw : Number(raw);
  if (!Number.isFinite(value)) {
    throw new USDDApiError(
      `openapi.usdd.io invalid numeric response on ${endpoint}`,
      { endpoint }
    );
  }
  return value;
}

async function main() {
  const [command, ...args] = process.argv.slice(2);
  const client = new USDDClient();

  try {
    switch (command) {
      case 'earn-apy':
        console.log(JSON.stringify(await client.getEarnApy(), null, 2));
        break;
      case 'susdd-supply':
        console.log(JSON.stringify(await client.getSusddSupply(), null, 2));
        break;
      case 'usdd-supply':
        console.log(JSON.stringify(await client.getUsddSupply(), null, 2));
        break;
      case 'supply-history':
        console.log(JSON.stringify(await client.getSupplyHistory(), null, 2));
        break;
      case 'collateral-history':
        console.log(JSON.stringify(await client.getCollateralHistory(), null, 2));
        break;
      case 'circulating-supply':
        console.log(JSON.stringify(await client.getCirculatingSupply(), null, 2));
        break;
      case 'total-supply':
        console.log(JSON.stringify(await client.getTotalSupply(), null, 2));
        break;
      case 'public-overview':
        console.log(JSON.stringify(await client.getPublicProtocolOverview(), null, 2));
        break;
      case 'public-overview-info':
        console.log(JSON.stringify(await client.getPublicProtocolOverviewInfo(), null, 2));
        break;
      case 'dsr-apy':
        console.log(JSON.stringify(await client.getPublicDsrApy(), null, 2));
        break;
      case 'vault-collaterals':
        console.log(JSON.stringify(await client.getVaultCollaterals(), null, 2));
        break;
      case 'latest-collateral':
        console.log(JSON.stringify(await client.getLatestCollateral(args[0]), null, 2));
        break;
      case 'chain-collateral-history':
        console.log(JSON.stringify(await client.getChainCollateralHistory(args[0], args[1]), null, 2));
        break;
      case 'smart-allocator-detail':
        console.log(JSON.stringify(await client.getSmartAllocatorDetail(), null, 2));
        break;
      default:
        console.log('Available commands:');
        console.log('  earn-apy                       Per-chain Earn APY');
        console.log('  usdd-supply                    USDD supply per chain');
        console.log('  susdd-supply                   sUSDD supply per chain');
        console.log('  supply-history                 USDD/sUSDD supply time series');
        console.log('  collateral-history             Total collateral value time series');
        console.log('  circulating-supply             Raw circulating supply');
        console.log('  total-supply                   Raw total supply');
        console.log('  public-overview                Public protocol overview');
        console.log('  public-overview-info           Public protocol overview with 24h changes');
        console.log('  dsr-apy                        DSR APY current/average/history');
        console.log('  vault-collaterals              Public vault configuration list');
        console.log('  latest-collateral <chain>      Per-chain collateral snapshot');
        console.log('  chain-collateral-history <chain> <interval>');
        console.log('                                  interval: WEEKLY, MONTHLY, BIANNUAL, ANNUAL');
        console.log('  smart-allocator-detail         Smart Allocator detail overview');
        process.exit(command ? 1 : 0);
    }
  } catch (error) {
    console.error('Execution Error:', error.message);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
