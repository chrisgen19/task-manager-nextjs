"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import type { JiraIssue, JiraProject } from "@/lib/jira";

interface AnnotatedIssue extends JiraIssue {
  alreadySynced: boolean;
  localTaskId: string | null;
}

interface FetchState {
  issues: AnnotatedIssue[];
  nextPageToken: string | null;
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
}

interface SyncResult {
  created: number;
  updated: number;
  autoImported: number;
}

export function useJiraSync() {
  // Modal
  const [open, setOpen] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [projectFilter, setProjectFilter] = useState("");
  const [statusFilters, setStatusFilters] = useState<string[]>([]);
  const [workboardId, setWorkboardId] = useState("");

  // Projects
  const [projects, setProjects] = useState<JiraProject[]>([]);

  // Selection
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Issues fetch state
  const [state, setState] = useState<FetchState>({
    issues: [],
    nextPageToken: null,
    loading: false,
    loadingMore: false,
    error: null,
  });

  // Sync
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  // Debounce ref
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  // AbortController to cancel stale requests
  const abortRef = useRef<AbortController>(undefined);

  // Serialized status filters for stable dependency tracking
  const statusFilterKey = statusFilters.join(",");

  const fetchIssues = useCallback(
    async (append = false) => {
      // Abort previous in-flight request to prevent stale data
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setState((prev) => ({
        ...prev,
        loading: !append,
        loadingMore: append,
        error: null,
      }));

      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (projectFilter) params.set("project", projectFilter);
      if (statusFilterKey) params.set("status", statusFilterKey);
      params.set("maxResults", "50");

      // For "load more", pass the current nextPageToken
      if (append && state.nextPageToken) {
        params.set("nextPageToken", state.nextPageToken);
      }

      try {
        const res = await fetch(`/api/jira/issues?${params}`, {
          signal: controller.signal,
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to fetch issues");
        }
        const data = await res.json();

        setState((prev) => ({
          issues: append ? [...prev.issues, ...data.issues] : data.issues,
          nextPageToken: data.nextPageToken,
          loading: false,
          loadingMore: false,
          error: null,
        }));
      } catch (err) {
        // Ignore aborted requests
        if (err instanceof DOMException && err.name === "AbortError") return;
        setState((prev) => ({
          ...prev,
          loading: false,
          loadingMore: false,
          error: err instanceof Error ? err.message : "Unknown error",
        }));
      }
    },
    [search, projectFilter, statusFilterKey, state.nextPageToken],
  );

  const fetchProjects = useCallback(async () => {
    try {
      const res = await fetch("/api/jira/projects");
      if (res.ok) {
        const data = await res.json();
        setProjects(data.projects);
      }
    } catch {
      // Non-critical, silently fail
    }
  }, []);

  // Open modal → load issues + projects
  const openModal = useCallback(() => {
    setOpen(true);
    setSearch("");
    setProjectFilter("");
    setStatusFilters([]);
    setSelected(new Set());
    setSyncResult(null);
    setSyncError(null);
  }, []);

  // Fetch on modal open
  useEffect(() => {
    if (open) {
      fetchIssues();
      fetchProjects();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Debounced search refetch
  useEffect(() => {
    if (!open) return;
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchIssues();
    }, 300);
    return () => clearTimeout(debounceRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, projectFilter, statusFilterKey]);

  const loadMore = useCallback(() => {
    fetchIssues(true);
  }, [fetchIssues]);

  // Selection
  const toggleSelect = useCallback((issueId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(issueId)) next.delete(issueId);
      else next.add(issueId);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelected(new Set(state.issues.map((i) => i.id)));
  }, [state.issues]);

  const deselectAll = useCallback(() => {
    setSelected(new Set());
  }, []);

  const toggleStatusFilter = useCallback((status: string) => {
    setStatusFilters((prev) =>
      prev.includes(status) ? prev.filter((s) => s !== status) : [...prev, status],
    );
  }, []);

  // Sync — batches in chunks of 100 to stay within server limit
  const syncSelected = useCallback(async () => {
    if (!workboardId || selected.size === 0) return;
    setSyncing(true);
    setSyncResult(null);
    setSyncError(null);

    try {
      const allIds = Array.from(selected);
      let totalCreated = 0;
      let totalUpdated = 0;
      let totalAutoImported = 0;

      // Process in chunks of 100
      for (let i = 0; i < allIds.length; i += 100) {
        const chunk = allIds.slice(i, i + 100);
        const res = await fetch("/api/jira/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ workboardId, issueIds: chunk }),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Sync failed");
        }

        const data = await res.json();
        totalCreated += data.created;
        totalUpdated += data.updated;
        totalAutoImported += data.autoImported ?? 0;
      }

      setSyncResult({ created: totalCreated, updated: totalUpdated, autoImported: totalAutoImported });
      setSelected(new Set());
      fetchIssues();
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setSyncing(false);
    }
  }, [workboardId, selected, fetchIssues]);

  const closeModal = useCallback(() => {
    setOpen(false);
  }, []);

  return {
    open,
    openModal,
    closeModal,
    // Filters
    search,
    setSearch,
    projectFilter,
    setProjectFilter,
    statusFilters,
    toggleStatusFilter,
    workboardId,
    setWorkboardId,
    // Data
    projects,
    issues: state.issues,
    loading: state.loading,
    loadingMore: state.loadingMore,
    error: state.error,
    hasMore: !!state.nextPageToken,
    loadMore,
    // Selection
    selected,
    toggleSelect,
    selectAll,
    deselectAll,
    // Sync
    syncing,
    syncResult,
    syncError,
    syncSelected,
  };
}
