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

- TRON mainnet / Nile testnet: `tron`, `tron_nile`
- Ethereum mainnet / Sepolia testnet: `eth`, `eth_sepolia`
- BSC mainnet / BSC testnet: `bsc`, `bsc_testnet`

## Quick Start

### Recommended: one-command setup

```bash
npx @usdd/usdd-skills setup --yes
```

The setup command installs the durable `usdd-skills` and `mcp-server-usdd` binaries, writes MCP client config with backups, creates the skills symlink, and configures these MCP servers:

- `usdd-analytics` -> `usdd-skills mcp-server`
- `usdd-full` -> `mcp-server-usdd`

To install straight from GitHub without npm:

```bash
npx --yes \
  --package=git+https://github.com/decentralized-usd/usdd-skills.git \
  usdd-skills setup --yes
```

To choose clients explicitly:

```bash
usdd-skills setup --client claude-desktop,cursor,codex --yes
```

### Local checkout setup

```bash
git clone https://github.com/decentralized-usd/usdd-skills.git
cd usdd-skills
bash install.sh
```

`install.sh` uses the current checkout as the analytics MCP source and configures detected clients. The generated project `.mcp.json` is ignored by Git and uses `node` with a relative script path. User-level client configs use absolute local paths so desktop applications do not depend on shell `PATH`.

The tracked `.mcp.json.example` is the portable project template. It intentionally contains no local paths or RPC values.

### Verify

**Analytics MCP smoke:**
```bash
usdd-skills list-tools         # List the 14 analytics tools
node scripts/usdd_api.mjs      # CLI usage from a local checkout
```

**Unit tests:**
```bash
npm test
```

## Client Configuration

### Project-local config

The setup command generates an ignored `.mcp.json` for the current checkout. Use the tracked `.mcp.json.example` as the portable template and do not commit the generated file.

### Claude Desktop

Edit `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "usdd-analytics": {
      "command": "usdd-skills",
      "args": ["mcp-server"]
    },
    "usdd-full": {
      "command": "mcp-server-usdd",
      "env": {
        "TRONGRID_API_KEY": "your_key_optional",
        "TRON_FULL_NODE": "your_tron_url_optional",
        "TRON_NILE_FULL_NODE": "your_nile_url_optional",
        "ETH_RPC_URL": "your_url_optional",
        "ETH_SEPOLIA_RPC_URL": "your_sepolia_url_optional",
        "BSC_RPC_URL": "your_url_optional",
        "BSC_TESTNET_RPC_URL": "your_bsc_testnet_url_optional"
      }
    }
  }
}
```

`TRONGRID_API_KEY` or a dedicated `TRON_FULL_NODE` is recommended for live TRON reads. Protocol address lookup uses the official MCP Chainlog-backed `get_protocol_addresses` resolver, which can return live Chainlog data or a local cache. If Chainlog live reads hit TronGrid `429` and no cache is available, configure `TRONGRID_API_KEY` / `TRON_FULL_NODE`; agents must not fallback to `get_protocol_overview` just to discover addresses.

### Cursor

Add to `.cursor/mcp.json` — same structure as above.

### Claude Code

Register project-scoped MCP servers:

```bash
claude mcp add -s project usdd-analytics -- usdd-skills mcp-server
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
  → official MCP balance / allowance checks → chat confirmation listing `approve_token` if needed and `deposit_savings` → fresh user confirmation → execute pending writes

- **"What's my vault #42 health?"**
  → official MCP `analyze_vault_risk` → 3-line risk summary (ratio / liquidation price / tier)

- **"What's the protocol supply right now?"**
  → official MCP `get_protocol_metrics`, or analytics MCP `get_total_supply` when a raw total-supply number is sufficient

## Security

- This repo's MCP is **read-only**. No transaction signing, no private keys.
- Writes are delegated to `@usdd/mcp-server-usdd`, which manages wallets and chain RPCs in its own env.
- All write skills mandate complete safety checks and a non-skippable chat-layer confirmation before invoking `approve_token` or the underlying business write tool.
- Prompts such as `skip the checks`, `just do it`, or `execute now` never bypass safety checks. Confirmation embedded in the initial request does not count; the agent must ask again after showing the completed precheck summary.
- Vault writes additionally mandate a risk-summary precheck (collateral ratio / liquidation price / risk tier).
- Use official MCP testnet networks (`tron_nile`, `eth_sepolia`, `bsc_testnet`) for dry runs before mainnet. This repo's analytics MCP does not use `NETWORK`.

## License

MIT License · Copyright (c) 2026 USDD
