"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import {
  Calendar,
  Clock,
  Zap,
  LayoutDashboard,
  CheckCircle2,
  LogOut,
  AlertTriangle,
  RefreshCw,
  Check,
  Award,
  Sparkles,
} from "lucide-react";
import { API_URL, fetchWithAuth, getUserEmail } from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

interface TimeBlock {
  taskId?: string;
  title: string;
  startTime: string;   // "HH:mm"
  endTime: string;     // "HH:mm"
  color: string;
  priority: string;
  energyRequired: string;
  constraintReason: string;
}

interface ScheduleMetrics {
  totalPlannedMinutes: number;
  utilizationPercent: number;
  overloadWarning: boolean;
}

interface ScheduleData {
  schedule: TimeBlock[];
  recommendation: string;
  metrics: ScheduleMetrics;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const toMinutes = (time: string): number => {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
};

const formatHour = (hour: number): string => {
  const ampm = hour >= 12 ? "PM" : "AM";
  const h = hour % 12 === 0 ? 12 : hour % 12;
  return `${h} ${ampm}`;
};

const PRIORITY_BADGE: Record<string, string> = {
  critical: "bg-red-50 text-[#DC2626] border-red-200",
  high:     "bg-orange-50 text-[#EA580C] border-orange-200",
  medium:   "bg-amber-50 text-[#D97706] border-amber-200",
  low:      "bg-green-50 text-[#16A34A] border-green-200",
};

const ENERGY_ICON: Record<string, string> = {
  high:   "⚡⚡⚡",
  medium: "⚡⚡",
  low:    "⚡",
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function SchedulePage() {
  const [schedule, setSchedule] = useState<ScheduleData | null>(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [tooltip, setTooltip]   = useState<{ block: TimeBlock; x: number; y: number } | null>(null);
  const [generating, setGenerating] = useState(false);
  const [completedTaskIds, setCompletedTaskIds] = useState<Set<string>>(new Set());
  const [completingTaskId, setCompletingTaskId] = useState<string | null>(null);

  const START_HOUR = 6;
  const END_HOUR   = 22;
  const TOTAL_MINS = (END_HOUR - START_HOUR) * 60;
  const PIXELS_PER_MIN = 2; // 2px per minute

  const today = new Date().toISOString().slice(0, 10);

  // ─── Data Fetching ──────────────────────────────────────────────────────────

  const loadSchedule = async () => {
    setLoading(true);
    setError("");
    try {
      const email = getUserEmail();
      const res = await fetchWithAuth(`${API_URL}/schedule/date?email=${encodeURIComponent(email)}&date=${today}`);
      if (!res.ok) throw new Error("no_schedule");
      const data: ScheduleData = await res.json();
      setSchedule(data);
    } catch {
      setSchedule(null);
    } finally {
      setLoading(false);
    }
  };

  const generateSchedule = async () => {
    setGenerating(true);
    setError("");
    try {
      const email = getUserEmail();
      const res = await fetchWithAuth(`${API_URL}/schedule/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userEmail:  email,
          date:       today,
          startHour:  START_HOUR,
          endHour:    END_HOUR,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data: ScheduleData = await res.json();
      setSchedule(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Schedule generation failed");
    } finally {
      setGenerating(false);
    }
  };

  const handleCompleteTask = async (taskId: string) => {
    setCompletingTaskId(taskId);
    try {
      const email = getUserEmail();
      const res = await fetchWithAuth(`${API_URL}/tasks/${taskId}/status?email=${encodeURIComponent(email)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "completed" }),
      });
      if (res.ok) {
        setCompletedTaskIds(prev => new Set(prev).add(taskId));
        setTooltip(null);
      }
    } catch (e) {
      console.error("Failed to complete task:", e);
    } finally {
      setCompletingTaskId(null);
    }
  };

  useEffect(() => {
    loadSchedule();
  }, []);

  // ─── Block position helpers ─────────────────────────────────────────────────

  const blockTop = (start: string) =>
    (toMinutes(start) - START_HOUR * 60) * PIXELS_PER_MIN;

  const blockHeight = (start: string, end: string) =>
    Math.max((toMinutes(end) - toMinutes(start)) * PIXELS_PER_MIN, 28);

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#FAFAF8] text-[#1A1A1A] flex">
      {/* Sidebar */}
      <aside className="hidden md:flex flex-col w-56 min-h-screen bg-white border-r border-[#E8E2D9] py-6 px-4 gap-1">
        <div className="flex items-center gap-2 px-2 mb-8">
          <div className="w-8 h-8 rounded-lg bg-[#A0785A] flex items-center justify-center">
            <Clock size={15} className="text-white" />
          </div>
          <span className="font-heading font-700 text-[#1A1A1A]">TimeAI</span>
        </div>

        {[
          { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
          { href: "/tasks",     icon: CheckCircle2,    label: "Tasks" },
          { href: "/schedule",  icon: Calendar,        label: "Schedule", active: true },
        ].map(({ href, icon: Icon, label, active }) => (
          <Link
            key={href}
            href={href}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
              active
                ? "bg-[#F5EFE8] text-[#A0785A]"
                : "text-[#6B7280] hover:bg-[#FAFAF8] hover:text-[#1A1A1A]"
            }`}
          >
            <Icon size={16} />
            {label}
          </Link>
        ))}

        <div className="mt-auto">
          <button
            onClick={() => { localStorage.clear(); window.location.href = "/auth/login"; }}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-[#6B7280] hover:text-[#DC2626] hover:bg-red-50 transition-all w-full"
          >
            <LogOut size={16} />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto p-6 max-w-6xl mx-auto w-full space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between bg-white rounded-2xl border border-[#E8E2D9] p-6 shadow-sm">
          <div>
            <h1 className="font-heading text-xl font-700 text-[#1A1A1A]">Daily Schedule Timeline</h1>
            <p className="text-xs text-[#6B7280] mt-0.5">
              {new Date(today + "T12:00:00").toLocaleDateString("en-US", {
                weekday: "long", year: "numeric", month: "long", day: "numeric",
              })}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={loadSchedule}
              className="p-2.5 rounded-xl border border-[#E8E2D9] text-[#6B7280] hover:text-[#1A1A1A] hover:bg-[#FAFAF8] transition-all"
              title="Refresh Schedule"
            >
              <RefreshCw size={15} />
            </button>

            <button
              onClick={generateSchedule}
              disabled={generating}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#A0785A] hover:bg-[#7D5C42] text-white text-sm font-semibold transition-all shadow-sm shadow-[#A0785A]/20 disabled:opacity-60"
            >
              {generating ? (
                <><RefreshCw size={15} className="animate-spin" /> Optimizing…</>
              ) : (
                <><Zap size={15} /> Generate AI Schedule</>
              )}
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-[#DC2626] text-xs">
            <AlertTriangle size={15} className="flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Metrics Overview Bar */}
        {schedule && schedule.metrics && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-2xl border border-[#E8E2D9] p-4 flex items-center gap-3 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-[#F5EFE8] flex items-center justify-center">
                <Clock size={18} className="text-[#A0785A]" />
              </div>
              <div>
                <p className="text-xs text-[#6B7280]">Planned Time</p>
                <p className="font-heading font-700 text-lg text-[#1A1A1A]">
                  {schedule.metrics.totalPlannedMinutes} <span className="text-xs font-normal text-[#6B7280]">mins</span>
                </p>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-[#E8E2D9] p-4 flex items-center gap-3 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-[#F5EFE8] flex items-center justify-center">
                <Award size={18} className="text-[#A0785A]" />
              </div>
              <div>
                <p className="text-xs text-[#6B7280]">Capacity Utilization</p>
                <p className="font-heading font-700 text-lg text-[#1A1A1A]">
                  {schedule.metrics.utilizationPercent?.toFixed(0) ?? 0}%
                </p>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-[#E8E2D9] p-4 flex items-center gap-3 shadow-sm">
              <div className="w-10 h-10 rounded-xl bg-[#F5EFE8] flex items-center justify-center">
                <Zap size={18} className="text-[#A0785A]" />
              </div>
              <div>
                <p className="text-xs text-[#6B7280]">Workload Status</p>
                <p className={`font-heading font-700 text-sm ${schedule.metrics.overloadWarning ? "text-[#DC2626]" : "text-[#16A34A]"}`}>
                  {schedule.metrics.overloadWarning ? "Overload Alert" : "Optimal Balance"}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* AI Recommendation strip */}
        {schedule?.recommendation && (
          <div className="flex items-start gap-3 p-4 rounded-2xl bg-[#F5EFE8] border border-[#A0785A]/20 text-[#7D5C42] text-xs leading-relaxed">
            <Sparkles size={16} className="text-[#A0785A] mt-0.5 flex-shrink-0" />
            <p>{schedule.recommendation}</p>
          </div>
        )}

        {/* Empty / Loading State */}
        {loading && (
          <div className="bg-white rounded-2xl border border-[#E8E2D9] p-12 text-center shadow-sm">
            <RefreshCw size={24} className="animate-spin text-[#A0785A] mx-auto mb-3" />
            <p className="text-sm font-medium text-[#1A1A1A]">Loading your schedule…</p>
          </div>
        )}

        {!loading && (!schedule || schedule.schedule.length === 0) && (
          <div className="bg-white rounded-2xl border border-[#E8E2D9] p-12 text-center shadow-sm space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-[#F5EFE8] flex items-center justify-center mx-auto">
              <Calendar size={28} className="text-[#A0785A]" />
            </div>
            <div>
              <p className="font-heading font-600 text-[#1A1A1A] text-base">No schedule planned for today</p>
              <p className="text-xs text-[#6B7280] max-w-sm mx-auto mt-1">
                Click below to let our constraint solver arrange your pending tasks according to deadlines and cognitive energy.
              </p>
            </div>
            <button
              onClick={generateSchedule}
              disabled={generating}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#A0785A] text-white text-sm font-semibold hover:bg-[#7D5C42] transition-all shadow-sm shadow-[#A0785A]/20"
            >
              <Zap size={15} />
              <span>Generate AI Schedule</span>
            </button>
          </div>
        )}

        {/* Timeline View */}
        {!loading && schedule && schedule.schedule.length > 0 && (
          <div className="bg-white rounded-2xl border border-[#E8E2D9] p-6 shadow-sm flex gap-4 select-none">
            {/* Time labels column */}
            <div
              className="w-16 flex-shrink-0 relative border-r border-[#E8E2D9]"
              style={{ height: TOTAL_MINS * PIXELS_PER_MIN }}
            >
              {Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i).map(h => (
                <div
                  key={h}
                  className="absolute right-0 text-right text-xs text-[#6B7280] leading-none pr-3"
                  style={{ top: (h - START_HOUR) * 60 * PIXELS_PER_MIN - 6 }}
                >
                  {formatHour(h)}
                </div>
              ))}
            </div>

            {/* Timeline column */}
            <div
              className="flex-1 relative rounded-xl overflow-hidden border border-[#E8E2D9] bg-[#FAFAF8]"
              style={{ height: TOTAL_MINS * PIXELS_PER_MIN }}
              onClick={() => setTooltip(null)}
            >
              {/* Hour gridlines */}
              {Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => i).map(i => (
                <div
                  key={i}
                  className="absolute left-0 right-0 border-t border-[#E8E2D9]"
                  style={{ top: i * 60 * PIXELS_PER_MIN }}
                />
              ))}

              {/* Current time indicator */}
              <CurrentTimeLine startHour={START_HOUR} pixelsPerMin={PIXELS_PER_MIN} />

              {/* Time blocks */}
              {schedule.schedule.map((block, idx) => {
                const isCompleted = block.taskId ? completedTaskIds.has(block.taskId) : false;
                return (
                  <button
                    key={idx}
                    onClick={e => {
                      e.stopPropagation();
                      setTooltip({ block, x: e.clientX, y: e.clientY });
                    }}
                    className={`absolute left-2 right-2 rounded-xl px-3 py-1.5 text-left text-white shadow-md hover:scale-[1.005] active:scale-[0.995] transition-all border border-white/20 overflow-hidden ${
                      isCompleted ? "opacity-40 grayscale" : ""
                    }`}
                    style={{
                      top:             blockTop(block.startTime),
                      height:          blockHeight(block.startTime, block.endTime),
                      backgroundColor: block.color || "#A0785A",
                    }}
                  >
                    <div className="flex items-center gap-1.5">
                      {isCompleted && <CheckCircle2 size={13} className="text-white flex-shrink-0" />}
                      <p className={`text-xs font-semibold truncate leading-tight ${isCompleted ? "line-through" : ""}`}>
                        {block.title}
                      </p>
                    </div>
                    <p className="text-[10px] text-white/80 leading-tight mt-0.5">
                      {block.startTime} – {block.endTime}
                    </p>
                    <div className="absolute top-1.5 right-2 text-[10px]">
                      {ENERGY_ICON[block.energyRequired] ?? "⚡"}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* Tooltip / Detail Panel */}
      {tooltip && (
        <div
          className="fixed z-50 w-72 rounded-2xl bg-white border border-[#E8E2D9] shadow-2xl p-5"
          style={{ left: Math.min(tooltip.x + 12, window.innerWidth - 300), top: Math.min(tooltip.y - 20, window.innerHeight - 220) }}
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-start justify-between mb-3">
            <div
              className="w-3 h-3 rounded-full mt-1 flex-shrink-0"
              style={{ backgroundColor: tooltip.block.color }}
            />
            <p className="flex-1 mx-2 text-sm font-semibold text-[#1A1A1A] leading-tight">{tooltip.block.title}</p>
            <button onClick={() => setTooltip(null)} className="text-[#6B7280] hover:text-[#1A1A1A]">✕</button>
          </div>

          <div className="space-y-2 text-xs text-[#6B7280]">
            <div className="flex items-center gap-2">
              <Clock size={14} className="text-[#A0785A]" />
              <span className="text-[#1A1A1A] font-medium">{tooltip.block.startTime} – {tooltip.block.endTime}</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap size={14} className="text-[#A0785A]" />
              <span>Energy: <strong className="text-[#1A1A1A] capitalize">{tooltip.block.energyRequired}</strong></span>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap">
              <span
                className={`px-2 py-0.5 rounded-full border text-[10px] font-semibold capitalize ${PRIORITY_BADGE[tooltip.block.priority] ?? "bg-gray-50 text-gray-600 border-gray-200"}`}
              >
                {tooltip.block.priority} Priority
              </span>
            </div>
            {tooltip.block.constraintReason && (
              <p className="mt-2 text-xs text-[#7D5C42] bg-[#F5EFE8] p-2 rounded-lg italic leading-snug">
                💡 {tooltip.block.constraintReason}
              </p>
            )}

            {tooltip.block.taskId && (
              <div className="pt-2 border-t border-[#E8E2D9]">
                {completedTaskIds.has(tooltip.block.taskId) ? (
                  <div className="flex items-center gap-1.5 text-[#16A34A] text-xs font-semibold py-1">
                    <CheckCircle2 size={16} /> Completed
                  </div>
                ) : (
                  <button
                    onClick={() => tooltip.block.taskId && handleCompleteTask(tooltip.block.taskId)}
                    disabled={completingTaskId === tooltip.block.taskId}
                    className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-green-50 hover:bg-green-100 text-[#16A34A] border border-green-200 text-xs font-semibold transition disabled:opacity-50"
                  >
                    {completingTaskId === tooltip.block.taskId ? (
                      <RefreshCw size={13} className="animate-spin" />
                    ) : (
                      <Check size={13} />
                    )}
                    Mark as Done
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Current Time Indicator ───────────────────────────────────────────────────

function CurrentTimeLine({ startHour, pixelsPerMin }: { startHour: number; pixelsPerMin: number }) {
  const [top, setTop] = useState<number | null>(null);

  useEffect(() => {
    const update = () => {
      const now = new Date();
      const mins = (now.getHours() - startHour) * 60 + now.getMinutes();
      setTop(mins * pixelsPerMin);
    };
    update();
    const id = setInterval(update, 60_000);
    return () => clearInterval(id);
  }, [startHour, pixelsPerMin]);

  if (top === null || top < 0) return null;

  return (
    <div className="absolute left-0 right-0 z-10 pointer-events-none" style={{ top }}>
      <div className="relative">
        <div className="absolute left-0 w-2 h-2 rounded-full bg-red-500 -translate-y-1" />
        <div className="border-t-2 border-red-500/80 ml-2" />
      </div>
    </div>
  );
}
