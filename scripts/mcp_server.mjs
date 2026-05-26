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
    description: "USDD Savings APY per chain (TRON, ETH, BSC). Use this when comparing Earn rates across chains. Data source: openapi.usdd.io /external/earn-apy.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "get_susdd_supply",
    description: "sUSDD total supply broken down by chain. Use this for analytics on Earn participation per chain. Data source: openapi.usdd.io /external/total-supply/susdd.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "get_supply_history",
    description: "Time series of USDD and sUSDD supply per chain. Use this for trend / change-over-time queries on circulating supply. Data source: openapi.usdd.io /data-platform/overview/supply-value-history.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "get_collateral_history",
    description: "Time series of protocol-wide collateral value per chain. Use this for collateral-trend queries. Data source: openapi.usdd.io /data-platform/overview/collateral-value-history.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "get_circulating_supply",
    description: "Raw USDD circulating supply (single number). Useful for quick header stats. Data source: openapi.usdd.io /circulatingSupply.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "get_total_supply",
    description: "Raw USDD total supply (single number). Data source: openapi.usdd.io /totalSupply.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "get_ilk_collateral_history",
    description: "Per-ilk (collateral type) historical ratio, debt, and APY series. Pass ilk symbol like TRX-A. Data source: openapi.usdd.io /data-platform/collateral-history.",
    inputSchema: {
      type: "object",
      properties: {
        ilk: { type: "string", description: "Ilk identifier, e.g. TRX-A" },
      },
      required: ["ilk"],
    },
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
      case "get_collateral_history":
        return { content: [{ type: "text", text: JSON.stringify(await client.getCollateralHistory(), null, 2) }] };
      case "get_circulating_supply":
        return { content: [{ type: "text", text: JSON.stringify(await client.getCirculatingSupply(), null, 2) }] };
      case "get_total_supply":
        return { content: [{ type: "text", text: JSON.stringify(await client.getTotalSupply(), null, 2) }] };
      case "get_ilk_collateral_history":
        return { content: [{ type: "text", text: JSON.stringify(await client.getIlkCollateralHistory(args.ilk), null, 2) }] };
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
  // --list-tools 模式在 Task 15 实现
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("USDD analytics MCP server running on stdio.");
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
