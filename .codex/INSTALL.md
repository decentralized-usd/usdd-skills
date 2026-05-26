# Installing USDD Skills for Codex CLI

## Prerequisites

- Node.js v20+
- Git
- `@usdd/mcp-server-usdd` (for writes — install separately)

## Installation

1. **Clone this repo:**

   ```bash
   git clone https://github.com/decentralized-usd/usdd-skills ~/.codex/usdd-skills
   cd ~/.codex/usdd-skills
   bash install.sh
   ```

2. **Install the official MCP for write operations:**

   ```bash
   npm install -g @usdd/mcp-server-usdd
   ```

3. **Create skills symlink:**

   ```bash
   mkdir -p ~/.agents/skills
   ln -s ~/.codex/usdd-skills/skills ~/.agents/skills/usdd-skills
   ```

4. **Register both MCP servers in your Codex config:**

   ```jsonc
   {
     "mcpServers": {
       "usdd-analytics": {
         "command": "node",
         "args": ["~/.codex/usdd-skills/scripts/mcp_server.mjs"]
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

5. **Restart Codex** to discover the skills.

## Verify

```bash
ls ~/.agents/skills/usdd-skills
# Should list: usdd-vault-v1/ usdd-psm-v1/ usdd-earn-v1/ usdd-analytics-v1/

node ~/.codex/usdd-skills/scripts/mcp_server.mjs --list-tools
# Should print 7 analytics-history tools
```

## Available Skills

| Skill | Description |
|-------|-------------|
| `usdd-vault-v1` | Open vaults, mint USDD, repay, withdraw, close. Requires official MCP. |
| `usdd-psm-v1` | Swap stablecoins ↔ USDD via PSM. Requires official MCP. |
| `usdd-earn-v1` | Deposit USDD to Earn, redeem sUSDD. Requires official MCP. |
| `usdd-analytics-v1` | Historical analytics. Uses this repo's local MCP only. |

## Updating

```bash
cd ~/.codex/usdd-skills && git pull && npm install
```

## Uninstalling

```bash
rm ~/.agents/skills/usdd-skills
rm -rf ~/.codex/usdd-skills
npm uninstall -g @usdd/mcp-server-usdd
```
