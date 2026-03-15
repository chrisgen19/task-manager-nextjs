"use client";

import { useState } from "react";
import { PRIORITY_COLORS } from "@/types";
import type { Task } from "@/types";

type Zoom = "day" | "week" | "month";

const ZOOM_CONFIG: Record<Zoom, { label: string; dayWidth: number }> = {
  day:   { label: "Day",   dayWidth: 40 },
  week:  { label: "Week",  dayWidth: 16 },
  month: { label: "Month", dayWidth: 5 },
};

const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

interface TimelineViewProps {
  tasks: Task[];
  onNavigate: (task: Task) => void;
}

function msToDate(ms: number) {
  return new Date(ms);
}

function dateToMs(d: Date) {
  return d.getTime();
}

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function addDays(d: Date, n: number) {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function diffDays(a: Date, b: Date) {
  return Math.floor((dateToMs(startOfDay(b)) - dateToMs(startOfDay(a))) / 86400000);
}

export function TimelineView({ tasks, onNavigate }: TimelineViewProps) {
  const [zoom, setZoom] = useState<Zoom>("week");

  const timelineTasks = tasks.filter((t) => t.createdAt);

  if (timelineTasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3" style={{ color: "var(--text-tertiary)" }}>
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth="1.5">
          <line x1="6" y1="24" x2="42" y2="24" />
          <rect x="12" y="12" width="14" height="6" rx="3" />
          <rect x="22" y="30" width="12" height="6" rx="3" />
        </svg>
        <p className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>No tasks to display</p>
        <p className="text-xs">Create tasks to see them on the timeline. Tasks with due dates will show as bars.</p>
      </div>
    );
  }

  // Date range
  const allMs: number[] = [];
  timelineTasks.forEach((t) => {
    allMs.push(new Date(t.createdAt).getTime());
    if (t.dueDate) allMs.push(new Date(t.dueDate).getTime());
  });
  const minDate = startOfDay(addDays(msToDate(Math.min(...allMs)), -3));
  const maxDate = startOfDay(addDays(msToDate(Math.max(...allMs)), 7));
  const totalDays = diffDays(minDate, maxDate);

  const { dayWidth } = ZOOM_CONFIG[zoom];
  const totalWidth = totalDays * dayWidth;
  const today = startOfDay(new Date());
  const todayOffset = diffDays(minDate, today) * dayWidth;

  // Build header date labels
  const headerCols: { label: string; offset: number; width: number }[] = [];
  if (zoom === "day") {
    for (let i = 0; i < totalDays; i++) {
      const d = addDays(minDate, i);
      headerCols.push({ label: `${d.getDate()}`, offset: i * dayWidth, width: dayWidth });
    }
  } else if (zoom === "week") {
    let i = 0;
    while (i < totalDays) {
      const d = addDays(minDate, i);
      headerCols.push({ label: `${MONTH_SHORT[d.getMonth()]} ${d.getDate()}`, offset: i * dayWidth, width: 7 * dayWidth });
      i += 7;
    }
  } else {
    let i = 0;
    while (i < totalDays) {
      const d = addDays(minDate, i);
      const daysInMo = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
      const cellDays = Math.min(daysInMo - d.getDate() + 1, totalDays - i);
      headerCols.push({ label: `${MONTH_SHORT[d.getMonth()]} ${d.getFullYear()}`, offset: i * dayWidth, width: cellDays * dayWidth });
      i += cellDays;
    }
  }

  const ROW_HEIGHT = 44;
  const LABEL_WIDTH = 200;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-5 py-3" style={{ borderBottom: "1px solid var(--border-primary)" }}>
        <div className="flex items-center gap-1 rounded-lg p-1" style={{ background: "var(--bg-tertiary)" }}>
          {(Object.keys(ZOOM_CONFIG) as Zoom[]).map((z) => (
            <button
              key={z}
              onClick={() => setZoom(z)}
              className="px-3 py-1 text-xs font-medium rounded-md transition-colors"
              style={{
                background: zoom === z ? "var(--bg-secondary)" : "transparent",
                color: zoom === z ? "var(--text-primary)" : "var(--text-tertiary)",
              }}
            >
              {ZOOM_CONFIG[z].label}
            </button>
          ))}
        </div>
        <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
          {timelineTasks.length} task{timelineTasks.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Timeline */}
      <div className="flex flex-1 overflow-hidden">
        {/* Labels */}
        <div
          className="shrink-0 overflow-hidden"
          style={{
            width: LABEL_WIDTH,
            borderRight: "1px solid var(--border-primary)",
          }}
        >
          {/* Header spacer */}
          <div style={{ height: 36, borderBottom: "1px solid var(--border-primary)" }} />
          {/* Task labels */}
          <div className="overflow-y-auto" style={{ maxHeight: `calc(100% - 36px)` }}>
            {timelineTasks.map((task) => (
              <div
                key={task.id}
                onClick={() => onNavigate(task)}
                className="flex items-center gap-2 px-3 cursor-pointer"
                style={{
                  height: ROW_HEIGHT,
                  borderBottom: "1px solid var(--border-primary)",
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = "var(--bg-secondary)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = "transparent"; }}
              >
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: PRIORITY_COLORS[task.priority] }} />
                <span className="text-xs truncate" style={{ color: "var(--text-primary)" }}>{task.title}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Scroll area */}
        <div className="flex-1 overflow-auto">
          <div style={{ width: totalWidth, position: "relative" }}>
            {/* Header */}
            <div className="relative" style={{ height: 36, borderBottom: "1px solid var(--border-primary)", background: "var(--bg-secondary)" }}>
              {headerCols.map((col, i) => (
                <div
                  key={i}
                  className="absolute top-0 flex items-center px-2 text-xs overflow-hidden"
                  style={{
                    left: col.offset,
                    width: col.width,
                    height: 36,
                    color: "var(--text-tertiary)",
                    borderRight: "1px solid var(--border-primary)",
                    fontWeight: 500,
                  }}
                >
                  {col.label}
                </div>
              ))}
              {/* Today marker header */}
              {todayOffset >= 0 && todayOffset <= totalWidth && (
                <div className="absolute top-0 bottom-0 w-px" style={{ left: todayOffset, background: "var(--status-todo)", opacity: 0.6 }} />
              )}
            </div>

            {/* Rows */}
            {timelineTasks.map((task) => {
              const startMs = new Date(task.createdAt).getTime();
              const endMs = task.dueDate ? new Date(task.dueDate).getTime() : startMs;
              const startOff = diffDays(minDate, startOfDay(new Date(startMs))) * dayWidth;
              const endOff = diffDays(minDate, startOfDay(new Date(endMs))) * dayWidth + dayWidth;
              const barWidth = Math.max(endOff - startOff, dayWidth);

              return (
                <div
                  key={task.id}
                  className="relative"
                  style={{ height: ROW_HEIGHT, borderBottom: "1px solid var(--border-primary)" }}
                >
                  {/* Grid lines */}
                  {headerCols.map((col, i) => (
                    <div key={i} className="absolute top-0 bottom-0 w-px" style={{ left: col.offset + col.width, background: "var(--border-primary)", opacity: 0.4 }} />
                  ))}
                  {/* Today line */}
                  {todayOffset >= 0 && todayOffset <= totalWidth && (
                    <div className="absolute top-0 bottom-0 w-px" style={{ left: todayOffset, background: "var(--status-todo)", opacity: 0.4 }} />
                  )}
                  {/* Bar */}
                  <div
                    onClick={() => onNavigate(task)}
                    className="absolute top-1/2 -translate-y-1/2 rounded-md cursor-pointer flex items-center px-2 text-xs font-medium overflow-hidden"
                    style={{
                      left: startOff,
                      width: barWidth,
                      height: 28,
                      background: PRIORITY_COLORS[task.priority],
                      opacity: 0.85,
                      color: "var(--accent-contrast)",
                      whiteSpace: "nowrap",
                    }}
                    title={task.title}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.opacity = "1"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.opacity = "0.85"; }}
                  >
                    {task.title}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
