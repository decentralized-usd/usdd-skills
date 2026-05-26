import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

dotenv.config();

const API_HOST = 'https://openapi.usdd.io';

export class USDDApiError extends Error {
  constructor(message, { endpoint, status } = {}) {
    super(message);
    this.name = 'USDDApiError';
    this.endpoint = endpoint;
    this.status = status;
  }
}

export class USDDClient {
  constructor({ baseUrl = API_HOST, fetchImpl, sleepImpl } = {}) {
    this.baseUrl = baseUrl;
    this.fetchImpl = fetchImpl || globalThis.fetch;
    this.sleepImpl = sleepImpl || ((ms) => new Promise((r) => setTimeout(r, ms)));
  }

  async _fetchWithRetry(path) {
    const url = `${this.baseUrl}${path}`;
    const delays = [0, 200, 600];
    let lastErr;
    for (const delay of delays) {
      if (delay > 0) await this.sleepImpl(delay);
      try {
        const resp = await this.fetchImpl(url);
        if (!resp.ok) {
          lastErr = new USDDApiError(
            `openapi.usdd.io ${resp.status} on ${path}`,
            { endpoint: path, status: resp.status }
          );
          continue;
        }
        return await resp.json();
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

  async getEarnApy() {
    const raw = await this._fetchWithRetry('/external/earn-apy');
    return this._withMeta(raw);
  }

  async getSusddSupply() {
    const raw = await this._fetchWithRetry('/external/total-supply/susdd');
    return this._withMeta(raw);
  }

  async getSupplyHistory() {
    const raw = await this._fetchWithRetry('/data-platform/overview/supply-value-history');
    return this._withMeta(raw);
  }

  async getCollateralHistory() {
    const raw = await this._fetchWithRetry('/data-platform/overview/collateral-value-history');
    return this._withMeta(raw);
  }

  async getCirculatingSupply() {
    const raw = await this._fetchWithRetry('/circulatingSupply');
    return this._withMeta({ value: typeof raw === 'number' ? raw : Number(raw) });
  }

  async getTotalSupply() {
    const raw = await this._fetchWithRetry('/totalSupply');
    return this._withMeta({ value: typeof raw === 'number' ? raw : Number(raw) });
  }

  async getIlkCollateralHistory(ilk) {
    if (!ilk) throw new TypeError('ilk is required');
    const raw = await this._fetchWithRetry(`/data-platform/collateral-history?ilk=${encodeURIComponent(ilk)}`);
    return this._withMeta(raw);
  }

  _withMeta(data) {
    return {
      ...data,
      _meta: {
        dataTime: new Date().toISOString(),
        source: 'openapi.usdd.io',
      },
    };
  }
}

export default USDDClient;

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
      case 'ilk-collateral-history':
        if (!args[0]) { console.error('Usage: ilk-collateral-history <ilk>'); process.exit(2); }
        console.log(JSON.stringify(await client.getIlkCollateralHistory(args[0]), null, 2));
        break;
      default:
        console.log('Available commands:');
        console.log('  earn-apy                       Per-chain Earn APY');
        console.log('  susdd-supply                   sUSDD supply per chain');
        console.log('  supply-history                 USDD/sUSDD supply time series');
        console.log('  collateral-history             Protocol-wide collateral time series');
        console.log('  circulating-supply             Raw circulating supply');
        console.log('  total-supply                   Raw total supply');
        console.log('  ilk-collateral-history <ilk>   Per-ilk collateral series');
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
