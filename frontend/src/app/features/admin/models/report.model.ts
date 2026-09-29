export type ReportStatus = 'submitted' | 'under_review' | 'resolved' | 'rejected';
export type ReportEvidenceType = 'photo' | 'screenshot';

export interface ReportEvidence {
  id: string;
  storagePath: string;
  evidenceType: ReportEvidenceType;
  mimeType: string;
  fileSizeBytes: number;
}

export interface Report {
  id: string;
  listingId: string;
  listingTitle: string;
  reporterId: string;
  reporterDisplayName: string;
  categoryCode: string;
  categoryLabel: string;
  description: string;
  status: ReportStatus;
  assignedAdminId?: string;
  resolutionNote?: string;
  resolvedAt?: string;
  createdAt: string;
  updatedAt: string;
  evidence: ReportEvidence[];
}
