import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { USDDClient } from "./usdd_api.mjs";

const server = new Server(
  { name: "usdd-analytics-mcp", version: "1.0.1" },
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
    name: "get_usdd_supply",
    description: "USDD supply broken down by chain, excluding sUSDD. Call this MCP tool for per-chain USDD distribution.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "get_supply_history",
    description: "Daily time series of USDD and sUSDD supply per chain. Use get_collateral_history for collateral value history.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "get_collateral_history",
    description: "Daily time series of total collateral value per chain. This is protocol-wide chain history, not per-ilk vault history.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "get_circulating_supply",
    description: "Raw USDD circulating supply (single number).",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "get_total_supply",
    description: "Raw USDD total supply (single number). Call this MCP tool for current raw supply stats.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "get_public_protocol_overview",
    description: "Public REST protocol overview with total supply, TVL, Earn TVL, and current APY fields.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "get_public_protocol_overview_info",
    description: "Public REST protocol overview with 24h daily-change fields.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "get_public_dsr_apy",
    description: "Public REST DSR APY current, average, and per-chain history.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "get_vault_collaterals",
    description: "Public REST vault collateral configuration list.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "get_latest_collateral",
    description: "Public REST per-chain collateral snapshot. Chain must be tron, eth, or bsc.",
    inputSchema: {
      type: "object",
      properties: {
        chain: { type: "string", enum: ["tron", "eth", "bsc"] },
      },
      required: ["chain"],
    },
  },
  {
    name: "get_chain_collateral_history",
    description: "Public REST per-chain historical series for 7D/1M/6M/1Y charts. This is keyed by chain and interval, not by ilk.",
    inputSchema: {
      type: "object",
      properties: {
        chain: { type: "string", enum: ["tron", "eth", "bsc"] },
        interval: { type: "string", enum: ["WEEKLY", "MONTHLY", "BIANNUAL", "ANNUAL"] },
      },
      required: ["chain", "interval"],
    },
  },
  {
    name: "get_smart_allocator_detail",
    description: "Public REST Smart Allocator detail overview with allocations, earnings, and vault info.",
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
      case "get_usdd_supply":
        return { content: [{ type: "text", text: JSON.stringify(await client.getUsddSupply(), null, 2) }] };
      case "get_supply_history":
        return { content: [{ type: "text", text: JSON.stringify(await client.getSupplyHistory(), null, 2) }] };
      case "get_collateral_history":
        return { content: [{ type: "text", text: JSON.stringify(await client.getCollateralHistory(), null, 2) }] };
      case "get_circulating_supply":
        return { content: [{ type: "text", text: JSON.stringify(await client.getCirculatingSupply(), null, 2) }] };
      case "get_total_supply":
        return { content: [{ type: "text", text: JSON.stringify(await client.getTotalSupply(), null, 2) }] };
      case "get_public_protocol_overview":
        return { content: [{ type: "text", text: JSON.stringify(await client.getPublicProtocolOverview(), null, 2) }] };
      case "get_public_protocol_overview_info":
        return { content: [{ type: "text", text: JSON.stringify(await client.getPublicProtocolOverviewInfo(), null, 2) }] };
      case "get_public_dsr_apy":
        return { content: [{ type: "text", text: JSON.stringify(await client.getPublicDsrApy(), null, 2) }] };
      case "get_vault_collaterals":
        return { content: [{ type: "text", text: JSON.stringify(await client.getVaultCollaterals(), null, 2) }] };
      case "get_latest_collateral":
        return { content: [{ type: "text", text: JSON.stringify(await client.getLatestCollateral(args.chain), null, 2) }] };
      case "get_chain_collateral_history":
        return { content: [{ type: "text", text: JSON.stringify(await client.getChainCollateralHistory(args.chain, args.interval), null, 2) }] };
      case "get_smart_allocator_detail":
        return { content: [{ type: "text", text: JSON.stringify(await client.getSmartAllocatorDetail(), null, 2) }] };
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
