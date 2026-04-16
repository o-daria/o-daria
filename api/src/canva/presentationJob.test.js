import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mocks ───────────────────────────────────────────────────────────────────

vi.mock('../db/client.js', () => ({
  query: vi.fn().mockResolvedValue({ rows: [] }),
}));

vi.mock('./assetUploader.js', () => ({
  uploadProfileAssets: vi.fn().mockResolvedValue({
    alice_post_1: 'CANVA_A1',
    alice_post_2: 'CANVA_A2',
    bob_post_1:   'CANVA_B1',
    bob_grid:     'MISSING',
  }),
}));

vi.mock('./queryBuilder.js', () => ({
  QUERY_LENGTH_LIMIT: 6000,
  buildQuery: vi.fn().mockReturnValue({
    query:          'mock query text',
    allAssetIds:    ['CANVA_A1', 'CANVA_A2', 'CANVA_B1'],
    totalSlides:    8,
    personaPhotoIds: ['CANVA_A1'],
    segmentPhotoIds: { 'Seg': ['CANVA_B1'] },
  }),
}));

const { runPresentationJob } = await import('./presentationJob.js');
const { query } = await import('../db/client.js');
const { uploadProfileAssets } = await import('./assetUploader.js');
const { buildQuery } = await import('./queryBuilder.js');

// ─── Fixtures ────────────────────────────────────────────────────────────────

const report = {
  brand: 'TestBrand',
  brand_DNA: 'Test values',
  best_photos_for_persona_slide: ['alice'],
  audience_segments: [
    { segment_name: 'Seg', representative_handles: ['bob'] },
  ],
};

// ─── Tests ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  query.mockResolvedValue({ rows: [] });
});

describe('runPresentationJob', () => {
  it('runs upload → query build → ready', async () => {
    await runPresentationJob({
      presentationId: 'pres-1',
      reportId:       'report-1',
      tenantId:       'tenant-1',
      report,
    });

    // Should have called uploadProfileAssets with collected handles
    expect(uploadProfileAssets).toHaveBeenCalledOnce();
    const [handles] = uploadProfileAssets.mock.calls[0];
    expect(handles).toContain('alice');
    expect(handles).toContain('bob');

    // Should have called buildQuery
    expect(buildQuery).toHaveBeenCalledOnce();

    // Should have updated status 3 times: uploading_assets, building_query, ready
    const statusUpdates = query.mock.calls
      .filter(([sql]) => sql.includes('UPDATE presentation_requests'))
      .map(([, params]) => params[1]);
    expect(statusUpdates).toEqual(['uploading_assets', 'building_query', 'ready']);
  });

  it('applies compact mode when query exceeds limit', async () => {
    // First call returns long query, second returns short
    buildQuery
      .mockReturnValueOnce({
        query: 'x'.repeat(7000),
        allAssetIds: ['A'], totalSlides: 8,
        personaPhotoIds: [], segmentPhotoIds: {},
      })
      .mockReturnValueOnce({
        query: 'compact query',
        allAssetIds: ['A'], totalSlides: 8,
        personaPhotoIds: [], segmentPhotoIds: {},
      });

    await runPresentationJob({
      presentationId: 'pres-2',
      reportId:       'report-2',
      tenantId:       'tenant-2',
      report,
    });

    // buildQuery called twice: once full, once compact
    expect(buildQuery).toHaveBeenCalledTimes(2);
    const secondCall = buildQuery.mock.calls[1][2];
    expect(secondCall.compact).toBe(true);
  });

  it('sets status to failed on error', async () => {
    uploadProfileAssets.mockRejectedValueOnce(new Error('Upload boom'));

    await expect(
      runPresentationJob({
        presentationId: 'pres-3',
        reportId:       'report-3',
        tenantId:       'tenant-3',
        report,
      })
    ).rejects.toThrow('Upload boom');

    // Should have set status to failed
    const failedUpdate = query.mock.calls.find(
      ([sql, params]) => sql.includes('UPDATE presentation_requests') && params[1] === 'failed'
    );
    expect(failedUpdate).toBeTruthy();
  });
});
