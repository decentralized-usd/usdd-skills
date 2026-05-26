# USDD PSM (Peg Stability Module) — AI Agent Skill

This skill enables AI agents to swap supported stablecoins to / from USDD at a fixed rate with no slippage, via the USDD PSM contracts on TRON, ETH, and BSC.

Note: This skill requires the USDD official MCP server ([@usdd/mcp-server-usdd](https://github.com/decentralized-usd/mcp-server-usdd)) for write operations and all reads. This repo's local MCP is not used by this skill.

## Prerequisites

- Node.js v20+
- Official MCP installed: `npm install -g @usdd/mcp-server-usdd`

## Available Tools

| Tool | Inputs | Description | Write? | Requires Approval |
|------|--------|-------------|--------|--------------------|
| `get_psm_status` (official MCP) | `chain` | Available liquidity, fees in/out, supported stables on a chain | No | — |
| `get_psm_metrics` (official MCP) | — | Historical PSM metrics across chains | No | — |
| `get_token_balance` (official MCP) | `address`, `token`, `chain` | Input stable / USDD balance | No | — |
| `check_allowance` (official MCP) | `address`, `spender`, `token`, `chain` | PSM-contract allowance for the input token | No | — |
| `approve_token` (official MCP) | `token`, `spender`, `amount`, `chain` | Approve input token spending for the PSM contract | Yes | (this IS the approval) |
| `psm_swap_to_usdd` (official MCP) | `amount`, `stable`, `chain`, `from` | Swap stablecoin → USDD | Yes | Input stable (USDT / USDC / …) |
| `psm_swap_from_usdd` (official MCP) | `amount`, `stable`, `chain`, `from` | Swap USDD → stablecoin | Yes | USDD |

## Approval Matrix

| Tool | Requires approval? | Token | Why |
|---|---|---|---|
| `psm_swap_to_usdd` | Yes | Input stablecoin | PSM contract pulls the stable from the user |
| `psm_swap_from_usdd` | Yes | USDD | PSM contract pulls USDD from the user |

## Workflow Rules

### Chain selection (mandatory)
PSM is deployed on TRON, ETH, and BSC with different supported stables and fees per chain. If the user does not specify a chain, ask explicitly. **Never default silently to TRON.**

### Write precheck (7 steps — non-skippable; PSM-specific because it adds a capacity check between chain and balance)

Before invoking any `Write? = Yes` tool:

1. **Check chain** — confirm user specified the chain; verify the PSM contract supports the input stable on that chain.
2. **Check PSM capacity** — call `get_psm_status`; the swap must not exceed remaining liquidity / debt ceiling for that direction.
3. **Check balance** — call `get_token_balance` for the input token; cover swap amount + gas reserve.
4. **Check allowance** — call `check_allowance` for the PSM contract on the chosen chain. If allowance ≥ swap amount, skip to step 6.
5. **Approve if needed** — call `approve_token`. Wait for on-chain confirmation.
6. **Chat confirmation (non-skippable)** — restate: `direction (in / out) / input amount / output amount after fee / chain / PSM contract / from-address`. Wait for the user to type an affirmative confirmation.
7. **Execute** — call `psm_swap_to_usdd` or `psm_swap_from_usdd`. Return the receipt.

(Step 2 — PSM capacity — is unique to this skill; it does not apply to Earn / Vault.)

### Fee + slippage
PSM swaps have **zero slippage** but a **fixed fee** in / out. Always show the fee explicitly in the chat-confirmation message so the user sees the net output amount, not just the input.

## Example Prompts

- "How much USDC can the PSM still take on BSC?" → `get_psm_status` chain=bsc
- "Swap 500 USDT to USDD on TRON." → full precheck, then `psm_swap_to_usdd`
- "Redeem 1000 USDD to USDT on Ethereum, what fee will I pay?" → `get_psm_status`, then chat-confirm with explicit fee, then `psm_swap_from_usdd`

## Security

- All writes pass through `@usdd/mcp-server-usdd`. This skill never holds private keys.
- PSM fees and capacity are governance-controlled and can change. Always fetch fresh `get_psm_status` before any swap quote.
- Chat confirmation (step 6) must show fees explicitly.
