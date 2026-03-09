"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { PRIORITIES, PRIORITY_LABELS } from "@/types";
import type { Task } from "@/types";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const MAX_CHIPS = 3;

interface CalendarViewProps {
  tasks: Task[];
  onEdit: (task: Task) => void;
  onNewTask: (dueDate: string) => void;
}

interface PopoverState {
  tasks: Task[];
  day: number;
  anchorRect: DOMRect;
}

export function CalendarView({ tasks, onEdit, onNewTask }: CalendarViewProps) {
  const [current, setCurrent] = useState(new Date());
  const [popover, setPopover] = useState<PopoverState | null>(null);

  const year = current.getFullYear();
  const month = current.getMonth();

  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startOffset = firstDay.getDay();

  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const tasksByDay: Record<number, Task[]> = {};
  tasks.forEach((task) => {
    if (!task.dueDate) return;
    const d = new Date(task.dueDate);
    if (d.getFullYear() === year && d.getMonth() === month) {
      const day = d.getDate();
      if (!tasksByDay[day]) tasksByDay[day] = [];
      tasksByDay[day].push(task);
    }
  });

  const handleDayClick = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    onNewTask(dateStr);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Nav */}
      <div className="flex items-center gap-3 px-5 py-3" style={{ borderBottom: "1px solid var(--border-primary)" }}>
        <button
          onClick={() => setCurrent(new Date(year, month - 1, 1))}
          className="p-1.5 rounded-lg transition-colors"
          style={{ color: "var(--text-secondary)", background: "var(--bg-tertiary)" }}
        >
          <ChevronLeft size={16} />
        </button>
        <h2 className="text-base font-semibold min-w-40 text-center" style={{ color: "var(--text-primary)" }}>
          {MONTH_NAMES[month]} {year}
        </h2>
        <button
          onClick={() => setCurrent(new Date(year, month + 1, 1))}
          className="p-1.5 rounded-lg transition-colors"
          style={{ color: "var(--text-secondary)", background: "var(--bg-tertiary)" }}
        >
          <ChevronRight size={16} />
        </button>
        <button
          onClick={() => setCurrent(new Date())}
          className="px-3 py-1.5 text-sm rounded-lg font-medium"
          style={{ background: "var(--bg-tertiary)", color: "var(--text-secondary)" }}
        >
          Today
        </button>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-auto p-4">
        <div className="grid grid-cols-7 gap-1 mb-1">
          {DAY_NAMES.map((d) => (
            <div key={d} className="text-center text-xs font-semibold py-2 uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {/* Offset */}
          {Array.from({ length: startOffset }).map((_, i) => (
            <div key={`empty-${i}`} className="rounded-lg min-h-24" style={{ background: "transparent" }} />
          ))}

          {/* Days */}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1;
            const cellKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const isToday = cellKey === todayKey;
            const dayTasks = tasksByDay[day] ?? [];

            return (
              <div
                key={day}
                onClick={() => handleDayClick(day)}
                className="rounded-lg min-h-24 p-2 cursor-pointer transition-colors relative"
                style={{
                  background: isToday ? "var(--calendar-today-bg)" : "var(--bg-secondary)",
                  border: `1px solid ${isToday ? "var(--status-todo)" : "var(--border-primary)"}`,
                }}
                onMouseEnter={(e) => { if (!isToday) (e.currentTarget as HTMLDivElement).style.background = "var(--bg-tertiary)"; }}
                onMouseLeave={(e) => { if (!isToday) (e.currentTarget as HTMLDivElement).style.background = "var(--bg-secondary)"; }}
              >
                <span
                  className="text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full mb-1"
                  style={{
                    color: isToday ? "#fff" : "var(--text-secondary)",
                    background: isToday ? "var(--status-todo)" : "transparent",
                  }}
                >
                  {day}
                </span>

                <div className="space-y-0.5">
                  {dayTasks.slice(0, MAX_CHIPS).map((task) => (
                    <div
                      key={task.id}
                      onClick={(e) => { e.stopPropagation(); onEdit(task); }}
                      className={`${PRIORITY_LABELS[task.priority]} px-1.5 py-0.5 rounded text-xs truncate cursor-pointer`}
                      title={task.title}
                    >
                      {task.title}
                    </div>
                  ))}
                  {dayTasks.length > MAX_CHIPS && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setPopover({ tasks: dayTasks, day, anchorRect: (e.currentTarget as HTMLButtonElement).getBoundingClientRect() });
                      }}
                      className="text-xs w-full text-left px-1"
                      style={{ color: "var(--text-tertiary)" }}
                    >
                      +{dayTasks.length - MAX_CHIPS} more
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {/* Trailing empties */}
          {(() => {
            const total = startOffset + daysInMonth;
            const remaining = total % 7 === 0 ? 0 : 7 - (total % 7);
            return Array.from({ length: remaining }).map((_, i) => (
              <div key={`trail-${i}`} className="rounded-lg min-h-24" />
            ));
          })()}
        </div>
      </div>

      {/* Popover */}
      {popover && (
        <div
          className="fixed z-50 rounded-xl shadow-xl overflow-hidden"
          style={{
            top: popover.anchorRect.bottom + 8,
            left: popover.anchorRect.left,
            background: "var(--bg-secondary)",
            border: "1px solid var(--border-primary)",
            minWidth: "200px",
            maxWidth: "280px",
          }}
        >
          <div className="flex items-center justify-between px-3 py-2" style={{ borderBottom: "1px solid var(--border-primary)" }}>
            <span className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>Day {popover.day}</span>
            <button onClick={() => setPopover(null)} className="text-xs" style={{ color: "var(--text-tertiary)" }}>✕</button>
          </div>
          <div className="p-2 space-y-1 max-h-64 overflow-y-auto">
            {popover.tasks.map((task) => (
              <div
                key={task.id}
                onClick={() => { onEdit(task); setPopover(null); }}
                className={`${PRIORITY_LABELS[task.priority]} px-2 py-1.5 rounded text-xs cursor-pointer flex items-center gap-1.5`}
              >
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: "currentColor" }} />
                {task.title}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
