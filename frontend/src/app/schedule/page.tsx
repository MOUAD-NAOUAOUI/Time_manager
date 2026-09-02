"use client";
import { useState, useEffect, useCallback } from "react";
import {
  Calendar,
  Clock,
  Zap,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Check,
  Award,
  Sparkles,
  Moon,
  Settings,
  X,
} from "lucide-react";
import { API_URL, fetchWithAuth, getUserEmail } from "@/lib/api";
import Sidebar from "@/components/Sidebar";

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

interface SleepWarning {
  type: "under" | "timing" | "over" | "full";
  message: string;
  science?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const toMinutes = (time?: string | null): number => {
  if (!time || typeof time !== "string" || !time.includes(":")) return 0;
  const parts = time.split(":").map(Number);
  const h = isNaN(parts[0]) ? 0 : parts[0];
  const m = isNaN(parts[1]) ? 0 : parts[1];
  return h * 60 + m;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeBlock(raw: any): TimeBlock {
  return {
    taskId: raw?.taskId || raw?.task_id,
    title: raw?.title || "Untitled",
    startTime: raw?.startTime || raw?.start_time || "00:00",
    endTime: raw?.endTime || raw?.end_time || "00:00",
    color: raw?.color || "#A0785A",
    priority: raw?.priority || "medium",
    energyRequired: raw?.energyRequired || raw?.energy_required || "medium",
    constraintReason: raw?.constraintReason || raw?.constraint_reason || "",
  };
}

function calcSleepDuration(start: string, end: string): number {
  const s = toMinutes(start);
  const e = toMinutes(end);
  return e <= s ? 24 * 60 - s + e : e - s;
}

function validateSleep(start: string, end: string, taskMinutes: number): SleepWarning | null {
  const durationMins = calcSleepDuration(start, end);
  const durationHours = durationMins / 60;
  const wakingHours = 24 - durationHours;
  const sh = start && typeof start === "string" && start.includes(":") ? parseInt(start.split(":")[0], 10) : 22;

  if (durationHours < 8) {
    const deficit = (8 - durationHours).toFixed(1);
    return {
      type: "under",
      message: `You selected only ${durationHours.toFixed(1)}h of sleep — ${deficit}h below the recommended minimum.`,
      science: `Scientific evidence: (1) 60–70% of REM sleep occurs in hours 6–8. Cutting to ${Math.floor(durationHours)}h causes severe REM deprivation, impairing memory consolidation and emotional regulation. (2) Glymphatic brain waste clearance (beta-amyloid, tau proteins) peaks during non-REM slow-wave sleep and is critically reduced below 8 hours (Walker, UC Berkeley). (3) Even one week of sub-8h sleep degrades insulin sensitivity by 30% and spikes cortisol, accelerating metabolic dysfunction.`,
    };
  }

  if (durationHours > 8) {
    const waking = Math.floor(wakingHours);
    const taskHours = Math.ceil(taskMinutes / 60);
    if (taskHours >= waking) {
      return {
        type: "full",
        message: `Your schedule is full. ${durationHours.toFixed(1)}h of sleep leaves only ${waking}h waking time, but your tasks require approximately ${taskHours}h.`,
      };
    }
  }

  // Check timing: bedtime should be between 22:00 and 08:00
  const isGoodStartTime = sh >= 22 || sh < 8;
  if (!isGoodStartTime) {
    return {
      type: "timing",
      message: `A bedtime of ${start} falls outside the optimal 10 PM – 8 AM sleep window.`,
      science: `Real physiological restoration occurs between 11 PM and 3 AM. The human brain drops core body temperature and peaks delta slow-wave activity during this specific window. Cortisol suppression, growth hormone release, and cellular repair are all phase-locked to the circadian clock — not just total hours. Going to bed after midnight compresses restorative deep sleep phases even if total duration is maintained.`,
    };
  }

  return null;
}

const SLEEP_COLOR = "#1E1B4B";

function isSleepBlock(block: TimeBlock): boolean {
  return block.taskId === "circadian-sleep-block" || block.color === SLEEP_COLOR;
}

// ─── Sleep Config Modal ────────────────────────────────────────────────────────

function SleepConfigModal({
  sleepStart,
  sleepEnd,
  totalTaskMins,
  onSave,
  onClose,
}: {
  sleepStart: string;
  sleepEnd: string;
  totalTaskMins: number;
  onSave: (start: string, end: string) => void;
  onClose: () => void;
}) {
  const [start, setStart] = useState(sleepStart);
  const [end, setEnd] = useState(sleepEnd);
  const [warning, setWarning] = useState<SleepWarning | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  const durationMins = calcSleepDuration(start, end);
  const hours = Math.floor(durationMins / 60);
  const mins = durationMins % 60;
  const durationLabel = `${hours}h${mins > 0 ? ` ${mins}m` : ""}`;

  useEffect(() => {
    setWarning(validateSleep(start, end, totalTaskMins));
    setConfirmed(false);
  }, [start, end, totalTaskMins]);

  const handleSave = () => {
    if (warning && !confirmed) { setConfirmed(true); return; }
    onSave(start, end);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white rounded-2xl border border-[#E8E2D9] shadow-2xl p-6 space-y-5 mx-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#1E1B4B] flex items-center justify-center">
              <Moon size={16} className="text-white" />
            </div>
            <div>
              <h2 className="font-semibold text-[#1A1A1A] text-sm">Sleep Schedule</h2>
              <p className="text-xs text-[#6B7280]">Configure your daily rest window</p>
            </div>
          </div>
          <button onClick={onClose} className="text-[#6B7280] hover:text-[#1A1A1A]">
            <X size={16} />
          </button>
        </div>

        <div className="bg-[#F5F4FF] rounded-xl p-3 flex items-center justify-between">
          <span className="text-xs text-[#4338CA] font-medium">Total sleep duration</span>
          <span className="font-bold text-[#1E1B4B] text-base">{durationLabel}</span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-[#6B7280] mb-1 block">Bedtime</label>
            <input type="time" value={start} onChange={e => setStart(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-[#E8E2D9] text-sm text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#1E1B4B]/30" />
          </div>
          <div>
            <label className="text-xs text-[#6B7280] mb-1 block">Wake time</label>
            <input type="time" value={end} onChange={e => setEnd(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-[#E8E2D9] text-sm text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#1E1B4B]/30" />
          </div>
        </div>

        {warning ? (
          <div className={`rounded-xl border p-3 space-y-2 ${warning.type === "timing" ? "bg-amber-50 border-amber-200" : "bg-red-50 border-red-200"}`}>
            <div className="flex items-start gap-2">
              <AlertTriangle size={14} className={`flex-shrink-0 mt-0.5 ${warning.type === "timing" ? "text-amber-600" : "text-[#DC2626]"}`} />
              <p className={`text-xs font-semibold ${warning.type === "timing" ? "text-amber-800" : "text-[#DC2626]"}`}>{warning.message}</p>
            </div>
            {warning.science && <p className="text-xs text-[#6B7280] leading-relaxed pl-5">{warning.science}</p>}
            {confirmed && <p className="text-xs font-semibold text-[#DC2626] pl-5">Press Save again to confirm despite this warning.</p>}
          </div>
        ) : (
          <div className="rounded-xl bg-green-50 border border-green-200 p-3 flex items-center gap-2">
            <CheckCircle2 size={14} className="text-[#16A34A] flex-shrink-0" />
            <p className="text-xs text-[#16A34A] font-medium">Optimal circadian sleep window selected.</p>
          </div>
        )}

        <p className="text-xs text-[#9CA3AF] leading-relaxed">
          Recommended: sleep at <strong>10:00 PM</strong>, wake at <strong>6:00 AM</strong>. The 11 PM – 3 AM window is peak slow-wave restorative sleep.
        </p>

        <div className="flex gap-2 pt-1">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-[#E8E2D9] text-sm text-[#6B7280] hover:bg-[#FAFAF8] transition">Cancel</button>
          <button onClick={handleSave}
            className={`flex-1 py-2.5 rounded-xl text-white text-sm font-semibold transition ${warning && confirmed ? "bg-[#DC2626] hover:bg-red-700" : "bg-[#1E1B4B] hover:bg-[#312E81]"}`}>
            {warning && !confirmed ? "Proceed Anyway" : "Save Sleep Schedule"}
          </button>
        </div>
      </div>
    </div>
  );
}

const formatHour = (hour: number): string => {
  const ampm = hour >= 12 ? "PM" : "AM";
  const h = hour % 12 === 0 ? 12 : hour % 12;
  return `${h} ${ampm}`;
};

function formatLocalDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const PRIORITY_BADGE: Record<string, string> = {
  critical: "bg-red-50 text-[#DC2626] border-red-200",
  high: "bg-orange-50 text-[#EA580C] border-orange-200",
  medium: "bg-amber-50 text-[#D97706] border-amber-200",
  low: "bg-green-50 text-[#16A34A] border-green-200",
};

const ENERGY_ICON: Record<string, string> = {
  high: "H",
  medium: "M",
  low: "L",
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function SchedulePage() {
  const [schedule, setSchedule] = useState<ScheduleData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [tooltip, setTooltip] = useState<{ block: TimeBlock; x: number; y: number } | null>(null);
  const [generating, setGenerating] = useState(false);
  const [completedTaskIds, setCompletedTaskIds] = useState<Set<string>>(new Set());
  const [completingTaskId, setCompletingTaskId] = useState<string | null>(null);
  const [showSleepModal, setShowSleepModal] = useState(false);
  const [sleepStart, setSleepStart] = useState("22:00");
  const [sleepEnd, setSleepEnd] = useState("06:00");
  const [savingSleep, setSavingSleep] = useState(false);

  const START_HOUR = 0;
  const END_HOUR = 24;
  const TOTAL_MINS = END_HOUR * 60;
  const PIXELS_PER_MIN = 1.5;

  const today = formatLocalDate(new Date());

  const totalTaskMins = schedule
    ? schedule.schedule.filter(b => !isSleepBlock(b)).reduce((acc, b) => {
        const s = toMinutes(b.startTime); const e = toMinutes(b.endTime);
        return acc + (e > s ? e - s : 0);
      }, 0)
    : 0;

  // ─── Load user sleep preferences ───────────────────────────────────────────

  const loadUserProfile = useCallback(async () => {
    try {
      const email = getUserEmail();
      const res = await fetchWithAuth(`${API_URL}/users/me?email=${encodeURIComponent(email)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.sleepStartTime) setSleepStart(data.sleepStartTime);
        if (data.sleepEndTime) setSleepEnd(data.sleepEndTime);
      }
    } catch { /* use defaults */ }
  }, []);

  // ─── Data Fetching ──────────────────────────────────────────────────────────

  const loadSchedule = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const email = getUserEmail();
      const res = await fetchWithAuth(`${API_URL}/schedule/date?email=${encodeURIComponent(email)}&date=${today}`);
      if (!res.ok) throw new Error("no_schedule");
      const data = await res.json();
      setSchedule({
        ...data,
        schedule: Array.isArray(data?.schedule) ? data.schedule.map(normalizeBlock) : [],
      });
    } catch {
      setSchedule(null);
    } finally {
      setLoading(false);
    }
  }, [today]);

  const generateSchedule = async () => {
    setGenerating(true);
    setError("");
    try {
      const email = getUserEmail();
      const res = await fetchWithAuth(`${API_URL}/schedule/today?email=${encodeURIComponent(email)}&startHour=6&endHour=22`, {
        method: "GET",
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setSchedule({
        ...data,
        schedule: Array.isArray(data?.schedule) ? data.schedule.map(normalizeBlock) : [],
      });
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

  const handleSaveSleep = async (newStart: string, newEnd: string) => {
    setSleepStart(newStart);
    setSleepEnd(newEnd);
    setSavingSleep(true);
    try {
      const email = getUserEmail();
      await fetchWithAuth(`${API_URL}/users/sleep?email=${encodeURIComponent(email)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sleepStartTime: newStart, sleepEndTime: newEnd }),
      });
    } catch { /* silent */ } finally {
      setSavingSleep(false);
    }
  };

  useEffect(() => {
    loadUserProfile();
    loadSchedule();
  }, [loadSchedule, loadUserProfile]);

  // ─── Block position helpers ─────────────────────────────────────────────────

  const blockTop = (start: string) => toMinutes(start) * PIXELS_PER_MIN;

  const blockHeight = (start: string, end: string) => {
    let endMins = toMinutes(end);
    const startMins = toMinutes(start);
    if (endMins <= startMins) endMins += 24 * 60; // overnight wrap
    return Math.max((endMins - startMins) * PIXELS_PER_MIN, 24);
  };

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#FAFAF8] text-[#1A1A1A] flex">
      <Sidebar active="Schedule" />

      {showSleepModal && (
        <SleepConfigModal
          sleepStart={sleepStart}
          sleepEnd={sleepEnd}
          totalTaskMins={totalTaskMins}
          onSave={handleSaveSleep}
          onClose={() => setShowSleepModal(false)}
        />
      )}

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
            {/* Sleep config */}
            <button
              onClick={() => setShowSleepModal(true)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl border border-[#E8E2D9] text-[#6B7280] hover:text-[#1E1B4B] hover:border-[#1E1B4B]/40 hover:bg-[#F5F4FF] transition-all text-xs font-medium"
            >
              <Moon size={14} className="text-[#1E1B4B]" />
              <span className="hidden sm:inline">{sleepStart} – {sleepEnd}</span>
              {savingSleep && <RefreshCw size={11} className="animate-spin" />}
            </button>

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

        {/* Legend */}
        <div className="flex items-center gap-5 text-xs text-[#6B7280]">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: "#1E1B4B" }} />
            <span>Sleep &amp; Recovery</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-[#A0785A]" />
            <span>Tasks</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-[#16A34A]" />
            <span>Completed</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-[#A0785A]/50 border border-dashed border-[#A0785A]" />
            <span>Quick-Win (10–15m)</span>
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
              <div className="w-10 h-10 rounded-xl bg-[#F5F4FF] flex items-center justify-center">
                <Moon size={18} className="text-[#1E1B4B]" />
              </div>
              <div>
                <p className="text-xs text-[#6B7280]">Sleep Target</p>
                <p className="font-heading font-700 text-base text-[#1E1B4B]">
                  {sleepStart} – {sleepEnd}
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
                const isSleep = isSleepBlock(block);
                const isCompleted = block.taskId ? completedTaskIds.has(block.taskId) : false;
                const isMicro = !isSleep && (toMinutes(block.endTime) - toMinutes(block.startTime)) <= 15;

                return (
                  <button
                    key={idx}
                    onClick={e => {
                      e.stopPropagation();
                      setTooltip({ block, x: e.clientX, y: e.clientY });
                    }}
                    className={`absolute left-2 right-2 rounded-xl px-3 py-1.5 text-left text-white shadow-md hover:scale-[1.005] active:scale-[0.995] transition-all border overflow-hidden ${
                      isSleep
                        ? "border-[#312E81]/30 cursor-pointer"
                        : isCompleted
                        ? "opacity-40 grayscale border-white/20"
                        : "border-white/20"
                    }`}
                    style={{
                      top: blockTop(block.startTime),
                      height: blockHeight(block.startTime, block.endTime),
                      backgroundColor: isSleep ? SLEEP_COLOR : (isCompleted ? "#16A34A" : block.color || "#A0785A"),
                      zIndex: isSleep ? 1 : 2,
                    }}
                  >
                    <div className="flex items-center gap-1.5">
                      {isSleep && <Moon size={12} className="text-indigo-300 flex-shrink-0" />}
                      {isCompleted && !isSleep && <CheckCircle2 size={13} className="text-white flex-shrink-0" />}
                      <p className={`text-xs font-semibold truncate leading-tight ${isCompleted ? "line-through" : ""}`}>
                        {block.title}
                      </p>
                      {isMicro && (
                        <span className="ml-auto text-[9px] bg-white/20 rounded px-1 flex-shrink-0 font-medium">Quick-Win</span>
                      )}
                    </div>
                    {!isMicro && (
                      <p className="text-[10px] text-white/80 leading-tight mt-0.5">
                        {block.startTime} – {block.endTime}
                      </p>
                    )}
                    {!isSleep && (
                      <div className="absolute top-1.5 right-2 text-[10px] opacity-70">
                        {ENERGY_ICON[block.energyRequired] ?? ""}
                      </div>
                    )}
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
          className="fixed z-50 w-80 rounded-2xl bg-white border border-[#E8E2D9] shadow-2xl p-5"
          style={{ left: Math.min(tooltip.x + 12, window.innerWidth - 340), top: Math.min(tooltip.y - 20, window.innerHeight - 280) }}
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-start justify-between mb-3">
            <div
              className="w-3 h-3 rounded-full mt-1 flex-shrink-0"
              style={{ backgroundColor: isSleepBlock(tooltip.block) ? SLEEP_COLOR : tooltip.block.color }}
            />
            <p className="flex-1 mx-2 text-sm font-semibold text-[#1A1A1A] leading-tight">{tooltip.block.title}</p>
            <button onClick={() => setTooltip(null)} className="text-[#6B7280] hover:text-[#1A1A1A]">
              <X size={14} />
            </button>
          </div>

          <div className="space-y-2 text-xs text-[#6B7280]">
            <div className="flex items-center gap-2">
              <Clock size={14} className="text-[#A0785A]" />
              <span className="text-[#1A1A1A] font-medium">{tooltip.block.startTime} – {tooltip.block.endTime}</span>
            </div>

            {isSleepBlock(tooltip.block) ? (
              <div className="rounded-xl bg-[#F5F4FF] border border-[#C7D2FE] p-3 space-y-2">
                <div className="flex items-center gap-1.5 text-[#4338CA] font-semibold text-xs">
                  <Moon size={13} />
                  <span>Circadian Recovery Window</span>
                </div>
                <p className="text-[#4B5563] text-[11px] leading-relaxed">
                  During this window, slow-wave delta sleep peaks, the glymphatic system clears metabolic toxins, and REM sleep consolidates memory.
                </p>
                <button
                  onClick={() => { setTooltip(null); setShowSleepModal(true); }}
                  className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl bg-[#1E1B4B] hover:bg-[#312E81] text-white text-xs font-semibold mt-1 transition"
                >
                  <Settings size={12} />
                  Configure Sleep Interval
                </button>
              </div>
            ) : (
              <>
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
                    {tooltip.block.constraintReason}
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
              </>
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
