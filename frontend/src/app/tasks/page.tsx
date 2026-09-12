"use client";
import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Plus,
  Clock,
  CheckCircle2,
  Circle,
  Sparkles,
  Send,
  AlertTriangle,
  ChevronRight,
  X,
  Layers,
  History,
  MessageSquare,
  Check,
  Trash2,
  Play,
  Square,
  Pencil,
  Search,
  Filter,
  CalendarDays
} from "lucide-react";
import { API_URL, fetchWithAuth, getUserEmail } from "@/lib/api";
import Sidebar from "@/components/Sidebar";
import {
  formatLocalDate,
  findNearestFreeSlot,
  parseTimeToMinutes,
  formatMinutesTo12Hour,
  formatMinutesTo24Hour,
  checkIntervalConflict,
  getOccupiedIntervalsFromTasks,
  FreeSlotResult,
  getValidScheduleDates,
} from "@/lib/scheduling";

interface Task {
  id: string;
  title: string;
  status: string;
  estimatedMinutes: number;
  color: string;
  deadline?: string;
  actualMinutesSpent?: number;
  recurrence?: string;
  priority?: string;
  category?: string;
}

interface ExtractedTask {
  title: string;
  estimated_minutes: number;
  durationMinutes?: number;
  recurrence?: string;
  priority: string;
  deadline?: string;
  color: string;
  priority_reason: string;
}

interface ScheduleImpact {
  existing_task_count: number;
  existing_total_minutes: number;
  added_minutes: number;
  new_total_minutes: number;
  weekly_capacity_percent: number;
  overload_warning: boolean;
  collision_warning: boolean;
  summary: string;
}

interface PriorityReasoning {
  rank: number;
  title: string;
  reason: string;
}

interface ChatProposal {
  extracted_tasks: ExtractedTask[];
  impact_analysis: ScheduleImpact;
  priority_ranking: PriorityReasoning[];
}

interface ChatSessionItem {
  id: string;
  title: string;
  updatedAt: string;
}

interface AdvancedGoalPlan {
  user_email: string;
  goal: string;
  target_hours: number;
  critical_path_hours: number;
  phases: {
    phase_number: number;
    name: string;
    estimated_hours: number;
    tasks: string[];
    dependencies: number[];
  }[];
  ai_strategic_guidance: string;
}

