# Code Summary — U-04: mfe-reports

**Unit**: U-04 mfe-reports
**Port**: 3003
**MF exposes**: `./ReportPanel`
**Status**: COMPLETED (updated 2026-04-09)

---

## Files

| File | Purpose |
|---|---|
| `apps/mfe-reports/src/ReportPanel.tsx` | MFE entry — polling-based report display; consumed via Module Federation by mfe-projects |
| `apps/mfe-reports/src/components/ReportSummaryCard.tsx` | Metric card for a single `ReportMetric` |
| `apps/mfe-reports/src/hooks/useProjectReports.ts` | Fetches all reports for a project: `GET /api/projects/:projectId/reports` |
| `apps/mfe-reports/src/hooks/useReportData.ts` | Polls `GET /api/reports/:reportId` every 3s until status is terminal |
| `apps/mfe-reports/src/main.tsx` | Standalone dev harness |

---

## Key Design Decisions

- **No SSE**: The previous SSE-based status tracking (`useProjectStatusSSE`) has been replaced entirely by HTTP polling. `ReportPanel` fetches the report list for the project, picks the most recent by `created_at`, then polls it by `report_id` until status is `"COMPLETED"` or `"FAILED"`.
- **Multiple reports per project**: `GET /api/projects/:projectId/reports` returns an array. The UI always shows the most recent report. No history view in this story.
- **`report` is a JSON string**: The `report` field in `ReportResponse` is a serialized `ReportData` object. `ReportPanel` parses it with `JSON.parse` before rendering. Parse failures show an empty state.
- **Polling stops automatically**: `refetchInterval` returns `false` once `status` is `"COMPLETED"` or `"FAILED"`, preventing unnecessary network traffic.
- **`initialStatus` prop retained**: Kept for backwards compatibility with the `main.tsx` standalone harness. Used only as a fallback label when no reports exist.

---

## API Contracts

```
GET  /api/projects/:projectId/reports
Authorization: Bearer ramsey-packado
→ 200 ReportResponse[]

GET  /api/reports/:reportId
Authorization: Bearer ramsey-packado
→ 200 ReportResponse

ReportResponse {
  report_id:     string
  status:        "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED"
  error?:        string
  brand_dna:     string  // JSON string
  report?:       string  // JSON string — ReportData shape, present when COMPLETED
  integrity?:    string
  created_at:    string  // ISO date
  completed_at?: string  // ISO date
}
```

## ReportPanel States

| Condition | UI |
|---|---|
| Reports list loading | Spinner |
| Reports list error | ErrorMessage with retry |
| No reports for project | "Upload profile images to start analysis" placeholder |
| status PENDING / PROCESSING | Spinner + "Analysing audience data…" |
| status FAILED | ErrorMessage with `error` message |
| Report data loading | Spinner |
| status COMPLETED, parse ok | Full report data view (see below) |
| status COMPLETED, parse fail | Empty state placeholder |

## Report Data View Sections

1. **Alignment score** — circular score badge + rationale text
2. **Audience segments** — `AudienceSegmentCard` per segment; strong-fit segments first; each card shows: name, brand_fit badge, size estimate, defining traits list, content direction callout
3. **Audience topics** — `Badge` tags for each topic string
4. **Content strategy pillars** — `ContentPillarCard` per pillar; each shows: pillar title, example post (italic), why it works
5. **Risks** — `RiskItem` list; each item shows warning icon, risk label (bold), risk detail

## Components

| Component | File | Purpose |
|---|---|---|
| `ReportPanel` | `ReportPanel.tsx` | MFE entry — orchestrates all states and sections |
| `AudienceSegmentCard` | `components/AudienceSegmentCard.tsx` | Single audience segment card |
| `ContentPillarCard` | `components/ContentPillarCard.tsx` | Single content strategy pillar card |
| `RiskItem` | `components/RiskItem.tsx` | Single risk row |
| `useProjectReports` | `hooks/useProjectReports.ts` | Fetches report list for a project |
| `useReportData` | `hooks/useReportData.ts` | Polls single report until terminal |

## ReportData Type (packages/@app/api-client)

```ts
ReportData {
  brand: string
  alignment_score: { overall: number; rationale: string }
  audience_segments: AudienceSegment[]
  content_strategy_pillars: ContentStrategyPillar[]
  risks: ReportRisk[]
  topics: string[]
  audience_narrative: AudienceNarrative
  content_mix_aggregate: Record<string, number>
}
```
