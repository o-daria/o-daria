/**
 * segmentLibrary.js
 *
 * Cross-client segment knowledge base — compounding competitive moat.
 *
 * Every completed report contributes its segments here.
 * Future reports retrieve historically observed segments as calibration.
 *
 * Tenant isolation:
 *   WRITES: tenant-scoped (each segment tagged with tenant_id)
 *   READS:  filtered to EXCLUDE the requesting tenant
 *
 * This means:
 *   ✓ You benefit from patterns learned across all clients
 *   ✗ Your competitor cannot see your specific segments
 *   ✗ One client's framing cannot bleed into another's report
 *
 * Value accumulates over time:
 *   50 reports  → calibration is plausible, segment names are stable
 *   500 reports → Ukrainian lifestyle clusters are well-calibrated
 *   5000 reports → best audience taxonomy for UA Instagram in existence
 */

import { query }                                 from '../db/client.js';
import { generateEmbedding, formatEmbeddingForPg } from './embeddings.js';

// ─── Writes ──────────────────────────────────────────────────────────────────

/**
 * Indexes all segments from a completed report into the shared library.
 * Called at the end of aggregateJob.js after a report is validated and signed.
 *
 * @param {object[]} segments  - audience_segments array from the completed report
 * @param {string}   tenantId  - UUID of the tenant who generated this report
 * @param {string}   brand     - Brand identifier (e.g. "Vysota890")
 */
export async function indexReportSegments(segments, tenantId, brand) {
  for (const segment of segments) {
    const embeddingText = buildSegmentEmbeddingInput(segment);
    const embedding     = await generateEmbedding(embeddingText);
    const pgEmbedding   = formatEmbeddingForPg(embedding);

    await query(
      `INSERT INTO segment_library (tenant_id, brand, segment_name, segment_data, embedding)
       VALUES ($1, $2, $3, $4, $5::vector)`,
      [tenantId, brand, segment.segment_name ?? 'unnamed', JSON.stringify(segment), pgEmbedding]
    );
  }

  console.log(`[SegmentLibrary] Indexed ${segments.length} segments for tenant ${tenantId}`);
}

// ─── Reads ────────────────────────────────────────────────────────────────────

/**
 * Retrieves k most similar historical segments, EXCLUDING the requesting tenant.
 *
 * Used by aggregateJob.js to inject historical calibration into the aggregation prompt.
 * The aggregation model uses these to:
 *   - Name new segments consistently with established taxonomy
 *   - Flag when a segment is genuinely new vs. a known pattern
 *   - Calibrate brand_fit scores against historical benchmarks
 *
 * @param {object[]} profiles   - Current report's profile analyses (query signal)
 * @param {string}   tenantId   - Requesting tenant (excluded from results)
 * @param {object}   opts
 * @param {number}   opts.k     - Max results (default 5)
 * @returns {Promise<object[]>} - Array of segment_json objects
 */
export async function findSimilarSegments(profiles, tenantId, { k = 5 } = {}) {
  const summaryText = buildProfileSummaryText(profiles);
  const embedding   = await generateEmbedding(summaryText);
  const pgEmbedding = formatEmbeddingForPg(embedding);

  const res = await query(
    `SELECT
       segment_data,
       1 - (embedding <=> $1::vector) AS similarity
     FROM segment_library
     WHERE tenant_id != $2
     ORDER BY embedding <=> $1::vector
     LIMIT $3`,
    [pgEmbedding, tenantId, k]
  );

  return res.rows.map(r => r.segment_data);
}

/**
 * Returns aggregate statistics about the library.
 * Used for the admin dashboard.
 */
export async function getLibraryStats() {
  const res = await query(
    `SELECT
       COUNT(*)                AS total_segments,
       COUNT(DISTINCT tenant_id) AS unique_tenants,
       MIN(created_at)         AS oldest_entry,
       MAX(created_at)         AS newest_entry
     FROM segment_library`
  );
  return res.rows[0];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildSegmentEmbeddingInput(segment) {
  return [
    segment.segment_name      ?? '',
    ...(segment.defining_traits ?? []),
    segment.content_direction  ?? '',
    segment.brand_fit          ?? '',
  ]
    .filter(Boolean)
    .join(', ');
}

/**
 * Builds a summary embedding input from a full profile set.
 * Topics are the most semantically stable field — used as primary signal.
 */
function buildProfileSummaryText(profiles) {
  const allTopics   = profiles.flatMap(p => p.topics ?? []);
  const allClusters = profiles.map(p => p.lifestyle_cluster).filter(Boolean);
  const allTones    = profiles.map(p => p.observed_signals?.visual_tone).filter(Boolean);

  return [
    ...new Set(allTopics),
    ...new Set(allClusters),
    ...new Set(allTones),
  ].join(', ');
}