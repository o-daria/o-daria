/**
 * queryBuilder.js — Canva Presentation Query Builder
 *
 * Pure functions that transform an audience report + asset map into a
 * fully-resolved Canva presentation query. No filesystem I/O, no env reads.
 *
 * Extracted from scripts/prepare-canva.js for use by both the CLI wrapper
 * and the presentation API endpoint.
 */

export const QUERY_LENGTH_LIMIT = 6000;

// ─── Asset resolution ────────────────────────────────────────────────────────

/**
 * Apply fallback chain: post_1 → post_2 → post_3 → grid → null
 */
export function resolveHandle(handle, assetMap) {
  for (const suffix of ['post_1', 'post_2', 'post_3', 'grid']) {
    const key = `${handle}_${suffix}`;
    const val = assetMap[key];
    if (val && val !== 'MISSING') return val;
  }
  return null;
}

// ─── Slide photo map ─────────────────────────────────────────────────────────

export function buildSlidePhotoMap(report, assetMap) {
  const usedIds = new Set();

  function pick(id) {
    if (!id || usedIds.has(id)) return null;
    usedIds.add(id);
    return id;
  }

  // Slide 3 — persona (up to 8 photos)
  const personaPhotoIds = [];
  for (const handle of (report.best_photos_for_persona_slide ?? [])) {
    if (personaPhotoIds.length >= 8) break;
    const id = pick(resolveHandle(handle, assetMap));
    if (id) personaPhotoIds.push(id);
  }

  // Segment slides — up to 3 photos each
  const segmentPhotoIds = {};
  for (const segment of (report.audience_segments ?? [])) {
    const ids = [];
    for (const handle of (segment.representative_handles ?? [])) {
      if (ids.length >= 3) break;
      const id = pick(resolveHandle(handle, assetMap));
      if (id) ids.push(id);
    }
    segmentPhotoIds[segment.segment_name] = ids;
  }

  return { personaPhotoIds, segmentPhotoIds };
}

// ─── Asset tag assignment ────────────────────────────────────────────────────

