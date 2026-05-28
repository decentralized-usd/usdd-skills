# Installing USDD Skills for Codex CLI

## Prerequisites

- Node.js v20+
- Git
- `npx` or npm v10+

## Installation

### Recommended

```bash
npx @usdd/usdd-skills setup --client codex --yes
```

The setup command installs durable `usdd-skills` and `mcp-server-usdd` binaries, writes Codex MCP config with a timestamped backup, and creates the skills symlink.

### Manual/local checkout

1. **Clone this repo:**

   ```bash
   git clone https://github.com/decentralized-usd/usdd-skills ~/.codex/usdd-skills
   cd ~/.codex/usdd-skills
   bash install.sh
   ```

2. **Manual config shape if you do not use `install.sh`:**

   ```jsonc
   {
     "mcpServers": {
       "usdd-analytics": {
         "command": "usdd-skills",
         "args": ["mcp-server"]
       },
       "usdd-full": {
         "command": "mcp-server-usdd",
         "env": {
           "TRONGRID_API_KEY": "<your key, optional>",
           "ETH_RPC_URL":      "<your url, optional>",
           "BSC_RPC_URL":      "<your url, optional>"
         }
       }
     }
   }
   ```

3. **Restart Codex** to discover the skills.

## Verify

```bash
ls ~/.agents/skills/usdd-skills
# Should list: usdd-vault-v1/ usdd-psm-v1/ usdd-earn-v1/ usdd-analytics-v1/

usdd-skills list-tools
# Should print 14 analytics tools
```

## Available Skills

| Skill | Description |
|-------|-------------|
| `usdd-vault-v1` | Open vaults, mint USDD, repay, withdraw, close. Requires official MCP. |
| `usdd-psm-v1` | Swap stablecoins ↔ USDD via PSM. Requires official MCP. |
| `usdd-earn-v1` | Deposit USDD to Earn, redeem sUSDD. Requires official MCP. |
| `usdd-analytics-v1` | Public read-only USDD API analytics. Uses this repo's local MCP only. |

## Updating

```bash
npm install -g @usdd/usdd-skills@latest @usdd/mcp-server-usdd@latest
usdd-skills setup --client codex --yes
```

For a local checkout, run `cd ~/.codex/usdd-skills && git pull && bash install.sh`.

## Uninstalling

```bash
rm ~/.agents/skills/usdd-skills
rm -rf ~/.codex/usdd-skills
npm uninstall -g @usdd/usdd-skills @usdd/mcp-server-usdd
```
