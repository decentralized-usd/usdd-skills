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
