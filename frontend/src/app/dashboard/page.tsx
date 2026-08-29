"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend,
} from "recharts";
import {
  Clock, CheckCircle2, Target, Zap, Plus, Play, Square,
  Brain, ChevronRight, Award
} from "lucide-react";
import { API_URL, fetchWithAuth, getUserEmail } from "@/lib/api";
import Sidebar from "@/components/Sidebar";

// ── Types ──────────────────────────────────────────────────────────────────
interface Task {
  id: string;
  title: string;
  status: string;
  estimatedMinutes: number;
  color: string;
  actualMinutesSpent?: number;
}

interface WeeklyTimeBlock {
  taskId?: string;
  title: string;
  startTime: string;
  endTime: string;
}

interface WeeklySchedule {
  schedule: WeeklyTimeBlock[];
}

interface DailyMetric {
  day: string;
  date: string;
  focus: number;
  tasks: number;
}

interface Analytics {
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  totalFocusMinutes: number;
  completionRate: number;
  weeklyMetrics?: DailyMetric[];
}

interface CoachTip {
  analysis: string;
  tips: string[];
}

interface ProductivityAssessment {
  score: number;
  completion_rate: number;
  estimation_accuracy_percent: number;
  deep_work_ratio: number;
  burnout_risk: string;
  grade: string;
  strengths: string[];
  growth_areas: string[];
  actionable_advice: string[];
}

const BRAND = "#A0785A";

// ── Stat Card ──────────────────────────────────────────────────────────────
function StatCard({
  icon: Icon, label, value, sub, color = BRAND,
}: {
  icon: React.ElementType; label: string; value: string | number; sub: string; color?: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-[#E8E2D9] p-5 flex items-start gap-4">
      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: color + "18" }}>
        <Icon size={18} style={{ color }} />
      </div>
      <div>
        <p className="text-xs text-[#6B7280] mb-0.5">{label}</p>
        <p className="font-heading text-2xl font-700 text-[#1A1A1A]">{value}</p>
        <p className="text-xs text-[#6B7280] mt-0.5">{sub}</p>
      </div>
    </div>
  );
}

