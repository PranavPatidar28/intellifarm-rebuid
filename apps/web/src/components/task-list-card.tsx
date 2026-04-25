import { useMemo, useState } from "react";
import { CalendarClock, CircleCheckBig, TimerReset } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { apiPatch } from "@/lib/api";
import { formatDate } from "@/lib/format";

type TaskListCardProps = {
  tasks: Array<{
    id: string;
    title: string;
    description: string;
    dueDate: string;
    priority: "LOW" | "MEDIUM" | "HIGH";
    status: "PENDING" | "COMPLETED" | "SKIPPED" | "OVERDUE";
  }>;
  interactive?: boolean;
  onTaskUpdated?: () => Promise<unknown> | void;
};

const priorityTone: Record<
  TaskListCardProps["tasks"][number]["priority"],
  "success" | "warning" | "danger"
> = {
  LOW: "success",
  MEDIUM: "warning",
  HIGH: "danger",
};

const statusTone: Record<
  TaskListCardProps["tasks"][number]["status"],
  "info" | "success" | "warning" | "danger"
> = {
  PENDING: "info",
  COMPLETED: "success",
  SKIPPED: "warning",
  OVERDUE: "danger",
};

export function TaskListCard({
  tasks,
  interactive = false,
  onTaskUpdated,
}: TaskListCardProps) {
  const [busyTaskId, setBusyTaskId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const sortedTasks = useMemo(
    () =>
      [...tasks].sort((left, right) => {
        const leftUrgency =
          left.status === "OVERDUE" ? 0 : left.status === "PENDING" ? 1 : 2;
        const rightUrgency =
          right.status === "OVERDUE" ? 0 : right.status === "PENDING" ? 1 : 2;
        return leftUrgency - rightUrgency;
      }),
    [tasks],
  );

  if (!sortedTasks.length) {
    return (
      <div className="surface-card-muted rounded-[var(--radius-card)] p-5">
        <div className="flex items-start gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--success-soft)] text-[var(--success)]">
            <CircleCheckBig className="h-5 w-5" />
          </span>
          <div className="space-y-1">
            <p className="text-base font-semibold text-[var(--foreground)]">
              No tasks due this week
            </p>
            <p className="text-sm leading-6 muted">
              Keep a regular field walk going and review the weather module for
              any fresh advisory changes.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const updateTask = async (
    taskId: string,
    status: "PENDING" | "COMPLETED" | "SKIPPED",
  ) => {
    setBusyTaskId(taskId);
    setMessage(null);

    try {
      await apiPatch(`/tasks/${taskId}`, { status });
      await onTaskUpdated?.();
    } catch {
      setMessage("Could not update the task right now.");
    } finally {
      setBusyTaskId(null);
    }
  };

  return (
    <div className="space-y-3">
      {message ? (
        <p className="text-sm font-medium text-[var(--danger)]">{message}</p>
      ) : null}

      {sortedTasks.map((task) => {
        const urgent = task.status === "OVERDUE" || task.priority === "HIGH";

        return (
          <article
            key={task.id}
            className={`rounded-[var(--radius-card)] border p-4 ${
              urgent
                ? "border-[rgba(181,71,60,0.2)] bg-[var(--danger-soft)]"
                : "surface-card"
            }`}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1 space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={priorityTone[task.priority]}>
                    {task.status === "OVERDUE" ? "High priority" : task.priority}
                  </Badge>
                  <Badge tone={statusTone[task.status]}>
                    {task.status === "OVERDUE" ? "Needs attention" : task.status}
                  </Badge>
                </div>
                <div className="space-y-2">
                  <p className="text-base font-semibold text-[var(--foreground)]">
                    {task.title}
                  </p>
                  <p className="text-sm leading-6 muted">{task.description}</p>
                </div>
              </div>

              <div className="surface-card-muted min-w-36 rounded-[var(--radius-card)] p-3 text-right">
                <p className="eyebrow">Due</p>
                <p className="mt-2 text-sm font-semibold text-[var(--foreground)] number-data">
                  {formatDate(task.dueDate)}
                </p>
              </div>
            </div>

            {interactive ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {task.status !== "COMPLETED" ? (
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    disabled={busyTaskId === task.id}
                    onClick={() => updateTask(task.id, "COMPLETED")}
                    leadingIcon={<CircleCheckBig className="h-4 w-4" />}
                  >
                    {busyTaskId === task.id ? "Saving..." : "Mark complete"}
                  </Button>
                ) : null}
                {task.status !== "SKIPPED" ? (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={busyTaskId === task.id}
                    onClick={() => updateTask(task.id, "SKIPPED")}
                    leadingIcon={<CalendarClock className="h-4 w-4" />}
                  >
                    {busyTaskId === task.id ? "Saving..." : "Skip for now"}
                  </Button>
                ) : null}
                {(task.status === "COMPLETED" || task.status === "SKIPPED") && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={busyTaskId === task.id}
                    onClick={() => updateTask(task.id, "PENDING")}
                    leadingIcon={<TimerReset className="h-4 w-4" />}
                  >
                    {busyTaskId === task.id ? "Saving..." : "Move back to pending"}
                  </Button>
                )}
              </div>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}
