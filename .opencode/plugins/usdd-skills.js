// OpenCode plugin shim for usdd-skills
// Registers the 4 skills under skills/ and routes to the local analytics MCP server.

export default {
  name: "usdd-skills",
  description: "AI Agent skills for USDD — vault, PSM, savings, analytics.",
  version: "1.0.1",
  skills: [
    "./skills/usdd-vault-v1",
    "./skills/usdd-psm-v1",
    "./skills/usdd-earn-v1",
    "./skills/usdd-analytics-v1",
  ],
  mcpServers: {
    "usdd-analytics": {
      command: "node",
      args: ["./scripts/mcp_server.mjs"],
    },
  },
};