export function assignTags(personaPhotoIds, segmentPhotoIds, segments) {
  const allAssetIds = [];
  const idToTag = {};
  let counter = 1;

  function register(id) {
    if (!id || idToTag[id]) return;
    const tag = `[A${String(counter).padStart(2, '0')}]`;
    idToTag[id] = tag;
    allAssetIds.push(id);
    counter++;
  }

  for (const id of personaPhotoIds) register(id);
  for (const segment of segments) {
    for (const id of (segmentPhotoIds[segment.segment_name] ?? [])) register(id);
  }

  return { allAssetIds, idToTag };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function brandFitEmoji(fit) {
  if (!fit) return '';
  const f = fit.toLowerCase();
  if (f.includes('висок') || f.includes('strong') || f.includes('excellent')) return '🟢';
  if (f.includes('середн') || f.includes('medium') || f.includes('moderate')) return '🟡';
  return '🔴';
}

// ─── Main query builder ──────────────────────────────────────────────────────

/**
 * Build the fully-resolved Canva presentation query.
 *
 * @param {object} report   - audience_report.json contents
 * @param {object} assetMap - { "{handle}_{type}": "canva_asset_id" | "MISSING" }
 * @param {object} [options]
 * @param {string} [options.brandName]   - override report.brand
 * @param {string} [options.brandValues] - override report.brand_DNA
 * @param {boolean} [options.compact]    - force compact mode
 * @returns {{ query: string, allAssetIds: string[], totalSlides: number, personaPhotoIds: string[], segmentPhotoIds: object }}
 */
export function buildQuery(report, assetMap, options = {}) {
  const {
    brandName   = report.brand || 'Brand',
    brandValues = report.brand_DNA
      || (report.content_strategy_pillars ?? []).map(p => p.why_it_works).filter(Boolean).join(', ')
      || '',
    compact = false,
  } = options;

  const segments = report.audience_segments ?? [];
  const segCount = segments.length;
  const totalSlides = 6 + segCount;  // cover + who + persona + N segments + strategy + risks + closing

  // Build photo map
  const { personaPhotoIds, segmentPhotoIds } = buildSlidePhotoMap(report, assetMap);
  const { allAssetIds, idToTag } = assignTags(personaPhotoIds, segmentPhotoIds, segments);

  function tag(id) { return id ? (idToTag[id] ?? id) : null; }

  // ── Asset manifest block ───────────────────────────────────────────────────
  const manifestLines = allAssetIds.map(id => `${idToTag[id]} = ${id}`);
  const manifestBlock = manifestLines.length > 0
    ? `ASSET MANIFEST — mandatory reference table:\n${manifestLines.join('\n')}\n\nCRITICAL ASSET RULES:\n1. Each tag ([A01], [A02], etc.) maps to a Canva asset ID above.\n2. Tags listed under a slide belong ONLY to that slide — never reuse on another slide.\n3. Place every listed tag exactly once on its assigned slide.\n4. If no tags are listed for a slide, it has no photos.\n`
    : '';

  // ── Slide 2 bullets ────────────────────────────────────────────────────────
  const bullets = (report.audience_narrative?.bullets ?? []).slice(0, 6);
  const bulletLines = bullets.map(b => `  ${b}`).join('\n');

  // ── Slide 3 — persona ──────────────────────────────────────────────────────
  const personaTags = personaPhotoIds.map(tag).filter(Boolean);
  const personaAssetLines = personaTags
    .map((t, i) => `  ASSET ${i + 1}: ${t}`)
    .join('\n');

  // ── Segment slides ─────────────────────────────────────────────────────────
  const segmentBlocks = segments.map((seg, idx) => {
    const slideNum = 4 + idx;
    const segTags  = (segmentPhotoIds[seg.segment_name] ?? []).map(tag).filter(Boolean);
    const traits   = compact
      ? (seg.defining_traits ?? []).slice(0, 2)
      : (seg.defining_traits ?? []).slice(0, 4);
    const traitLines = traits.map(t => `  • ${t}`).join('\n');
    const assetLines = segTags.map((t, i) => `  ASSET ${i + 1}: ${t}`).join('\n');
    const emoji = brandFitEmoji(seg.brand_fit);

    return `
SLIDE ${slideNum} — ${(seg.segment_name ?? '').toUpperCase()}
Title: "${seg.segment_name}"
Sub-label: "${seg.size_estimate ?? ''}"
Brand fit badge: ${emoji} ${seg.brand_fit ?? ''}
Left column — defining traits:
${traitLines}
Italic callout box labelled "Ідея контенту":
  ${seg.content_direction ?? ''}
Right side (~30% width) — vertical photo strip, stacked top-to-bottom,
using ONLY the assets listed below (use each exactly once, never on other slides):
${assetLines || '  (no assets available for this segment)'}`.trim();
  });

  // ── Strategy slide ─────────────────────────────────────────────────────────
  const strategySlide = 4 + segCount;
  const pillars = report.content_strategy_pillars ?? [];
  const pillarLines = pillars.map(p => {
    const parts = [`  **${p.pillar ?? p.name ?? ''}** — ${p.body ?? p.description ?? ''}`];
    if (!compact && p.example) parts.push(`  _Example: ${p.example}_`);
    return parts.join('\n');
  }).join('\n');

  // ── Risks slide ────────────────────────────────────────────────────────────
  const risksSlide = 5 + segCount;
  const risks = report.risks ?? [];
  const riskLines = risks.map(r => {
    const label  = r.label ?? r.risk ?? '';
    const detail = compact
      ? (r.detail ?? r.description ?? '').split('.')[0] + '.'
      : (r.detail ?? r.description ?? '');
    return `  **${label}** — ${detail}`;
  }).join('\n');

  // ── Closing slide ──────────────────────────────────────────────────────────
  const closingSlide = 6 + segCount;

  // ── Assemble full query ────────────────────────────────────────────────────
  const query = `Create a visually rich, editorial-quality brand presentation for ${brandName}.

Brand DNA: ${brandValues}.
Colour mood: earthy warm neutrals (stone, linen, sand), deep forest greens, aged wood tones,
bold typographic accents in near-black or deep moss. No pastels. No generic blues.
Typography: pair a distinctive serif or slab-serif display font with a clean humanist body font.
Apply creative, editorial layouts — NO blank or generic templates. Each slide should feel designed.

${manifestBlock}
Total slides: ${totalSlides}

---

SLIDE 1 — COVER
Title: "${brandName} — Аудиторний Звіт"
Subtitle: "${report.audience_narrative?.intro ?? ''}"
Typography-only cover — no photo asset.
Brand name large and centred with dramatic typographic treatment.

---

SLIDE 2 — ХТО НАША АУДИТОРІЯ
Title: "Хто наша аудиторія"
Typography-only slide — no photos.
Display each line as a large bold pull-quote, one statement per visual block:
${bulletLines}

---

SLIDE 3 — НАША ПЕРСОНА
Title: "Наша Персона"
Full-slide editorial photo collage — fill the entire slide with an asymmetric mosaic
using ALL of the assets listed below. Use each exactly once; no blank space.
Mix portrait and landscape crops freely for a magazine-quality result.
${personaAssetLines || '  (no persona assets available)'}
Small caption overlay at bottom:
  "Активні, свідомі, міські — вони обирають якість і тишу над показністю."

---

${segmentBlocks.join('\n\n---\n\n')}

---

SLIDE ${strategySlide} — КОНТЕНТ-СТРАТЕГІЯ
Title: "Контент-Стратегія"
No photos. Grid layout — one card per pillar:
${pillarLines}

---

SLIDE ${risksSlide} — РИЗИКИ
Title: "Ризики та Обмеження"
No photos. Two-column card grid — one card per risk:
${riskLines}

---

SLIDE ${closingSlide} — CLOSING
Title: "Дякуємо"
Subtitle: "${brandName} — де якість зустрічає природу"
Do NOT use any asset tag from earlier slides.
Generate a single cinematic image for this slide using this prompt:
  "A lone wooden terrace at golden hour overlooking misty mountain ridges,
   a single steaming cup on a rough-hewn table, no people, warm amber light,
   editorial photography style, serene and minimal."
Place the generated image full-bleed behind the text.
Brand name centred, warm minimal closing layout.
`.trim();

  return { query, allAssetIds, totalSlides, personaPhotoIds, segmentPhotoIds };
}
