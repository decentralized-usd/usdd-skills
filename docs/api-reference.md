# Analytics MCP Upstream Reference

This repo's analytics MCP wraps the public read-only USDD API endpoints that are useful to agent workflows.

Agent workflows must call this repo's MCP tools. The upstream URL details below are implementation/maintenance notes for the MCP server, not instructions for agents to fetch APIs directly.

For wallet-aware reads, on-chain state, and all writes, use the official MCP.

## Internal upstream mappings

| Internal upstream path | This repo's MCP tool | Notes |
|---|---|---|
| `GET /totalSupply` | `get_total_supply` | Plain total supply number |
| `GET /circulatingSupply` | `get_circulating_supply` | Plain circulating supply number |
| `GET /api/v1/external/earn-apy` | `get_earn_apy` | Per-chain Earn APY |
| `GET /api/v1/external/total-supply/usdd` | `get_usdd_supply` | USDD supply per chain |
| `GET /api/v1/external/total-supply/susdd` | `get_susdd_supply` | sUSDD supply per chain |
| `GET /api/v1/market-site/overview` | `get_public_protocol_overview` | Public protocol overview |
| `GET /api/v1/data-platform/overview/info` | `get_public_protocol_overview_info` | Public overview with 24h changes |
| `GET /api/v1/market-site/overview/apy` | `get_public_dsr_apy` | DSR APY current / average / history |
| `GET /api/v1/data-platform/overview/supply-value-history` | `get_supply_history` | USDD/sUSDD supply time series per chain |
| `GET /api/v1/data-platform/overview/collateral-value-history` | `get_collateral_history` | Protocol-wide collateral value time series per chain |
| `GET /api/v1/vault/collaterals` | `get_vault_collaterals` | Vault collateral configuration list |
| `GET /api/v1/data-platform/latest-collateral?chain=<chain>` | `get_latest_collateral` | Per-chain collateral snapshot |
| `GET /api/v1/data-platform/collateral-history?chain=<chain>&interval=<interval>` | `get_chain_collateral_history` | Per-chain historical series |
| `GET /api/v1/smart-allocator/detail-overview` | `get_smart_allocator_detail` | Smart Allocator allocations and earnings |

## Not available

The public API does not expose an ilk-keyed historical series. Do not document this old tool name as available and do not route skills or tests to it:

- `get_ilk_collateral_history`

## Response envelope (added by this repo)

Every response from this repo's MCP is the raw upstream JSON merged with a `_meta` block:

```json
{
  "...raw API fields...": "...",
  "_meta": {
    "dataTime": "2026-05-25T03:14:15.000Z",
    "source": "openapi.usdd.io"
  }
}
```

`dataTime` is the moment this repo fetched the data, not the upstream record time.

## Auth

No API key is needed for the upstream analytics data currently used by the MCP.

## Capabilities intentionally NOT wrapped here

The following write-capable or wallet-aware capabilities are covered by `@usdd/mcp-server-usdd` and must not be duplicated in this repo:

- Vault summary, PSM status, savings status
- Treasury summary, JST buyback stats
- Token balance, allowance, approval

If you find yourself wanting to wrap one of these, stop and use the official MCP instead.
