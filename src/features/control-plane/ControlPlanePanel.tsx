"use client";

import { useMemo } from "react";

export type ControlPlaneTaskView = {
  taskId: string;
  goal: string;
  status: string;
  confidence: number;
  distance: number;
  action: string;
};

export function ControlPlanePanel({ tasks }: { tasks: readonly ControlPlaneTaskView[] }) {
  const summary = useMemo(() => ({
    total: tasks.length,
    accepted: tasks.filter((task) => task.action === "accept").length,
    blocked: tasks.filter((task) => task.action === "human_review").length,
    iterating: tasks.filter((task) => task.action === "iterate" || task.action === "replan").length,
  }), [tasks]);

  return (
    <section aria-label="Control Plane" className="rounded-xl border border-white/10 bg-black/30 p-4 text-sm">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="font-semibold">Control Plane</h2>
          <p className="text-xs opacity-60">Canonical task / reconciliation projection</p>
        </div>
        <div className="flex gap-3 text-xs opacity-70">
          <span>{summary.total} tasks</span><span>{summary.accepted} accepted</span><span>{summary.iterating} iterating</span><span>{summary.blocked} review</span>
        </div>
      </div>
      <div className="space-y-2">
        {tasks.length === 0 ? <p className="opacity-50">No canonical tasks projected.</p> : tasks.map((task) => (
          <article key={task.taskId} className="rounded-lg border border-white/10 p-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0"><div className="truncate font-medium">{task.goal}</div><div className="text-xs opacity-50">{task.taskId} · {task.status}</div></div>
              <div className="text-right text-xs"><div>{Math.round(task.confidence * 100)}% confidence</div><div className="opacity-50">distance {task.distance.toFixed(2)} · {task.action}</div></div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
