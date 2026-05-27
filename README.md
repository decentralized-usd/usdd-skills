# USDD Skills

![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)
![Networks: TRON · ETH · BSC](https://img.shields.io/badge/Networks-TRON_·_ETH_·_BSC-red)
![MCP](https://img.shields.io/badge/MCP-Compatible-blue)

AI Agent skills for the [USDD](https://usdd.io) stablecoin protocol. Provides structured instructions and a local analytics MCP server that enables AI agents (Claude Code, Claude Desktop, Cursor, Codex, OpenCode) to query the public read-only USDD API, and — via the official `@usdd/mcp-server-usdd` package — open vaults, swap on PSM, and deposit into Earn.

## Features

- **Vault (CDP)** — open, deposit, mint, repay, withdraw, close — with built-in risk-summary precheck and projected-ratio chat confirmation.
- **PSM** — swap stablecoins ↔ USDD at fixed rate, no slippage, explicit fees in chat confirmation.
- **Earn (Savings)** — deposit USDD to receive sUSDD; redeem back at the current rate.
- **Analytics** — public read-only USDD API data: supply, APY, collateral, Vault configuration, per-chain history, and Smart Allocator detail.

## Architecture

Two MCP servers, non-overlapping:

| Server | Source | Role |
|---|---|---|
| Analytics MCP (this repo) | `scripts/mcp_server.mjs` | 14 read-only MCP tools backed by the public USDD API |
| Official MCP | npm `@usdd/mcp-server-usdd` | Wallet, Vault/PSM/Earn reads & writes, protocol metrics, treasury, Smart Allocator |

Skills route automatically. Write operations always go through the official MCP.

## Supported Networks

- TRON mainnet / Nile testnet
- Ethereum mainnet
- BSC mainnet

## Quick Start

### 1. Install this repo's analytics MCP

```bash
git clone https://github.com/decentralized-usd/usdd-skills
cd usdd-skills
bash install.sh
```

### 2. Install the official MCP (for writes)

```bash
npm install -g @usdd/mcp-server-usdd
```

### 3. Run

**Analytics MCP smoke:**
```bash
npm run mcp:list-tools         # List the 14 analytics tools
node scripts/usdd_api.mjs      # CLI usage
```

**Unit tests:**
```bash
npm test
```

## Client Configuration

### Claude Desktop

Edit `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "usdd-analytics": {
      "command": "node",
      "args": ["/ABS_PATH/usdd-skills/scripts/mcp_server.mjs"]
    },
    "usdd-full": {
      "command": "mcp-server-usdd",
      "env": {
        "TRONGRID_API_KEY": "your_key_optional",
        "ETH_RPC_URL": "your_url_optional",
        "BSC_RPC_URL": "your_url_optional"
      }
    }
  }
}
```

### Cursor

Add to `.cursor/mcp.json` — same structure as above.

### Claude Code

Register project-scoped MCP servers:

```bash
claude mcp add -s project usdd-analytics -- node /ABS_PATH/usdd-skills/scripts/mcp_server.mjs
claude mcp add -s project usdd-full -- mcp-server-usdd
```

### OpenCode / Codex CLI

See `.codex/INSTALL.md`.

## Available Tools (this repo's analytics MCP)

| Tool | Description |
|------|-------------|
| `get_earn_apy` | USDD Savings APY per chain |
| `get_usdd_supply` | USDD supply per chain |
| `get_susdd_supply` | sUSDD supply per chain |
| `get_supply_history` | Time series of USDD and sUSDD supply per chain |
| `get_collateral_history` | Time series of total collateral value per chain |
| `get_circulating_supply` | Raw circulating supply |
| `get_total_supply` | Raw total supply |
| `get_public_protocol_overview` | Public REST protocol overview |
| `get_public_protocol_overview_info` | Public REST protocol overview with 24h changes |
| `get_public_dsr_apy` | DSR APY current / average / history |
| `get_vault_collaterals` | Vault collateral configuration list |
| `get_latest_collateral` | Per-chain collateral snapshot |
| `get_chain_collateral_history` | Per-chain historical series for chart intervals |
| `get_smart_allocator_detail` | Smart Allocator detail overview |

There is still no per-ilk historical tool named `get_ilk_collateral_history`. The public `collateral-history` endpoint is keyed by `chain` and `interval`, not by `ilk`.

For Vault / PSM / Earn / balance / allowance / protocol-overview / treasury / Smart Allocator tools, see the official MCP: <https://github.com/decentralized-usd/mcp-server-usdd>.

## Example Conversations

- **"Which chain has the highest USDD Earn APY today?"**
  → analytics MCP `get_earn_apy` → AI compares TRON / ETH / BSC

- **"Deposit 1000 USDD on Ethereum into Earn."**
  → official MCP balance / allowance / approve_token → chat confirmation → `deposit_savings`

- **"What's my vault #42 health?"**
  → official MCP `analyze_vault_risk` → 3-line risk summary (ratio / liquidation price / tier)

- **"What's the protocol supply right now?"**
  → official MCP `get_protocol_metrics`, or analytics MCP `get_total_supply` when a raw total-supply number is sufficient

## Security

- This repo's MCP is **read-only**. No transaction signing, no private keys.
- Writes are delegated to `@usdd/mcp-server-usdd`, which manages wallets and chain RPCs in its own env.
- All write skills mandate a non-skippable chat-layer confirmation before invoking the underlying single-step write tool.
- Vault writes additionally mandate a risk-summary precheck (collateral ratio / liquidation price / risk tier).
- Use Nile testnet (`NETWORK=nile`) for all dry runs before mainnet.

## License

MIT License · Copyright (c) 2026 USDD
