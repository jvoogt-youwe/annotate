export type Category = "UX" | "A11y" | "CRO" | "Perf" | "Idea";

export type Severity = "Critical" | "High" | "Medium" | "Low";

export type Device = "desktop" | "mobile";

export interface Attachment {
  id: string;
  type: "image" | "link";
  url: string;
  label?: string;
}

export interface Annotation {
  id: string;
  number: number;
  x: number;
  y: number;
  category: Category;
  severity: Severity;
  title: string;
  detail: string;
  recommendation: string;
  hypothesis: string;
  clientNotes?: string;
  source?: "ai" | "manual";
  aiFeedback?: "up" | "down";
  attachments?: Attachment[];
  jiraKey?: string;
  jiraUrl?: string;
}

export interface Page {
  id: string;
  name: string;
  url: string;
  device: Device;
  screenshotUrl: string;
  annotations: Annotation[];
}

export interface Overview {
  summary: string;
  keyFindings: string;
  urgentFixes: string;
}

export interface DataSource {
  id: string;
  name: string;
  url: string;
  contentType: string;
  uploadedAt: string;
}

export interface Report {
  id: string;
  siteName: string;
  url: string;
  clientId?: string;
  pages: Page[];
  overview?: Overview;
  dataSources?: DataSource[];
}
