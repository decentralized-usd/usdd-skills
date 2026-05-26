# USDD Earn (Savings) — AI Agent Skill

This skill enables AI agents to query USDD Savings APY, deposit USDD to receive sUSDD, and redeem sUSDD back to USDD. sUSDD appreciates against USDD as savings rate accrues.

Note: This skill requires the USDD official MCP server ([@usdd/mcp-server-usdd](https://github.com/decentralized-usd/mcp-server-usdd)) for write operations and most reads. Analytics-history queries (per-chain APY comparison, sUSDD supply breakdown) also use this repo's local MCP.

## Prerequisites

- Node.js v20+
- Official MCP installed: `npm install -g @usdd/mcp-server-usdd`
- This repo's MCP server installed for analytics history

## Available Tools

| Tool | Inputs | Description | Write? | Requires Approval |
|------|--------|-------------|--------|--------------------|
| `get_savings_status` (official MCP) | `chain` | Current savings rate, sUSDD exchange rate, total supply on a given chain | No | — |
| `get_token_balance` (official MCP) | `address`, `token`, `chain` | USDD / sUSDD balance | No | — |
| `check_allowance` (official MCP) | `address`, `spender`, `token`, `chain` | Earn-contract allowance for USDD | No | — |
| `approve_token` (official MCP) | `token`, `spender`, `amount`, `chain` | Approve USDD spending for the Earn contract | Yes | (this IS the approval) |
| `get_earn_apy` (this repo MCP) | — | Per-chain APY for cross-chain comparison | No | — |
| `get_susdd_supply` (this repo MCP) | — | sUSDD supply broken down by chain | No | — |
| `deposit_savings` (official MCP) | `amount`, `chain`, `from` | Deposit USDD, receive sUSDD | Yes | USDD |
| `withdraw_savings` (official MCP) | `amount`, `chain`, `from` | Redeem sUSDD back to USDD | Yes | None |

## Approval Matrix

| Tool | Requires approval? | Token | Why |
|---|---|---|---|
| `deposit_savings` | Yes | USDD | Earn contract pulls USDD from the user's wallet |
| `withdraw_savings` | No | — | Burns sUSDD, returns USDD to user (no inbound pull) |

## Workflow Rules

### Chain selection (mandatory)
Earn is deployed on TRON, ETH, and BSC. If the user does not specify a chain, ask explicitly. **Never default silently to TRON.**

### Write precheck (6 steps — non-skippable)

Before invoking any `Write? = Yes` tool, run these steps **in order**:

1. **Check chain** — confirm user specified the chain; verify the Earn contract is deployed on that chain.
2. **Check balance** — call official MCP `get_token_balance` for the input token; the amount must cover both the deposit and a gas reserve. If insufficient, abort and report the gap.
3. **Check allowance** — call official MCP `check_allowance` for the Earn contract on the chosen chain. If allowance ≥ deposit amount, skip to step 5.
4. **Approve if needed** — call official MCP `approve_token` to set allowance. Wait for on-chain confirmation. Abort if the user cancels or the approval reverts.
5. **Chat confirmation (non-skippable)** — restate in the conversation: `amount / fee estimate / chain / Earn contract / from-address`. Wait for the user to type an affirmative confirmation. Abort if the user says no or amends parameters.
6. **Execute** — call the official MCP write tool (`deposit_savings` or `withdraw_savings`). Return the receipt summary.

> The official MCP does NOT expose `prepare_*/confirm_*` for Earn writes — they are single-call. Step 5's chat confirmation is the contract-level safety check and is mandatory regardless of what the underlying MCP exposes.

### Data freshness footer
For analytics tools (`get_earn_apy`, `get_susdd_supply`) append:
`Data time: <ISO8601> · Source: openapi.usdd.io`

## Example Prompts

- "Which chain has the highest Earn APY today?" → `get_earn_apy`
- "How much sUSDD is there on ETH vs TRON?" → `get_susdd_supply`
- "What is the current Earn APY on Ethereum?" → official `get_savings_status` with chain=eth
- "Deposit 1000 USDD on Ethereum into Earn." → full 6-step precheck, then `deposit_savings`
- "Withdraw all my sUSDD on TRON." → 6-step precheck (skipping the approve step since withdrawal needs no approval), then `withdraw_savings`

## Security

- All writes pass through `@usdd/mcp-server-usdd`. This skill never holds private keys.
- Chat confirmation in step 5 is non-skippable. Skipping it is a skill-contract violation.
