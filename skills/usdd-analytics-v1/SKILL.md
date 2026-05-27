# USDD Analytics — AI Agent Skill

This read-only skill routes USDD analytics questions between:

- this repo's local analytics MCP for supported APY/supply analytics tools, and
- the official `@usdd/mcp-server-usdd` MCP for current-state protocol metrics, treasury, and Smart Allocator data.

No transaction signing is used by this skill.

## Prerequisites

- Node.js v20+
- This repo's analytics MCP registered in the AI client
- Official MCP registered when the question is about current-state metrics, treasury, or Smart Allocator

## Local Analytics MCP Tools

| Tool | Inputs | Current status | Use for |
|------|--------|----------------|---------|
| `get_earn_apy` | — | Verified OK | Cross-chain Earn APY |
| `get_susdd_supply` | — | Verified OK | sUSDD supply breakdown |
| `get_total_supply` | — | Verified OK | Raw USDD total supply |
| `get_supply_history` | — | MCP tool available; upstream may return an error | Historical USDD/sUSDD supply |

Always call these as MCP tools. Do not fetch `openapi.usdd.io` or other upstream URLs directly from the skill workflow. If an MCP tool returns `isError: true`, surface the error message and stop. Do not invent alternate paths.

Unavailable tool names: `get_collateral_history`, `get_circulating_supply`, and `get_ilk_collateral_history`. The backend service and MCP do not expose them. If a user asks for collateral history, per-ilk historical ratios, or raw circulating supply through those tools, say that the MCP does not provide that data. For current protocol-level supply or collateral snapshots, use the official MCP current-state tools below.

Never call `get_supply_history` for collateral, collateral-ratio, Vault, or per-ilk history questions. `get_supply_history` is only for USDD/sUSDD supply over time.

## Official MCP Current-State Analytics

Use the official MCP for current snapshots:

| User asks about | Official tool |
|---|---|
| Overall protocol supply, TVL, savings TVL, Smart Allocator earning | `get_protocol_metrics` |
| Chain-level mainnet metrics for TRON/ETH/BSC | `get_chain_metrics` |
| Latest collateral highest-price data | `get_collateral_prices` |
| Current PSM route fees/availability | `get_psm_metrics` |
| Current PSM market status | `get_psm_status` |
| Current Savings status for a network | `get_savings_status` |
| Current Vault/CDP state | `get_vault_summary`, `analyze_vault_risk` |
| Treasury report summary | `get_treasury_summary` |
| JST buyback/burn stats | `get_jst_buyback_stats` |
| Smart Allocator overview/assets/proof/debt | `get_smart_allocator_overview`, `get_assets_breakdown`, `get_proof_of_reserve`, `get_debt_overview` |

Official MCP current-state tools use `network` when applicable. If the user asks for chain-specific current state without specifying a network, ask or present all supported mainnet families when the tool supports it.

## Workflow Rules

### Routing

- Supported APY/supply analytics -> local analytics MCP.
- Current balances, wallet state, Vault state, PSM status, Savings status, protocol metrics, treasury, and Smart Allocator -> official MCP.
- If both are useful, call both and label sources separately.

### Chain / Network Selection

For local APY and supply breakdown tools, if the user omits a chain, present all returned chains rather than defaulting to TRON.

For official MCP tools, use official `network` values (`tron`, `eth`, `bsc`, `tron_nile`, `eth_sepolia`, `bsc_testnet`). Ask when the user omitted a network and the query cannot safely be answered for all mainnet families.

### Data Freshness Footer

Every local analytics response carries `_meta` with:

- `dataTime`
- `source`

When summarizing local analytics output, append:

`Data time: <ISO8601> · Source: <source from _meta>`

For official MCP current-state data, mention the tool/source in prose when freshness matters, because those outputs do not use this repo's `_meta` envelope.

## Example Prompts

- "Which chain has the highest Earn APY today?" -> local `get_earn_apy`
- "Show sUSDD supply breakdown across chains." -> local `get_susdd_supply`
- "What's the current protocol supply of USDD?" -> official `get_protocol_metrics`, or local `get_total_supply` if a raw total-supply number is sufficient
- "What's USDD protocol TVL right now?" -> official `get_protocol_metrics`
- "Show Smart Allocator proof of reserve." -> official `get_proof_of_reserve`
- "Compare TRX-A collateral history." -> explain that no backend or MCP tool currently provides per-ilk collateral history; offer current `get_oracle_status` / Vault risk reads if useful

## Security

- Read-only skill. No approvals, no signing, no writes.
- Do not use analytics responses as authorization to execute transactions; product skills must run their own write prechecks.
- Do not hide MCP tool failures. They indicate the tool or its upstream data source needs maintenance.
