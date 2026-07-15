import { put, get, del } from "@vercel/blob";
import type { Annotation, Page } from "./types";

// Jira Server / Data Center (self-hosted) — auth is a Bearer Personal Access
// Token generated from the user's own Jira profile, not an email + API token
// pair from id.atlassian.com (that's Jira Cloud's auth model, which this isn't).
export interface JiraConfig {
  siteUrl: string;
  apiToken: string;
  projectKey: string;
}

// Forgiving of a pasted board/project/browse URL (e.g. ".../secure/RapidBoard.jspa?...")
// instead of the bare site root — only the origin is ever needed for API calls.
export function normalizeSiteUrl(url: string): string {
  try {
    return new URL(url.trim()).origin;
  } catch {
    return url.trim().replace(/\/$/, "");
  }
}

// Jira credentials are a real secret (the API token must be kept in plaintext
// server-side to call the Jira API), so this is stored as its own *private*
// blob and never returned to the browser.
const CONFIG_PATH = "jira-config/config.json";

export async function getJiraConfig(): Promise<JiraConfig | null> {
  try {
    const result = await get(CONFIG_PATH, { access: "private", token: process.env.BLOB_READ_WRITE_TOKEN });
    if (!result || result.statusCode !== 200) return null;
    const text = await new Response(result.stream).text();
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export async function saveJiraConfig(config: JiraConfig): Promise<void> {
  await put(CONFIG_PATH, JSON.stringify(config), {
    access: "private",
    contentType: "application/json",
    token: process.env.BLOB_READ_WRITE_TOKEN,
    allowOverwrite: true,
  });
}

export async function deleteJiraConfig(): Promise<void> {
  await del(CONFIG_PATH, { token: process.env.BLOB_READ_WRITE_TOKEN }).catch(() => {});
}

// Jira Server/Data Center's REST API v2 takes `description` as a plain wiki-markup
// string (Jira Cloud's v3 API is the one that requires an Atlassian Document
// Format node tree — this isn't that).
function wikiMarkup(sections: { heading?: string; text: string }[]) {
  return sections.map(s => (s.heading ? `h4. ${s.heading}\n${s.text}` : s.text)).join("\n\n");
}

export function buildJiraDescription(annotation: Annotation, page: Page, shareUrl: string) {
  const sections: { heading?: string; text: string }[] = [
    { heading: "Category / Severity", text: `${annotation.category} · ${annotation.severity}` },
  ];
  if (annotation.detail) sections.push({ heading: "Observed", text: annotation.detail });
  if (annotation.recommendation) sections.push({ heading: "Recommendation", text: annotation.recommendation });
  if (annotation.hypothesis) sections.push({ heading: "Acceptance criteria", text: annotation.hypothesis });
  else if (annotation.recommendation) sections.push({ heading: "Acceptance criteria", text: annotation.recommendation });
  sections.push({ heading: "Source", text: `${page.name} (${page.device}) — ${shareUrl}` });
  return wikiMarkup(sections);
}

export async function createJiraIssue(config: JiraConfig, summary: string, description: string) {
  const base = config.siteUrl.replace(/\/$/, "");
  const res = await fetch(`${base}/rest/api/2/issue`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiToken}`,
    },
    body: JSON.stringify({
      fields: {
        project: { key: config.projectKey },
        summary,
        issuetype: { name: "Task" },
        description,
      },
    }),
  });
  const data = await res.json();
  if (!res.ok) {
    const message = data.errorMessages?.join(", ") || Object.values(data.errors || {}).join(", ") || "Jira API error";
    throw new Error(message);
  }
  return { key: data.key as string, url: `${base}/browse/${data.key}` };
}
