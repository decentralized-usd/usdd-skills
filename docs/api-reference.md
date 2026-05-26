# openapi.usdd.io API Reference

This repo's analytics MCP and CLI wrap a curated subset of `openapi.usdd.io` — specifically the **historical analytics** endpoints that the official MCP server (`@usdd/mcp-server-usdd`) does not expose.

For current-state reads (protocol overview, chain metrics, treasury, Smart Allocator), use the official MCP — do not duplicate.

## Endpoints used by this repo

| Endpoint | This repo's MCP tool | CLI subcommand | Notes |
|---|---|---|---|
| `GET /external/earn-apy` | `get_earn_apy` | `earn-apy` | Per-chain Earn APY |
| `GET /external/total-supply/susdd` | `get_susdd_supply` | `susdd-supply` | sUSDD supply per chain |
| `GET /data-platform/overview/supply-value-history` | `get_supply_history` | `supply-history` | USDD/sUSDD supply time series per chain |
| `GET /data-platform/overview/collateral-value-history` | `get_collateral_history` | `collateral-history` | Protocol collateral value time series per chain |
| `GET /circulatingSupply` | `get_circulating_supply` | `circulating-supply` | Plain number response |
| `GET /totalSupply` | `get_total_supply` | `total-supply` | Plain number response |
| `GET /data-platform/collateral-history?ilk=<ilk>` | `get_ilk_collateral_history` | `ilk-collateral-history <ilk>` | Per-ilk historical ratio / debt / APY |

## Response envelope (added by this repo)

Every response from this repo's MCP / CLI is the raw API JSON merged with a `_meta` block:

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

`openapi.usdd.io` is public and keyless. No API key needed for any endpoint above.

## Endpoints intentionally NOT wrapped here

The following endpoints are covered by `@usdd/mcp-server-usdd` and must not be duplicated in this repo:

- Protocol overview, chain metrics, collateral prices
- Vault summary, PSM status, savings status
- Treasury summary, JST buyback stats
- Smart Allocator endpoints
- Token balance, allowance, approval

If you find yourself wanting to wrap one of these, stop and use the official MCP instead.
