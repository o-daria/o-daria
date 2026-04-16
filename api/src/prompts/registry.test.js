/**
 * registry.test.js
 *
 * Unit tests for the in-process prompt registry.
 * Tests register(), getPrompt() (in-process path only), snapshotVersions().
 * The DB path for getPrompt() is covered by integration tests.
 *
 * No external dependencies required.
 */

import { describe, it, expect } from 'vitest';
import { register, getPrompt, snapshotVersions, getCurrentVersionSnapshot } from './registry.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const UNIQUE_PREFIX = `test_${Date.now()}_`;

let counter = 0;
function uniqueName() {
  return `${UNIQUE_PREFIX}${counter++}`;
}

// ─── register() ───────────────────────────────────────────────────────────────

describe('register()', () => {
  it('registers a prompt retrievable by name@version', async () => {
    const name = uniqueName();
    register(name, 'v1.0', 'You are a helpful assistant.', 'claude-haiku');

    const result = await getPrompt(name, 'v1.0');
    expect(result.content).toBe('You are a helpful assistant.');
    expect(result.version).toBe('v1.0');
  });

  it('updates the "latest" pointer on each register call', async () => {
    const name = uniqueName();
    register(name, 'v1.0', 'Version one prompt.');
    register(name, 'v2.0', 'Version two prompt.');

    const result = await getPrompt(name, 'latest');
    expect(result.content).toBe('Version two prompt.');
    expect(result.version).toBe('v2.0');
  });

  it('stores modelHint alongside the prompt', async () => {
    const name = uniqueName();
    register(name, 'v1.0', 'Some prompt.', 'claude-sonnet-4-6');

    const result = await getPrompt(name, 'v1.0');
    expect(result.modelHint).toBe('claude-sonnet-4-6');
  });

  it('modelHint defaults to null when not provided', async () => {
    const name = uniqueName();
    register(name, 'v1.0', 'Prompt without model hint.');

    const result = await getPrompt(name, 'v1.0');
    expect(result.modelHint).toBeNull();
  });

  it('older versions remain accessible after registering a new version', async () => {
    const name = uniqueName();
    register(name, 'v1.0', 'Original prompt.');
    register(name, 'v2.0', 'Updated prompt.');

    const v1 = await getPrompt(name, 'v1.0');
    expect(v1.content).toBe('Original prompt.');
  });
});

// ─── getPrompt() — in-process path ────────────────────────────────────────────

describe('getPrompt() — in-process', () => {
  it('retrieves prompt by exact version', async () => {
    const name = uniqueName();
    register(name, 'v3.0', 'Exact version content.');

    const result = await getPrompt(name, 'v3.0');
    expect(result.content).toBe('Exact version content.');
  });

  it('retrieves latest version when version is "latest"', async () => {
    const name = uniqueName();
    register(name, 'v1.0', 'First.');
    register(name, 'v2.0', 'Second.');

    const result = await getPrompt(name, 'latest');
    expect(result.content).toBe('Second.');
  });

  it('defaults to "latest" when version is omitted', async () => {
    const name = uniqueName();
    register(name, 'v1.0', 'Latest default.');

    const result = await getPrompt(name);
    expect(result.content).toBe('Latest default.');
  });

  it('throws when prompt name is not registered', async () => {
    await expect(
      getPrompt('definitely_not_registered_prompt_xyz')
    ).rejects.toThrow(/Prompt not found/);
  });

  it('throws when a specific version is not registered', async () => {
    const name = uniqueName();
    register(name, 'v1.0', 'Only v1.');

    await expect(
      getPrompt(name, 'v99.0')
    ).rejects.toThrow(/Prompt not found/);
  });
});

// ─── snapshotVersions() ───────────────────────────────────────────────────────

describe('snapshotVersions()', () => {
  it('returns version strings for requested prompt names', async () => {
    const nameA = uniqueName();
    const nameB = uniqueName();
    register(nameA, 'v1.0', 'Prompt A.');
    register(nameB, 'v2.0', 'Prompt B.');

    const snapshot = await snapshotVersions([nameA, nameB]);
    expect(snapshot[nameA]).toBe('v1.0');
    expect(snapshot[nameB]).toBe('v2.0');
  });

  it('omits names that are not registered', async () => {
    const name = uniqueName();
    register(name, 'v1.0', 'Registered.');

    const snapshot = await snapshotVersions([name, 'not_registered_xyz']);
    expect(name in snapshot).toBe(true);
    expect('not_registered_xyz' in snapshot).toBe(false);
  });

  it('returns empty object for empty names array', async () => {
    const snapshot = await snapshotVersions([]);
    expect(snapshot).toEqual({});
  });

  it('reflects the latest version, not an older one', async () => {
    const name = uniqueName();
    register(name, 'v1.0', 'Old.');
    register(name, 'v2.0', 'New.');

    const snapshot = await snapshotVersions([name]);
    expect(snapshot[name]).toBe('v2.0');
  });
});

// ─── getCurrentVersionSnapshot() ─────────────────────────────────────────────

describe('getCurrentVersionSnapshot()', () => {
  it('returns a flat name → version map for all registered prompts', () => {
    const name = uniqueName();
    register(name, 'v5.0', 'Test.');

    const snapshot = getCurrentVersionSnapshot();
    expect(name in snapshot).toBe(true);
    expect(snapshot[name]).toBe('v5.0');
  });

  it('returns an object (not a Map)', () => {
    const snapshot = getCurrentVersionSnapshot();
    expect(snapshot).not.toBeNull();
    expect(typeof snapshot).toBe('object');
    expect('get' in snapshot).toBe(false);
  });
});