const COLORS = ["#A0785A", "#16A34A", "#D97706", "#2563EB", "#9333EA", "#DC2626", "#0891B2"];

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [taskPendingDeletion, setTaskPendingDeletion] = useState<Task | null>(null);
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);

  // Manual Form State
  const [showManualForm, setShowManualForm] = useState(false);
  const [showTimeUpModal, setShowTimeUpModal] = useState(false);
  const [timeUpTask, setTimeUpTask] = useState<Task | null>(null);
  const [hasPrompted, setHasPrompted] = useState(false);
  const [manualForm, setManualForm] = useState({
    title: "",
    estimatedMinutes: 30,
    color: "#A0785A",
    startTime: "",
  });
  // None selected by default — user must explicitly pick days
  const [selectedDays, setSelectedDays] = useState<string[]>([]);

  // Edit Task State
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editForm, setEditForm] = useState({
    title: "",
    estimatedMinutes: 30,
    color: "#A0785A",
    priority: "medium",
    recurrence: "none",
  });
  const [editLoading, setEditLoading] = useState(false);

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "pending" | "in_progress" | "completed">("all");

  // 7 Days of the current week (Monday - Sunday)
  const weekDays = useMemo(() => {
    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setHours(0, 0, 0, 0);
    weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7)); // Monday
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(weekStart.getDate() + i);
      const dateKey = formatLocalDate(d);
      const dayShort = d.toLocaleDateString("en-US", { weekday: "short" });
      const dayNum = d.getDate();
      return { date: d, dateKey, dayShort, dayNum, label: `${dayShort} ${dayNum}` };
    });
  }, []);

  const handleToggleDay = (dateKey: string) => {
    setSelectedDays((prev) =>
      prev.includes(dateKey) ? prev.filter((d) => d !== dateKey) : [...prev, dateKey]
    );
  };

  const handleSelectDayPreset = (preset: "clear" | "weekdays" | "all") => {
    if (preset === "clear") {
      setSelectedDays([]);
    } else if (preset === "weekdays") {
      setSelectedDays(weekDays.slice(0, 5).map((d) => d.dateKey));
    } else {
      setSelectedDays(weekDays.map((d) => d.dateKey));
    }
  };

  // Computed Time Range & Schedule Conflict Evaluation
  const slotEvaluation = useMemo(() => {
    const duration = Math.max(5, Number(manualForm.estimatedMinutes) || 30);
    const dateStr = formatLocalDate(new Date());
    const occupied = getOccupiedIntervalsFromTasks(tasks, dateStr);

    // Build per-day conflict map for the current week
    const email = getUserEmail();
    const dayConflictMap: Record<string, boolean> = {};
    if (manualForm.startTime && manualForm.startTime.includes(":")) {
      const startMinutes = parseTimeToMinutes(manualForm.startTime);
      const endMinutes = startMinutes + duration;

      for (const wd of weekDays) {
        const dKey = wd.dateKey;
        // Check localStorage scheduled items for this day
        let dayOccupied: Array<{ start: number; end: number }> = [];
        if (typeof window !== "undefined" && email) {
          try {
            const stored = JSON.parse(localStorage.getItem(`timespace_manual_schedule_${email}`) || "{}");
            const dayItems: Array<{ startHour: number; startMinute: number; durationMinutes: number }> = stored[dKey] || [];
            dayOccupied = dayItems.map((it) => ({
              start: it.startHour * 60 + (it.startMinute || 0),
              end: it.startHour * 60 + (it.startMinute || 0) + (it.durationMinutes || 30),
            }));
          } catch { /* ignore */ }
        }

        const taskIntervals = getOccupiedIntervalsFromTasks(tasks, dKey);
        const combined = [...dayOccupied, ...taskIntervals];
        dayConflictMap[dKey] = checkIntervalConflict(startMinutes, endMinutes, combined);
      }
    }

    if (manualForm.startTime && manualForm.startTime.includes(":")) {
      const startMinutes = parseTimeToMinutes(manualForm.startTime);
      const endMinutes = startMinutes + duration;

      const now = new Date();
      const currentDayKey = formatLocalDate(now);
      const nowMinutes = now.getHours() * 60 + now.getMinutes();

      // Only check conflicts for upcoming target days:
      // Past days in current week or passed hours today are never scheduled in current week!
      const targetDaysToCheck = selectedDays.length > 0 ? selectedDays : [dateStr];
      const validUpcomingTargetDays = targetDaysToCheck.filter((dKey) => {
        if (dKey < currentDayKey) return false;
        if (dKey === currentDayKey && startMinutes < nowMinutes) return false;
        return true;
      });

      const conflictedSelectedDays = validUpcomingTargetDays.filter((dKey) => dayConflictMap[dKey]);
      const hasConflict = conflictedSelectedDays.length > 0;

      const conflictedDayLabels = weekDays
        .filter((wd) => conflictedSelectedDays.includes(wd.dateKey))
        .map((wd) => `${wd.dayShort} ${wd.dayNum}`)
        .join(", ");

      const start12 = formatMinutesTo12Hour(startMinutes);
      const end12 = formatMinutesTo12Hour(endMinutes);
      const start24 = formatMinutesTo24Hour(startMinutes);
      const end24 = formatMinutesTo24Hour(endMinutes);

      let suggestedSlot: FreeSlotResult | null = null;
      if (hasConflict) {
        suggestedSlot = findNearestFreeSlot(duration, tasks, startMinutes);
      }

      let scheduleStartNote = "";
      if (selectedDays.length > 0) {
        if (selectedDays.includes(currentDayKey) && startMinutes >= nowMinutes) {
          scheduleStartNote = `(starts today · applies to all ${selectedDays.length} days & next week)`;
        } else {
          scheduleStartNote = `(starts tomorrow / next day · full schedule starts next week from Monday)`;
        }
      } else {
        if (startMinutes >= nowMinutes) {
          scheduleStartNote = "(scheduled for today)";
        } else {
          scheduleStartNote = "(starts tomorrow, since today's hour has passed)";
        }
      }

      return {
        isAuto: false,
        hasConflict,
        startMinutes,
        endMinutes,
        start12,
        end12,
        start24,
        end24,
        formattedRange: `${start12} - ${end12}`,
        suggestedSlot,
        dayConflictMap,
        conflictedSelectedDays,
        conflictedDayLabels,
        scheduleStartNote,
      };
    } else {
      const nearest = findNearestFreeSlot(duration, tasks, null);
      return {
        isAuto: true,
        hasConflict: false,
        startMinutes: nearest.startMinutes,
        endMinutes: nearest.endMinutes,
        start12: nearest.startTime12,
        end12: nearest.endTime12,
        start24: nearest.startTime24,
        end24: nearest.endTime24,
        formattedRange: nearest.formattedRange,
        suggestedSlot: nearest,
        dayConflictMap: {},
        conflictedSelectedDays: [],
        conflictedDayLabels: "",
        scheduleStartNote: "(nearest available slot)",
      };
    }
  }, [manualForm.startTime, manualForm.estimatedMinutes, tasks, weekDays, selectedDays]);

  // AI Assistant Modal State
  const [showAiModal, setShowAiModal] = useState(false);
  const [aiTab, setAiTab] = useState<"prompt" | "decomposer">("prompt");

  // Prompt Chat State & Sessions
  const [sessions, setSessions] = useState<ChatSessionItem[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiReply, setAiReply] = useState<string | null>(null);
  const [proposal, setProposal] = useState<ChatProposal | null>(null);
  const [confirming, setConfirming] = useState(false);

  // Goal Decomposer State
  const [goalText, setGoalText] = useState("");
  const [goalHours, setGoalHours] = useState(8);
  const [goalPlan, setGoalPlan] = useState<AdvancedGoalPlan | null>(null);
  const [decomposing, setDecomposing] = useState(false);
  const [savingPlan, setSavingPlan] = useState(false);

  // Live Timer & Active Session State
  const [activeSession, setActiveSession] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);

  // Filtered Tasks computation
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      const matchesSearch = !searchTerm.trim() || t.title.toLowerCase().includes(searchTerm.toLowerCase().trim());
      const matchesStatus =
        filterStatus === "all"
          ? true
          : filterStatus === "pending"
            ? t.status === "pending"
            : filterStatus === "in_progress"
              ? t.status === "in_progress" || activeSession === t.id
              : t.status === "completed";
      return matchesSearch && matchesStatus;
    });
  }, [tasks, searchTerm, filterStatus, activeSession]);

  const fetchTasks = () => {
    const email = getUserEmail();
    const query = email ? `?email=${encodeURIComponent(email)}` : "";
    fetchWithAuth(`${API_URL}/tasks${query}`)
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => Array.isArray(d) && setTasks(d))
      .catch(() => { });
  };

  const fetchActiveSession = () => {
    const email = getUserEmail();
    const query = email ? `?email=${encodeURIComponent(email)}` : "";
    fetchWithAuth(`${API_URL}/sessions/active${query}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((active) => {
        if (active && active.id && active.status === "running") {
          setActiveSession(active.taskId);
          setSessionId(active.id);
          if (active.startTime) {
            const startMs = new Date(active.startTime).getTime();
            const nowMs = Date.now();
            setElapsed(Math.max(0, Math.floor((nowMs - startMs) / 1000)));
          }
        } else {
          setActiveSession(null);
          setSessionId(null);
        }
      })
      .catch(() => { });
  };

  useEffect(() => {
    fetchTasks();
    fetchActiveSession();

    // Clean up legacy pending items in the past that caused false "missed" hours
    const email = getUserEmail();
    if (email && typeof window !== "undefined") {
      try {
        const key = `timespace_manual_schedule_${email}`;
        const saved = localStorage.getItem(key);
        if (saved) {
          const parsed: Record<string, any[]> = JSON.parse(saved);
          const now = new Date();
          const currentWeekStart = new Date(now);
          currentWeekStart.setHours(0, 0, 0, 0);
          currentWeekStart.setDate(now.getDate() - ((now.getDay() + 6) % 7)); // Monday of current week
          const currentWeekStartKey = formatLocalDate(currentWeekStart);
          let changed = false;

          const cleaned: Record<string, any[]> = {};
          for (const [dKey, items] of Object.entries(parsed)) {
            if (dKey < currentWeekStartKey) {
              // Prior weeks: retain only completed items
              const remaining = items.filter((it) => it.status === "completed");
              if (remaining.length !== items.length) changed = true;
              if (remaining.length > 0) cleaned[dKey] = remaining;
            } else {
              // Current week & future weeks: preserve all scheduled items across all 7 days!
              cleaned[dKey] = items;
            }
          }

          if (changed) {
            localStorage.setItem(key, JSON.stringify(cleaned));
          }
        }
      } catch { /* ignore */ }
    }
  }, []);

  // Live timer tick
  useEffect(() => {
    if (!activeSession) return;
    const interval = setInterval(() => {
      setElapsed((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [activeSession]);

  // Overtime detection
  useEffect(() => {
    if (!activeSession || hasPrompted || elapsed <= 0) return;
    const task = tasks.find((t) => t.id === activeSession);
    if (!task) return;
    const totalAllocatedSec = (task.estimatedMinutes || 30) * 60;
    const pastSpentSec = (task.actualMinutesSpent || 0) * 60;
    const remainingSec = totalAllocatedSec - (pastSpentSec + elapsed);
    if (remainingSec <= 0) {
      setTimeUpTask(task);
      setShowTimeUpModal(true);
      setHasPrompted(true);
    }
  }, [elapsed, activeSession, tasks, hasPrompted]);

  // Reset prompt flag when session changes
  useEffect(() => {
    setHasPrompted(false);
  }, [activeSession]);

  // Handler to add minutes and keep timer running
  const handleAddMinutes = async (mins: number) => {
    if (!timeUpTask) return;
    try {
      const email = getUserEmail();
      const res = await fetchWithAuth(`${API_URL}/tasks/${timeUpTask.id}/status?email=${encodeURIComponent(email)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ addMinutes: mins }),
      });
      if (res.ok) {
        setTasks((prev) =>
          prev.map((t) =>
            t.id === timeUpTask.id ? { ...t, estimatedMinutes: (t.estimatedMinutes || 30) + mins } : t
          )
        );
        setShowTimeUpModal(false);
        setHasPrompted(false); // allow re-trigger if they hit overtime again
      } else {
        alert("Failed to extend task time.");
      }
    } catch (e) {
      console.error(e);
      alert("Error extending task time.");
    }
  };

  // Handler to finish task
  const handleFinishTask = async () => {
    if (!timeUpTask) return;
    const taskToFinish = timeUpTask;
    setShowTimeUpModal(false);

    // 1. Optimistically update local UI state to completed
    setTasks((prev) =>
      prev.map((t) => (t.id === taskToFinish.id ? { ...t, status: "completed" } : t))
    );

    try {
      const email = getUserEmail();
      // 2. Persist completed status to backend
      const statusResponse = await fetchWithAuth(`${API_URL}/tasks/${taskToFinish.id}/status?email=${encodeURIComponent(email)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "completed" }),
      });
      if (!statusResponse.ok) {
        throw new Error("Could not complete task");
      }
      // 3. Stop running session (records actual minutes)
      await stopSession(true);
      // 4. Fetch latest data from backend
      fetchTasks();
    } catch (e) {
      console.error("Error completing task:", e);
      setTasks((prev) =>
        prev.map((t) => (t.id === taskToFinish.id ? { ...t, status: "in_progress" } : t))
      );
      alert("Could not finish the task. Your changes were not saved.");
    }
  };



  const startSession = async (task: Task) => {
    try {
      const email = getUserEmail();
      const res = await fetchWithAuth(`${API_URL}/sessions`, {
        method: "POST",
        body: JSON.stringify({ userEmail: email, taskId: task.id }),
      });
      if (res.ok) {
        const d = await res.json();
        setActiveSession(task.id);
        setSessionId(d.id);
        setElapsed(0);
        setTasks((prev) =>
          prev.map((t) =>
            t.id === task.id
              ? { ...t, status: "in_progress" }
              : (t.status === "in_progress" ? { ...t, status: "pending" } : t)
          )
        );
        fetchTasks();
      } else {
        const err = await res.text();
        console.error("Failed to start session:", err);
        alert("Could not start the timer. Please try again.");
      }
    } catch (e) {
      console.error("Error starting session:", e);
      alert("Could not reach the backend. Please check that it is running.");
    }
  };

  const stopSession = async (forceComplete = false) => {
    // If the active task's time is up, show the modal instead of silently stopping
    if (!forceComplete && activeSession) {
      const task = tasks.find((t) => t.id === activeSession);
      if (task) {
        const totalSec = (task.estimatedMinutes || 30) * 60;
        const spentSec = (task.actualMinutesSpent || 0) * 60 + elapsed;
        if (spentSec >= totalSec) {
          setTimeUpTask(task);
          setShowTimeUpModal(true);
          setHasPrompted(true);
          return; // don't stop yet — let the modal decide
        }
      }
    }
    let stopped = false;
    try {
      const email = getUserEmail();
      const emailParam = email ? `?email=${encodeURIComponent(email)}` : "";
      if (sessionId) {
        const response = await fetchWithAuth(`${API_URL}/sessions/${sessionId}/stop${emailParam}`, { method: "PUT" });
        stopped = response.ok;
      } else {
        const res = await fetchWithAuth(`${API_URL}/sessions/active${emailParam}`);
        if (res.ok) {
          const active = await res.json();
          if (active?.id) {
            const response = await fetchWithAuth(`${API_URL}/sessions/${active.id}/stop${emailParam}`, { method: "PUT" });
            stopped = response.ok;
          }
        }
      }
    } catch (e) {
      console.error("Failed to stop session:", e);
    }
    if (stopped) {
      setActiveSession(null);
      setSessionId(null);
      setElapsed(0);
      fetchTasks();
    } else {
      alert("Could not stop the timer. It is still running on the server.");
    }
  };

  const formatStatus = (st: string) => {
    if (!st) return "Pending";
    if (st === "in_progress") return "In Progress";
    return st.charAt(0).toUpperCase() + st.slice(1).replace("_", " ");
  };

  const getTaskRemainingDisplay = (task: Task) => {
    const isActive = activeSession === task.id;
    const totalAllocatedSec = (task.estimatedMinutes || 30) * 60;
    const pastSpentSec = (task.actualMinutesSpent || 0) * 60;

    if (task.status === "completed") {
      const spent = task.actualMinutesSpent || task.estimatedMinutes || 0;
      return {
        label: `${spent}m · Completed`,
        isLive: false,
        isOvertime: false,
      };
    }

    if (isActive) {
      const currentTotalSpentSec = pastSpentSec + elapsed;
      const remainingSec = totalAllocatedSec - currentTotalSpentSec;

      if (remainingSec >= 0) {
        const remM = Math.floor(remainingSec / 60);
        const remS = remainingSec % 60;
        return {
          label: `${remM}m ${String(remS).padStart(2, "0")}s left`,
          isLive: true,
          isOvertime: false,
        };
      } else {
        const overSec = Math.abs(remainingSec);
        const overM = Math.floor(overSec / 60);
        const overS = overSec % 60;
        return {
          label: `+${overM}m ${String(overS).padStart(2, "0")}s overtime`,
          isLive: true,
          isOvertime: true,
        };
      }
    }

    if ((task.actualMinutesSpent || 0) > 0) {
      const remM = Math.max(0, (task.estimatedMinutes || 30) - (task.actualMinutesSpent || 0));
      return {
        label: `${remM}m left of ${task.estimatedMinutes}m · Pending`,
        isLive: false,
        isOvertime: false,
      };
    }

    return {
      label: `${task.estimatedMinutes}m · Pending`,
      isLive: false,
      isOvertime: false,
    };
  };

  // 1. Handle Manual Task Creation
  const handleManualCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (slotEvaluation.hasConflict) {
      alert(
        `⚠️ Cannot schedule: The selected time slot (${slotEvaluation.formattedRange}) is occupied on: ${slotEvaluation.conflictedDayLabels || "selected day(s)"
        }.\n\nPlease choose an available time slot or click 'Apply Suggested Time'.`
      );
      return;
    }

    setLoading(true);
    try {
      const today = new Date();
      const endH = Math.floor(slotEvaluation.endMinutes / 60);
      const endM = slotEvaluation.endMinutes % 60;
      const isRecurring = selectedDays.length > 0;
      const targetRawDays = isRecurring ? selectedDays : [formatLocalDate(today)];

      // Apply rule:
      // 1. Current week: skip past days; if today's hour has passed, start from tomorrow.
      // 2. Next week: schedule all selected days starting from the beginning (Monday..Sunday) if recurring!
      const { allDates } = getValidScheduleDates(
        targetRawDays,
        slotEvaluation.startMinutes,
        today,
        isRecurring
      );

      const lastDateKey = allDates.length > 0 ? allDates[allDates.length - 1] : formatLocalDate(today);
      const [ly, lm, ld] = lastDateKey.split("-").map(Number);
      const deadlineDate = new Date(ly, lm - 1, ld, endH, endM, 0);
      const deadlineIso = deadlineDate.toISOString();

      const res = await fetchWithAuth(`${API_URL}/tasks`, {
        method: "POST",
        body: JSON.stringify({
          title: manualForm.title,
          estimatedMinutes: manualForm.estimatedMinutes,
          color: manualForm.color,
          deadline: deadlineIso,
          userEmail: getUserEmail(),
          recurrence: selectedDays.length > 1 ? "weekly" : "none",
        }),
      });
      if (res.ok) {
        const createdTask = await res.json().catch(() => null);

        const email = getUserEmail();
        if (email && typeof window !== "undefined") {
          try {
            const key = `timespace_manual_schedule_${email}`;
            const current = JSON.parse(localStorage.getItem(key) || "{}");
            const baseId = createdTask?.id || `manual_${Date.now()}`;

            for (const dKey of allDates) {
              const dayList = current[dKey] || [];
              const [dy, dm, dd] = dKey.split("-").map(Number);
              const dayDeadlineIso = new Date(dy, dm - 1, dd, endH, endM, 0).toISOString();

              const newItem = {
                id: `${baseId}_${dKey}`,
                taskId: createdTask?.id,
                title: manualForm.title,
                durationMinutes: manualForm.estimatedMinutes,
                startHour: Math.floor(slotEvaluation.startMinutes / 60),
                startMinute: slotEvaluation.startMinutes % 60,
                status: "pending",
                color: manualForm.color,
                deadline: dayDeadlineIso,
              };
              const filtered = dayList.filter(
                (it: any) =>
                  it.id !== newItem.id &&
                  !(it.startHour === newItem.startHour && it.title === newItem.title)
              );
              current[dKey] = [...filtered, newItem];
            }
            localStorage.setItem(key, JSON.stringify(current));
          } catch (storageErr) {
            console.error("Error storing manual schedule items:", storageErr);
          }
        }

        setManualForm({ title: "", estimatedMinutes: 30, color: "#A0785A", startTime: "" });
        setSelectedDays([]);
        setShowManualForm(false);
        fetchTasks();
      } else {
        const error = await res.json().catch(() => null);
        alert(error?.message || "Could not save the task. Please try again.");
      }
    } catch (error) {
      console.error("Error creating task:", error);
      alert("Could not reach the backend. Please check that it is running.");
    }
    setLoading(false);
  };

  const toggleTaskStatus = async (taskId: string, currentStatus: string) => {
    const nextStatus = currentStatus === "completed" ? "pending" : "completed";
    try {
      const email = getUserEmail();
      const res = await fetchWithAuth(`${API_URL}/tasks/${taskId}/status?email=${encodeURIComponent(email)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (res.ok) {
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: nextStatus } : t));
      } else {
        const error = await res.json().catch(() => null);
        alert(error?.message || "Could not update the task status.");
      }
    } catch (err) {
      console.error("Error toggling task status:", err);
    }
  };

  const deleteTask = async (task: Task) => {
    setDeletingTaskId(task.id);
    try {
      const email = getUserEmail();
      const res = await fetchWithAuth(`${API_URL}/tasks/${task.id}?email=${encodeURIComponent(email)}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setTasks((previous) => previous.filter((current) => current.id !== task.id));
        setTaskPendingDeletion(null);

        // Clean up from manual scheduled items in localStorage
        if (email && typeof window !== "undefined") {
          try {
            const key = `timespace_manual_schedule_${email}`;
            const current = JSON.parse(localStorage.getItem(key) || "{}");
            let changed = false;
            for (const dKey of Object.keys(current)) {
              const prevLen = current[dKey]?.length || 0;
              current[dKey] = (current[dKey] || []).filter(
                (it: any) => it.taskId !== task.id && it.id !== task.id && !it.id.startsWith(task.id)
              );
              if (current[dKey].length !== prevLen) changed = true;
            }
            if (changed) {
              localStorage.setItem(key, JSON.stringify(current));
            }
          } catch { /* ignore */ }
        }

        // If active session was on this task, stop it locally
        if (activeSession === task.id) {
          stopSession(true);
        }
      } else {
        alert("The task could not be deleted. Please try again.");
      }
    } catch (err) {
      console.error("Error deleting task:", err);
      alert("The task could not be deleted. Please try again.");
    } finally {
      setDeletingTaskId(null);
    }
  };

  const handleOpenEditModal = (task: Task) => {
    setEditingTask(task);
    setEditForm({
      title: task.title,
      estimatedMinutes: task.estimatedMinutes || 30,
      color: task.color || "#A0785A",
      priority: task.priority || "medium",
      recurrence: task.recurrence || "none",
    });
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask) return;
    setEditLoading(true);
    try {
      const email = getUserEmail();
      const res = await fetchWithAuth(`${API_URL}/tasks/${editingTask.id}?email=${encodeURIComponent(email)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editForm.title,
          estimatedMinutes: Number(editForm.estimatedMinutes),
          color: editForm.color,
          priority: editForm.priority,
          recurrence: editForm.recurrence,
          userEmail: email,
        }),
      });
      if (res.ok) {
        const updated = await res.json().catch(() => null);
        setTasks((prev) =>
          prev.map((t) =>
            t.id === editingTask.id
              ? {
                ...t,
                title: editForm.title,
                estimatedMinutes: Number(editForm.estimatedMinutes),
                color: editForm.color,
                priority: editForm.priority,
                recurrence: editForm.recurrence,
                ...(updated || {}),
              }
              : t
          )
        );
        setEditingTask(null);
      } else {
        const errText = await res.text();
        alert("Failed to update task: " + errText);
      }
    } catch (err) {
      console.error("Error updating task:", err);
      alert("Error updating task. Please check your connection.");
    } finally {
      setEditLoading(false);
    }
  };

  const fetchSessions = () => {
    fetchWithAuth(`${API_URL}/ai/chat/sessions`)
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => Array.isArray(d) && setSessions(d))
      .catch(() => { });
  };

  useEffect(() => {
    if (showAiModal) {
      fetchSessions();
    }
  }, [showAiModal]);

  // Load chat session history when user selects an existing conversation
  useEffect(() => {
    if (!selectedSessionId) {
      setAiReply(null);
      setProposal(null);
      return;
    }
    fetchWithAuth(`${API_URL}/ai/chat/sessions/${selectedSessionId}/messages`)
      .then((r) => (r.ok ? r.json() : []))
      .then((msgs) => {
        if (Array.isArray(msgs) && msgs.length > 0) {
          const lastAssistant = msgs.slice().reverse().find((m: any) => m.role === "assistant");
          if (lastAssistant) {
            setAiReply(lastAssistant.content);
          }
        }
      })
      .catch(() => { });
  }, [selectedSessionId]);

  // 2. Handle AI Prompt Submission
  const handleAiSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiPrompt.trim()) return;
    setAiLoading(true);
    setAiReply(null);
    setProposal(null);

    const url = selectedSessionId
      ? `${API_URL}/ai/chat?sessionId=${selectedSessionId}`
      : `${API_URL}/ai/chat`;

    try {
      const email = getUserEmail();
      const res = await fetchWithAuth(url, {
        method: "POST",
        body: JSON.stringify({ message: aiPrompt, userEmail: email }),
      });
      if (res.ok) {
        const data = await res.json();
        setAiReply(data.ai_reply || data.aiReply || (data.proposal ? "I analyzed your request and prepared this plan:" : "I received your message. Let me know what specific tasks you would like to schedule!"));
        setProposal(data.proposal || null);
        fetchSessions();
      } else {
        alert("Failed to analyze prompt. Please try again.");
      }
    } catch (err: unknown) {
      alert("AI Assistant Error: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setAiLoading(false);
    }
  };

  // 3. Confirm & Save AI Proposed Tasks
  const handleConfirmProposal = async () => {
    if (!proposal || !proposal.extracted_tasks) return;
    setConfirming(true);
    try {
      const email = getUserEmail();
      const res = await fetchWithAuth(`${API_URL}/ai/chat/confirm`, {
        method: "POST",
        body: JSON.stringify({ tasks: proposal.extracted_tasks, userEmail: email }),
      });
      if (res.ok) {
        setShowAiModal(false);
        setAiPrompt("");
        setProposal(null);
        setAiReply(null);
        fetchTasks();
      } else {
        alert("Failed to save tasks. Please try again.");
      }
    } catch (err: unknown) {
      alert("Error saving tasks: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setConfirming(false);
    }
  };

  // 4. Handle Advanced Goal Decomposition
  const handleDecomposeGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!goalText.trim()) return;
    setDecomposing(true);
    setGoalPlan(null);

    try {
      const res = await fetchWithAuth(`${API_URL}/ai/analytics/decompose-advanced`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_email: getUserEmail() || "user@example.com",
          goal: goalText,
          target_hours: goalHours
        }),
      });
      if (res.ok) {
        const data: AdvancedGoalPlan = await res.json();
        setGoalPlan(data);
      } else {
        alert("Failed to decompose goal. Please try again.");
      }
    } catch (err: unknown) {
      alert("Decomposer Error: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setDecomposing(false);
    }
  };

  // 5. Batch Save Decomposed Plan Tasks
  const handleSaveGoalPlan = async () => {
    if (!goalPlan) return;
    setSavingPlan(true);
    const email = getUserEmail();
    const phaseColors = ["#2563EB", "#A0785A", "#16A34A"];

    try {
      for (const phase of goalPlan.phases) {
        const color = phaseColors[(phase.phase_number - 1) % phaseColors.length];
        const minutesPerTask = Math.max(20, Math.round((phase.estimated_hours * 60) / Math.max(1, phase.tasks.length)));

        for (const taskTitle of phase.tasks) {
          await fetchWithAuth(`${API_URL}/tasks`, {
            method: "POST",
            body: JSON.stringify({
              userEmail: email,
              title: `[${phase.name.split(":")[0]}] ${taskTitle}`,
              estimatedMinutes: minutesPerTask,
              color: color
            })
          });
        }
      }
      setShowAiModal(false);
      setGoalText("");
      setGoalPlan(null);
      fetchTasks();
    } catch (err: unknown) {
      alert("Error saving goal tasks: " + (err instanceof Error ? err.message : String(err)));
    } finally {
      setSavingPlan(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-[#FAFAF8]">
      <Sidebar active="Tasks" />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        <header className="bg-white border-b border-[#E8E2D9] px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="font-heading text-xl font-700 text-[#1A1A1A]">Tasks</h1>
            <p className="text-xs text-[#6B7280]">
              {tasks.length} total · {tasks.filter((t) => t.status === "completed").length} completed
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Way 2: AI Prompt Creator Button */}
            <button
              onClick={() => setShowAiModal(true)}
              className="flex items-center gap-2 bg-[#F5EFE8] border border-[#A0785A]/40 text-[#A0785A] text-sm px-4 py-2 rounded-xl font-semibold hover:bg-[#A0785A]/10 transition-all shadow-sm"
            >
              <Sparkles size={15} className="text-[#A0785A]" /> AI Prompt Assistant
            </button>

            {/* Way 1: Manual New Task Button */}
            <button
              onClick={() => setShowManualForm(!showManualForm)}
              className="flex items-center gap-2 bg-[#A0785A] text-white text-sm px-4 py-2 rounded-xl font-semibold hover:bg-[#7D5C42] transition-all shadow-sm shadow-[#A0785A]/20"
            >
              <Plus size={15} /> Add Task (Manual)
            </button>
          </div>
        </header>

        <main className="flex-1 p-6 max-w-4xl mx-auto w-full space-y-6">
          {/* 1. Manual Form Drawer/Card */}
          {showManualForm && (
            <div className="bg-white rounded-2xl border border-[#A0785A]/30 p-6 shadow-sm">
              <h2 className="font-heading font-600 text-[#1A1A1A] mb-5">Create Task (Manual)</h2>
              <form onSubmit={handleManualCreate} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-[#1A1A1A] mb-1.5">Task title *</label>
                  <input
                    required
                    placeholder="e.g. Write project report"
                    value={manualForm.title}
                    onChange={(e) => setManualForm({ ...manualForm, title: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-[#E8E2D9] text-sm text-[#1A1A1A] placeholder:text-[#6B7280] focus:outline-none focus:border-[#A0785A] focus:ring-2 focus:ring-[#A0785A]/15 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#1A1A1A] mb-1.5">Estimated duration (minutes)</label>
                  <input
                    type="number"
                    min={5}
                    max={480}
                    value={manualForm.estimatedMinutes}
                    onChange={(e) => setManualForm({ ...manualForm, estimatedMinutes: Number(e.target.value) })}
                    className="w-full px-4 py-3 rounded-xl border border-[#E8E2D9] text-sm text-[#1A1A1A] focus:outline-none focus:border-[#A0785A] focus:ring-2 focus:ring-[#A0785A]/15 transition-all"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-sm font-medium text-[#1A1A1A]">
                      Start Time <span className="text-xs text-[#6B7280] font-normal">(optional)</span>
                    </label>
                    {manualForm.startTime && (
                      <button
                        type="button"
                        onClick={() => setManualForm((prev) => ({ ...prev, startTime: "" }))}
                        className="text-xs text-[#A0785A] hover:underline cursor-pointer"
                      >
                        Clear (auto-assign)
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Clock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6B7280] pointer-events-none" />
                    <input
                      type="time"
                      value={manualForm.startTime}
                      onChange={(e) => setManualForm({ ...manualForm, startTime: e.target.value })}
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-[#E8E2D9] text-sm text-[#1A1A1A] focus:outline-none focus:border-[#A0785A] focus:ring-2 focus:ring-[#A0785A]/15 transition-all"
                    />
                  </div>
                </div>

                {/* ── 7 Days of the Week Selection (Not selected by default) ── */}
                <div className="md:col-span-2 bg-[#FAF7F2] rounded-2xl border border-[#E8E2D9] p-3.5 space-y-2.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <label className="text-xs font-bold text-[#1A1A1A] flex items-center gap-1.5">
                      <CalendarDays size={14} className="text-[#A0785A]" />
                      Repeat on Days of the Week:
                      <span
                        className={`font-semibold px-2 py-0.5 rounded-full text-[11px] ${selectedDays.length > 0
                          ? "bg-[#A0785A] text-white"
                          : "bg-[#E8E2D9]/70 text-[#6B7280]"
                          }`}
                      >
                        {selectedDays.length > 0
                          ? `${selectedDays.length} of 7 days selected`
                          : "None selected (default: today)"}
                      </span>
                    </label>

                    {/* Quick Presets */}
                    <div className="flex items-center gap-1">
                      {selectedDays.length > 0 && (
                        <button
                          type="button"
                          onClick={() => handleSelectDayPreset("clear")}
                          className="text-[10px] px-2 py-1 rounded-md font-semibold bg-white border border-[#E8E2D9] text-[#6B7280] hover:text-[#DC2626] hover:border-red-300 transition-all cursor-pointer"
                        >
                          Clear
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => handleSelectDayPreset("weekdays")}
                        className={`text-[10px] px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${selectedDays.length === 5 &&
                          weekDays.slice(0, 5).every((d) => selectedDays.includes(d.dateKey))
                          ? "bg-[#A0785A] text-white shadow-xs"
                          : "bg-white border border-[#E8E2D9] text-[#6B7280] hover:text-[#A0785A] hover:border-[#A0785A]"
                          }`}
                      >
                        Mon–Fri
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSelectDayPreset("all")}
                        className={`text-[10px] px-2.5 py-1 rounded-md font-semibold transition-all cursor-pointer ${selectedDays.length === 7
                          ? "bg-[#A0785A] text-white shadow-xs"
                          : "bg-white border border-[#E8E2D9] text-[#6B7280] hover:text-[#A0785A] hover:border-[#A0785A]"
                          }`}
                      >
                        All 7 days
                      </button>
                    </div>
                  </div>

                  {/* The 7 Day Buttons */}
                  <div className="grid grid-cols-7 gap-1.5">
                    {weekDays.map((wd) => {
                      const isSelected = selectedDays.includes(wd.dateKey);
                      const isOccupied = !!slotEvaluation.dayConflictMap?.[wd.dateKey];
                      const now = new Date();
                      const currentDayKey = formatLocalDate(now);
                      const nowMinutes = now.getHours() * 60 + now.getMinutes();
                      const isPastSlot =
                        wd.dateKey < currentDayKey ||
                        (wd.dateKey === currentDayKey && slotEvaluation.startMinutes < nowMinutes);

                      return (
                        <button
                          key={wd.dateKey}
                          type="button"
                          onClick={() => handleToggleDay(wd.dateKey)}
                          title={`${wd.dayShort} ${wd.dayNum} · ${manualForm.startTime
                            ? isPastSlot
                              ? "Past this week · Starts next week from beginning"
                              : isOccupied
                                ? "Slot occupied at this time"
                                : "Slot free"
                            : "Click to toggle selection"
                            }`}
                          className={`flex flex-col items-center justify-center py-2.5 px-1 rounded-xl border text-xs transition-all cursor-pointer select-none relative ${isSelected
                            ? "bg-[#A0785A] text-white border-[#A0785A] shadow-xs ring-1 ring-[#A0785A]"
                            : "bg-white text-[#4B5563] border-[#E8E2D9] hover:border-[#A0785A]/50 hover:bg-[#FDFBF9]"
                            }`}
                        >
                          {isSelected && (
                            <div className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-white text-[#A0785A] flex items-center justify-center shadow-xs">
                              <Check size={9} strokeWidth={3} />
                            </div>
                          )}
                          <span
                            className={`text-[10px] font-bold uppercase tracking-wider ${isSelected ? "text-white" : "text-[#6B7280]"
                              }`}
                          >
                            {wd.dayShort}
                          </span>
                          <span
                            className={`text-sm font-extrabold mt-0.5 ${isSelected ? "text-white" : "text-[#1A1A1A]"
                              }`}
                          >
                            {wd.dayNum}
                          </span>

                          {/* Status Dot */}
                          {manualForm.startTime && (
                            <div className="flex items-center gap-1 mt-1">
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${isPastSlot
                                  ? isSelected
                                    ? "bg-amber-200"
                                    : "bg-slate-300"
                                  : isOccupied
                                    ? isSelected
                                      ? "bg-amber-300"
                                      : "bg-red-500"
                                    : isSelected
                                      ? "bg-emerald-300"
                                      : "bg-emerald-500"
                                  }`}
                              />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Time Range Calculation & Collision Warning Banner */}
                <div className="md:col-span-2">
                  {slotEvaluation.hasConflict ? (
                    <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
                      <div className="flex items-start sm:items-center gap-2.5">
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5 sm:mt-0" />
                        <div className="text-sm">
                          <span className="font-semibold text-amber-800">⚠️ Slot occupied</span>{" "}
                          <span className="font-bold text-amber-950">({slotEvaluation.formattedRange})</span>
                          {slotEvaluation.conflictedDayLabels && (
                            <span className="text-xs text-amber-800 block sm:inline ml-1">
                              on: <span className="font-semibold underline">{slotEvaluation.conflictedDayLabels}</span>
                            </span>
                          )}
                          {slotEvaluation.suggestedSlot && (
                            <div className="text-xs text-amber-800 mt-1">
                              Suggested nearest free slot:{" "}
                              <span className="font-bold text-amber-950">
                                {slotEvaluation.suggestedSlot.formattedRange}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      {slotEvaluation.suggestedSlot && (
                        <button
                          type="button"
                          onClick={() => {
                            if (slotEvaluation.suggestedSlot) {
                              setManualForm((prev) => ({
                                ...prev,
                                startTime: slotEvaluation.suggestedSlot!.startTime24,
                              }));
                            }
                          }}
                          className="shrink-0 px-3.5 py-1.5 bg-[#A0785A] hover:bg-[#7D5C42] text-white text-xs font-semibold rounded-lg shadow-sm transition-all active:scale-95 cursor-pointer"
                        >
                          Apply Suggested Time
                        </button>
                      )}
                    </div>
                  ) : manualForm.startTime ? (
                    <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <div className="text-sm">
                        <span className="font-semibold text-emerald-700">✓ Slot available</span>
                        <span className="mx-2 text-emerald-300">·</span>
                        <span className="text-emerald-800">Scheduled Range: </span>
                        <span className="font-bold text-emerald-950">
                          {slotEvaluation.formattedRange}
                        </span>
                        <span className="text-xs text-emerald-700 ml-2 font-medium">
                          {slotEvaluation.scheduleStartNote}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 rounded-xl bg-[#FBF9F5] border border-[#E8E2D9] text-[#1A1A1A] flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <Clock className="w-4 h-4 text-[#A0785A] shrink-0" />
                        <div className="text-sm">
                          <span className="text-[#6B7280]">Auto-assigned Range: </span>
                          <span className="font-semibold text-[#1A1A1A]">
                            {slotEvaluation.formattedRange}
                          </span>
                          <span className="text-xs text-[#A0785A] ml-2 font-medium bg-[#A0785A]/10 px-2 py-0.5 rounded-full">
                            Nearest Available
                          </span>
                          {selectedDays.length > 0 && (
                            <span className="text-xs text-[#6B7280] ml-2">
                              (across {selectedDays.length} days)
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-[#1A1A1A] mb-2">Task color</label>
                  <div className="flex gap-2">
                    {COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setManualForm({ ...manualForm, color: c })}
                        className="w-7 h-7 rounded-full transition-all hover:scale-110"
                        style={{
                          backgroundColor: c,
                          outline: manualForm.color === c ? `3px solid ${c}` : "none",
                          outlineOffset: "2px",
                        }}
                      />
                    ))}
                  </div>
                </div>
                <div className="md:col-span-2 flex gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-[#A0785A] text-white py-3 rounded-xl text-sm font-semibold hover:bg-[#7D5C42] transition-all disabled:opacity-60"
                  >
                    {loading ? "Creating…" : "Save Task"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowManualForm(false)}
                    className="px-6 border border-[#E8E2D9] text-[#6B7280] py-3 rounded-xl text-sm font-semibold hover:border-[#A0785A] transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* 2. AI Assistant Modal / Workspace */}
          {showAiModal && (
            <div className="bg-white rounded-2xl border-2 border-[#A0785A]/40 p-6 shadow-md transition-all">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-[#A0785A] flex items-center justify-center">
                    <Sparkles size={16} className="text-white" />
                  </div>
                  <div>
                    <h2 className="font-heading font-700 text-[#1A1A1A]">AI Task & Goal Assistant</h2>
                    <p className="text-xs text-[#6B7280]">
                      Natural language task extraction, capacity analysis & hierarchical sprint decomposition.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowAiModal(false)}
                  className="text-[#6B7280] hover:text-[#1A1A1A] p-1.5 rounded-lg hover:bg-[#FAFAF8]"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Mode Tabs */}
              <div className="flex border-b border-[#E8E2D9] mb-4 gap-4 text-xs font-semibold">
                <button
                  onClick={() => setAiTab("prompt")}
                  className={`pb-2 flex items-center gap-1.5 border-b-2 transition-all ${aiTab === "prompt"
                    ? "border-[#A0785A] text-[#A0785A]"
                    : "border-transparent text-[#6B7280] hover:text-[#1A1A1A]"
                    }`}
                >
                  <MessageSquare size={14} /> Prompt Assistant
                </button>
                <button
                  onClick={() => setAiTab("decomposer")}
                  className={`pb-2 flex items-center gap-1.5 border-b-2 transition-all ${aiTab === "decomposer"
                    ? "border-[#A0785A] text-[#A0785A]"
                    : "border-transparent text-[#6B7280] hover:text-[#1A1A1A]"
                    }`}
                >
                  <Layers size={14} /> Sprint Goal Decomposer
                </button>
              </div>

              {/* TAB 1: Prompt Assistant */}
              {aiTab === "prompt" && (
                <div className="space-y-4">
                  {/* Session Selector */}
                  {sessions.length > 0 && (
                    <div className="flex items-center gap-2 text-xs">
                      <History size={13} className="text-[#6B7280]" />
                      <span className="text-[#6B7280]">Conversation:</span>
                      <select
                        value={selectedSessionId || ""}
                        onChange={(e) => setSelectedSessionId(e.target.value || null)}
                        className="px-2.5 py-1 rounded-lg border border-[#E8E2D9] bg-[#FAFAF8] text-xs text-[#1A1A1A] focus:outline-none focus:border-[#A0785A]"
                      >
                        <option value="">New Session</option>
                        {sessions.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.title} ({new Date(s.updatedAt).toLocaleDateString()})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Prompt Input Form */}
                  <form onSubmit={handleAiSubmit} className="flex gap-2">
                    <input
                      value={aiPrompt}
                      onChange={(e) => setAiPrompt(e.target.value)}
                      placeholder="e.g. I have a Calculus midterm on Thursday and need to build a prototype by Wednesday night..."
                      className="flex-1 px-4 py-3 rounded-xl border border-[#E8E2D9] text-sm text-[#1A1A1A] placeholder:text-[#6B7280] focus:outline-none focus:border-[#A0785A] focus:ring-2 focus:ring-[#A0785A]/15"
                    />
                    <button
                      type="submit"
                      disabled={aiLoading || !aiPrompt.trim()}
                      className="flex items-center gap-2 bg-[#A0785A] text-white px-5 py-3 rounded-xl text-sm font-semibold hover:bg-[#7D5C42] transition-all disabled:opacity-50 shrink-0"
                    >
                      {aiLoading ? <Clock size={16} className="animate-spin" /> : <Send size={16} />}
                      <span>{aiLoading ? "Analyzing..." : "Analyze Prompt"}</span>
                    </button>
                  </form>

                  {/* AI Reply Bubble */}
                  {aiReply && (
                    <div className="p-3.5 rounded-xl bg-[#F5EFE8] text-sm text-[#7D5C42] font-medium leading-relaxed border border-[#A0785A]/20">
                      {aiReply}
                    </div>
                  )}

                  {/* AI Analysis & Proposal Card */}
                  {proposal && proposal.extracted_tasks && proposal.extracted_tasks.length > 0 && (
                    <div className="space-y-4 pt-2 border-t border-[#E8E2D9]">

                      {/* Impact Analysis Banner */}
                      {proposal.impact_analysis && (
                        <div className="p-4 rounded-xl border border-[#E8E2D9] bg-[#FAFAF8] flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold uppercase tracking-wider text-[#A0785A]">Schedule Impact Preview</span>
                              {proposal.impact_analysis.overload_warning && (
                                <span className="flex items-center gap-1 text-[11px] font-bold text-[#DC2626] bg-red-50 px-2 py-0.5 rounded-md">
                                  <AlertTriangle size={12} /> Workload Overload Warning
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-[#6B7280] mt-1">{proposal.impact_analysis.summary}</p>
                          </div>
                          <div className="flex items-center gap-4 text-xs shrink-0">
                            <div className="text-center">
                              <span className="block text-gray-400">Added Work</span>
                              <span className="font-bold text-[#A0785A]">+{proposal.impact_analysis.added_minutes}m</span>
                            </div>
                            <div className="text-center">
                              <span className="block text-gray-400">Total Workload</span>
                              <span className="font-bold text-[#1A1A1A]">{(proposal.impact_analysis.new_total_minutes / 60).toFixed(1)}h</span>
                            </div>
                            <div className="text-center">
                              <span className="block text-gray-400">Weekly Capacity</span>
                              <span className="font-bold text-[#1A1A1A]">{proposal.impact_analysis.weekly_capacity_percent}%</span>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Extracted Tasks Table */}
                      <div className="space-y-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-[#6B7280]">
                          Proposed Tasks ({proposal.extracted_tasks.length})
                        </span>
                        <div className="space-y-2">
                          {proposal.extracted_tasks.map((task, idx) => (
                            <div
                              key={idx}
                              className="p-3 bg-white rounded-xl border border-[#E8E2D9] flex items-center justify-between gap-3 text-sm"
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="w-2 h-8 rounded-full shrink-0" style={{ backgroundColor: task.color }} />
                                <div>
                                  <p className="font-medium text-[#1A1A1A] truncate">{task.title}</p>
                                  <p className="text-xs text-[#6B7280]">{task.priority_reason}</p>
                                </div>
                              </div>
                              <div className="flex items-center gap-3 shrink-0">
                                <span className="text-xs text-[#6B7280] flex items-center gap-1">
                                  <Clock size={12} /> {task.durationMinutes ?? task.estimated_minutes}m
                                </span>
                                {task.recurrence && task.recurrence !== "none" && (
                                  <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-[#F5EFE8] text-[#A0785A]">
                                    {task.recurrence}
                                  </span>
                                )}
                                <span
                                  className={`text-xs px-2 py-0.5 rounded-full font-medium ${task.priority === "high"
                                    ? "bg-red-50 text-[#DC2626]"
                                    : "bg-[#F5EFE8] text-[#A0785A]"
                                    }`}
                                >
                                  {task.priority}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Action Confirmation Buttons */}
                      <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E8E2D9]">
                        <button
                          type="button"
                          onClick={() => setProposal(null)}
                          className="px-4 py-2 border border-[#E8E2D9] text-[#6B7280] rounded-xl text-xs font-semibold hover:border-[#A0785A]"
                        >
                          Dismiss
                        </button>
                        <button
                          type="button"
                          disabled={confirming}
                          onClick={handleConfirmProposal}
                          className="flex items-center gap-2 bg-[#16A34A] text-white px-5 py-2 rounded-xl text-xs font-semibold hover:bg-[#15803D] transition-all shadow-sm"
                        >
                          <CheckCircle2 size={14} />
                          <span>{confirming ? "Saving..." : "Confirm & Save All Tasks"}</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: Sprint Goal Decomposer */}
              {aiTab === "decomposer" && (
                <div className="space-y-4">
                  <form onSubmit={handleDecomposeGoal} className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-[#1A1A1A] mb-1">
                        High-Level Project or Study Goal
                      </label>
                      <input
                        value={goalText}
                        onChange={(e) => setGoalText(e.target.value)}
                        placeholder="e.g. Build and deploy a secure microservices backend with rate limiting and automated testing"
                        className="w-full px-4 py-3 rounded-xl border border-[#E8E2D9] text-sm text-[#1A1A1A] placeholder:text-[#6B7280] focus:outline-none focus:border-[#A0785A] focus:ring-2 focus:ring-[#A0785A]/15"
                      />
                    </div>
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-2 text-xs">
                        <label className="text-[#6B7280]">Target Execution Hours:</label>
                        <input
                          type="number"
                          min={2}
                          max={80}
                          value={goalHours}
                          onChange={(e) => setGoalHours(Number(e.target.value))}
                          className="w-16 px-2 py-1 rounded-lg border border-[#E8E2D9] text-xs text-center"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={decomposing || !goalText.trim()}
                        className="flex items-center gap-2 bg-[#A0785A] text-white px-5 py-2.5 rounded-xl text-xs font-semibold hover:bg-[#7D5C42] transition-all disabled:opacity-50"
                      >
                        {decomposing ? <Clock size={14} className="animate-spin" /> : <Layers size={14} />}
                        <span>{decomposing ? "Decomposing..." : "Generate 3-Phase Sprint Plan"}</span>
                      </button>
                    </div>
                  </form>

                  {/* Render Goal Plan */}
                  {goalPlan && (
                    <div className="space-y-4 pt-3 border-t border-[#E8E2D9]">
                      <div className="p-3.5 rounded-xl bg-[#F5EFE8] text-xs text-[#7D5C42] flex items-start gap-2">
                        <Sparkles size={14} className="shrink-0 mt-0.5" />
                        <div>
                          <p className="font-semibold">AI Strategic Guidance</p>
                          <p className="mt-0.5 leading-relaxed">{goalPlan.ai_strategic_guidance}</p>
                        </div>
                      </div>

                      {/* Milestone Phases */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {goalPlan.phases.map((phase) => (
                          <div
                            key={phase.phase_number}
                            className="bg-[#FAFAF8] rounded-xl border border-[#E8E2D9] p-3.5 flex flex-col justify-between"
                          >
                            <div>
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-white border border-[#E8E2D9] text-[#A0785A]">
                                  Phase {phase.phase_number}
                                </span>
                                <span className="text-xs font-bold text-[#1A1A1A]">{phase.estimated_hours}h</span>
                              </div>
                              <h4 className="font-heading font-600 text-xs text-[#1A1A1A] mb-2">{phase.name}</h4>
                              <ul className="space-y-1.5 text-[11px] text-[#6B7280]">
                                {phase.tasks.map((taskName, tIdx) => (
                                  <li key={tIdx} className="flex items-start gap-1.5">
                                    <span className="text-[#A0785A] font-bold">•</span>
                                    <span>{taskName}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                            {phase.dependencies.length > 0 && (
                              <p className="text-[10px] text-gray-400 mt-3 pt-2 border-t border-[#E8E2D9]">
                                Unlocks after Phase {phase.dependencies.join(", ")}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Save Plan Button */}
                      <div className="flex items-center justify-end gap-3 pt-2">
                        <button
                          type="button"
                          disabled={savingPlan}
                          onClick={handleSaveGoalPlan}
                          className="flex items-center gap-2 bg-[#16A34A] text-white px-5 py-2.5 rounded-xl text-xs font-semibold hover:bg-[#15803D] transition-all shadow-sm disabled:opacity-50"
                        >
                          {savingPlan ? <Clock size={14} className="animate-spin" /> : <Check size={14} />}
                          <span>{savingPlan ? "Creating Tasks..." : "Convert Plan into Scheduled Tasks"}</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* 3. Task List Header, Search & Filter Bar */}
          {tasks.length > 0 && (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-[#E8E2D9] shadow-xs">
              {/* Search Input */}
              <div className="relative flex-1">
                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6B7280]" />
                <input
                  type="text"
                  placeholder="Search tasks..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-8 py-2 rounded-xl border border-[#E8E2D9] text-sm text-[#1A1A1A] placeholder:text-[#6B7280] focus:outline-none focus:border-[#A0785A] bg-[#FAFAF8]"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B7280] hover:text-[#1A1A1A] text-xs font-semibold"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center gap-1 overflow-x-auto text-xs font-medium shrink-0">
                {(
                  [
                    { key: "all", label: "All", count: tasks.length },
                    { key: "pending", label: "Pending", count: tasks.filter((t) => t.status === "pending" && activeSession !== t.id).length },
                    { key: "in_progress", label: "In Progress", count: tasks.filter((t) => t.status === "in_progress" || activeSession === t.id).length },
                    { key: "completed", label: "Completed", count: tasks.filter((t) => t.status === "completed").length },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setFilterStatus(tab.key)}
                    className={`px-3 py-1.5 rounded-lg transition-all flex items-center gap-1.5 ${filterStatus === tab.key
                      ? "bg-[#A0785A] text-white shadow-xs font-semibold"
                      : "text-[#6B7280] hover:bg-[#FAFAF8] hover:text-[#1A1A1A]"
                      }`}
                  >
                    <span>{tab.label}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full ${filterStatus === tab.key ? "bg-white/20 text-white" : "bg-[#E8E2D9]/60 text-[#6B7280]"
                        }`}
                    >
                      {tab.count}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {tasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center bg-white rounded-2xl border border-[#E8E2D9] p-8">
              <div className="w-16 h-16 rounded-2xl bg-[#F5EFE8] flex items-center justify-center mb-4">
                <CheckCircle2 size={28} className="text-[#A0785A]" />
              </div>
              <p className="font-heading font-600 text-lg text-[#1A1A1A] mb-2">No tasks yet</p>
              <p className="text-sm text-[#6B7280] mb-6 max-w-sm">
                Add a task manually or let the AI prompt assistant break down your goals.
              </p>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowAiModal(true)}
                  className="flex items-center gap-2 bg-[#F5EFE8] border border-[#A0785A]/40 text-[#A0785A] px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#A0785A]/10 transition-all"
                >
                  <Sparkles size={15} /> AI Prompt
                </button>
                <button
                  onClick={() => setShowManualForm(true)}
                  className="flex items-center gap-2 bg-[#A0785A] text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#7D5C42] transition-all"
                >
                  <Plus size={15} /> Manual Task
                </button>
              </div>
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="bg-white rounded-2xl border border-[#E8E2D9] p-8 text-center shadow-xs">
              <p className="text-sm font-medium text-[#1A1A1A]">No tasks match your filters</p>
              <p className="text-xs text-[#6B7280] mt-1">Try changing the search query or status filter.</p>
              <button
                type="button"
                onClick={() => {
                  setSearchTerm("");
                  setFilterStatus("all");
                }}
                className="mt-3 text-xs text-[#A0785A] font-semibold hover:underline"
              >
                Reset filters
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {filteredTasks.map((task) => {
                const timeInfo = getTaskRemainingDisplay(task);
                const isActive = activeSession === task.id;
                return (
                  <div
                    key={task.id}
                    className={`bg-white rounded-2xl border p-4 flex items-center gap-4 transition-all ${isActive
                      ? "border-[#A0785A] bg-[#F5EFE8]/30 shadow-sm"
                      : "border-[#E8E2D9] hover:border-[#A0785A]/30 hover:shadow-sm"
                      }`}
                  >
                    <div
                      className={`w-1 h-10 rounded-full shrink-0 ${isActive ? "animate-pulse ring-2 ring-[#A0785A]/40" : ""}`}
                      style={{ backgroundColor: task.color || "#A0785A" }}
                    />
                    <button
                      onClick={() => toggleTaskStatus(task.id, task.status)}
                      className="flex items-center gap-2 shrink-0 p-1 hover:bg-[#FAFAF8] rounded-lg transition-colors"
                      title={task.status === "completed" ? "Mark pending" : "Mark completed"}
                    >
                      {task.status === "completed" ? (
                        <CheckCircle2 size={18} className="text-[#16A34A]" />
                      ) : (
                        <Circle size={18} className="text-[#E8E2D9] hover:text-[#A0785A]" />
                      )}
                    </button>
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-sm font-medium ${task.status === "completed" ? "line-through text-[#6B7280]" : "text-[#1A1A1A]"
                          }`}
                      >
                        {task.title}
                      </p>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span
                          className={`text-xs flex items-center gap-1 font-medium ${timeInfo.isOvertime
                            ? "text-[#DC2626]"
                            : timeInfo.isLive
                              ? "text-[#A0785A]"
                              : "text-[#6B7280]"
                            }`}
                        >
                          <Clock size={11} className={timeInfo.isLive ? "text-[#A0785A] animate-pulse" : ""} />
                          {timeInfo.label}
                        </span>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${task.status === "completed"
                            ? "bg-green-50 text-[#16A34A]"
                            : isActive
                              ? "bg-[#F5EFE8] text-[#A0785A]"
                              : "bg-gray-100 text-gray-600"
                            }`}
                        >
                          {isActive ? "In Progress (Live)" : task.status === "completed" ? "Completed" : "Pending"}
                        </span>
                        {task.recurrence && task.recurrence !== "none" && (
                          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-[#F5EFE8] text-[#A0785A] border border-[#A0785A]/25 capitalize">
                            {task.recurrence}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {isActive ? (
                        <button
                          onClick={() => stopSession()}
                          className="flex items-center gap-1.5 text-xs text-white bg-[#DC2626] px-3 py-1.5 rounded-lg hover:bg-red-700 transition-all font-semibold shadow-sm"
                        >
                          <Square size={10} fill="white" /> Stop
                        </button>
                      ) : (
                        task.status !== "completed" && (
                          <button
                            onClick={() => startSession(task)}
                            className="flex items-center gap-1.5 text-xs text-[#A0785A] border border-[#A0785A]/30 px-3 py-1.5 rounded-lg hover:bg-[#F5EFE8] transition-all font-medium"
                          >
                            <Play size={11} fill="#A0785A" /> Start
                          </button>
                        )
                      )}
                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(task)}
                        className="p-2 rounded-lg text-[#9CA3AF] hover:text-[#A0785A] hover:bg-[#F5EFE8] transition-colors shrink-0"
                        title="Edit task"
                        aria-label={`Edit ${task.title}`}
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setTaskPendingDeletion(task)}
                        className="p-2 rounded-lg text-[#9CA3AF] hover:text-[#DC2626] hover:bg-red-50 transition-colors shrink-0"
                        title="Delete task permanently"
                        aria-label={`Delete ${task.title} permanently`}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>

      {taskPendingDeletion && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1A1A1A]/45 p-6" role="presentation">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-task-title"
            className="w-full max-w-md rounded-2xl bg-white border border-[#E8E2D9] p-6 shadow-2xl"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center shrink-0">
                <Trash2 size={20} className="text-[#DC2626]" />
              </div>
              <div>
                <h2 id="delete-task-title" className="font-heading text-lg font-700 text-[#1A1A1A]">Delete task permanently?</h2>
                <p className="mt-2 text-sm leading-relaxed text-[#6B7280]">
                  &quot;{taskPendingDeletion.title}&quot; will be permanently removed. Its task record, schedule links, and tracked history cannot be recovered.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={() => setTaskPendingDeletion(null)}
                disabled={deletingTaskId !== null}
                className="px-4 py-2.5 rounded-xl border border-[#E8E2D9] text-sm font-semibold text-[#6B7280] hover:bg-[#FAFAF8] disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => deleteTask(taskPendingDeletion)}
                disabled={deletingTaskId !== null}
                className="px-4 py-2.5 rounded-xl bg-[#DC2626] text-sm font-semibold text-white hover:bg-[#B91C1C] disabled:opacity-60"
              >
                {deletingTaskId ? "Deleting..." : "Delete permanently"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Task Time Reached Modal */}
      {showTimeUpModal && timeUpTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1A1A1A]/45 p-6">
          <div className="w-full max-w-md rounded-2xl bg-white border border-[#E8E2D9] p-6 shadow-2xl">
            <h2 className="font-heading text-lg font-semibold text-[#1A1A1A] mb-2">Task Time Reached</h2>
            <p className="mb-5 text-sm text-[#6B7280]">
              The planned {timeUpTask.estimatedMinutes} minutes for &ldquo;{timeUpTask.title}&rdquo; have elapsed.
              Add more time or finish the task?
            </p>
            <div className="flex flex-wrap gap-2 mb-5">
              {[5, 10, 15, 30].map((m) => (
                <button
                  key={m}
                  onClick={() => handleAddMinutes(m)}
                  className="px-4 py-2 bg-[#A0785A] text-white rounded-xl text-sm font-medium hover:bg-[#7D5C42]"
                >
                  +{m}m
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3 justify-end">
              <button
                onClick={() => { setShowTimeUpModal(false); setHasPrompted(false); }}
                className="px-4 py-2 border border-[#E8E2D9] text-[#6B7280] rounded-xl text-sm hover:bg-[#FAFAF8]"
              >
                Cancel
              </button>
              <button
                onClick={handleFinishTask}
                className="flex items-center gap-2 px-4 py-2 bg-[#16A34A] text-white rounded-xl text-sm font-medium hover:bg-[#15803D]"
              >
                <CheckCircle2 size={15} /> Finish Task
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Task Modal */}
      {editingTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1A1A1A]/45 p-6" role="presentation">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-task-title"
            className="w-full max-w-lg rounded-2xl bg-white border border-[#E8E2D9] p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150"
          >
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#F5EFE8] flex items-center justify-center">
                  <Pencil size={16} className="text-[#A0785A]" />
                </div>
                <div>
                  <h2 id="edit-task-title" className="font-heading text-lg font-700 text-[#1A1A1A]">
                    Edit Task
                  </h2>
                  <p className="text-xs text-[#6B7280]">Update task details, duration, priority, and recurrence.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingTask(null)}
                className="text-[#6B7280] hover:text-[#1A1A1A] p-1.5 rounded-lg hover:bg-[#FAFAF8]"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#1A1A1A] mb-1.5">Task title *</label>
                <input
                  required
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-xl border border-[#E8E2D9] text-sm text-[#1A1A1A] focus:outline-none focus:border-[#A0785A] focus:ring-2 focus:ring-[#A0785A]/15"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#1A1A1A] mb-1.5">Duration (minutes) *</label>
                  <input
                    type="number"
                    min={5}
                    max={480}
                    required
                    value={editForm.estimatedMinutes}
                    onChange={(e) => setEditForm({ ...editForm, estimatedMinutes: Number(e.target.value) })}
                    className="w-full px-4 py-2.5 rounded-xl border border-[#E8E2D9] text-sm text-[#1A1A1A] focus:outline-none focus:border-[#A0785A]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#1A1A1A] mb-1.5">Priority</label>
                  <select
                    value={editForm.priority}
                    onChange={(e) => setEditForm({ ...editForm, priority: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl border border-[#E8E2D9] text-sm text-[#1A1A1A] focus:outline-none focus:border-[#A0785A] bg-white"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1A1A1A] mb-1.5">Recurrence</label>
                <select
                  value={editForm.recurrence}
                  onChange={(e) => setEditForm({ ...editForm, recurrence: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-xl border border-[#E8E2D9] text-sm text-[#1A1A1A] focus:outline-none focus:border-[#A0785A] bg-white"
                >
                  <option value="none">None (One-time)</option>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1A1A1A] mb-2">Color tag</label>
                <div className="flex gap-2">
                  {COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setEditForm({ ...editForm, color: c })}
                      className="w-7 h-7 rounded-full transition-all hover:scale-110"
                      style={{
                        backgroundColor: c,
                        outline: editForm.color === c ? `3px solid ${c}` : "none",
                        outlineOffset: "2px",
                      }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-[#E8E2D9]">
                <button
                  type="button"
                  onClick={() => setEditingTask(null)}
                  className="px-4 py-2.5 rounded-xl border border-[#E8E2D9] text-xs font-semibold text-[#6B7280] hover:bg-[#FAFAF8]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editLoading}
                  className="px-5 py-2.5 rounded-xl bg-[#A0785A] text-xs font-semibold text-white hover:bg-[#7D5C42] shadow-sm disabled:opacity-50"
                >
                  {editLoading ? "Saving changes..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
