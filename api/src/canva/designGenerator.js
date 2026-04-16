/**
 * designGenerator.js — Canva design generation via MCP
 *
 * Automates the two MCP tool calls that were previously done manually
 * in a Claude Code session:
 *   1. generate-design  → returns candidates
 *   2. create-design-from-candidate → returns editable design with URLs
 *
 * Called as a fire-and-forget background job from the /generate endpoint.
 */

import { query } from '../db/client.js';
import { callMcpTool, resetMcpSession } from './mcpClient.js';

const MAX_ASSET_IDS = 10;

// ─── Status updater (same pattern as presentationJob.js) ─────────────────────

async function updateStatus(presentationId, status, fields = {}) {
  const setClauses = ['status = $2', 'updated_at = NOW()'];
  const values = [presentationId, status];
  let paramIdx = 3;

  for (const [col, val] of Object.entries(fields)) {
    setClauses.push(`${col} = $${paramIdx}`);
    values.push(typeof val === 'object' ? JSON.stringify(val) : val);
    paramIdx++;
  }

  await query(
    `UPDATE presentation_requests SET ${setClauses.join(', ')} WHERE id = $1`,
    values
  );
}

// ─── MCP tool wrappers ──────────────────────────────────────────────────────

/**
 * Calls the Canva MCP generate-design tool.
 * Returns the raw content array from the MCP response.
 */
async function callGenerateDesign(queryText, assetIds) {
  const args = {
    query: queryText,
    design_type: 'presentation',
    user_intent: 'Generate audience intelligence presentation from analysis report',
  };

  if (assetIds && assetIds.length > 0) {
    args.asset_ids = assetIds.slice(0, MAX_ASSET_IDS);
  }

  console.log(`[DesignGenerator] Calling generate-design (${assetIds?.length ?? 0} assets, query ${queryText.length} chars)`);

  return callMcpTool('generate-design', args);
}

/**
 * Calls the Canva MCP create-design-from-candidate tool.
 */
async function callCreateDesign(jobId, candidateId) {
  console.log(`[DesignGenerator] Calling create-design-from-candidate (job=${jobId}, candidate=${candidateId})`);

  return callMcpTool('create-design-from-candidate', {
    job_id: jobId,
    candidate_id: candidateId,
    user_intent: 'Create editable Canva presentation from selected candidate',
  });
}

// ─── Response parsing helpers ────────────────────────────────────────────────

/**
 * Extracts text content from an MCP tool result.
 * MCP results typically have: { content: [{ type: 'text', text: '...' }] }
 */
function extractTextContent(result) {
  if (!result?.content) return null;

  const textParts = result.content
    .filter(c => c.type === 'text')
    .map(c => c.text);

  return textParts.join('\n');
}

/**
 * Attempts to parse JSON from the text content of an MCP result.
 * Falls back to returning the raw text if JSON parsing fails.
 */
function parseResultContent(result) {
  const text = extractTextContent(result);
  if (!text) return { raw: result };

  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

// ─── Main orchestrator ──────────────────────────────────────────────────────

/**
 * Run the full design generation flow:
 *   generate-design → pick first candidate → create-design-from-candidate
 *
 * Updates presentation_requests status at each step.
 *
 * @param {object} params
 * @param {string} params.presentationId - presentation_requests.id
 * @param {string} params.reportId       - reports.id
 * @param {string} params.queryText      - Fully-resolved Canva query
 * @param {object} params.manifest       - { asset_ids: [...], total_slides: N }
 */
export async function runDesignGeneration({ presentationId, reportId, queryText, manifest }) {
  try {
    // ── Step 1: Generate design ───────────────────────────────────────────
    await updateStatus(presentationId, 'generating');

    const assetIds = manifest?.asset_ids ?? [];
    const generateResult = await callGenerateDesign(queryText, assetIds);

    // Log the raw response shape for debugging (first run will reveal the format)
    console.log('[DesignGenerator] generate-design response:', JSON.stringify(generateResult, null, 2));

    const generateData = parseResultContent(generateResult);

    // Extract job_id and candidates — adapt to the actual MCP response shape
    const jobId = generateData.job?.id;;
    const candidates = generateData.job.result?.generated_designs ?? [];

    if (!jobId) {
      throw new Error(`generate-design did not return a job_id. Response: ${JSON.stringify(generateData).slice(0, 500)}`);
    }

    await updateStatus(presentationId, 'creating_design', {
      job_id: jobId,
      candidates,
    });

    console.log(`[DesignGenerator] Got ${candidates.length} candidate(s) for job ${jobId}`);

    // ── Step 2: Create design from first candidate ────────────────────────
    if (candidates.length === 0) {
      throw new Error('generate-design returned no candidates');
    }

    const firstCandidate = candidates[0];
    const candidateId = firstCandidate.candidate_id;

    if (!candidateId) {
      throw new Error(`No candidate_id found in first candidate: ${JSON.stringify(firstCandidate).slice(0, 300)}`);
    }

    const createResult = await callCreateDesign(jobId, candidateId);

    console.log('[DesignGenerator] create-design-from-candidate response:', JSON.stringify(createResult, null, 2));

    const createData = parseResultContent(createResult);

    // Extract design URL — adapt to the actual MCP response shape
    const designUrl =
      createData.design_summary.urls.view_url ??
      extractDesignUrlFromText(extractTextContent(createResult));

    if (!designUrl) {
      console.warn('[DesignGenerator] Could not extract design URL from response:', JSON.stringify(createData).slice(0, 500));
    }

    // ── Step 3: Finalize ──────────────────────────────────────────────────
    await updateStatus(presentationId, 'approved', {
      approved_candidate_id: candidateId,
      canva_design_url: designUrl,
    });

    // Also set the URL on the reports table
    if (designUrl) {
      await query(
        `UPDATE reports SET canva_url = $2 WHERE id = $1`,
        [reportId, designUrl]
      );
    }

    console.log(`[DesignGenerator] Done — design URL: ${designUrl}`);
  } catch (err) {
    console.error(`[DesignGenerator] Failed for ${presentationId}:`, err.message);

    // Reset session on auth errors so next attempt re-initializes
    if (err.message?.includes('401') || err.message?.includes('invalid_token')) {
      resetMcpSession();
    }

    await updateStatus(presentationId, 'failed', { error: err.message }).catch(() => {});
    throw err;
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Last-resort URL extraction from free-text MCP response.
 */
function extractDesignUrlFromText(text) {
  if (!text) return null;
  const match = text.match(/https:\/\/www\.canva\.com\/design\/[^\s)"\]]+/);
  return match ? match[0] : null;
}
