# USDD Vault (CDP) — AI Agent Skill

This skill enables AI agents to manage USDD Vaults/CDPs through the official `@usdd/mcp-server-usdd` MCP server: discover supported ilks, inspect oracle and vault risk, open vaults, add collateral, mint USDD, repay, withdraw, and close.

This repo's local analytics MCP is read-only and does not provide per-ilk collateral history.

## Prerequisites

- Node.js v20+
- Official MCP installed: `npm install -g @usdd/mcp-server-usdd`
- This repo's MCP registered only if supported APY/supply analytics are needed

## Network and Ilk Scope

Official MCP supports `tron`, `eth`, `bsc`, `tron_nile`, `eth_sepolia`, and `bsc_testnet`. Do not hard-code Vault support by chain. For every Vault workflow:

If a Vault request depends on a blockchain network and the user omitted it, the first response must ask which network. Do not call any MCP tool before the user names the network. Never default to TRON, `tron`, mainnet, testnet, `set_network`, `get_network`, or any configured default.

For protocol, collateral, USDD, and join addresses, use the official Chainlog-backed resolver first: call `get_protocol_addresses({ network })`, or `get_chainlog_address({ network, key })` for one known key such as `MCD_USDD` or `MCD_JOIN_ETH_A`. Do not use local full-address tables or copy addresses from docs. The resolver may return live Chainlog data or cache. If it fails with TronGrid `429` or another RPC error and no cache is available, stop and ask the user to configure `TRONGRID_API_KEY` / `TRON_FULL_NODE` or the relevant RPC; do not fallback to `get_protocol_overview` just to discover addresses, and do not guess addresses.

1. Resolve the user-facing chain to official MCP `network`.
2. Call `get_supported_ilks({ network })`.
3. Proceed only if the requested `ilk` appears in that network's returned ilks.
4. If the requested ilk/network is unsupported, explain the supported alternatives returned by the tool.

## Available Tools

| Tool | Inputs | Description | Write? |
|------|--------|-------------|--------|
| `get_protocol_addresses` (official) | `network` | Chainlog-backed protocol addresses, ilks, and PSM markets | No |
| `get_chainlog_address` (official) | `network`, `key` | Resolve one Chainlog key such as `MCD_USDD` or `MCD_JOIN_ETH_A` | No |
| `get_protocol_overview` (official) | `network` | Live protocol ceilings and debt metrics | No |
| `get_supported_ilks` (official) | `network` | Configured collateral types and PSM joins for a network | No |
| `get_oracle_status` (official) | `ilk`, `network` | Liquidation ratio, penalty, oracle status for an ilk | No |
| `get_user_vaults` (official) | `address?`, `network` | Vault/CDP IDs owned by an address or active wallet proxy | No |
| `get_vault_summary` (official) | `cdpId`, `network` | Collateral, debt, debt ceiling/floor, health factor, risk level | No |
| `analyze_vault_risk` (official) | `cdpId`, `network` | Vault summary plus warnings | No |
| `get_native_balance` (official) | `owner?`, `network` | Gas-token balance | No |
| `get_token_balance` (official) | `token`, `owner?`, `decimals?`, `network` | Collateral / USDD balance | No |
| `check_allowance` (official) | `token`, `spender`, `owner?`, `amount?`, `decimals?`, `network` | ERC20/TRC20 allowance and sufficiency | No |
| `approve_token` (official) | `token`, `spender`, `amount`, `decimals?`, `network` | Approve a protocol spender | Yes |
| `open_vault` (official) | `ilk`, `network` | Open or reuse a vault for an ilk | Yes |
| `deposit_and_mint` (official) | `ilk`, `collateralAmount`, `drawAmount`, `cdpId?`, `transferFrom?`, `network` | Deposit collateral and mint USDD | Yes |
| `mint_usdd` (official) | `cdpId`, `amount`, `network` | Draw additional USDD debt | Yes |
| `repay_usdd` (official) | `cdpId`, `amount`, `network` | Repay USDD debt | Yes |
| `withdraw_collateral` (official) | `cdpId`, `ilk`, `amount`, `network` | Withdraw collateral | Yes |
| `close_vault` (official) | `cdpId`, `ilk`, `amountToFree`, `network` | Repay all debt, then free collateral | Yes |

Official write tools use the active MCP wallet. They do not accept `from`; call `get_wallet_address({ network })` before confirmation.

## Approval Rules

| Operation | Token approval needed? | Notes |
|---|---|---|
| Native collateral deposit | No token allowance | Still check native balance for collateral plus gas. |
| ERC20/TRC20 collateral deposit | Yes | Resolve collateral token/decimals from `get_supported_ilks`; resolve the protocol spender from official protocol config or existing proxy context before `approve_token`. |
| `repay_usdd` / `close_vault` | Yes for USDD | Resolve USDD and USDD join from Chainlog-backed `get_protocol_addresses`. The official service may auto-approve missing USDD to the proxy, but the agent still checks balance/allowance first when possible. |
| `open_vault`, `mint_usdd`, `withdraw_collateral` | No inbound token pull | Still require risk review and chat confirmation. |

