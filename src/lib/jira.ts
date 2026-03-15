import { db } from "@/lib/db";
import { encryptToken, decryptToken } from "@/lib/jira-crypto";

const ATLASSIAN_AUTH_URL = "https://auth.atlassian.com";
const ATLASSIAN_API_URL = "https://api.atlassian.com";

// ── Connection helpers ────────────────────────────────────────

export async function getJiraConnection(userId: string) {
  return db.jiraConnection.findUnique({ where: { userId } });
}

/**
 * Returns a valid access token for the user.
 * Auto-refreshes if the token expires within 5 minutes.
 */
export async function getValidAccessToken(userId: string): Promise<string> {
  const connection = await db.jiraConnection.findUnique({ where: { userId } });
  if (!connection) throw new Error("No Jira connection found");

  const fiveMinFromNow = new Date(Date.now() + 5 * 60 * 1000);

  if (connection.expiresAt > fiveMinFromNow) {
    return decryptToken(connection.accessToken);
  }

  // Refresh the token
  const refreshToken = decryptToken(connection.refreshToken);
  const res = await fetch(`${ATLASSIAN_AUTH_URL}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      grant_type: "refresh_token",
      client_id: process.env.JIRA_CLIENT_ID,
      client_secret: process.env.JIRA_CLIENT_SECRET,
      refresh_token: refreshToken,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Token refresh failed: ${body}`);
  }

  const tokens = (await res.json()) as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };

  await db.jiraConnection.update({
    where: { userId },
    data: {
      accessToken: encryptToken(tokens.access_token),
      refreshToken: encryptToken(tokens.refresh_token),
      expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
    },
  });

  return tokens.access_token;
}

// ── Jira API calls ────────────────────────────────────────────

interface FetchIssuesOptions {
  jql?: string;
  startAt?: number;
  maxResults?: number;
}

export interface JiraIssue {
  id: string;
  key: string;
  fields: {
    summary: string;
    description: unknown;
    priority?: { name: string };
    status: { name: string; statusCategory: { key: string } };
    duedate: string | null;
    issuetype?: { name: string; iconUrl?: string };
    project?: { key: string; name: string };
  };
}

export interface JiraSearchResult {
  issues: JiraIssue[];
  total: number;
  startAt: number;
  maxResults: number;
}

export interface JiraProject {
  id: string;
  key: string;
  name: string;
}

export async function fetchJiraIssues(
  userId: string,
  options: FetchIssuesOptions = {},
): Promise<JiraSearchResult> {
  const connection = await db.jiraConnection.findUniqueOrThrow({ where: { userId } });
  const token = await getValidAccessToken(userId);

  const jql = options.jql || "assignee = currentUser() ORDER BY updated DESC";
  const startAt = options.startAt ?? 0;
  const maxResults = options.maxResults ?? 50;

  const params = new URLSearchParams({
    jql,
    startAt: String(startAt),
    maxResults: String(maxResults),
    fields: "summary,description,priority,status,duedate,issuetype,project",
  });

  const res = await fetch(
    `${ATLASSIAN_API_URL}/ex/jira/${connection.cloudId}/rest/api/3/search?${params}`,
    { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } },
  );

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Jira search failed (${res.status}): ${body}`);
  }

  return res.json() as Promise<JiraSearchResult>;
}

export async function fetchJiraProjects(userId: string): Promise<JiraProject[]> {
  const connection = await db.jiraConnection.findUniqueOrThrow({ where: { userId } });
  const token = await getValidAccessToken(userId);

  const res = await fetch(
    `${ATLASSIAN_API_URL}/ex/jira/${connection.cloudId}/rest/api/3/project/search?maxResults=100&orderBy=name`,
    { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } },
  );

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Jira projects fetch failed (${res.status}): ${body}`);
  }

  const data = (await res.json()) as { values: JiraProject[] };
  return data.values;
}

// ── Field mapping ─────────────────────────────────────────────

/**
 * Recursively extract plain text from Atlassian Document Format JSON.
 */
export function adfToPlainText(adf: unknown): string {
  if (!adf || typeof adf !== "object") return "";

  const node = adf as { type?: string; text?: string; content?: unknown[] };

  if (node.type === "text" && typeof node.text === "string") {
    return node.text;
  }

  if (Array.isArray(node.content)) {
    return node.content
      .map((child) => adfToPlainText(child))
      .join(node.type === "paragraph" ? "\n" : "");
  }

  return "";
}

const PRIORITY_MAP: Record<string, number> = {
  lowest: 0,
  trivial: 0,
  low: 1,
  minor: 1,
  medium: 1,
  high: 2,
  major: 2,
  highest: 3,
  critical: 3,
  blocker: 3,
};

const STATUS_CATEGORY_MAP: Record<string, number> = {
  new: 1,          // To Do
  undefined: 1,    // To Do
  indeterminate: 2, // In Progress
  done: 4,         // Done
};

export interface MappedJiraTask {
  title: string;
  description: string;
  priority: number;
  status: number;
  dueDate: string | null;
  jiraIssueId: string;
  jiraIssueKey: string;
  jiraUrl: string;
}

export function mapJiraIssueToTask(issue: JiraIssue, cloudName: string): MappedJiraTask {
  const description = adfToPlainText(issue.fields.description);
  const priorityName = (issue.fields.priority?.name || "medium").toLowerCase();
  const statusCategoryKey = issue.fields.status.statusCategory.key;

  return {
    title: issue.fields.summary,
    description,
    priority: PRIORITY_MAP[priorityName] ?? 1,
    status: STATUS_CATEGORY_MAP[statusCategoryKey] ?? 1,
    dueDate: issue.fields.duedate || null,
    jiraIssueId: issue.id,
    jiraIssueKey: issue.key,
    jiraUrl: `https://${cloudName}/browse/${issue.key}`,
  };
}