function WeeklyHourGrid({ tasks, schedules }: { tasks: Task[]; schedules: Record<string, WeeklySchedule> }) {
  const today = new Date();
  const weekStart = new Date(today);
  weekStart.setHours(0, 0, 0, 0);
  weekStart.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + index);
    return date;
  });
  const hours = Array.from({ length: 24 }, (_, hour) => hour);
  const taskById = new Map(tasks.map((task) => [task.id, task]));

  const getCell = (date: Date, hour: number) => {
    const dayKey = date.toISOString().slice(0, 10);
    const block = schedules[dayKey]?.schedule.find((candidate) => {
      const startHour = Number(candidate.startTime?.split(":")[0]);
      const endHour = Number(candidate.endTime?.split(":")[0]);
      return hour >= startHour && hour < endHour;
    });
    if (!block) return { tone: "bg-[#F1F1F1]", label: "No task" };

    const task = block.taskId ? taskById.get(block.taskId) : undefined;
    const completed = task?.status === "completed" ||
      ((task?.actualMinutesSpent ?? 0) >= (task?.estimatedMinutes ?? 0) * 0.8);
    return completed
      ? { tone: "bg-[#BFE8C8]", label: `${block.title} completed` }
      : { tone: "bg-[#F4B8B8]", label: `${block.title} incomplete` };
  };

  return (
    <section className="bg-white rounded-2xl border border-[#E8E2D9] p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <h2 className="font-heading font-600 text-[#1A1A1A]">Weekly Hour Map</h2>
          <p className="text-xs text-[#6B7280] mt-1">Every hour, from Monday through Sunday</p>
        </div>
        <div className="flex items-center gap-4 text-xs text-[#6B7280]">
          <span className="flex items-center gap-1.5"><i className="w-3 h-3 rounded-sm bg-[#BFE8C8]" /> Complete</span>
          <span className="flex items-center gap-1.5"><i className="w-3 h-3 rounded-sm bg-[#F4B8B8]" /> Incomplete</span>
          <span className="flex items-center gap-1.5"><i className="w-3 h-3 rounded-sm bg-[#F1F1F1]" /> Empty</span>
        </div>
      </div>
      <div className="overflow-x-auto">
        <div className="min-w-[900px]">
          <div className="grid grid-cols-[72px_repeat(24,minmax(32px,1fr))] gap-1 mb-1">
            <div />
            {hours.map((hour) => <div key={hour} className="text-center text-[10px] text-[#6B7280]">{String(hour).padStart(2, "0")}</div>)}
          </div>
          {days.map((date) => (
            <div key={date.toISOString()} className="grid grid-cols-[72px_repeat(24,minmax(32px,1fr))] gap-1 mb-1">
              <div className="flex items-center text-xs font-semibold text-[#6B7280]">{date.toLocaleDateString("en-US", { weekday: "short" })}</div>
              {hours.map((hour) => {
                const cell = getCell(date, hour);
                return <div key={hour} title={cell.label} className={`h-7 rounded-sm ${cell.tone}`} />;
              })}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function GlobalRecords({ analytics }: { analytics: Analytics | null }) {
  const records = [
    { label: "Tasks created", value: analytics?.totalTasks ?? 0 },
    { label: "Tasks completed", value: analytics?.completedTasks ?? 0 },
    { label: "Focus minutes", value: analytics?.totalFocusMinutes ?? 0 },
    { label: "Completion rate", value: `${analytics?.completionRate?.toFixed(0) ?? 0}%` },
  ];

  return (
    <section className="bg-white rounded-2xl border border-[#E8E2D9] p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="font-heading font-600 text-[#1A1A1A]">Global Records</h2>
          <p className="text-xs text-[#6B7280] mt-1">All saved activity across every week</p>
        </div>
        <span className="text-xs font-semibold text-[#16A34A] bg-green-50 border border-green-200 px-2.5 py-1 rounded-full">Saved</span>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 divide-x divide-[#E8E2D9]">
        {records.map((record) => (
          <div key={record.label} className="px-4 first:pl-0 last:pr-0">
            <p className="text-xs text-[#6B7280] mb-1">{record.label}</p>
            <p className="font-heading text-2xl font-700 text-[#1A1A1A]">{record.value}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function computeProductivityAssessment(
  tasks: Task[],
  totalFocusMinutes: number,
  activeSessionId: string | null = null,
  elapsedSec: number = 0
): ProductivityAssessment {
  if (!tasks || tasks.length === 0) {
    return {
      score: 0,
      completion_rate: 0,
      estimation_accuracy_percent: 0,
      deep_work_ratio: 0,
      burnout_risk: "low",
      grade: "N/A",
      strengths: ["No tasks logged yet"],
      growth_areas: ["Add tasks to your schedule to activate AI scoring"],
      actionable_advice: ["Add 2-3 core tasks and start a timer to begin building your index."],
    };
  }

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === "completed");
  const completedCount = completedTasks.length;
  const completionRate = (completedCount / Math.max(1, totalTasks)) * 100;

  // 1. Completion Rate points (35)
  const completionPoints = (completionRate / 100) * 35;

  // 2. Estimation Accuracy: evaluate completed tasks and in-progress tasks with logged time
  const evaluatedAccuracies: number[] = [];
  for (const t of tasks) {
    const est = Math.max(1, t.estimatedMinutes || 30);
    const isRunning = activeSessionId === t.id;
    const currentActualMins = (t.actualMinutesSpent || 0) + (isRunning ? Math.floor(elapsedSec / 60) : 0);

    if (t.status === "completed") {
      const act = currentActualMins > 0 ? currentActualMins : est;
      const acc = Math.max(0, 100 - (Math.abs(est - act) / est) * 100);
      evaluatedAccuracies.push(acc);
    } else if (currentActualMins > 0) {
      const acc = Math.max(0, 100 - (Math.abs(est - currentActualMins) / est) * 100);
      evaluatedAccuracies.push(acc);
    }
  }

  const accuracyPercent = evaluatedAccuracies.length > 0
    ? evaluatedAccuracies.reduce((a, b) => a + b, 0) / evaluatedAccuracies.length
    : (completedCount > 0 ? 100 : 0);

  const estimationPoints = (accuracyPercent / 100) * 30;

  // 3. Deep Work Ratio: ratio of high focus / deep tasks
  const deepTasks = tasks.filter(
    (t) =>
      ((t as Task & { priority?: string }).priority || "medium").toLowerCase() === "high" ||
      ((t as Task & { energyRequired?: string }).energyRequired || "medium").toLowerCase() === "deep" ||
      (t.estimatedMinutes || 0) >= 60
  );
  const deepCompleted = deepTasks.filter((t) => t.status === "completed");
  const deepMinutes = deepCompleted.reduce((acc, t) => acc + (t.actualMinutesSpent || t.estimatedMinutes || 0), 0);
  const totalCompletedMinutes = completedTasks.reduce((acc, t) => acc + (t.actualMinutesSpent || t.estimatedMinutes || 0), 0);

  let deepWorkRatio = 0;
  if (totalCompletedMinutes > 0) {
    deepWorkRatio = Math.min(100, (deepMinutes / totalCompletedMinutes) * 100);
  } else if (totalTasks > 0) {
    deepWorkRatio = Math.min(100, (deepTasks.length / totalTasks) * 100);
  }

  const deepWorkPoints = (deepWorkRatio / 100) * 20;

  // 4. Focus volume & consistency (15)
  const currentActiveMins = activeSessionId ? Math.floor(elapsedSec / 60) : 0;
  const effectiveFocus = Math.max(
    totalFocusMinutes + currentActiveMins,
    tasks.reduce((acc, t) => acc + (t.actualMinutesSpent || 0), 0) + currentActiveMins
  );
  const focusPoints = Math.min(15, (effectiveFocus / 120) * 15);

  const finalScore = Math.max(0, Math.min(100, Math.round(completionPoints + estimationPoints + deepWorkPoints + focusPoints)));

  let burnoutRisk = "low";
  if (effectiveFocus > 480 || (totalTasks > 12 && completionRate < 40)) {
    burnoutRisk = "high";
  } else if (effectiveFocus > 360 || totalTasks > 9) {
    burnoutRisk = "elevated";
  } else if (effectiveFocus > 240) {
    burnoutRisk = "moderate";
  }

  let grade = "Needs Attention";
  if (finalScore >= 90) grade = "A+";
  else if (finalScore >= 80) grade = "A";
  else if (finalScore >= 70) grade = "B";
  else if (finalScore >= 60) grade = "C";
  else if (finalScore >= 50) grade = "D";

  const strengths: string[] = [];
  const growthAreas: string[] = [];
  const advice: string[] = [];

  if (completionRate >= 70) strengths.push(`Strong completion rate (${completionRate.toFixed(0)}%)`);
  else growthAreas.push(`Completion rate is ${completionRate.toFixed(0)}%`);

  if (accuracyPercent >= 75) strengths.push(`High estimation accuracy (${accuracyPercent.toFixed(0)}%)`);
  else growthAreas.push(`Variance in task estimations (${accuracyPercent.toFixed(0)}%)`);

  if (burnoutRisk === "high" || burnoutRisk === "elevated") {
    advice.push("High workload detected — schedule 15m restorative breaks between deep sessions.");
  } else if (completionRate < 50) {
    advice.push("Focus on finishing 1 high-priority task before starting new ones.");
  } else if (accuracyPercent < 75) {
    advice.push("Calibrate task durations with a 20% buffer to match actual execution pace.");
  } else {
    advice.push("Excellent workflow rhythm. Maintain balanced morning focus blocks.");
  }

  return {
    score: finalScore,
    completion_rate: Math.round(completionRate),
    estimation_accuracy_percent: Math.round(accuracyPercent),
    deep_work_ratio: Math.round(deepWorkRatio),
    burnout_risk: burnoutRisk,
    grade: grade,
    strengths,
    growth_areas: growthAreas,
    actionable_advice: advice,
  };
}

// ── Main Dashboard ─────────────────────────────────────────────────────────
export default function DashboardPage() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [weeklySchedules, setWeeklySchedules] = useState<Record<string, WeeklySchedule>>({});
  const [coach, setCoach] = useState<CoachTip | null>(null);
  const [assessment, setAssessment] = useState<ProductivityAssessment | null>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("timespace_assessment");
        if (saved) return JSON.parse(saved);
      } catch { /* ignore */ }
    }
    return null;
  });
  const [activeSession, setActiveSession] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);

  const email = getUserEmail();

  // Fetch analytics + tasks on mount
  useEffect(() => {
    fetchWithAuth(`${API_URL}/analytics/dashboard`)
      .then((r) => r.ok ? r.json() : null)
      .then((d) => d && setAnalytics(d))
      .catch(() => { });

    fetchWithAuth(`${API_URL}/tasks`)
      .then((r) => r.ok ? r.json() : [])
      .then((d) => Array.isArray(d) && setTasks(d))
      .catch(() => { });

    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
    const weekDates = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + index);
      return date.toISOString().slice(0, 10);
    });
    Promise.all(weekDates.map(async (date) => {
      const response = await fetchWithAuth(`${API_URL}/schedule/date?email=${encodeURIComponent(email)}&date=${date}`);
      return [date, response.ok ? await response.json() : { schedule: [] }] as const;
    })).then((entries) => setWeeklySchedules(Object.fromEntries(entries))).catch(() => { });

    // Fetch any currently running active session
    fetchWithAuth(`${API_URL}/sessions/active`)
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
        }
      })
      .catch(() => { });
  }, [email]);

  // Real-time Event-driven Productivity Recalculation
  useEffect(() => {
    if (tasks.length === 0 && !analytics) return;
    const computed = computeProductivityAssessment(
      tasks,
      analytics?.totalFocusMinutes || 0,
      activeSession,
      elapsed
    );
    setAssessment(computed);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("timespace_assessment", JSON.stringify(computed));
      } catch { /* ignore */ }
    }
  }, [tasks, analytics, activeSession, elapsed]);

  // Fetch AI coaching & Server Productivity Score after analytics/tasks loaded
  useEffect(() => {
    if (!analytics) return;
    fetchWithAuth(`${API_URL}/ai/coach/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_email: email || "user@example.com",
        total_tasks: analytics.totalTasks,
        completed_tasks: analytics.completedTasks,
        total_focus_minutes: analytics.totalFocusMinutes,
      }),
    })
      .then((r) => r.ok ? r.json() : null)
      .then((d) => d && setCoach(d))
      .catch(() => { });

    // Compute Advanced Productivity Score on Server
    const records = tasks.map(t => ({
      title: t.title,
      estimated_minutes: t.estimatedMinutes || 30,
      actual_minutes: t.status === "completed" ? (t as Task & { actualMinutesSpent?: number }).actualMinutesSpent : null,
      status: t.status,
      priority: (t as Task & { priority?: string }).priority || "medium",
      energy_required: (t as Task & { energyRequired?: string }).energyRequired || "medium"
    }));

    fetchWithAuth(`${API_URL}/ai/analytics/productivity-score`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_email: email || "user@example.com",
        records: records,
        total_focus_minutes: analytics.totalFocusMinutes || 0
      }),
    })
      .then((r) => r.ok ? r.json() : null)
      .then((d) => {
        if (d) {
          setAssessment((prev) => ({
            ...d,
            ...(prev ? {
              score: prev.score,
              estimation_accuracy_percent: prev.estimation_accuracy_percent,
              deep_work_ratio: prev.deep_work_ratio,
              grade: prev.grade,
            } : {})
          }));
        }
      })
      .catch(() => { });
  }, [analytics, tasks, email]);

  // Live timer tick
  useEffect(() => {
    if (!activeSession) return;
    const t = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [activeSession]);

  const fetchAllData = () => {
    fetchWithAuth(`${API_URL}/analytics/dashboard`)
      .then((r) => r.ok ? r.json() : null)
      .then((d) => d && setAnalytics(d))
      .catch(() => { });

    fetchWithAuth(`${API_URL}/tasks`)
      .then((r) => r.ok ? r.json() : [])
      .then((d) => Array.isArray(d) && setTasks(d))
      .catch(() => { });
  };

  const startSession = async (task: Task) => {
    try {
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
          prev.map((t) => (t.id === task.id ? { ...t, status: "in_progress" } : t))
        );
      }
    } catch { /* offline */ }
  };

  const stopSession = async () => {
    if (!sessionId) return;
    try {
      await fetchWithAuth(`${API_URL}/sessions/${sessionId}/stop`, { method: "PUT" });
      fetchAllData();
    } catch { /* offline */ }
    setActiveSession(null);
    setSessionId(null);
    setElapsed(0);
  };

  const getTaskRemainingDisplay = (task: Task) => {
    const isActive = activeSession === task.id;
    const totalAllocatedSec = (task.estimatedMinutes || 30) * 60;
    const pastSpentSec = (task.actualMinutesSpent || 0) * 60;

    if (task.status === "completed") {
      const spent = task.actualMinutesSpent || task.estimatedMinutes || 0;
      return {
        label: `${spent}m · completed`,
        statusText: "completed",
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
          statusText: "in_progress",
          isLive: true,
          isOvertime: false,
        };
      } else {
        const overSec = Math.abs(remainingSec);
        const overM = Math.floor(overSec / 60);
        const overS = overSec % 60;
        return {
          label: `+${overM}m ${String(overS).padStart(2, "0")}s overtime`,
          statusText: "in_progress",
          isLive: true,
          isOvertime: true,
        };
      }
    }

    if (task.status === "in_progress" && (task.actualMinutesSpent || 0) > 0) {
      const remM = Math.max(0, (task.estimatedMinutes || 30) - (task.actualMinutesSpent || 0));
      return {
        label: `${remM}m left of ${task.estimatedMinutes}m · in_progress`,
        statusText: "in_progress",
        isLive: false,
        isOvertime: false,
      };
    }

    return {
      label: `${task.estimatedMinutes}m · ${task.status}`,
      statusText: task.status,
      isLive: false,
      isOvertime: false,
    };
  };

  const fmtTime = (s: number) =>
    `${String(Math.floor(s / 3600)).padStart(2, "0")}:${String(Math.floor((s % 3600) / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  // Pie chart data from real tasks
  const pieData = tasks.length
    ? [
      { name: "Completed", value: analytics?.completedTasks || 0, color: "#16A34A" },
      { name: "Pending", value: analytics?.pendingTasks || 0, color: BRAND },
    ]
    : [{ name: "No data", value: 1, color: "#E8E2D9" }];

  const liveChartData = (analytics?.weeklyMetrics && analytics.weeklyMetrics.length > 0)
    ? analytics.weeklyMetrics
    : [
      { day: "Mon", focus: 0, tasks: 0 },
      { day: "Tue", focus: 0, tasks: 0 },
      { day: "Wed", focus: 0, tasks: 0 },
      { day: "Thu", focus: 0, tasks: 0 },
      { day: "Fri", focus: 0, tasks: 0 },
      { day: "Sat", focus: 0, tasks: 0 },
      { day: "Sun", focus: 0, tasks: 0 },
    ];

  return (
    <div className="flex min-h-screen bg-[#FAFAF8]">
      <Sidebar active="Dashboard" />

      <div className="flex-1 flex flex-col">
        {/* Topbar */}
        <header className="bg-white border-b border-[#E8E2D9] px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="font-heading text-xl font-700 text-[#1A1A1A]">Dashboard</h1>
            <p className="text-xs text-[#6B7280]">{new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
          </div>
          <Link
            href="/tasks"
            className="flex items-center gap-2 bg-[#A0785A] text-white text-sm px-4 py-2 rounded-xl font-semibold hover:bg-[#7D5C42] transition-all"
          >
            <Plus size={14} /> New Task
          </Link>
        </header>

        <main className="flex-1 p-6 space-y-6 max-w-7xl mx-auto w-full">
          {/* ── Stat Cards ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={Target} label="Total Tasks" value={analytics?.totalTasks || 0} sub="all time" />
            <StatCard icon={CheckCircle2} label="Completed" value={analytics?.completedTasks || 0} sub="tasks done" color="#16A34A" />
            <StatCard icon={Clock} label="Focus Time" value={`${analytics?.totalFocusMinutes || 0} m`} sub="total tracked" color="#D97706" />
            <StatCard icon={Zap} label="Completion Rate" value={`${analytics?.completionRate?.toFixed(0) || 0}% `} sub="of tasks done" color="#A0785A" />
          </div>

          <WeeklyHourGrid tasks={tasks} schedules={weeklySchedules} />
          <GlobalRecords analytics={analytics} />

          {/* ── Charts Row (Live Real Database Metrics) ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Weekly Bar Chart */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-[#E8E2D9] p-6">
              <h2 className="font-heading font-600 text-[#1A1A1A] mb-4">Weekly Focus Time (min)</h2>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={liveChartData} barSize={28}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F0EBE3" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 12, fill: "#6B7280" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: "#6B7280" }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #E8E2D9", fontSize: 12 }} />
                  <Bar dataKey="focus" fill={BRAND} radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Pie Chart */}
            <div className="bg-white rounded-2xl border border-[#E8E2D9] p-6">
              <h2 className="font-heading font-600 text-[#1A1A1A] mb-4">Task Distribution</h2>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3} dataKey="value">
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #E8E2D9", fontSize: 12 }} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* ── Line Chart + AI Coach Row ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Line Chart */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-[#E8E2D9] p-6">
              <h2 className="font-heading font-600 text-[#1A1A1A] mb-4">Tasks Completed per Day</h2>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={liveChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F0EBE3" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 12, fill: "#6B7280" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: "#6B7280" }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #E8E2D9", fontSize: 12 }} />
                  <Line type="monotone" dataKey="tasks" stroke={BRAND} strokeWidth={2.5} dot={{ fill: BRAND, r: 4 }} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* AI Coach Panel */}
            <div className="bg-white rounded-2xl border border-[#E8E2D9] p-6 flex flex-col">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-[#F5EFE8] flex items-center justify-center">
                  <Brain size={16} className="text-[#A0785A]" />
                </div>
                <h2 className="font-heading font-600 text-[#1A1A1A]">AI Coach</h2>
              </div>
              {coach ? (
                <div className="flex flex-col gap-3 flex-1">
                  <p className="text-xs text-[#6B7280] italic leading-relaxed">{coach.analysis}</p>
                  <div className="flex flex-col gap-2 mt-1">
                    {coach.tips.map((tip, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs text-[#1A1A1A]">
                        <ChevronRight size={12} className="text-[#A0785A] mt-0.5 shrink-0" />
                        <span>{tip}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-[#6B7280] italic">
                  Complete some tasks to unlock personalized AI coaching recommendations.
                </p>
              )}
            </div>
          </div>

          {/* ── AI Productivity Index Card ── */}
          {tasks.length > 0 && assessment ? (
            <div className="bg-white rounded-2xl p-6 border border-[#E8E2D9] shadow-sm">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#E8E2D9]">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#F5EFE8] flex items-center justify-center">
                    <Award size={20} className="text-[#A0785A]" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="font-heading font-700 text-base text-[#1A1A1A]">AI Productivity Index</h2>
                      <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-[#F5EFE8] text-[#A0785A] border border-[#A0785A]/20">
                        Grade {assessment.grade}
                      </span>
                    </div>
                    <p className="text-xs text-[#6B7280]">Cognitive execution & estimation accuracy</p>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className="text-[11px] text-[#6B7280]">Overall Score</p>
                    <p className="font-heading text-2xl font-800 text-[#A0785A]">{assessment.score}<span className="text-xs font-normal text-[#6B7280]">/100</span></p>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] text-[#6B7280]">Burnout Risk</p>
                    <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full capitalize border ${assessment.burnout_risk === "low" ? "bg-green-50 text-[#16A34A] border-green-200" :
                      assessment.burnout_risk === "moderate" ? "bg-amber-50 text-[#D97706] border-amber-200" :
                        "bg-red-50 text-[#DC2626] border-red-200"
                      }`}>
                      {assessment.burnout_risk}
                    </span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 text-xs">
                <div className="bg-[#FAFAF8] rounded-xl p-3 border border-[#E8E2D9]">
                  <p className="text-[#6B7280] mb-1">Time Estimation Accuracy</p>
                  <p className="font-semibold text-[#1A1A1A] text-sm">{assessment.estimation_accuracy_percent}%</p>
                  <p className="text-[10px] text-[#6B7280] mt-0.5">Calibrated to planned task duration</p>
                </div>
                <div className="bg-[#FAFAF8] rounded-xl p-3 border border-[#E8E2D9]">
                  <p className="text-[#6B7280] mb-1">Deep Work Ratio</p>
                  <p className="font-semibold text-[#1A1A1A] text-sm">{assessment.deep_work_ratio}%</p>
                  <p className="text-[10px] text-[#6B7280] mt-0.5">High-cognitive task execution</p>
                </div>
                <div className="bg-[#FAFAF8] rounded-xl p-3 border border-[#E8E2D9]">
                  <p className="text-[#6B7280] mb-1">Strategic Advice</p>
                  <p className="text-[#1A1A1A] italic leading-snug">{assessment.actionable_advice[0] || "Maintain balanced session rhythm."}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl p-6 border border-[#E8E2D9] shadow-sm flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#F5EFE8] flex items-center justify-center">
                  <Award size={20} className="text-[#A0785A]" />
                </div>
                <div>
                  <h2 className="font-heading font-700 text-base text-[#1A1A1A]">AI Productivity Index</h2>
                  <p className="text-xs text-[#6B7280]">No data yet — Add tasks and start focus timers to unlock your live score & grade.</p>
                </div>
              </div>
              <Link
                href="/tasks"
                className="text-xs text-[#A0785A] border border-[#A0785A]/30 px-3 py-1.5 rounded-lg hover:bg-[#F5EFE8] font-semibold transition-all shrink-0"
              >
                Add Tasks →
              </Link>
            </div>
          )}

          {/* ── Active Timer + Today's Tasks ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Timer */}
            <div className="bg-white rounded-2xl border border-[#E8E2D9] p-6 flex flex-col items-center justify-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-[#F5EFE8] flex items-center justify-center">
                <Clock size={22} className="text-[#A0785A]" />
              </div>
              <div>
                <p className="text-center text-xs text-[#6B7280] mb-1">
                  {activeSession ? "Session in progress" : "No active session"}
                </p>
                <p className="font-heading text-4xl font-700 text-[#1A1A1A] text-center tabular-nums">
                  {fmtTime(elapsed)}
                </p>
              </div>
              {activeSession && (
                <button
                  onClick={stopSession}
                  className="flex items-center gap-2 bg-[#DC2626] text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-red-700 transition-all"
                >
                  <Square size={13} fill="white" /> Stop
                </button>
              )}
            </div>

            {/* Today's Tasks */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-[#E8E2D9] p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-heading font-600 text-[#1A1A1A]">Your Tasks</h2>
                <Link href="/tasks" className="text-xs text-[#A0785A] hover:underline font-medium">
                  View all →
                </Link>
              </div>
              {tasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Target size={32} className="text-[#E8E2D9] mb-3" />
                  <p className="text-sm text-[#6B7280]">No tasks yet.</p>
                  <Link href="/tasks" className="text-xs text-[#A0785A] mt-1 hover:underline">Add your first task →</Link>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {tasks.slice(0, 5).map((task) => {
                    const timeInfo = getTaskRemainingDisplay(task);
                    const isActive = activeSession === task.id;
                    return (
                      <div
                        key={task.id}
                        className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                          isActive
                            ? "border-[#A0785A] bg-[#F5EFE8]/40 shadow-sm"
                            : "border-[#E8E2D9] hover:border-[#A0785A]/30 hover:bg-[#FAFAF8]"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-3 h-3 rounded-full shrink-0 ${isActive ? "animate-pulse ring-2 ring-[#A0785A]/30" : ""}`}
                            style={{ backgroundColor: task.color || BRAND }}
                          />
                          <div>
                            <p className="text-sm font-medium text-[#1A1A1A]">{task.title}</p>
                            <p
                              className={`text-xs flex items-center gap-1 font-medium ${
                                timeInfo.isOvertime
                                  ? "text-[#DC2626]"
                                  : timeInfo.isLive
                                  ? "text-[#A0785A]"
                                  : "text-[#6B7280]"
                              }`}
                            >
                              {timeInfo.isLive && (
                                <Clock size={11} className="text-[#A0785A] animate-pulse" />
                              )}
                              {timeInfo.label}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {isActive ? (
                            <button
                              onClick={stopSession}
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
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
