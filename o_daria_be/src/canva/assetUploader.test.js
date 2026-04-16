import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./tokenManager.js', () => ({
  withTokenRefresh: vi.fn(fn => fn('fake-token')),
}));

// Mock fs to simulate profile directories
vi.mock('fs', async () => {
  const actual = await vi.importActual('fs');
  return {
    ...actual,
    existsSync: vi.fn(),
    readFileSync: vi.fn(),
  };
});

const { uploadProfileAssets } = await import('./assetUploader.js');
const fs = await import('fs');

// ─── Setup ──────────────────��─────────────────────��──────────────────────────

const mockFetch = vi.fn();
global.fetch = mockFetch;

beforeEach(() => {
  vi.clearAllMocks();

  // Default: handle directory exists, image files exist
  fs.existsSync.mockImplementation((p) => {
    if (p.includes('/profiles/alice')) return true;
    if (p.includes('/profiles/bob')) return true;
    if (p.includes('post_1.png')) return true;
    if (p.includes('post_2.png')) return true;
    return false;
  });

  fs.readFileSync.mockReturnValue(Buffer.from('fake-image-data'));

  // Default Canva API response
  mockFetch.mockResolvedValue({
    ok: true,
    json: async () => ({ asset: { id: 'CANVA_ID_123' } }),
  });
});

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('uploadProfileAssets', () => {
  it('uploads images and returns asset map', async () => {
    const assetMap = await uploadProfileAssets(['alice'], {
      profilesDir: '/fake/profiles',
    });

    expect(assetMap).toHaveProperty('alice_post_1', 'CANVA_ID_123');
    expect(assetMap).toHaveProperty('alice_post_2', 'CANVA_ID_123');
    expect(assetMap.alice_grid).toBe('MISSING'); // grid doesn't exist
  });

  it('marks all as MISSING when handle directory does not exist', async () => {
    fs.existsSync.mockImplementation(p => {
      if (p.includes('/profiles/unknown')) return false;
      return false;
    });

    const assetMap = await uploadProfileAssets(['unknown'], {
      profilesDir: '/fake/profiles',
    });

    expect(assetMap.unknown_post_1).toBe('MISSING');
    expect(assetMap.unknown_post_2).toBe('MISSING');
    expect(assetMap.unknown_post_3).toBe('MISSING');
    expect(assetMap.unknown_grid).toBe('MISSING');
  });

  it('skips already-uploaded assets in existingAssetMap', async () => {
    const assetMap = await uploadProfileAssets(['alice'], {
      profilesDir: '/fake/profiles',
      existingAssetMap: { alice_post_1: 'EXISTING_ID' },
    });

    expect(assetMap.alice_post_1).toBe('EXISTING_ID');
    // post_2 should still be uploaded
    expect(assetMap.alice_post_2).toBe('CANVA_ID_123');
  });

  it('does not skip MISSING entries in existingAssetMap', async () => {
    const assetMap = await uploadProfileAssets(['alice'], {
      profilesDir: '/fake/profiles',
      existingAssetMap: { alice_post_1: 'MISSING' },
    });

    // Should attempt to upload since it was MISSING
    expect(assetMap.alice_post_1).toBe('CANVA_ID_123');
  });

  it('marks as MISSING on upload failure', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    // Only post_1 exists for this test
    fs.existsSync.mockImplementation(p => {
      if (p.includes('/profiles/alice')) return true;
      if (p.endsWith('post_1.png')) return true;
      return false;
    });

    const assetMap = await uploadProfileAssets(['alice'], {
      profilesDir: '/fake/profiles',
    });

    expect(assetMap.alice_post_1).toBe('MISSING');
  });
});
