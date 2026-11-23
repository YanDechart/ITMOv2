export type IssueType = 'bug' | 'task' | 'feature' | 'needs-triage';

export interface TriageRequest {
  title: string;
  description: string;
}

export interface TriageResult {
  type: IssueType;
  confidence: number;
  priority: 'Высокий' | 'Средний' | 'Низкий';
  recommendation: string;
  summary: string;
}

export interface TriageRecord extends TriageResult, TriageRequest {
  id: string;
  createdAt: string;
}
