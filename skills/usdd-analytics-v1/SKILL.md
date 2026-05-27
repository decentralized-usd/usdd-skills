# USDD Analytics — AI Agent Skill

This read-only skill routes USDD analytics questions between:

- this repo's local analytics MCP for the public read-only USDD API, and
- the official `@usdd/mcp-server-usdd` MCP for wallet state, on-chain reads, and write-capable protocol workflows.

No transaction signing is used by this skill.

## Prerequisites

- Node.js v20+
- This repo's analytics MCP registered in the AI client
- Official MCP registered when the question involves wallets, balances, Vault ownership, PSM/Earn actions, or writes

## Local Analytics MCP Tools

| Tool | Inputs | Current status | Use for |
|------|--------|----------------|---------|
| `get_earn_apy` | — | Verified OK | Cross-chain Earn APY |
| `get_usdd_supply` | — | Verified OK | USDD supply breakdown |
| `get_susdd_supply` | — | Verified OK | sUSDD supply breakdown |
| `get_total_supply` | — | Verified OK | Raw USDD total supply |
| `get_circulating_supply` | — | Verified OK | Raw circulating supply |
| `get_supply_history` | — | Verified OK | Historical USDD/sUSDD supply |
| `get_collateral_history` | — | Verified OK | Protocol-wide collateral value history by chain |
| `get_public_protocol_overview` | — | Verified OK | Public REST protocol overview |
| `get_public_protocol_overview_info` | — | Verified OK | Public REST overview with 24h changes |
| `get_public_dsr_apy` | — | Verified OK | DSR APY current / average / history |
| `get_vault_collaterals` | — | Verified OK | Vault collateral configuration list |
| `get_latest_collateral` | `chain` | Verified OK | Per-chain collateral snapshot |
| `get_chain_collateral_history` | `chain`, `interval` | Verified OK | Per-chain historical series |
| `get_smart_allocator_detail` | — | Verified OK | Smart Allocator allocations and earnings |

Always call these as MCP tools. Do not fetch `openapi.usdd.io` or other upstream URLs directly from the skill workflow. If an MCP tool returns `isError: true`, surface the error message and stop. Do not invent alternate paths.

Unavailable tool name: `get_ilk_collateral_history`. The public API does not expose an ilk-keyed historical series. If a user asks for per-ilk historical ratios, say that the MCP does not provide that data and offer `get_collateral_history`, `get_latest_collateral`, `get_chain_collateral_history`, `get_oracle_status`, or Vault risk reads depending on the question.

Never call `get_supply_history` for collateral or Vault history questions. `get_supply_history` is only for USDD/sUSDD supply over time.

## Official MCP Current-State Analytics

Use the official MCP when the question needs wallet-aware, on-chain, or write-adjacent state:

| User asks about | Official tool |
|---|---|
| Wallet-specific Vault/CDP state | `get_user_vaults`, `get_vault_summary`, `analyze_vault_risk` |
| Chain-level mainnet metrics for TRON/ETH/BSC | `get_chain_metrics` |
| Latest collateral highest-price data | `get_collateral_prices` |
| Current PSM route fees/availability | `get_psm_metrics` |
| Current PSM market status | `get_psm_status` |
| Current Savings status for a network | `get_savings_status` |
| Treasury report summary | `get_treasury_summary` |
| JST buyback/burn stats | `get_jst_buyback_stats` |
| Smart Allocator proof/debt | `get_proof_of_reserve`, `get_debt_overview` |

Official MCP current-state tools use `network` when applicable. If the user asks for chain-specific current state without specifying a network, ask or present all supported mainnet families when the tool supports it.

## Workflow Rules

### Routing

- Public REST analytics, supply, collateral, Vault configuration, APY history, and Smart Allocator detail -> local analytics MCP.
- Current balances, wallet state, wallet-specific Vault state, PSM status, Savings status, treasury, and write-adjacent checks -> official MCP.
- If both are useful, call both and label sources separately.

### Chain / Network Selection

For local APY and supply breakdown tools, if the user omits a chain, present all returned chains rather than defaulting to TRON.

For `get_latest_collateral` and `get_chain_collateral_history`, `chain` must be `tron`, `eth`, or `bsc`. For `get_chain_collateral_history`, `interval` must be `WEEKLY`, `MONTHLY`, `BIANNUAL`, or `ANNUAL`; ask if the user does not specify enough detail.

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
- "Show USDD supply by chain." -> local `get_usdd_supply`
- "Show sUSDD supply breakdown across chains." -> local `get_susdd_supply`
- "What's the current protocol supply of USDD?" -> local `get_total_supply`, or `get_public_protocol_overview` for TVL context
- "Show collateral value history." -> local `get_collateral_history`
- "Show TRON collateral history for 1 month." -> local `get_chain_collateral_history` with `chain="tron"`, `interval="MONTHLY"`
- "Show Smart Allocator detail." -> local `get_smart_allocator_detail`; use official proof/debt tools if the user asks for proof of reserve or debt overview
- "Compare TRX-A collateral history." -> explain that no MCP tool currently provides per-ilk collateral history; offer chain-level history or current `get_oracle_status` / Vault risk reads

## Security

- Read-only skill. No approvals, no signing, no writes.
- Do not use analytics responses as authorization to execute transactions; product skills must run their own write prechecks.
- Do not hide MCP tool failures. They indicate the tool or its upstream data source needs maintenance.
