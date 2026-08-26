"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend,
} from "recharts";
import {
  Clock, CheckCircle2, Target, Zap, Plus, Play, Square,
  BarChart3, Brain, LogOut, ChevronRight, Award, Activity,
  Sparkles, TrendingUp, AlertCircle
} from "lucide-react";
import { API_URL, AI_API_URL, fetchWithAuth, getUserEmail } from "@/lib/api";

// ── Types ──────────────────────────────────────────────────────────────────
interface Task {
  id: string;
  title: string;
  status: string;
  estimatedMinutes: number;
  color: string;
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

// ── Sidebar ────────────────────────────────────────────────────────────────
function Sidebar({ active }: { active: string }) {
  const links = [
    { href: "/dashboard", label: "Dashboard", icon: BarChart3 },
    { href: "/tasks",     label: "Tasks",     icon: CheckCircle2 },
    { href: "/schedule",  label: "Schedule",  icon: Clock },
  ];
  return (
    <aside className="hidden md:flex flex-col w-56 min-h-screen bg-white border-r border-[#E8E2D9] py-6 px-4 gap-1">
      <div className="flex items-center gap-2 px-2 mb-8">
        <div className="w-8 h-8 rounded-lg bg-[#A0785A] flex items-center justify-center">
          <Clock size={15} className="text-white" />
        </div>
        <span className="font-heading font-700 text-[#1A1A1A]">TimeAI</span>
      </div>
      {links.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
            active === l.label
              ? "bg-[#F5EFE8] text-[#A0785A]"
              : "text-[#6B7280] hover:bg-[#FAFAF8] hover:text-[#1A1A1A]"
          }`}
        >
          <l.icon size={16} />
          {l.label}
        </Link>
      ))}
      <div className="mt-auto">
        <button
          onClick={() => { localStorage.clear(); window.location.href = "/auth/login"; }}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-[#6B7280] hover:text-[#DC2626] hover:bg-red-50 transition-all w-full"
        >
          <LogOut size={16} /> Sign out
        </button>
      </div>
    </aside>
  );
}

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

// ── Main Dashboard ─────────────────────────────────────────────────────────
export default function DashboardPage() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [coach, setCoach] = useState<CoachTip | null>(null);
  const [assessment, setAssessment] = useState<ProductivityAssessment | null>(null);
  const [activeSession, setActiveSession] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);

  const email = getUserEmail();

  // Fetch analytics + tasks on mount
  useEffect(() => {
    fetchWithAuth(`${API_URL}/analytics/dashboard`)
      .then((r) => r.ok ? r.json() : null)
      .then((d) => d && setAnalytics(d))
      .catch(() => {});

    fetchWithAuth(`${API_URL}/tasks`)
      .then((r) => r.ok ? r.json() : [])
      .then((d) => Array.isArray(d) && setTasks(d))
      .catch(() => {});
  }, []);

  // Fetch AI coaching & Productivity Score after analytics/tasks loaded
  useEffect(() => {
    if (!analytics) return;
    fetch(`${AI_API_URL}/coach/analyze`, {
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
      .catch(() => {});

    // Compute Advanced Productivity Score
    const records = tasks.map(t => ({
      title: t.title,
      estimated_minutes: t.estimatedMinutes || 30,
      actual_minutes: t.status === "completed" ? (t.estimatedMinutes || 30) : null,
      status: t.status,
      priority: "medium",
      energy_required: "medium"
    }));

    fetch(`${AI_API_URL}/analytics/productivity-score`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_email: email || "user@example.com",
        records: records,
        total_focus_minutes: analytics.totalFocusMinutes || 0
      }),
    })
      .then((r) => r.ok ? r.json() : null)
      .then((d) => d && setAssessment(d))
      .catch(() => {});
  }, [analytics, tasks, email]);

  // Live timer tick
  useEffect(() => {
    if (!activeSession) return;
    const t = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [activeSession]);

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
      }
    } catch { /* offline */ }
  };

  const stopSession = async () => {
    if (!sessionId) return;
    try {
      await fetchWithAuth(`${API_URL}/sessions/${sessionId}/stop`, { method: "PUT" });
    } catch { /* offline */ }
    setActiveSession(null);
    setSessionId(null);
  };

  const fmtTime = (s: number) =>
    `${String(Math.floor(s / 3600)).padStart(2, "0")}:${String(Math.floor((s % 3600) / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

  // Pie chart data from real tasks
  const pieData = tasks.length
    ? [
        { name: "Completed", value: analytics?.completedTasks || 0, color: "#16A34A" },
        { name: "Pending",   value: analytics?.pendingTasks   || 0, color: BRAND },
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
            <StatCard icon={Target}       label="Total Tasks"     value={analytics?.totalTasks || 0}         sub="all time" />
            <StatCard icon={CheckCircle2} label="Completed"       value={analytics?.completedTasks || 0}     sub="tasks done" color="#16A34A" />
            <StatCard icon={Clock}        label="Focus Time"      value={`${analytics?.totalFocusMinutes || 0}m`} sub="total tracked" color="#D97706" />
            <StatCard icon={Zap}          label="Completion Rate" value={`${analytics?.completionRate?.toFixed(0) || 0}%`} sub="of tasks done" color="#A0785A" />
          </div>

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
          {tasks.length > 0 && assessment && (
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
                    <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full capitalize ${
                      assessment.burnout_risk === "low" ? "bg-green-50 text-[#16A34A] border border-green-200" :
                      assessment.burnout_risk === "moderate" ? "bg-amber-50 text-[#D97706] border border-amber-200" :
                      "bg-red-50 text-[#DC2626] border border-red-200"
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
                  {tasks.slice(0, 5).map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center justify-between p-3 rounded-xl border border-[#E8E2D9] hover:border-[#A0785A]/30 hover:bg-[#FAFAF8] transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: task.color || BRAND }} />
                        <div>
                          <p className="text-sm font-medium text-[#1A1A1A]">{task.title}</p>
                          <p className="text-xs text-[#6B7280]">{task.estimatedMinutes}m · {task.status}</p>
                        </div>
                      </div>
                      {task.status !== "completed" && activeSession !== task.id && (
                        <button
                          onClick={() => startSession(task)}
                          className="flex items-center gap-1.5 text-xs text-[#A0785A] border border-[#A0785A]/30 px-3 py-1.5 rounded-lg hover:bg-[#F5EFE8] transition-all font-medium"
                        >
                          <Play size={11} fill="#A0785A" /> Start
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
