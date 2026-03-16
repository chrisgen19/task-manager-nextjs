"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import type { JiraIssue, JiraProject } from "@/lib/jira";

interface AnnotatedIssue extends JiraIssue {
  alreadySynced: boolean;
  localTaskId: string | null;
}

interface FetchState {
  issues: AnnotatedIssue[];
  total: number;
  startAt: number;
  loading: boolean;
  loadingMore: boolean;
  error: string | null;
}

interface SyncResult {
  created: number;
  updated: number;
}

export function useJiraSync() {
  // Modal
  const [open, setOpen] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [projectFilter, setProjectFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [workboardId, setWorkboardId] = useState("");

  // Projects
  const [projects, setProjects] = useState<JiraProject[]>([]);

  // Selection
  const [selected, setSelected] = useState<Set<string>>(new Set());

  // Issues fetch state
  const [state, setState] = useState<FetchState>({
    issues: [],
    total: 0,
    startAt: 0,
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

  const fetchIssues = useCallback(
    async (append = false, overrideStartAt?: number) => {
      setState((prev) => ({
        ...prev,
        loading: !append,
        loadingMore: append,
        error: null,
      }));

      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (projectFilter) params.set("project", projectFilter);
      if (statusFilter) params.set("status", statusFilter);
      const startAt = overrideStartAt ?? (append ? state.startAt + 50 : 0);
      params.set("startAt", String(startAt));
      params.set("maxResults", "50");

      try {
        const res = await fetch(`/api/jira/issues?${params}`);
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to fetch issues");
        }
        const data = await res.json();

        setState((prev) => ({
          issues: append ? [...prev.issues, ...data.issues] : data.issues,
          total: data.total,
          startAt: data.startAt,
          loading: false,
          loadingMore: false,
          error: null,
        }));
      } catch (err) {
        setState((prev) => ({
          ...prev,
          loading: false,
          loadingMore: false,
          error: err instanceof Error ? err.message : "Unknown error",
        }));
      }
    },
    [search, projectFilter, statusFilter, state.startAt],
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
    setStatusFilter("");
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
  }, [search, projectFilter, statusFilter]);

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
      }

      setSyncResult({ created: totalCreated, updated: totalUpdated });
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
    statusFilter,
    setStatusFilter,
    workboardId,
    setWorkboardId,
    // Data
    projects,
    issues: state.issues,
    total: state.total,
    loading: state.loading,
    loadingMore: state.loadingMore,
    error: state.error,
    hasMore: state.issues.length < state.total,
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
