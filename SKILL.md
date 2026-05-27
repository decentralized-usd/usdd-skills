# USDD DAO — AI Agent Skills

This bundle teaches AI agents how to use the [USDD](https://usdd.io) protocol safely across the local analytics MCP and the official `@usdd/mcp-server-usdd` MCP server.

## Architecture

Two MCP servers, non-overlapping:

| Server | Package | Role |
|---|---|---|
| Official MCP | [`@usdd/mcp-server-usdd`](https://github.com/decentralized-usd/mcp-server-usdd) | Wallet/network state, protocol reads, Vault / PSM / Savings writes, token transfer, treasury, Smart Allocator |
| Analytics MCP (this repo) | `scripts/mcp_server.mjs` | Read-only public USDD API tools; the MCP owns all upstream REST access |

Route wallet state, on-chain reads, and writes to the official MCP. Route public REST analytics and dashboard data to this repo's analytics MCP. Agents must call MCP tools for analytics data; do not fetch upstream API URLs directly from skill workflows. `get_supply_history` is supply-only; use `get_collateral_history` or `get_chain_collateral_history` for collateral history. There is still no per-ilk historical tool named `get_ilk_collateral_history`; the public `collateral-history` endpoint is keyed by `chain` and `interval`, not by `ilk`.

## Official MCP Capabilities

The official MCP exposes these tool groups:

| Group | Tools |
|---|---|
| Wallet / network | `get_supported_networks`, `set_network`, `get_network`, `connect_browser_wallet`, `set_wallet_mode`, `get_wallet_mode`, `get_wallet_address`, `list_wallets`, `import_wallet`, `set_active_wallet` |
| Common preflight | `get_native_balance`, `get_token_balance`, `check_allowance`, `approve_token` |
| Protocol reads | `get_protocol_overview`, `get_supported_ilks`, `get_oracle_status`, `get_protocol_metrics`, `get_chain_metrics`, `get_collateral_prices` |
| Vault | `get_user_vaults`, `get_vault_summary`, `analyze_vault_risk`, `open_vault`, `deposit_and_mint`, `mint_usdd`, `repay_usdd`, `withdraw_collateral`, `close_vault` |
| PSM | `get_psm_status`, `get_psm_metrics`, `psm_swap_to_usdd`, `psm_swap_from_usdd` |
| Savings | `get_savings_status`, `deposit_savings`, `withdraw_savings` |
| Token transfer | `prepare_token_transfer`, `confirm_token_transfer` |
| Treasury / allocator | `get_treasury_summary`, `get_jst_buyback_stats`, `get_smart_allocator_overview`, `get_assets_breakdown`, `get_proof_of_reserve`, `get_debt_overview` |

## Supported Networks

Official MCP `network` values:

| Family | Mainnet | Testnet |
|---|---|---|
| TRON | `tron` | `tron_nile` |
| Ethereum | `eth` | `eth_sepolia` |
| BSC | `bsc` | `bsc_testnet` |

Official MCP tool arguments use `network`, not `chain`. If the user names a chain, map it to the right `network` value. If the user does not specify a network and the operation depends on one, ask before proceeding. Do not rely on the official MCP's silent default.

## Global Rules

### Active Wallet

Official write tools use the MCP server's active wallet. They do not accept a `from` argument. Before any write, call `get_wallet_address({ network })` and use the returned address in the user-facing confirmation.

### TRON Signing Mode

TRON operations may return a STOP message requiring signing-mode confirmation. If that happens:

1. Stop all other tool use.
2. Present the two choices from the error to the user:
   - Browser wallet: call `connect_browser_wallet`.
   - Agent wallet: call `set_wallet_mode` with `mode="agent"`.
3. Wait for the user's explicit choice.
4. Only then retry the original operation.

### Standard Asset-Write Precheck

Before invoking Vault, PSM, or Savings write tools, run:

1. Resolve `network` and required market/ilk/token addresses.
2. Call `get_wallet_address({ network })` to confirm the active wallet.
3. Check native gas balance with `get_native_balance({ network })`.
4. Check input-token balance with `get_token_balance` when the operation spends ERC20/TRC20 tokens.
5. Check allowance with `check_allowance` when a protocol contract pulls ERC20/TRC20 tokens.
6. If allowance is insufficient, call `approve_token` for the exact protocol spender and wait for confirmation.
7. Chat confirmation: restate action, amount, fee or risk fields, `network`, protocol contract/spender, and active wallet address. Wait for an affirmative user response.
8. Execute the official write tool.
9. Run the relevant post-write read (`get_vault_summary`, `get_psm_status`, `get_savings_status`, or balance checks) and summarize the result.

PSM spender exception: for `psm_swap_to_usdd`, approve the market gem token to the market `gemJoin` address, not the PSM contract. For `psm_swap_from_usdd`, approve USDD to the PSM contract.

This flow does not apply to wallet/network administration tools such as `set_network`, `connect_browser_wallet`, `set_wallet_mode`, `import_wallet`, or `set_active_wallet`; those still require clear user intent before use. The official MCP write tools for Vault, PSM, and Savings are single-call. Chat-layer confirmation is therefore mandatory. Token transfer is the exception: it has its own MCP-level `prepare_token_transfer` -> user confirmation -> `confirm_token_transfer` flow.

### Analytics Freshness Footer

This repo's analytics MCP adds `_meta.dataTime` and `_meta.source`. When summarizing local analytics output, append:

`Data time: <ISO8601> · Source: openapi.usdd.io`

### Error Fallback

If any MCP returns `isError: true`, surface the error message clearly and stop that workflow. Do not guess missing paths, markets, ilks, token decimals, or contract addresses.

## Skills in this Bundle

| Skill | Scope | Writes? |
|---|---|---|
| [`usdd-vault-v1`](./skills/usdd-vault-v1/SKILL.md) | Vault / CDP: open, deposit, mint, repay, withdraw, close, risk review | Yes |
| [`usdd-psm-v1`](./skills/usdd-psm-v1/SKILL.md) | Peg Stability Module: stablecoin <-> USDD swap | Yes |
| [`usdd-earn-v1`](./skills/usdd-earn-v1/SKILL.md) | Savings: deposit USDD -> sUSDD, redeem back | Yes |
| [`usdd-analytics-v1`](./skills/usdd-analytics-v1/SKILL.md) | Read-only analytics and current-state routing | No |

## Quick Links

- Install: see `README.md`
- Endpoint catalog: `docs/api-reference.md`
- Per-protocol guides: `docs/vault-guide.md` · `docs/psm-guide.md` · `docs/earn-guide.md`
- Implementation design: `docs/superpowers/specs/2026-05-25-usdd-skills-design.md`
