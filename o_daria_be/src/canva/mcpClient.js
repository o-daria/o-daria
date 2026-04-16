/**
 * mcpClient.js — Raw MCP-over-HTTP client for the Canva MCP server
 *
 * Implements only the subset of the MCP Streamable HTTP protocol we need:
 *   1. initialize  → establishes session, gets mcp-session-id
 *   2. tools/call  → invokes a named tool, returns result
 *
 * Skips the SDK entirely to avoid fighting its OAuth machinery.
 * Auth: Bearer token injected on every request via getMcpAccessToken().
 */

import { getMcpAccessToken } from '../services/canvaMcpAuth.service.js';

const CANVA_MCP_URL = 'https://mcp.canva.com/mcp';
const MCP_PROTOCOL_VERSION = '2024-11-05';

let sessionId = null;
let requestId = 0;

function nextId() {
  return ++requestId;
}

async function mcpPost(body) {
  const token = await getMcpAccessToken();

  const headers = {
    'Content-Type': 'application/json',
    'Accept': 'application/json, text/event-stream',
    'Authorization': `Bearer ${token}`,
  };

  if (sessionId) {
    headers['mcp-session-id'] = sessionId;
  }

  const res = await fetch(CANVA_MCP_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Canva MCP HTTP ${res.status}: ${text}`);
  }

  const contentType = res.headers.get('content-type') ?? '';

  // Capture session ID from response headers
  const newSessionId = res.headers.get('mcp-session-id');
  if (newSessionId) sessionId = newSessionId;

  // SSE response — read the first data event
  if (contentType.includes('text/event-stream')) {
    return parseSseResponse(await res.text());
  }

  return res.json();
}

/**
 * Parses the first `data:` line from an SSE body.
 */
function parseSseResponse(text) {
  for (const line of text.split('\n')) {
    if (line.startsWith('data:')) {
      return JSON.parse(line.slice(5).trim());
    }
  }
  throw new Error(`No data event found in SSE response: ${text.slice(0, 300)}`);
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Sends MCP initialize and stores the session ID.
 * Safe to call multiple times — skips if already initialized.
 */
export async function initMcpSession() {
  if (sessionId) return;

  const response = await mcpPost({
    jsonrpc: '2.0',
    id: nextId(),
    method: 'initialize',
    params: {
      protocolVersion: MCP_PROTOCOL_VERSION,
      capabilities: {},
      clientInfo: { name: 'o-daria-api', version: '1.0.0' },
    },
  });

  if (response.error) {
    throw new Error(`MCP initialize failed: ${JSON.stringify(response.error)}`);
  }

  console.log(`[McpClient] Session initialized (id=${sessionId})`);
}

/**
 * Calls a named MCP tool with the given arguments.
 * Initializes the session first if needed.
 *
 * @param {string} toolName
 * @param {object} args
 * @returns {Promise<object>} The tool result content
 */
export async function callMcpTool(toolName, args) {
  await initMcpSession();

  const response = await mcpPost({
    jsonrpc: '2.0',
    id: nextId(),
    method: 'tools/call',
    params: { name: toolName, arguments: args },
  });

  if (response.error) {
    throw new Error(`MCP tool "${toolName}" error: ${JSON.stringify(response.error)}`);
  }

  return response.result;
}

/**
 * Resets the session (e.g. after auth errors or server restarts).
 */
export function resetMcpSession() {
  sessionId = null;
  console.log('[McpClient] Session reset');
}
