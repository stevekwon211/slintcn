// Spawn the MCP server as a child process, drive it over stdio, and assert
// on the JSON-RPC responses — repeatable end-to-end coverage that catches
// regressions a smoke test would miss (packaging, protocol shape, edge cases).
import { test } from "node:test";
import { strict as assert } from "node:assert";
import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const SERVER = path.join(ROOT, "bin", "slintcn-mcp.mjs");

// Drive the server with a list of requests, returning the parsed responses
// in the order they arrive. Notifications (no `id`) don't get a response.
async function drive(requests, { timeoutMs = 5000 } = {}) {
  const child = spawn("node", [SERVER], { cwd: ROOT });
  const out = [];
  let buf = "";
  child.stdout.on("data", (chunk) => {
    buf += chunk.toString();
    let nl;
    while ((nl = buf.indexOf("\n")) >= 0) {
      const line = buf.slice(0, nl).trim();
      buf = buf.slice(nl + 1);
      if (line) {
        try { out.push(JSON.parse(line)); } catch { /* swallow malformed-out */ }
      }
    }
  });
  for (const r of requests) {
    child.stdin.write((typeof r === "string" ? r : JSON.stringify(r)) + "\n");
  }
  const expected = requests.filter((r) => typeof r === "object" && r.id !== undefined).length;
  const start = Date.now();
  while (out.length < expected && Date.now() - start < timeoutMs) {
    await sleep(25);
  }
  child.stdin.end();
  child.kill();
  return out;
}

test("MCP: initialize handshake reports server info + protocol version", async () => {
  const [resp] = await drive([
    { jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2024-11-05" } },
  ]);
  assert.equal(resp.jsonrpc, "2.0");
  assert.equal(resp.id, 1);
  assert.equal(resp.result.serverInfo.name, "slintcn");
  assert.match(resp.result.serverInfo.version, /^\d+\.\d+\.\d+/);
  assert.ok(resp.result.capabilities.tools, "advertises tools capability");
  assert.equal(resp.result.protocolVersion, "2024-11-05");
});

test("MCP: tools/list returns exactly the four documented tools", async () => {
  const [, list] = await drive([
    { jsonrpc: "2.0", id: 1, method: "initialize", params: {} },
    { jsonrpc: "2.0", id: 2, method: "tools/list" },
  ]);
  const names = list.result.tools.map((t) => t.name).sort();
  assert.deepEqual(names, ["install_command", "list_blocks", "list_components", "view_component"]);
  for (const t of list.result.tools) {
    assert.ok(t.description, `${t.name} has a description`);
    assert.equal(t.inputSchema.type, "object", `${t.name} schema is an object`);
  }
});

test("MCP: list_components reports every registry:ui item", async () => {
  const [, resp] = await drive([
    { jsonrpc: "2.0", id: 1, method: "initialize", params: {} },
    { jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: "list_components", arguments: {} } },
  ]);
  const text = resp.result.content[0].text;
  const lines = text.split("\n").filter((l) => l.startsWith("- "));
  assert.ok(lines.length >= 50, `expected 50+ UI components, got ${lines.length}`);
  for (const line of lines) {
    assert.match(line, /^- .+ \(`[a-z-]+`\) \[[a-z-]+\] — /, `well-formed: ${line}`);
  }
});

test("MCP: list_blocks reports every registry:block item", async () => {
  const [, resp] = await drive([
    { jsonrpc: "2.0", id: 1, method: "initialize", params: {} },
    { jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: "list_blocks", arguments: {} } },
  ]);
  const lines = resp.result.content[0].text.split("\n").filter((l) => l.startsWith("- "));
  assert.ok(lines.length >= 5, `expected 5+ blocks, got ${lines.length}`);
});

test("MCP: view_component returns full metadata + usage snippet for a known item", async () => {
  const [, resp] = await drive([
    { jsonrpc: "2.0", id: 1, method: "initialize", params: {} },
    { jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: "view_component", arguments: { name: "button" } } },
  ]);
  const text = resp.result.content[0].text;
  assert.match(text, /^# Button/m);
  assert.match(text, /install:.+npx slintcn@latest add button/);
  assert.match(text, /docs: https:\/\/stevekwon211\.github\.io\/slintcn\/docs\/button/);
  assert.match(text, /## Usage/);
  assert.match(text, /import \{ Button/);
});

test("MCP: view_component returns isError for unknown item", async () => {
  const [, resp] = await drive([
    { jsonrpc: "2.0", id: 1, method: "initialize", params: {} },
    { jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: "view_component", arguments: { name: "this-does-not-exist" } } },
  ]);
  assert.equal(resp.result.isError, true);
  assert.match(resp.result.content[0].text, /Unknown item/);
});

test("MCP: install_command emits a single npx line for N names", async () => {
  const [, resp] = await drive([
    { jsonrpc: "2.0", id: 1, method: "initialize", params: {} },
    { jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: "install_command", arguments: { names: ["button", "card", "dialog"] } } },
  ]);
  assert.equal(resp.result.content[0].text, "npx slintcn@latest add button card dialog");
});

test("MCP: unknown tool returns isError with a helpful message", async () => {
  const [, resp] = await drive([
    { jsonrpc: "2.0", id: 1, method: "initialize", params: {} },
    { jsonrpc: "2.0", id: 2, method: "tools/call", params: { name: "definitely_not_a_tool", arguments: {} } },
  ]);
  assert.equal(resp.result.isError, true);
  assert.match(resp.result.content[0].text, /Unknown tool/);
});

test("MCP: notifications/initialized is silent (no response written)", async () => {
  const responses = await drive([
    { jsonrpc: "2.0", id: 1, method: "initialize", params: {} },
    { jsonrpc: "2.0", method: "notifications/initialized" }, // no id ⇒ no response
    { jsonrpc: "2.0", id: 2, method: "tools/list" },
  ]);
  assert.equal(responses.length, 2, "exactly two responses (notification is silent)");
  assert.deepEqual(responses.map((r) => r.id), [1, 2]);
});

test("MCP: unknown JSON-RPC method returns -32601 Method-not-found", async () => {
  const [resp] = await drive([
    { jsonrpc: "2.0", id: 1, method: "completely/made-up" },
  ]);
  assert.equal(resp.error.code, -32601);
  assert.match(resp.error.message, /Method not found/);
});

test("MCP: malformed JSON on stdin is ignored; subsequent valid request still works", async () => {
  const responses = await drive([
    "this is not json at all",
    { jsonrpc: "2.0", id: 1, method: "initialize", params: {} },
  ]);
  assert.equal(responses.length, 1);
  assert.equal(responses[0].id, 1);
});

test("MCP: every tool's listed inputSchema is valid JSON Schema (type/properties)", async () => {
  const [, list] = await drive([
    { jsonrpc: "2.0", id: 1, method: "initialize", params: {} },
    { jsonrpc: "2.0", id: 2, method: "tools/list" },
  ]);
  for (const t of list.result.tools) {
    assert.equal(t.inputSchema.type, "object", `${t.name}.inputSchema.type`);
    assert.equal(typeof t.inputSchema.properties, "object", `${t.name}.inputSchema.properties`);
    if (t.inputSchema.required) {
      for (const r of t.inputSchema.required) {
        assert.ok(t.inputSchema.properties[r], `${t.name} required '${r}' is declared`);
      }
    }
  }
});
