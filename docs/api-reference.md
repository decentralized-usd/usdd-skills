# Analytics MCP Upstream Reference

This repo's analytics MCP wraps a curated subset of upstream analytics data that the skills intentionally expose locally.

Agent workflows must call this repo's MCP tools. The upstream URL details below are implementation/maintenance notes for the MCP server, not instructions for agents to fetch APIs directly.

For broader current-state reads (protocol overview, chain metrics, treasury, Smart Allocator), use the official MCP — do not duplicate those tool surfaces here.

## Internal upstream mappings

| Internal upstream path | This repo's MCP tool | Notes |
|---|---|---|
| `GET /api/v1/external/earn-apy` | `get_earn_apy` | Per-chain Earn APY |
| `GET /api/v1/external/total-supply/susdd` | `get_susdd_supply` | sUSDD supply per chain |
| `GET /data-platform/overview/supply-value-history` | `get_supply_history` | USDD/sUSDD supply time series per chain |
| `GET /totalSupply` | `get_total_supply` | Plain number response |

## Not available

The backend service and MCP do not expose these tool names. Do not document them as available and do not route skills or tests to them:

- `get_collateral_history`
- `get_circulating_supply`
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

## Endpoints intentionally NOT wrapped here

The following endpoints are covered by `@usdd/mcp-server-usdd` and must not be duplicated in this repo:

- Protocol overview, chain metrics, collateral prices
- Vault summary, PSM status, savings status
- Treasury summary, JST buyback stats
- Smart Allocator endpoints
- Token balance, allowance, approval

If you find yourself wanting to wrap one of these, stop and use the official MCP instead.
