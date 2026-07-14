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
  attachments?: Attachment[];
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

export interface Report {
  id: string;
  siteName: string;
  url: string;
  pages: Page[];
  overview?: Overview;
}
