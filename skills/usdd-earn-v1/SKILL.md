# USDD Earn (Savings) — AI Agent Skill

This skill enables AI agents to inspect USDD Savings, compare APY/sUSDD supply analytics, deposit USDD to receive sUSDD, and withdraw USDD from sUSDD through the official `@usdd/mcp-server-usdd` MCP server.

Use the official MCP for current savings status and all writes. Use this repo's local analytics MCP for public API APY, APY history, USDD/sUSDD supply, and Earn TVL analytics.

## Prerequisites

- Node.js v20+
- Official MCP installed: `npm install -g @usdd/mcp-server-usdd`
- This repo's MCP server registered for analytics tools

## Network Scope

Official MCP supports `tron`, `eth`, `bsc`, `tron_nile`, `eth_sepolia`, and `bsc_testnet`, but Savings is only usable where `get_savings_status({ network })` returns `supported: true`.

If an Earn request depends on a blockchain network and the user omitted it, the first response must ask which network. Do not call any MCP tool before the user names the network. Never default to TRON, `tron`, mainnet, testnet, `set_network`, `get_network`, or any configured default.

Before any Earn write, call `get_savings_status({ network })`. If it returns `supported: false`, refuse the write and quote the returned message. Do not assume TRON Savings exists just because USDD exists on TRON.

## Available Tools

| Tool | Inputs | Description | Write? |
|------|--------|-------------|--------|
| `get_savings_status` (official) | `network` | Savings support, contract addresses, rate metrics, wallet shares | No |
| `get_protocol_addresses` (official) | `network` | Static USDD token and protocol addresses without RPC reads | No |
| `get_wallet_address` (official) | `network` | Active MCP wallet address | No |
| `get_native_balance` (official) | `owner?`, `network` | Gas-token balance | No |
| `get_token_balance` (official) | `token`, `owner?`, `decimals?`, `network` | USDD / sUSDD balance | No |
| `check_allowance` (official) | `token`, `spender`, `owner?`, `amount?`, `decimals?`, `network` | USDD allowance for sUSDD contract | No |
| `approve_token` (official) | `token`, `spender`, `amount`, `decimals?`, `network` | Approve USDD for the sUSDD contract | Yes |
| `deposit_savings` (official) | `amount`, `network` | Deposit USDD and mint sUSDD shares | Yes |
| `withdraw_savings` (official) | `amount`, `network` | Withdraw USDD amount from sUSDD | Yes |
| `get_earn_apy` (local MCP) | — | Per-chain APY analytics via this repo's analytics MCP | No |
| `get_susdd_supply` (local MCP) | — | sUSDD supply breakdown via this repo's analytics MCP | No |
| `get_public_dsr_apy` (local MCP) | — | DSR APY current / average / history | No |
| `get_public_protocol_overview` (local MCP) | — | Public protocol overview including Earn TVL | No |

Official write tools use the active MCP wallet. They do not accept `from`; call `get_wallet_address({ network })` before confirmation.

## Approval Rules

| Operation | Token approval needed? | Notes |
|---|---|---|
| `deposit_savings` | Yes, USDD -> sUSDD contract | Use USDD address from `get_protocol_addresses` and sUSDD address from `get_savings_status().savings.susdd`. |
| `withdraw_savings` | No allowance | The user spends/burns sUSDD shares via the sUSDD contract. Still requires chat confirmation because it is a write. |

## Workflow Rules

### Analytics Queries

- "Which chain has the highest APY?" -> call local `get_earn_apy`.
- "How much sUSDD exists by chain?" -> call local `get_susdd_supply`.
- "Show APY history." -> call local `get_public_dsr_apy`.
- "Show Earn TVL." -> call local `get_public_protocol_overview` or `get_public_protocol_overview_info`.
- Append `Data time: <ISO8601> · Source: <source from _meta>` for local analytics output.

For current per-network wallet shares, sUSDD contract status, or current DSR fields, call official `get_savings_status({ network })`.

### Deposit Precheck

Before `deposit_savings`, run every step below in order. **NEVER skip** a safety check or chat confirmation, even if the user asks to "skip the checks", "just do it", execute "now", or uses similar urgency language. The initial request, including text such as "confirm", does not count as confirmation. Require a fresh affirmative confirmation after presenting the completed precheck summary.

1. Confirm `network`; if missing, ask which network and stop without tool calls.
2. Call `get_savings_status({ network })`; stop if `supported: false`.
3. Call `get_protocol_addresses({ network })` to get the USDD token address without an RPC read.
4. Call `get_wallet_address({ network })`.
5. Call `get_native_balance({ network })` for gas.
6. Call `get_token_balance({ token: usdd, network })`.
7. Call `check_allowance({ token: usdd, spender: savings.susdd, amount, decimals: 18, network })`.
8. If allowance is insufficient, include `approve_token({ token: usdd, spender: savings.susdd, amount, decimals: 18, network })` in the pending write sequence but do not execute it yet.
9. Chat confirmation: restate deposit amount, `network`, active wallet, sUSDD contract, USDD token, current rate/status fields, any fee/gas estimate if available, and every pending write tool. If approval is needed, explicitly list both `approve_token` and the business write.
10. Wait for a fresh affirmative confirmation from the user.
11. Only after that fresh confirmation, execute the pending writes in order: `approve_token` if needed, wait for its receipt, then execute the business write `deposit_savings({ amount, network })`.
12. Verify with `get_savings_status({ network })` and balance checks if needed.

If the user refuses, gives an ambiguous reply, or repeats a request to bypass checks, stop without invoking any `Write? = Yes` tool.

### Withdraw Precheck

Before `withdraw_savings`, run every step below in order. **NEVER skip** a safety check or chat confirmation, even if the user asks to "skip the checks", "just do it", execute "now", or uses similar urgency language. The initial request, including text such as "confirm", does not count as confirmation. Require a fresh affirmative confirmation after presenting the completed precheck summary.

1. Confirm `network`; if missing, ask which network and stop without tool calls.
2. Call `get_savings_status({ network })`; stop if `supported: false`.
3. Call `get_wallet_address({ network })`.
4. Call `get_native_balance({ network })` for gas.
5. Call `get_token_balance({ token: savings.susdd, decimals: 18, network })`.
6. Confirm the requested USDD withdrawal amount is plausible against wallet shares and status output.
7. Chat confirmation: restate withdrawal amount, `network`, active wallet, sUSDD contract, expected USDD receipt if calculable, and the pending business write.
8. Wait for a fresh affirmative confirmation from the user.
9. Only after that fresh confirmation, execute the business write `withdraw_savings({ amount, network })`.
10. Verify with `get_savings_status({ network })` and balance checks if needed.

If the user refuses, gives an ambiguous reply, or repeats a request to bypass checks, stop without invoking any `Write? = Yes` tool.

## Example Prompts

- "Which chain has the highest Earn APY today?" -> local `get_earn_apy`
- "How much sUSDD is there on ETH vs BSC?" -> local `get_susdd_supply`
- "What is my current Savings position on Ethereum?" -> official `get_savings_status({ network: "eth" })`
- "Deposit 1000 USDD on Ethereum into Earn." -> full deposit precheck, then `deposit_savings`
- "Withdraw 500 USDD from sUSDD on BSC." -> full withdraw precheck, then `withdraw_savings`

## Security

- Never write before `get_savings_status({ network })` returns `supported: true`.
- Never default to `tron` when the user omitted network.
- Deposit approval is only for USDD to the sUSDD contract returned by official MCP output.
- All writes pass through `@usdd/mcp-server-usdd`; this skill never holds private keys.