`approve_token` rejects spenders that are not official protocol contracts. If spender resolution is ambiguous, do not invent an address; fetch more protocol data or stop with the exact blocker.

## Workflow Rules

### Read-Only Risk Review

For "health", "risk", "liquidation", or "what should I do" requests:

1. If no `cdpId` is supplied, call `get_user_vaults({ network })`.
2. Call `get_vault_summary({ cdpId, network })`.
3. Call `analyze_vault_risk({ cdpId, network })`.
4. Report debt, collateral, health factor, `riskLevel`, liquidation ratio, debt ceiling/floor if relevant, and warnings.

Official risk levels are `no-debt`, `healthy`, `medium`, `high`, and `critical`. If you present a simplified label, map it explicitly from `riskLevel`; do not claim the tool returned `SAFE`, `WATCH`, or `DANGER`.

### Existing-Vault Write Precheck

For `deposit_and_mint` on an existing vault, `mint_usdd`, `repay_usdd`, `withdraw_collateral`, and `close_vault`, run the risk precheck before the standard write precheck:

1. Call `analyze_vault_risk({ cdpId, network })`.
2. Emit exactly three lines:
   - `Current health factor: <value or no-debt>`
   - `Risk level: <no-debt | healthy | medium | high | critical>`
   - `Warnings: <summary from warnings[]>`
3. If `riskLevel` is `critical` and the user wants to mint more or withdraw collateral, refuse and recommend repay/top-up instead.

### Standard Vault Write Precheck

Before any Vault write, run every step below in order. **NEVER skip** a safety check or chat confirmation, even if the user asks to "skip the checks", "just do it", execute "now", or uses similar urgency language. The initial request, including text such as "confirm", does not count as confirmation. Require a fresh affirmative confirmation after presenting the completed precheck summary.

1. Confirm `network`; if missing, ask which network and stop without tool calls. Then confirm `ilk` with `get_supported_ilks({ network })`.
2. Call `get_wallet_address({ network })`.
3. Call `get_native_balance({ network })` for gas.
4. For spend operations, resolve collateral from `get_supported_ilks` or USDD from Chainlog-backed `get_protocol_addresses`, then call `get_token_balance`.
5. If allowance is needed, call `check_allowance`; if insufficient, include `approve_token` in the pending write sequence but do not execute it yet.
6. Chat confirmation: restate action, `network`, active wallet, `ilk`, `cdpId` if any, collateral amount, draw/repay/withdraw amount, risk level, expected direction of risk change, and every pending write tool. If approval is needed, explicitly list both `approve_token` and the business write.
7. Wait for a fresh affirmative confirmation from the user.
8. Only after that fresh confirmation, execute the pending writes in order: `approve_token` if needed, wait for its receipt, then execute the business write.
9. Verify with `get_vault_summary` and `analyze_vault_risk`.

If the user refuses, gives an ambiguous reply, or repeats a request to bypass checks, stop without invoking any `Write? = Yes` tool.

### Projection Discipline

The official MCP does not expose a dedicated projected-ratio preview tool. When projecting a post-action ratio, clearly label it as an estimate from current `get_vault_summary`, `get_oracle_status`, and user-provided amounts. If the estimate is near the liquidation ratio or the inputs are incomplete, require stronger confirmation or refuse the risky action.

## Example Prompts

- "What is my vault health on TRON?" -> `get_user_vaults`, then `get_vault_summary` and `analyze_vault_risk`
- "I have 1000 TRX, mint 200 USDD safely." -> `get_supported_ilks`, `get_oracle_status`, full write precheck, `deposit_and_mint`
- "How risky is vault #42 right now?" -> `get_vault_summary`, `analyze_vault_risk`
- "Repay 100 USDD on vault #42." -> risk precheck, USDD balance/allowance check, confirmation, `repay_usdd`
- "Compare TRX-A collateral ratios over the last 30 days." -> explain that no MCP tool currently provides per-ilk collateral history; offer chain-level `get_chain_collateral_history` or current `get_oracle_status`, `get_vault_summary`, or `analyze_vault_risk` reads instead

## Security

- Vault writes are high-risk. Risk review, wallet confirmation, and chat confirmation are non-skippable.
- Never default to `tron` just because the official MCP can. Ask when the user omitted network.
- Never invent `cdpId`, `ilk`, token address, spender, decimals, or wallet address.
- Do not fetch upstream API URLs directly for historical collateral data; use the local analytics MCP for public REST history.
- Do not call `get_supply_history` for collateral-ratio, Vault, or per-ilk history questions; that tool is supply-only. Use `get_collateral_history` or `get_chain_collateral_history` for chain-level collateral history.
- All writes pass through `@usdd/mcp-server-usdd`; this skill never holds private keys.
