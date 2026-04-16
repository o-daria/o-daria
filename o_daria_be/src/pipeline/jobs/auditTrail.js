/**
 * auditTrail.js
 *
 * Records job lifecycle events to job_audit table.
 * Called at the start and end of every pipeline job.
 *
 * Enables:
 *   - Per-report replay: "which jobs ran, in what order, with what inputs?"
 *   - Billing attribution: measure compute per report per tenant
 *   - Debugging: full input/output checksums for any job
 */

import crypto  from 'crypto';
import { query } from '../../db/client.js';

/**
 * Records a job lifecycle event.
 *
 * @param {string} reportId  - UUID of the parent report
 * @param {string} jobName   - 'analyze' | 'aggregate' | 'validate' | 'fetch'
 * @param {string} status    - 'started' | 'completed' | 'failed'
 * @param {object} payload   - Arbitrary metadata (counts, versions, error messages)
 */
export async function auditJob(reportId, jobName, status, payload = {}) {
  const payloadHash = crypto
    .createHash('sha256')
    .update(JSON.stringify(payload))
    .digest('hex');

  if (status === 'started') {
    await query(
      `INSERT INTO job_audit (report_id, job_name, status, input_hash)
       VALUES ($1, $2, $3, $4)`,
      [reportId, jobName, status, payloadHash]
    );
  } else {
    // Update the existing started row with completion info
    await query(
      `UPDATE job_audit
       SET status      = $1,
           output_hash = $2,
           ended_at    = now(),
           error       = $3
       WHERE report_id = $4
         AND job_name  = $5
         AND status    = 'started'`,
      [
        status,
        payloadHash,
        payload.error ?? null,
        reportId,
        jobName,
      ]
    );
  }
}
