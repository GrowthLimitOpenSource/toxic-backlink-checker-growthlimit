export type ImportSource = "Google Search Console" | "Ahrefs" | "Semrush" | "Majestic" | "Moz" | "Generic CSV";

export interface ImportFile {
  name: string;
  content: string;
}

export interface ImportSummary {
  fileName: string;
  source: ImportSource;
  rowsRead: number;
  rowsAccepted: number;
  rowsRejected: number;
}

export interface DecisionEvent {
  at: string;
  classification: Classification;
  approved: boolean;
}

export type Classification = "KEEP" | "REVIEW" | "REMOVE_URL" | "DISAVOW_URL" | "DISAVOW_DOMAIN";

export interface BacklinkRow {
  urlFrom: string;
  urlTo: string;
  domainFrom: string;
  domainTo: string;
  anchor: string;
  textPre: string;
  textPost: string;
  dofollow: boolean | null;
  isNew: boolean;
  isLost: boolean;
  firstSeen: string | null;
  lastSeen: string | null;
  rank: number | null;
  domainRank: number | null;
  pageRank: number | null;
  source: Record<string, unknown>;
  sources: string[];
}

export interface Evidence {
  code: string;
  label: string;
  detail: string;
  weight: number;
  kind: "risk" | "context" | "protective";
}

export interface PageInspection {
  requestedUrl: string;
  finalUrl: string | null;
  status: number | null;
  title: string | null;
  linkFound: boolean;
  rel: string[];
  anchor: string | null;
  surroundingText: string | null;
  blockedReason: string | null;
  fetchedAt: string;
}

export interface DomainGroup {
  domain: string;
  links: BacklinkRow[];
  anchors: Array<{ value: string; count: number; share: number }>;
  targets: Array<{ value: string; count: number; share: number }>;
  followCount: number;
  sitewideTargets: number;
  sourceNames: string[];
  evidence: Evidence[];
  inspection?: PageInspection;
  classification: Classification;
  confidence: number;
  humanChecks: string[];
  note: string;
  approved: boolean;
  decisionHistory: DecisionEvent[];
}

export interface ExistingDisavow {
  comments: string[];
  domains: string[];
  urls: string[];
  invalid: Array<{ line: number; value: string; reason: string }>;
}

export interface AuditOptions {
  target: string;
  includeSubdomains: boolean;
  includeDataForSeo: boolean;
  maxBacklinks: number;
  inspectPages: number;
  concurrency: number;
  fetchTimeoutMs: number;
  maxResponseBytes: number;
  commercialTerms: string[];
  existingDisavow?: string;
  useLlm: boolean;
}

export interface AuditReport {
  id: string;
  applicationVersion: string;
  ruleSetVersion: string;
  createdAt: string;
  target: string;
  options: AuditOptions;
  source: { provider: string; endpoint: string; rowsRetrieved: number; cost: number | null; tasks: number };
  summary: Record<string, unknown> | null;
  groups: DomainGroup[];
  imports: ImportSummary[];
  existingDisavow: ExistingDisavow;
  proposedDisavow: string;
  warnings: string[];
  llm: { enabled: boolean; provider: string | null; model: string | null; groupsReviewed: number };
}

export interface AuditSummary {
  id: string;
  target: string;
  createdAt: string;
  groupCount: number;
  reviewCount: number;
  approvedCount: number;
  sourceNames: string[];
}

export interface GroupChange {
  domain: string;
  previousClassification: Classification;
  currentClassification: Classification;
  previousApproved: boolean;
  currentApproved: boolean;
  evidenceAdded: string[];
  evidenceRemoved: string[];
}

export interface AuditComparison {
  currentAuditId: string;
  previousAuditId: string | null;
  previousCreatedAt: string | null;
  newDomains: string[];
  removedDomains: string[];
  changedGroups: GroupChange[];
  disavowAdded: string[];
  disavowRemoved: string[];
}
