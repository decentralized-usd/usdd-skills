# USDD Vault (CDP) — AI Agent Skill

This skill enables AI agents to interact with USDD Vaults (CDPs): open a vault, lock collateral, mint USDD against it, monitor health, repay, withdraw, and close. Vault is the primary mint route for USDD.

Note: This skill requires the USDD official MCP server (@usdd/mcp-server-usdd) for write operations and all reads. This repo's local MCP is used only for per-ilk historical analytics (`get_ilk_collateral_history`).

## Prerequisites

- Node.js v20+
- Official MCP installed: `npm install -g @usdd/mcp-server-usdd`
- This repo's MCP for per-ilk history

## Available Tools

| Tool | Inputs | Description | Write? | Requires Approval |
|------|--------|-------------|--------|--------------------|
| `get_oracle_status` (official) | — | Latest collateral prices and oracle freshness | No | — |
| `get_supported_ilks` (official) | — | Supported ilks, min ratio, stability fee, debt ceiling | No | — |
| `get_user_vaults` (official) | `address`, `chain` | All vaults owned by the user on a chain | No | — |
| `get_vault_summary` (official) | `vaultId`, `chain` | Collateral, debt, ratio for a specific vault | No | — |
| `analyze_vault_risk` (official) | `vaultId`, `chain` | Liquidation price, health factor, risk tier | No | — |
| `get_token_balance` (official) | `address`, `token`, `chain` | Collateral / USDD balance | No | — |
| `check_allowance` (official) | `address`, `spender`, `token`, `chain` | Vault-contract allowance | No | — |
| `approve_token` (official) | `token`, `spender`, `amount`, `chain` | Approve collateral or USDD for the Vault contract | Yes | (this IS the approval) |
| `get_ilk_collateral_history` (this repo) | `ilk` | Per-ilk historical ratio, debt, APY | No | — |
| `open_vault` (official) | `ilk`, `chain`, `from` | Open a new vault for a given ilk | Yes | None |
| `deposit_and_mint` (official) | `vaultId`, `collateralAmount`, `mintAmount`, `chain`, `from` | Lock collateral and mint USDD in one tx | Yes | Collateral token (skip if TRX native) |
| `mint_usdd` (official) | `vaultId`, `amount`, `chain`, `from` | Mint additional USDD from an existing vault | Yes | None |
| `repay_usdd` (official) | `vaultId`, `amount`, `chain`, `from` | Repay USDD debt | Yes | USDD |
| `withdraw_collateral` (official) | `vaultId`, `amount`, `chain`, `from` | Withdraw unlocked collateral | Yes | None |
| `close_vault` (official) | `vaultId`, `chain`, `from` | Repay all debt and withdraw all collateral | Yes | USDD (for repay portion) |

## Approval Matrix

| Tool | Requires approval? | Token | Why |
|---|---|---|---|
| `deposit_and_mint` | Yes (unless TRX native) | Collateral token | Vault contract pulls collateral from user |
| `repay_usdd` / `close_vault` | Yes | USDD | Vault contract pulls USDD from user |
| `open_vault` / `mint_usdd` / `withdraw_collateral` | No | — | No inbound token pull (open is bookkeeping, mint creates new debt, withdraw returns user assets) |

## Workflow Rules

### Chain
Vault is deployed on TRON only (in v1). If the user asks about Vault on ETH or BSC, explain the scope and offer the user the equivalent USDD path via the PSM skill instead. Re-check by calling `get_supported_ilks` if uncertain.

### Risk-summary precheck (Vault-specific, runs BEFORE step 1 of the standard 6 steps)

Before *any* of the 6-step write precheck, for any write that affects an existing vault (`deposit_and_mint` on existing vault / `mint_usdd` / `repay_usdd` / `withdraw_collateral` / `close_vault`), the AI:

- Calls `analyze_vault_risk(vaultId, chain)`.
- Emits exactly three lines to the user:
  - `Current collateral ratio: <value>%`
  - `Liquidation price: <token> at <price>`
  - `Risk tier: <SAFE | WATCH | DANGER>`
- Only after these three lines are shown does the AI move on to step 1 of the 6-step precheck.

### Write precheck (standard 6 steps — non-skippable)

1. Check chain (TRON)
2. Check balance (collateral or USDD)
3. Check allowance (Vault contract)
4. Approve if needed
5. **Chat confirmation (non-skippable)** — restate: `action (open / deposit+mint / mint / repay / withdraw / close) / vaultId / collateral amount / mint or repay amount / chain / from-address / projected new ratio / projected new liquidation price`
6. Execute

The chat-confirmation line for vault writes MUST include the **projected new collateral ratio** and **projected new liquidation price** after the action, computed from oracle + intended numbers. This is the single most important field for the user to verify.

### When to refuse outright (or strongly warn)

- If `analyze_vault_risk` returns `risk tier = DANGER` and the user asks to **mint more** or **withdraw collateral**, refuse and recommend repay / top-up instead. Do not proceed to step 1 of the precheck.
- If projected new collateral ratio after the action would dip below the ilk's `liquidationRatio + 10%` safety buffer, warn loudly in step 5 and require the user to type a *stronger* confirmation phrase (e.g. echo back the projected ratio).

## Example Prompts

- "What is my vault health?" → `get_user_vaults`, then `analyze_vault_risk` for each
- "I have 1000 TRX, mint 200 USDD safely." → `get_oracle_status`, compute safe ratio, full precheck, `deposit_and_mint`
- "How risky is vault #42 right now?" → `analyze_vault_risk`, emit 3-line risk summary
- "Repay all my USDD debt." → risk summary, full precheck (USDD approve), `repay_usdd` for full debt
- "Compare TRX-A and stETH-A collateral ratios over the last 30 days." → `get_ilk_collateral_history` (this repo's MCP)

## Security

- Vault writes are the highest-risk in this bundle. **Risk summary + projected ratio + chat confirmation are all non-skippable.**
- All writes pass through `@usdd/mcp-server-usdd`. This skill never holds private keys.
- For ilks with `DANGER` risk tier, mint and withdraw are refused. Only repay or top-up paths proceed.
