#!/usr/bin/env node
// slintcn MCP server — exposes the slintcn registry to MCP-capable AI agents
// (Claude Desktop, Cursor, Windsurf, etc.). Pure JSON-RPC over stdio, zero
// runtime deps; reads the bundled registry + usage snippets so the server
// always reports what `npx slintcn@latest add` would actually install.
//
// Configure in your client's MCP servers config:
//   {
//     "mcpServers": {
//       "slintcn": { "command": "npx", "args": ["-y", "slintcn-mcp"] }
//     }
//   }
//
// Tools exposed:
//   list_components   — every registry:ui item with title / category / one-liner
//   list_blocks       — every registry:block item (drop-in screens)
//   view_component    — full metadata + usage snippet for one item
//   install_command   — the exact `npx slintcn@latest add …` line for N items
//
// JSON-RPC framing: one request per line on stdin, one response per line on
// stdout. The MCP spec also defines an HTTP+SSE transport; agents that want
// the in-process variant should use the stdio runner shown above.

import { readFile } from "node:fs/promises";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";
import path from "node:path";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const pkg = JSON.parse(await readFile(path.join(ROOT, "package.json"), "utf8"));
const registry = JSON.parse(
  await readFile(path.join(ROOT, "registry/default/registry.json"), "utf8"),
);
const { usage } = await import(path.join(ROOT, "scripts/docs-usage.mjs"));

const SERVER_INFO = { name: "slintcn", version: pkg.version };

const TOOLS = [
  {
    name: "list_components",
    description: "List every UI component in the slintcn registry (name · category · one-line description).",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "list_blocks",
    description: "List every installable block (full-screen compositions like dashboard, sign-in, team).",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "view_component",
    description: "View full metadata + a copy-paste usage snippet for one component or block.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Item name as it appears in the registry, e.g. 'button', 'data-table', 'sign-in'." },
      },
      required: ["name"],
      additionalProperties: false,
    },
  },
  {
    name: "install_command",
    description: "Return the exact CLI command to install one or more components / blocks into a Slint project.",
    inputSchema: {
      type: "object",
      properties: {
        names: {
          type: "array",
          items: { type: "string" },
          description: "Component / block names to install in one go.",
          minItems: 1,
        },
      },
      required: ["names"],
      additionalProperties: false,
    },
  },
];

// JSON-RPC handlers — `null` return suppresses the response (for notifications).
function handle(req) {
  const { id, method, params } = req;

  if (method === "initialize") {
    return ok(id, {
      protocolVersion: "2024-11-05",
      capabilities: { tools: {} },
      serverInfo: SERVER_INFO,
    });
  }

  if (method === "notifications/initialized") return null;

  if (method === "tools/list") return ok(id, { tools: TOOLS });

  if (method === "tools/call") {
    const { name, arguments: args = {} } = params ?? {};
    try {
      const text = callTool(name, args);
      return ok(id, { content: [{ type: "text", text }] });
    } catch (e) {
      return ok(id, { content: [{ type: "text", text: `error: ${e.message}` }], isError: true });
    }
  }

  return err(id, -32601, `Method not found: ${method}`);
}

function callTool(name, args) {
  if (name === "list_components") return listByType("registry:ui");
  if (name === "list_blocks")     return listByType("registry:block");
  if (name === "view_component")  return view(args.name);
  if (name === "install_command") return `npx slintcn@latest add ${args.names.join(" ")}`;
  throw new Error(`Unknown tool: ${name}`);
}

function listByType(type) {
  const rows = Object.entries(registry.components)
    .filter(([, v]) => v.type === type)
    .map(([k, v]) => `- ${v.title} (\`${k}\`) [${v.category}] — ${v.description}`);
  return rows.length ? rows.join("\n") : `(no ${type} items)`;
}

function view(name) {
  const item = registry.components[name];
  if (!item) throw new Error(`Unknown item: ${name}. Try list_components / list_blocks.`);
  const reqs = (item.requires ?? []).filter((r) => r !== "theme");
  const snippet = usage[name] ?? `import { } from "slintcn/components/${name}.slint";`;
  return [
    `# ${item.title}  (\`${name}\`)`,
    item.description,
    ``,
    `- type: ${item.type}`,
    `- category: ${item.category}`,
    `- requires: ${reqs.length ? reqs.join(", ") : "theme only"}`,
    `- install: \`npx slintcn@latest add ${name}\``,
    `- docs: https://stevekwon211.github.io/slintcn/docs/${name}`,
    ``,
    "## Usage",
    "```slint",
    snippet,
    "```",
  ].join("\n");
}

const ok  = (id, result)        => ({ jsonrpc: "2.0", id, result });
const err = (id, code, message) => ({ jsonrpc: "2.0", id, error: { code, message } });

const rl = createInterface({ input: process.stdin, terminal: false });
rl.on("line", (line) => {
  if (!line.trim()) return;
  let req;
  try { req = JSON.parse(line); } catch { return; }
  const resp = handle(req);
  if (resp !== null) process.stdout.write(JSON.stringify(resp) + "\n");
});
