# USDD DAO — AI Agent Skills

This bundle enables AI agents to interact with the [USDD](https://usdd.io) stablecoin protocol across TRON, Ethereum, and BSC. Mint, swap, earn, and analyze — all via natural language.

## Architecture

Two MCP servers, non-overlapping:

| Server | Package | Role |
|---|---|---|
| Official MCP | `@usdd/mcp-server-usdd` (npm) | Wallet, Vault / PSM / Earn reads & writes, protocol metrics, treasury, Smart Allocator |
| Analytics MCP (this repo) | `scripts/mcp_server.mjs` | Historical analytics from `openapi.usdd.io` — supply / collateral / per-ilk time series, per-chain APY, raw supply |

Skills route automatically: current-state and write actions go to the official MCP; historical analytics go to the local MCP.

## Skills in this bundle

| Skill | Scope | Writes? |
|---|---|---|
| [`usdd-vault-v1`](./skills/usdd-vault-v1/SKILL.md) | Vault / CDP: open, deposit, mint, repay, withdraw, close | Yes |
| [`usdd-psm-v1`](./skills/usdd-psm-v1/SKILL.md) | Peg Stability Module: stablecoin ↔ USDD swap | Yes |
| [`usdd-earn-v1`](./skills/usdd-earn-v1/SKILL.md) | Savings: deposit USDD → sUSDD, redeem back | Yes |
| [`usdd-analytics-v1`](./skills/usdd-analytics-v1/SKILL.md) | Read-only analytics history | No |

## Global Rules

### Chain selection
USDD lives on TRON, ETH, and BSC. For any tool whose behavior depends on chain, the AI **must** ask the user to specify the chain if not provided. Never default silently.

### Chat-layer confirmation for all writes (non-skippable)
Before invoking any `Write? = Yes` tool, the AI restates `amount / fee / chain / contract / from-address` in the conversation and waits for an affirmative confirmation from the user. The official MCP's writes are single-call (only `token_transfer` has a true `prepare_*/confirm_*` flow), so this discipline lives in skill prose.

### 6-step write precheck
For every skill with `Write? = Yes` tools, the AI runs:

1. Check chain
2. Check balance (official MCP `get_token_balance`)
3. Check allowance (official MCP `check_allowance`)
4. Approve if needed (official MCP `approve_token`)
5. Chat confirmation (non-skippable)
6. Execute

For Vault writes, an additional **risk-summary precheck** runs *before* step 1: call `analyze_vault_risk` and emit the current collateral ratio, liquidation price, and risk tier.

### Data freshness footer
Analytics responses (from this repo's MCP) carry `_meta.dataTime` and `_meta.source`. The AI appends a footer to user-facing summaries:
`Data time: <ISO8601> · Source: openapi.usdd.io`

### Error fallback
If `openapi.usdd.io` returns an `isError: true` response from the analytics MCP, the AI surfaces the error message verbatim and does not retry beyond what the MCP already handled internally.

## Quick Links

- Install: see `README.md`
- Endpoint catalog: `docs/api-reference.md`
- Per-protocol guides: `docs/vault-guide.md` · `docs/psm-guide.md` · `docs/earn-guide.md`
- Implementation design: `docs/superpowers/specs/2026-05-25-usdd-skills-design.md`
