import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { USDDClient } from "./usdd_api.mjs";

const server = new Server(
  { name: "usdd-analytics-mcp", version: "0.1.0" },
  { capabilities: { tools: {} } }
);

const client = new USDDClient();

// ---- handlers will go here in Task 13 & 14 ----

async function main() {
  // --list-tools 模式在 Task 15 实现
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("USDD analytics MCP server running on stdio.");
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
