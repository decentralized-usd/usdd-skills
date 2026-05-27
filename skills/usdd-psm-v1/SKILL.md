# USDD PSM (Peg Stability Module) — AI Agent Skill

This skill enables AI agents to swap supported stablecoins to/from USDD through USDD PSM markets using the official `@usdd/mcp-server-usdd` MCP server.

The local analytics MCP is not used for PSM writes.

## Prerequisites

- Node.js v20+
- Official MCP installed: `npm install -g @usdd/mcp-server-usdd`

## Core Concepts

Official PSM tools require:

- `network`: one of `tron`, `eth`, `bsc`, `tron_nile`, `eth_sepolia`, `bsc_testnet`
- `market`: a PSM market key such as `PSM-USDT`, `PSM-USDC`, or `PSM-USD1`

If the user gives only a stable symbol such as "USDT", resolve it to a market by calling `get_protocol_overview({ network })` or `get_supported_ilks({ network })` and checking returned `psmMarkets`. If the user does not provide a network, ask before proceeding.

## Available Tools

| Tool | Inputs | Description | Write? |
|------|--------|-------------|--------|
| `get_protocol_overview` (official) | `network?` | Protocol addresses, configured ilks, and PSM markets | No |
| `get_supported_ilks` (official) | `network?` | Configured collateral types and PSM joins | No |
| `get_psm_status` (official) | `market`, `network?` | PSM market config, buy/sell enablement, in/out fees | No |
| `get_psm_metrics` (official) | `market`, `network?` | Route availability and route fees | No |
| `get_native_balance` (official) | `owner?`, `network?` | Gas-token balance | No |
| `get_token_balance` (official) | `token`, `owner?`, `decimals?`, `network?` | Input token balance | No |
| `check_allowance` (official) | `token`, `spender`, `owner?`, `amount?`, `decimals?`, `network?` | Token allowance and sufficiency | No |
| `approve_token` (official) | `token`, `spender`, `amount`, `decimals?`, `network?` | Approve token spending for a protocol spender | Yes |
| `psm_swap_to_usdd` (official) | `market`, `amount`, `network?` | Sell the market gem into USDD | Yes |
| `psm_swap_from_usdd` (official) | `market`, `amount`, `network?` | Buy the market gem with USDD | Yes |

Official write tools use the active MCP wallet. They do not accept `from`; call `get_wallet_address({ network })` before confirmation.

## Direction Semantics

| User intent | Official tool | `amount` means | Fee field to show |
|---|---|---|---|
| Stablecoin -> USDD | `psm_swap_to_usdd` | Amount of market gem to sell, e.g. USDT amount for `PSM-USDT` | `feeInPercent` / route fee from gem to USDD |
| USDD -> stablecoin | `psm_swap_from_usdd` | Amount of market gem to buy, not the amount of USDD to spend | `feeOutPercent` / route fee from USDD to gem |

For `psm_swap_from_usdd`, be explicit: if the user says "spend 100 USDD", compute or ask for the target gem amount before calling the tool. Do not pass a "USDD spend amount" as `amount` unless it is also the intended gem amount after fee.

## Direction-Specific Spenders

Use the spender that actually pulls the input token:

| Direction | Input token | Spender for `check_allowance` / `approve_token` |
|---|---|---|
| Stablecoin -> USDD (`psm_swap_to_usdd`) | Market gem, e.g. USDT for `PSM-USDT` | The market `gemJoin` address from `get_psm_status().market.gemJoin` or `get_supported_ilks()` |
| USDD -> stablecoin (`psm_swap_from_usdd`) | USDD | The PSM contract address from `get_psm_status().market.psm` |

Do not approve the PSM contract for `psm_swap_to_usdd` unless the official MCP output explicitly says the market has no `gemJoin` spender. The PSM contract calls `gemJoin.join(..., msg.sender)`, and `gemJoin` performs the token `transferFrom`.

## Workflow Rules

### PSM Quote / Read

1. Resolve `network`.
2. Resolve `market`.
3. Call `get_psm_status({ market, network })`.
4. Call `get_psm_metrics({ market, network })` when the user asks about routes, fee comparison, or availability.
5. Report buy/sell enablement, fees, market contract, gem token, gem decimals, and route availability.

The official tools expose enablement and route availability. They do not guarantee a remaining-capacity number. Do not claim a capacity check unless the returned data contains a concrete capacity/liquidity field.

### Write Precheck

Before either PSM swap:

1. Resolve `network` and `market`; verify the market exists.
2. Call `get_wallet_address({ network })`.
3. Call `get_psm_status({ market, network })` and verify the relevant direction is enabled:
   - `psm_swap_to_usdd`: `sellEnabled` must be true.
   - `psm_swap_from_usdd`: `buyEnabled` must be true.
4. Call `get_psm_metrics({ market, network })` and show the route fee/availability if present.
5. Resolve input token:
   - to USDD: market gem token and decimals from `get_psm_status().market`.
   - from USDD: USDD token from `get_protocol_overview({ network }).addresses.usdd`.
6. Resolve spender from the direction-specific spender table above.
7. Call `get_native_balance({ network })` for gas.
8. Call `get_token_balance` for the input token.
9. Call `check_allowance` for the input token and resolved spender.
10. If allowance is insufficient, call `approve_token` for the resolved spender.
11. Chat confirmation: restate direction, `network`, `market`, input amount, expected output/net amount after fee if calculable, fee percent, PSM contract, token spender, and active wallet.
12. Wait for an affirmative user response.
13. Execute `psm_swap_to_usdd` or `psm_swap_from_usdd`.
14. Verify by re-checking balances or `get_psm_status`.

If any token address, spender, or decimals cannot be resolved from official MCP outputs, stop and explain the missing field. Do not guess contract addresses.

## Example Prompts

- "What PSM markets exist on BSC?" -> `get_protocol_overview({ network: "bsc" })`
- "What is the fee to swap USDT into USDD on TRON?" -> `get_psm_status({ market: "PSM-USDT", network: "tron" })`
- "Swap 500 USDT to USDD on TRON." -> resolve `PSM-USDT`, full write precheck, `psm_swap_to_usdd`
- "Buy 1000 USDC from USDD on Ethereum." -> resolve `PSM-USDC`, full write precheck, `psm_swap_from_usdd` with `amount="1000"`

## Security

- PSM swaps are low slippage by design but not free. Always show the fee and direction-specific amount semantics.
- Never default to `tron` when the user omitted network.
- Never infer a `market` if multiple markets could match the user's wording.
- All writes pass through `@usdd/mcp-server-usdd`; this skill never holds private keys.
