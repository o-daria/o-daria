export type ProjectStatus =
  | "DRAFT"
  | "PROCESSING"
  | "REPORT_READY"
  | "PRESENTATION_READY";

/** Shape of data stored locally for a created project */
export interface Project {
  projectId: string;
  brandName: string;
  brandDna: string;
  status?: ProjectStatus;
  ownerId?: string;
  canvaLink?: string;
  reportData?: ReportData;
  createdAt: string;
  updatedAt?: string;
}

/** Fields the user submits when creating a project */
export interface ProjectInput {
  name: string;         // brand name
  brand_input: string;  // brand values
}

/** Payload sent to POST /api/projects */
export interface CreateProjectRequest {
  brand: string;
  brand_input: string;
}

/** Response from POST /api/projects */
export interface CreateProjectResponse {
  projectId: string;
  brandName: string;
  brandDna: string;
  createdAt: string;
}

/** Response from POST /api/reports (async — no inline report data) */
export interface StartAnalysisResponse {
  report_id: string;
}

export interface ReportRisk {
  label: string;
  detail: string;
}

export interface AudienceSegment {
  segment_name: string;
  brand_fit: "strong" | "moderate" | "weak";
  pattern_match: string;
  size_estimate: string;
  segment_star: string;
  defining_traits: string[];
  content_direction: string;
  representative_handles: string[];
}

export interface ContentStrategyPillar {
  pillar: string;
  example_post: string;
  why_it_works: string;
}

export interface AudienceNarrative {
  intro: string;
  bullets: string[];
  language: string;
}

export interface AlignmentScore {
  overall: number;
  rationale: string;
}

export interface ReportData {
  brand: string;
  alignment_score: AlignmentScore;
  audience_segments: AudienceSegment[];
  content_strategy_pillars: ContentStrategyPillar[];
  risks: ReportRisk[];
  topics: string[];
  audience_narrative: AudienceNarrative;
  content_mix_aggregate: Record<string, number>;
}

/** Response from GET /api/reports/:reportId and GET /api/projects/:projectId/reports items */
export interface ReportResponse {
  report_id: string
  status: string
  error?: string
  brand_dna: BrandDna
  report: Report
  created_at: string
  completed_at: string
}

export interface BrandDna {}

export interface Report {
  brand: string
  risks: Risk[]
  topics: string[]
  alignment_score: AlignmentScore
  topic_to_handles: TopicToHandles
  audience_segments: AudienceSegment[]
  audience_narrative: AudienceNarrative
  content_mix_aggregate: ContentMixAggregate
  content_strategy_pillars: ContentStrategyPillar[]
  best_photos_for_persona_slide: string[]
}

export interface Risk {
  label: string
  detail: string
}

export interface AlignmentScore {
  overall: number
  rationale: string
}

export interface TopicToHandles {
  "ЖІНОЧНІ КОЛА": string[]
  "ЧАЙНА КУЛЬТУРА": string[]
  "ПРИРОДА ТА ГОРИ": string[]
  "ПОДОРОЖІ І ПРИГОДИ": string[]
  "СПІЛЬНОТА ОДНОДУМЦІВ": string[]
  "ТВОРЧІСТЬ І САМОВИРАЖЕННЯ": string[]
  "МЕДИТАЦІЯ ТА УСВІДОМЛЕНІСТЬ": string[]
  "ДУХОВНІ ПРАКТИКИ ТА ЕЗОТЕРИКА": string[]
}

export interface AudienceSegment {
  brand_fit: string
  segment_name: string
  pattern_match: string
  size_estimate: string
  defining_traits: string[]
  content_direction: string
  representative_handles: string[]
}

export interface AudienceNarrative {
  intro: string
  bullets: string[]
  language: string
}

export interface ContentMixAggregate {
  other: number
  nature: number
  selfie: number
  travel: number
  product: number
  abstract: number
  creative: number
  lifestyle: number
  text_quote: number
}

export interface ContentStrategyPillar {
  pillar: string
  example_post: string
  why_it_works: string
}

// export interface ReportResponse {
//   report_id: string;
//   status: string;          // "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED"
//   error?: string;
//   brand_dna: string;       // JSON string
//   report?: string;         // JSON string — present when status === "COMPLETED"
//   integrity?: string;
//   created_at: string;      // ISO date string
//   completed_at?: string;   // ISO date string
// }

export interface CanvaSetupRequest {
  projectId: string;
}

export interface CanvaSetupResponse {
  sessionToken: string;
}

export interface CanvaGenerateRequest {
  projectId: string;
  sessionToken: string;
}

export interface CanvaGenerateResponse {
  canvaLink: string;
}
