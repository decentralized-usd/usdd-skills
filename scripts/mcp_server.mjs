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

// ---- handlers ----

const TOOLS = [
  {
    name: "get_earn_apy",
    description: "USDD Savings APY per chain (TRON, ETH, BSC). Call this MCP tool when comparing Earn rates across chains.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "get_susdd_supply",
    description: "sUSDD total supply broken down by chain. Call this MCP tool for analytics on Earn participation per chain.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "get_supply_history",
    description: "Time series of USDD and sUSDD supply per chain only. Do not use for collateral, collateral-ratio, vault, or per-ilk history queries; no MCP tool currently provides those histories.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "get_total_supply",
    description: "Raw USDD total supply (single number). Call this MCP tool for current raw supply stats.",
    inputSchema: { type: "object", properties: {} },
  },
];

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args = {} } = request.params;
  try {
    switch (name) {
      case "get_earn_apy":
        return { content: [{ type: "text", text: JSON.stringify(await client.getEarnApy(), null, 2) }] };
      case "get_susdd_supply":
        return { content: [{ type: "text", text: JSON.stringify(await client.getSusddSupply(), null, 2) }] };
      case "get_supply_history":
        return { content: [{ type: "text", text: JSON.stringify(await client.getSupplyHistory(), null, 2) }] };
      case "get_total_supply":
        return { content: [{ type: "text", text: JSON.stringify(await client.getTotalSupply(), null, 2) }] };
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    return {
      content: [{ type: "text", text: `Error: ${error.message}` }],
      isError: true,
    };
  }
});

async function main() {
  if (process.argv.includes('--list-tools')) {
    console.log(JSON.stringify(TOOLS.map(t => ({ name: t.name, description: t.description })), null, 2));
    return;
  }
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("USDD analytics MCP server running on stdio.");
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
