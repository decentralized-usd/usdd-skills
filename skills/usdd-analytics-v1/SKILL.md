# USDD Analytics — AI Agent Skill

This skill enables AI agents to query historical USDD analytics — supply, collateral, Earn APY, and per-ilk metrics — that the official MCP does not expose. Reads come from `openapi.usdd.io` via this repo's local analytics MCP server.

Note: This skill pairs with the USDD official MCP server ([@usdd/mcp-server-usdd](https://github.com/decentralized-usd/mcp-server-usdd)) for current-state reads (protocol overview, chain metrics, treasury, Smart Allocator). For historical / per-chain analytics, this skill uses this repo's local MCP.

## Prerequisites

- Node.js v20+
- This repo's MCP server installed and registered in the AI client (see README)

## Available Tools

| Tool | Inputs | Description | Write? |
|------|--------|-------------|--------|
| `get_earn_apy` | — | USDD Savings APY per chain (TRON / ETH / BSC) | No |
| `get_susdd_supply` | — | sUSDD total supply broken down by chain | No |
| `get_supply_history` | — | Time series of USDD & sUSDD supply per chain | No |
| `get_collateral_history` | — | Time series of protocol-wide collateral value per chain | No |
| `get_circulating_supply` | — | Raw USDD circulating supply | No |
| `get_total_supply` | — | Raw USDD total supply | No |
| `get_ilk_collateral_history` | `ilk` | Per-ilk historical ratio, debt, APY | No |

## Workflow Rules

### Chain selection
If the user asks about supply / APY without naming a chain, present all chains (TRON, ETH, BSC). Do not silently default to TRON.

### Data freshness footer
Every analytics response carries a `_meta` block with `dataTime` (ISO8601) and `source` (`openapi.usdd.io`). When summarizing for the user, append a one-line footer:
`Data time: <ISO8601> · Source: openapi.usdd.io`

### Cross-MCP routing
For *current* state (TVL, balance, vault summary, PSM status, savings status, smart allocator detail), call the official MCP tools (`get_protocol_overview`, `get_chain_metrics`, etc.). Use this skill's tools only when the question is **historical** or per-chain analytics not covered by the official MCP.

## Example Prompts

- "How did USDD circulating supply change last week per chain?"
- "Which chain has the highest Earn APY today?"
- "Compare TRX-A and stETH-A collateral ratios over the last 30 days."
- "What's the current raw circulating supply of USDD?"
- "Show sUSDD supply breakdown across TRON, ETH, BSC."

## Security

- Read-only skill. No transaction signing.
- No API key required (`openapi.usdd.io` is keyless).
