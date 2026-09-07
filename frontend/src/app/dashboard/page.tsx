"use client";
import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, Legend,
} from "recharts";
import {
  Clock, CheckCircle2, Circle, Target, Zap, Plus, Play, Square,
  Brain, ChevronRight, Award, Moon, AlertCircle, X, Sparkles, Check, Info, Calendar,
  Pencil, Repeat2, CalendarDays, Trash2, RotateCw
} from "lucide-react";
import { API_URL, fetchWithAuth, getUserEmail } from "@/lib/api";
import Sidebar from "@/components/Sidebar";
import {
  ScheduledItem,
  HourCellDetail,
  SleepConfig,
  DEFAULT_SLEEP_CONFIG,
  buildWeeklyHourGrid,
  validateSlot,
  findNearestAvailableSlot,
  formatLocalDate,
} from "@/lib/scheduling";

// ── Types ──────────────────────────────────────────────────────────────────
interface Task {
  id: string;
  title: string;
  status: string;
  estimatedMinutes: number;
  color: string;
  actualMinutesSpent?: number;
  deadline?: string;
  createdAt?: string;
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

function HourDetailModal({
  cell,
  onClose,
  tasks,
  onToggleTask,
  onScheduleItem,
  onDeleteItem,
  cellMap,
  sleepConfig,
  days,
}: {
  cell: HourCellDetail | null;
  onClose: () => void;
  tasks: Task[];
  onToggleTask?: (taskId: string, currentStatus: string) => void;
  onScheduleItem: (item: ScheduledItem, dateKeys: string | string[], oldItemId?: string) => void;
  onDeleteItem?: (itemId: string) => void;
  cellMap: Map<string, HourCellDetail>;
  sleepConfig: SleepConfig;
  days: Date[];
}) {
  const [selectedTaskId, setSelectedTaskId] = useState<string>("");
  const [customTitle, setCustomTitle] = useState("");
  const [durationMinutes, setDurationMinutes] = useState<number>(30);
  const [startHour, setStartHour] = useState<number>(cell ? cell.hour : 9);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [nearbySuggestions, setNearbySuggestions] = useState<number[]>([]);
  const [scheduleSuccess, setScheduleSuccess] = useState<string | null>(null);
  const [selectedDays, setSelectedDays] = useState<string[]>([]);
  const [editingItem, setEditingItem] = useState<ScheduledItem | null>(null);
  const [overrideSleep, setOverrideSleep] = useState(false);

  // Array of 7 days in the week
  const weekDays = useMemo(() => {
    return days.map((d) => {
      const key = formatLocalDate(d);
      const dayShort = d.toLocaleDateString("en-US", { weekday: "short" });
      const dayNum = d.getDate();
      return { date: d, dateKey: key, dayShort, dayNum, label: `${dayShort} ${dayNum}` };
    });
  }, [days]);

  useEffect(() => {
    if (cell) {
      setStartHour(cell.hour);
      const free = cell.remainingFreeMinutes > 0 ? Math.min(30, cell.remainingFreeMinutes) : 30;
      setDurationMinutes(free > 0 ? free : 30);
      setValidationError(null);
      setNearbySuggestions([]);
      setScheduleSuccess(null);
      setSelectedDays([cell.dateKey]);
      setEditingItem(null);
      setSelectedTaskId("");
      setCustomTitle("");
      setOverrideSleep(false);
    }
  }, [cell]);

  // Live slot validation
  useEffect(() => {
    if (!cell) return;
    if (editingItem && startHour === (editingItem.startHour ?? cell.hour)) {
      setValidationError(null);
      setNearbySuggestions([]);
      return;
    }
    const res = validateSlot(cell.dateKey, startHour, durationMinutes, cellMap, sleepConfig);
    if (!res.isValid) {
      setValidationError(res.message || "This time slot is occupied.");
      setNearbySuggestions(res.nearbyHours || []);
    } else {
      setValidationError(null);
      setNearbySuggestions([]);
    }
  }, [cell, startHour, durationMinutes, cellMap, sleepConfig, editingItem]);

  if (!cell) return null;

  const handleToggleDay = (key: string) => {
    setSelectedDays((prev) => {
      if (prev.includes(key)) {
        if (prev.length === 1) return prev; // Keep at least one day
        return prev.filter((d) => d !== key);
      }
      return [...prev, key];
    });
  };

  const handleSelectPreset = (preset: "this" | "weekdays" | "all") => {
    if (preset === "this") setSelectedDays([cell.dateKey]);
    else if (preset === "weekdays") setSelectedDays(weekDays.slice(0, 5).map((d) => d.dateKey));
    else setSelectedDays(weekDays.map((d) => d.dateKey));
  };

  // Conflict map per day
  const dayConflictMap = useMemo(() => {
    const map: Record<string, boolean> = {};
    for (const wd of weekDays) {
      if (editingItem && wd.dateKey === cell.dateKey && startHour === (editingItem.startHour ?? cell.hour)) {
        map[wd.dateKey] = false;
        continue;
      }
      const v = validateSlot(wd.dateKey, startHour, durationMinutes, cellMap, sleepConfig);
      map[wd.dateKey] = !v.isValid;
    }
    return map;
  }, [weekDays, startHour, durationMinutes, cellMap, sleepConfig, editingItem, cell]);

  const conflictedSelectedDays = selectedDays.filter((k) => dayConflictMap[k]);

  const handleAutoAssign = () => {
    const slot = findNearestAvailableSlot(cell.dateKey, cell.hour, durationMinutes, cellMap, sleepConfig);
    if (slot !== null) setStartHour(slot);
  };

  const handleStartEdit = (item: ScheduledItem) => {
    setEditingItem(item);
    if (item.taskId) {
      setSelectedTaskId(item.taskId);
      setCustomTitle("");
    } else {
      setSelectedTaskId("");
      setCustomTitle(item.title);
    }
    setDurationMinutes(item.durationMinutes);
    setStartHour(item.startHour ?? cell.hour);

    // Find all days where this task is scheduled
    const baseId = item.id.replace(/_\d{4}-\d{2}-\d{2}$/, "");
    const daysWithTask = weekDays.filter((wd) => {
      const c = cellMap.get(`${wd.dateKey}_${item.startHour ?? cell.hour}`);
      return c?.items.some((it) =>
        it.id === item.id ||
        it.id.startsWith(baseId) ||
        (item.taskId && it.taskId === item.taskId) ||
        it.title === item.title
      );
    }).map((wd) => wd.dateKey);

    setSelectedDays(daysWithTask.length > 0 ? daysWithTask : [cell.dateKey]);
    setOverrideSleep(true);
    setValidationError(null);
  };

  const handleCancelEdit = () => {
    setEditingItem(null);
    setSelectedTaskId("");
    setCustomTitle("");
    setStartHour(cell ? cell.hour : 9);
    setDurationMinutes(cell?.remainingFreeMinutes ? Math.min(30, cell.remainingFreeMinutes) : 30);
    setSelectedDays(cell ? [cell.dateKey] : []);
    setValidationError(null);
  };

  const handleDeleteItem = (item: ScheduledItem) => {
    if (onDeleteItem) {
      onDeleteItem(item.id);
      if (editingItem?.id === item.id) {
        handleCancelEdit();
      }
      setScheduleSuccess(`Task "${item.title}" removed.`);
      setTimeout(() => setScheduleSuccess(null), 1500);
    }
  };

  const handleScheduleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const chosenTask = tasks.find((t) => t.id === selectedTaskId);
    const title = chosenTask ? chosenTask.title : customTitle.trim();
    if (!title) {
      setValidationError("Please select a task or enter a task title.");
      return;
    }
    if (selectedDays.length === 0) {
      setValidationError("Please select at least one day.");
      return;
    }
    if (!editingItem && conflictedSelectedDays.length === selectedDays.length) {
      setValidationError(`All selected days are occupied at ${String(startHour).padStart(2, "0")}:00. Try Auto-Assign.`);
      return;
    }

    const baseId = editingItem
      ? editingItem.id.replace(/_\d{4}-\d{2}-\d{2}$/, "")
      : `manual_${Date.now()}`;

    const newItem: ScheduledItem = {
      id: baseId,
      taskId: chosenTask?.id || editingItem?.taskId,
      title,
      durationMinutes,
      startHour,
      status: editingItem ? editingItem.status : (chosenTask?.status === "completed" ? "completed" : "pending"),
      color: chosenTask?.color || editingItem?.color || BRAND,
      deadline: chosenTask?.deadline || editingItem?.deadline,
    };

    onScheduleItem(newItem, selectedDays, editingItem ? editingItem.id : undefined);
    setScheduleSuccess(
      editingItem
        ? `Task updated for ${selectedDays.length} day${selectedDays.length > 1 ? "s" : ""}!`
        : `Task scheduled for ${selectedDays.length} day${selectedDays.length > 1 ? "s" : ""}!`
    );
    setTimeout(() => {
      setEditingItem(null);
      onClose();
    }, 900);
  };

  const isSleepSlot = cell.status === "sleep" && !overrideSleep;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl border border-[#E8E2D9] flex flex-col"
           style={{ maxHeight: "min(94vh, 760px)" }}>

        {/* ── Header ── */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#F0EBE3] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#F5EFE8] flex items-center justify-center">
              <CalendarDays size={17} className="text-[#A0785A]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-xs font-semibold text-[#6B7280]">
                  {cell.dayLabel} · {cell.date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                </p>
                {cell.status === "sleep" && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#EEF2FF] text-[#4338CA] border border-[#C7D2FE]">
                    <Moon size={10} /> Sleep Block
                  </span>
                )}
              </div>
              <h3 className="font-heading text-lg font-700 text-[#1A1A1A] leading-tight mt-0.5">
                {cell.timeRangeLabel}
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#9CA3AF] hover:text-[#1A1A1A] p-1.5 rounded-lg hover:bg-[#F5EFE8] transition-colors cursor-pointer"
            title="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* ── Scrollable Body ── */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

          {/* ── Scheduled Tasks in this slot ── */}
          {cell.items.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#6B7280]">
                  Scheduled in this Hour ({cell.items.length})
                </h4>
                <span className="text-[11px] text-[#6B7280]">
                  {cell.remainingFreeMinutes > 0 ? `${cell.remainingFreeMinutes}m free remaining` : "Full hour booked"}
                </span>
              </div>

              <div className="space-y-2">
                {cell.items.map((item, idx) => (
                  <div
                    key={item.id || idx}
                    className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                      editingItem?.id === item.id
                        ? "bg-[#FAF7F2] border-[#A0785A] ring-2 ring-[#A0785A]/25"
                        : "bg-[#FAFAF8] border-[#E8E2D9]"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {item.color && (
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                      )}
                      <span className="text-xs font-bold text-[#A0785A] bg-[#F5EFE8] px-2 py-0.5 rounded-md shrink-0">
                        {item.durationMinutes}m
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-[#1A1A1A] truncate">{item.title}</p>
                        {item.startHour !== undefined && (
                          <p className="text-[10px] text-[#6B7280]">
                            {String(item.startHour).padStart(2, "0")}:00 – {String((item.startHour + Math.ceil(item.durationMinutes / 60)) % 24).padStart(2, "0")}:00
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {item.isSleep ? (
                        <span className="text-[10px] font-semibold text-[#4338CA] bg-[#EEF2FF] px-2 py-0.5 rounded-md">
                          Sleep
                        </span>
                      ) : (
                        <>
                          <span
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${
                              item.status === "completed"
                                ? "text-[#16A34A] bg-[#E8F8EE]"
                                : item.status === "missed"
                                ? "text-[#DC2626] bg-[#FDE8E8]"
                                : "text-[#475569] bg-[#F1F5F9]"
                            }`}
                          >
                            {item.status === "completed" ? "Done" : item.status === "missed" ? "Missed" : "Pending"}
                          </span>

                          {/* Complete Toggle */}
                          {item.taskId && onToggleTask && (
                            <button
                              type="button"
                              onClick={() => onToggleTask(item.taskId!, item.status)}
                              className="p-1.5 rounded-lg text-[#6B7280] hover:text-[#16A34A] hover:bg-green-50 transition-colors cursor-pointer"
                              title={item.status === "completed" ? "Mark pending" : "Mark done"}
                            >
                              <CheckCircle2 size={15} className={item.status === "completed" ? "text-[#16A34A]" : ""} />
                            </button>
                          )}

                          {/* ── Edit Button ── */}
                          <button
                            type="button"
                            onClick={() => (editingItem?.id === item.id ? handleCancelEdit() : handleStartEdit(item))}
                            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                              editingItem?.id === item.id
                                ? "bg-[#A0785A] text-white shadow-xs"
                                : "bg-white border border-[#E8E2D9] text-[#6B7280] hover:text-[#A0785A] hover:border-[#A0785A]"
                            }`}
                            title="Edit task & recurring days"
                          >
                            <Pencil size={12} />
                            <span>{editingItem?.id === item.id ? "Editing" : "Edit"}</span>
                          </button>

                          {/* ── Delete Button ── */}
                          {onDeleteItem && (
                            <button
                              type="button"
                              onClick={() => handleDeleteItem(item)}
                              className="p-1.5 rounded-lg text-[#9CA3AF] hover:text-[#DC2626] hover:bg-red-50 transition-colors cursor-pointer"
                              title="Delete from schedule"
                            >
                              <Trash2 size={14} />
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Sleep slot locked message with override option ── */}
          {isSleepSlot && (
            <div className="bg-[#EEF2FF]/70 border border-[#C7D2FE] rounded-2xl p-4 text-center space-y-2.5">
              <div className="flex items-center justify-center gap-2 text-[#4338CA] font-semibold text-sm">
                <Moon size={16} /> Circadian Sleep Block ({cell.timeRangeLabel})
              </div>
              <p className="text-xs text-[#4B5563]">
                This hour is reserved for sleep and recovery.
              </p>
              <button
                type="button"
                onClick={() => setOverrideSleep(true)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#4338CA] bg-white border border-[#C7D2FE] hover:bg-[#EEF2FF] px-3.5 py-2 rounded-xl transition-all shadow-xs cursor-pointer"
              >
                <Plus size={13} /> Schedule task in this slot anyway
              </button>
            </div>
          )}

          {/* ── Scheduling & Editing Form ── */}
          {!isSleepSlot && (
            <div className="space-y-3.5 pt-1">
              {/* Form title / Edit banner */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-6 h-6 rounded-lg flex items-center justify-center ${editingItem ? "bg-[#A0785A] text-white" : "bg-[#F5EFE8] text-[#A0785A]"}`}>
                    {editingItem ? <Pencil size={12} /> : <CalendarDays size={13} />}
                  </div>
                  <span className="text-xs font-bold text-[#1A1A1A]">
                    {editingItem ? `Edit Task: "${editingItem.title}"` : "Schedule a Task"}
                  </span>
                </div>
                {editingItem && (
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="text-xs font-semibold text-[#A0785A] hover:underline cursor-pointer"
                  >
                    Cancel Edit
                  </button>
                )}
              </div>

              {scheduleSuccess ? (
                <div className="p-3 bg-green-50 border border-green-200 rounded-xl text-green-800 text-xs flex items-center gap-2 font-medium">
                  <Check size={16} className="text-green-600 shrink-0" />
                  <span>{scheduleSuccess}</span>
                </div>
              ) : (
                <form onSubmit={handleScheduleSubmit} className="space-y-3.5">

                  {/* ── STEP 1: CHOOSE DAYS OF THE WEEK ── */}
                  <div className="bg-[#FAF7F2] rounded-2xl border border-[#E8E2D9] p-3.5 space-y-2.5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <label className="text-xs font-bold text-[#1A1A1A] flex items-center gap-1.5">
                        <CalendarDays size={14} className="text-[#A0785A]" />
                        Repeat on Days of the Week:
                        <span className="text-[#A0785A] font-extrabold bg-[#A0785A]/15 px-2 py-0.5 rounded-full text-[11px]">
                          {selectedDays.length} of 7 days
                        </span>
                      </label>

                      {/* Quick Presets */}
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleSelectPreset("this")}
                          className={`text-[10px] px-2 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                            selectedDays.length === 1 && selectedDays[0] === cell.dateKey
                              ? "bg-[#A0785A] text-white shadow-xs"
                              : "bg-white border border-[#E8E2D9] text-[#6B7280] hover:text-[#A0785A] hover:border-[#A0785A]"
                          }`}
                        >
                          This day
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSelectPreset("weekdays")}
                          className={`text-[10px] px-2 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                            selectedDays.length === 5 && weekDays.slice(0, 5).every((d) => selectedDays.includes(d.dateKey))
                              ? "bg-[#A0785A] text-white shadow-xs"
                              : "bg-white border border-[#E8E2D9] text-[#6B7280] hover:text-[#A0785A] hover:border-[#A0785A]"
                          }`}
                        >
                          Mon–Fri
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSelectPreset("all")}
                          className={`text-[10px] px-2 py-1 rounded-md font-semibold transition-all cursor-pointer ${
                            selectedDays.length === 7
                              ? "bg-[#A0785A] text-white shadow-xs"
                              : "bg-white border border-[#E8E2D9] text-[#6B7280] hover:text-[#A0785A] hover:border-[#A0785A]"
                          }`}
                        >
                          All 7 days
                        </button>
                      </div>
                    </div>

                    {/* 7 Day Pills */}
                    <div className="grid grid-cols-7 gap-1.5">
                      {weekDays.map((wd) => {
                        const isSelected = selectedDays.includes(wd.dateKey);
                        const isConflicted = dayConflictMap[wd.dateKey];
                        const isClicked = wd.dateKey === cell.dateKey;

                        return (
                          <button
                            key={wd.dateKey}
                            type="button"
                            onClick={() => handleToggleDay(wd.dateKey)}
                            title={`${wd.dayShort} ${wd.dayNum} · ${isConflicted ? "Slot occupied at this hour" : "Slot free"}`}
                            className={`flex flex-col items-center justify-center py-2.5 px-1 rounded-xl border text-xs transition-all cursor-pointer select-none relative ${
                              isSelected
                                ? "bg-[#A0785A] text-white border-[#A0785A] shadow-xs ring-1 ring-[#A0785A]"
                                : "bg-white text-[#4B5563] border-[#E8E2D9] hover:border-[#A0785A]/50 hover:bg-[#FDFBF9]"
                            }`}
                          >
                            {isSelected && (
                              <div className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-white text-[#A0785A] flex items-center justify-center shadow-xs">
                                <Check size={9} strokeWidth={3} />
                              </div>
                            )}
                            <span className={`text-[10px] font-bold uppercase tracking-wider ${isSelected ? "text-white" : "text-[#6B7280]"}`}>
                              {wd.dayShort}
                            </span>
                            <span className={`text-sm font-extrabold mt-0.5 ${isSelected ? "text-white" : "text-[#1A1A1A]"}`}>
                              {wd.dayNum}
                            </span>
                            <div className="flex items-center gap-1 mt-1">
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  isConflicted
                                    ? isSelected ? "bg-amber-300" : "bg-red-500"
                                    : isSelected ? "bg-emerald-300" : "bg-emerald-500"
                                }`}
                              />
                            </div>
                            {isClicked && (
                              <span className={`text-[8px] font-semibold mt-0.5 leading-none ${isSelected ? "text-white/80" : "text-[#A0785A]"}`}>
                                Selected
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {conflictedSelectedDays.length > 0 && !editingItem && (
                      <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200/80 rounded-lg px-2.5 py-1.5 mt-1 flex items-center gap-1.5">
                        <AlertCircle size={13} className="text-amber-600 shrink-0" />
                        <span>
                          Note: {conflictedSelectedDays.map((k) => weekDays.find((w) => w.dateKey === k)?.dayShort).join(", ")} already {conflictedSelectedDays.length === 1 ? "has" : "have"} an item at {String(startHour).padStart(2, "0")}:00.
                        </span>
                      </p>
                    )}
                  </div>

                  {/* ── STEP 2: TASK SELECTION ── */}
                  <div>
                    <label className="block text-xs font-semibold text-[#6B7280] mb-1">
                      {editingItem ? "Task" : "Select Existing Task or Create Custom"}
                    </label>
                    <select
                      value={selectedTaskId}
                      onChange={(e) => {
                        setSelectedTaskId(e.target.value);
                        const t = tasks.find((item) => item.id === e.target.value);
                        if (t) {
                          setDurationMinutes(t.estimatedMinutes || 30);
                          setCustomTitle("");
                        }
                      }}
                      className="w-full text-xs rounded-xl border border-[#E8E2D9] p-2.5 bg-white text-[#1A1A1A] focus:outline-hidden focus:ring-2 focus:ring-[#A0785A]/20"
                    >
                      <option value="">— Choose existing task or write custom below —</option>
                      {tasks.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.title} ({t.estimatedMinutes}m) · {t.status}
                        </option>
                      ))}
                    </select>
                  </div>

                  {!selectedTaskId && (
                    <div>
                      <label className="block text-xs font-semibold text-[#6B7280] mb-1">Custom Task Title</label>
                      <input
                        type="text"
                        placeholder="e.g. Deep Work, Gym Workout, Reading"
                        value={customTitle}
                        onChange={(e) => setCustomTitle(e.target.value)}
                        className="w-full text-xs rounded-xl border border-[#E8E2D9] p-2.5 bg-white text-[#1A1A1A] focus:outline-hidden focus:ring-2 focus:ring-[#A0785A]/20"
                      />
                    </div>
                  )}

                  {/* ── STEP 3: DURATION & START HOUR ── */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-semibold text-[#6B7280]">Duration</label>
                        <span className="text-xs font-bold text-[#A0785A]">{durationMinutes}m</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {[15, 30, 45, 60, 90, 120].map((m) => (
                          <button
                            key={m}
                            type="button"
                            onClick={() => setDurationMinutes(m)}
                            className={`text-xs px-2 py-1 rounded-lg border font-medium transition-all cursor-pointer ${
                              durationMinutes === m
                                ? "bg-[#A0785A] text-white border-[#A0785A]"
                                : "bg-white text-[#6B7280] border-[#E8E2D9] hover:bg-[#F5EFE8]"
                            }`}
                          >
                            {m >= 60 ? `${m / 60}h` : `${m}m`}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#6B7280] mb-1">Start Hour</label>
                      <select
                        value={startHour}
                        onChange={(e) => setStartHour(Number(e.target.value))}
                        className="w-full text-xs rounded-xl border border-[#E8E2D9] p-2.5 bg-white text-[#1A1A1A] focus:outline-hidden focus:ring-2 focus:ring-[#A0785A]/20"
                      >
                        {Array.from({ length: 24 }, (_, h) => (
                          <option key={h} value={h}>
                            {String(h).padStart(2, "0")}:00 – {String((h + 1) % 24).padStart(2, "0")}:00
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Validation Error Banner */}
                  {validationError && (
                    <div className="p-2.5 bg-red-50 border border-red-200 rounded-xl space-y-1.5">
                      <div className="flex items-start gap-2 text-xs text-red-700">
                        <AlertCircle size={14} className="text-red-500 shrink-0 mt-0.5" />
                        <span>{validationError}</span>
                      </div>
                      {nearbySuggestions.length > 0 && (
                        <div className="flex items-center gap-1 flex-wrap pt-1 border-t border-red-200/60">
                          <span className="text-[10px] text-red-600 font-medium">Available nearby:</span>
                          {nearbySuggestions.map((h) => (
                            <button
                              key={h}
                              type="button"
                              onClick={() => setStartHour(h)}
                              className="text-[10px] font-semibold bg-white text-red-700 border border-red-300 px-2 py-0.5 rounded hover:bg-red-50 cursor-pointer"
                            >
                              {String(h).padStart(2, "0")}:00
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-1">
                    <button
                      type="submit"
                      disabled={selectedDays.length === 0 || (!editingItem && conflictedSelectedDays.length === selectedDays.length)}
                      className="flex-1 text-sm py-2.5 px-4 rounded-xl font-semibold text-white bg-[#A0785A] hover:bg-[#7D5C42] disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer flex items-center justify-center gap-2 shadow-xs"
                    >
                      {editingItem ? (
                        <>
                          <Pencil size={14} />
                          {selectedDays.length <= 1 ? "Update Task" : `Update Task for ${selectedDays.length} Days`}
                        </>
                      ) : (
                        <>
                          <CalendarDays size={14} />
                          {selectedDays.length <= 1 ? "Schedule Task" : `Schedule for ${selectedDays.length} Days`}
                        </>
                      )}
                    </button>
                    {!editingItem && (
                      <button
                        type="button"
                        onClick={handleAutoAssign}
                        className="text-xs py-2.5 px-3.5 rounded-xl font-medium text-[#A0785A] border border-[#A0785A]/40 hover:bg-[#F5EFE8] transition-all shrink-0 flex items-center gap-1 cursor-pointer"
                        title="Auto-find closest free slot"
                      >
                        <Sparkles size={13} /> Auto
                      </button>
                    )}
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function WeeklyHourGrid({
  tasks,
  schedules,
  userSleep = DEFAULT_SLEEP_CONFIG,
  onToggleTask,
}: {
  tasks: Task[];
  schedules: Record<string, WeeklySchedule>;
  userSleep?: SleepConfig;
  onToggleTask?: (taskId: string, currentStatus: string) => void;
}) {
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

  const email = getUserEmail();
  const [manualItems, setManualItems] = useState<Record<string, ScheduledItem[]>>({});
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (!email) return;
    try {
      const key = `timespace_manual_schedule_${email}`;
      const saved = localStorage.getItem(key);
      if (saved) setManualItems(JSON.parse(saved));
    } catch { /* ignore */ }

    const handleStorage = (e: StorageEvent) => {
      if (e.key === `timespace_manual_schedule_${email}` && e.newValue) {
        try {
          setManualItems(JSON.parse(e.newValue));
        } catch { /* ignore */ }
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [email]);

  const saveManualItem = (
    item: ScheduledItem,
    dateKeys: string | string[],
    oldItemId?: string
  ) => {
    const keys = Array.isArray(dateKeys) ? dateKeys : [dateKeys];
    const baseId = oldItemId
      ? oldItemId.replace(/_\d{4}-\d{2}-\d{2}$/, "")
      : item.id.replace(/_\d{4}-\d{2}-\d{2}$/, "");

    setManualItems((prev) => {
      const updated = { ...prev };

      // If updating an existing item, remove old occurrences across all days first
      if (oldItemId) {
        for (const dKey of Object.keys(updated)) {
          updated[dKey] = (updated[dKey] || []).filter(
            (it) => it.id !== oldItemId && !it.id.startsWith(baseId)
          );
        }
      }

      // Add to each selected day
      for (const dKey of keys) {
        const existing = updated[dKey] || [];
        const itemForDay: ScheduledItem = {
          ...item,
          id: `${baseId}_${dKey}`,
        };
        // Avoid duplicate
        const filtered = existing.filter(
          (it) => it.id !== itemForDay.id && !(it.startHour === item.startHour && it.title === item.title)
        );
        updated[dKey] = [...filtered, itemForDay];
      }

      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(`timespace_manual_schedule_${email}`, JSON.stringify(updated));
        } catch { /* ignore */ }
      }
      return updated;
    });
  };

  const deleteManualItem = (itemId: string) => {
    const baseId = itemId.replace(/_\d{4}-\d{2}-\d{2}$/, "");
    setManualItems((prev) => {
      const updated = { ...prev };
      for (const dKey of Object.keys(updated)) {
        updated[dKey] = (updated[dKey] || []).filter(
          (it) => it.id !== itemId && !it.id.startsWith(baseId)
        );
      }
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(`timespace_manual_schedule_${email}`, JSON.stringify(updated));
        } catch { /* ignore */ }
      }
      return updated;
    });
  };

  const taskById = new Map(tasks.map((task) => [task.id, task]));

  const scheduledItemsByDay: Record<string, ScheduledItem[]> = {};

  for (const date of days) {
    const dKey = formatLocalDate(date);
    const list: ScheduledItem[] = [];

    // 1. Explicit items from backend schedule
    const backendBlocks = schedules[dKey]?.schedule || [];
    for (const b of backendBlocks) {
      const startH = Number(b.startTime?.split(":")[0]) || 0;
      const endH = Number(b.endTime?.split(":")[0]) || (startH + 1);
      const startM = Number(b.startTime?.split(":")[1]) || 0;
      const endM = Number(b.endTime?.split(":")[1]) || 0;
      const durationMins = (endH * 60 + endM) - (startH * 60 + startM);
      const task = b.taskId ? taskById.get(b.taskId) : undefined;
      const isCompleted = task?.status === "completed" ||
        ((task?.actualMinutesSpent ?? 0) >= (task?.estimatedMinutes ?? 0) * 0.8);

      list.push({
        id: b.taskId || `block_${dKey}_${startH}`,
        taskId: b.taskId,
        title: b.title,
        durationMinutes: Math.max(5, durationMins > 0 ? durationMins : 60),
        startHour: startH,
        startMinute: startM,
        status: isCompleted ? "completed" : (task?.status === "in_progress" ? "in_progress" : "pending"),
        color: task?.color || "#A0785A",
        deadline: task?.deadline,
      });
    }

    // 2. Manual items scheduled from UI
    if (manualItems[dKey]) {
      list.push(...manualItems[dKey]);
    }

    // 3. Deadline tasks matching this date if not already included
    for (const t of tasks) {
      if (!t.deadline) continue;
      const dStr = t.deadline.slice(0, 10);
      if (dStr === dKey && !list.some((it) => it.taskId === t.id)) {
        const dHour = t.deadline.includes("T") ? new Date(t.deadline).getHours() : 17;
        list.push({
          id: t.id,
          taskId: t.id,
          title: t.title,
          durationMinutes: t.estimatedMinutes || 30,
          startHour: isNaN(dHour) ? 17 : dHour,
          status: t.status === "completed" ? "completed" : "pending",
          color: t.color || "#A0785A",
          deadline: t.deadline,
        });
      }
    }

    scheduledItemsByDay[dKey] = list;
  }

  const cellMap = buildWeeklyHourGrid(days, scheduledItemsByDay, userSleep, new Date());

  const [selectedCellKey, setSelectedCellKey] = useState<string | null>(null);
  const selectedCell = selectedCellKey ? cellMap.get(selectedCellKey) || null : null;

  return (
    <section className="bg-white rounded-2xl border border-[#E8E2D9] p-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-heading font-600 text-[#1A1A1A]">Weekly Hour Map</h2>
            <span className="text-[11px] font-semibold text-[#A0785A] bg-[#F5EFE8] px-2 py-0.5 rounded-md">
              Interactive 7×24
            </span>
          </div>
          <p className="text-xs text-[#6B7280] mt-1">Every hour from Monday through Sunday · Click any cell to inspect, edit, or schedule</p>
        </div>
        <div className="flex items-center gap-3.5 text-xs text-[#6B7280] flex-wrap">
          <span className="flex items-center gap-1.5"><i className="w-3 h-3 rounded-xs bg-[#BFE8C8] border border-[#A3D9AE]" /> Complete</span>
          <span className="flex items-center gap-1.5"><i className="w-3 h-3 rounded-xs bg-[#F4B8B8] border border-[#E89E9E]" /> Missed</span>
          <span className="flex items-center gap-1.5"><i className="w-3 h-3 rounded-xs bg-[#E2E8F0] border border-[#CBD5E1]" /> Scheduled</span>
          <span className="flex items-center gap-1.5"><i className="w-3 h-3 rounded-xs bg-[#EEF2FF] border border-[#C7D2FE]" /> Sleep</span>
          <span className="flex items-center gap-1.5"><i className="w-3 h-3 rounded-xs bg-[#F1F1F1]" /> Empty</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <div className="min-w-[900px]">
          {/* Hour Numbers Header */}
          <div className="grid grid-cols-[72px_repeat(24,minmax(32px,1fr))] gap-1 mb-1">
            <div />
            {hours.map((hour) => (
              <div key={hour} className="text-center text-[10px] font-medium text-[#6B7280]">
                {String(hour).padStart(2, "0")}
              </div>
            ))}
          </div>

          {/* 7 Days Matrix */}
          {days.map((date) => {
            const dateKey = formatLocalDate(date);
            const isCurrentDay = mounted && dateKey === formatLocalDate(today);

            return (
              <div key={dateKey} className="grid grid-cols-[72px_repeat(24,minmax(32px,1fr))] gap-1 mb-1">
                <div className={`flex items-center text-xs font-semibold ${isCurrentDay ? "text-[#A0785A]" : "text-[#6B7280]"}`}>
                  {date.toLocaleDateString("en-US", { weekday: "short" })}
                  {isCurrentDay && <span className="ml-1 w-1.5 h-1.5 rounded-full bg-[#A0785A]" title="Today" />}
                </div>

                {hours.map((hour) => {
                  const cellKey = `${dateKey}_${hour}`;
                  const cell = cellMap.get(cellKey)!;
                  const hasMultiple = cell.items.length > 1;
                  const hasTasks = cell.items.length > 0 && cell.status !== "sleep";

                  return (
                    <button
                      type="button"
                      key={hour}
                      onClick={() => setSelectedCellKey(cellKey)}
                      title={`${cell.label} (Click to inspect or edit)`}
                      className={`h-7 rounded-xs ${cell.tone} relative transition-all duration-150 hover:ring-2 hover:ring-[#A0785A]/50 hover:scale-105 focus:outline-hidden cursor-pointer flex items-center justify-center group`}
                    >
                      {cell.status === "sleep" ? (
                        <Moon size={9} className="text-[#6366F1]/50" />
                      ) : hasMultiple ? (
                        <div className="flex items-center gap-0.5">
                          {cell.items.slice(0, 3).map((_, i) => (
                            <span key={i} className="w-1 h-1 rounded-full bg-[#475569]/70" />
                          ))}
                        </div>
                      ) : null}

                      {/* Visual pencil edit indicator on hover for cells with scheduled tasks */}
                      {hasTasks && (
                        <span className="absolute inset-0 bg-[#A0785A]/15 rounded-xs opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                          <Pencil size={9} className="text-[#A0785A]" />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      {/* Hour Detail Modal */}
      {selectedCell && (
        <HourDetailModal
          cell={selectedCell}
          onClose={() => setSelectedCellKey(null)}
          tasks={tasks}
          onToggleTask={onToggleTask}
          onScheduleItem={saveManualItem}
          onDeleteItem={deleteManualItem}
          cellMap={cellMap}
          sleepConfig={userSleep}
          days={days}
        />
      )}
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
  const [assessment, setAssessment] = useState<ProductivityAssessment | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("timespace_assessment");
      if (saved) setAssessment(JSON.parse(saved));
    } catch { /* ignore */ }
  }, []);
  const [activeSession, setActiveSession] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [timerSelectedTaskId, setTimerSelectedTaskId] = useState("");
  const [coachLoading, setCoachLoading] = useState(false);
  const [showTimeUpModal, setShowTimeUpModal] = useState(false);
  const [timeUpTask, setTimeUpTask] = useState<Task | null>(null);
  const [hasPrompted, setHasPrompted] = useState(false);
  const [userSleep, setUserSleep] = useState<SleepConfig>(DEFAULT_SLEEP_CONFIG);

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
    weekStart.setHours(0, 0, 0, 0);
    weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
    const weekDates = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + index);
      return formatLocalDate(date);
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

    // Load user sleep preferences
    fetchWithAuth(`${API_URL}/users/me?email=${encodeURIComponent(email)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data) {
          const sh = data.sleepStartTime ? parseInt(data.sleepStartTime.split(":")[0], 10) : 22;
          const eh = data.sleepEndTime ? parseInt(data.sleepEndTime.split(":")[0], 10) : 6;
          setUserSleep({
            startHour: isNaN(sh) ? 22 : sh,
            endHour: isNaN(eh) ? 6 : eh,
            enabled: true,
          });
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

  const fetchCoach = async () => {
    if (!analytics) return;
    setCoachLoading(true);
    try {
      const res = await fetchWithAuth(`${API_URL}/ai/coach/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_email: email || "user@example.com",
          total_tasks: analytics.totalTasks,
          completed_tasks: analytics.completedTasks,
          total_focus_minutes: analytics.totalFocusMinutes,
        }),
      });
      if (res.ok) {
        const d = await res.json();
        if (d) setCoach(d);
      }
    } catch (err) {
      console.error("Failed to fetch coach recommendations:", err);
    } finally {
      setCoachLoading(false);
    }
  };

  // Fetch AI coaching & Server Productivity Score after analytics/tasks loaded
  useEffect(() => {
    if (!analytics) return;
    fetchCoach();

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

  const handleAddMinutes = async (mins: number) => {
    if (!timeUpTask) return;
    try {
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
        setHasPrompted(false);
        fetchAllData();
      } else {
        alert("Failed to extend task time.");
      }
    } catch (e) {
      console.error(e);
      alert("Error extending task time.");
    }
  };

  const handleFinishTask = async () => {
    if (!timeUpTask) return;
    const taskToFinish = timeUpTask;
    setShowTimeUpModal(false);
    
    // 1. Optimistically mark task as completed locally
    setTasks((prev) =>
      prev.map((t) => (t.id === taskToFinish.id ? { ...t, status: "completed" } : t))
    );

    try {
      // 2. Persist completed status to backend
      await fetchWithAuth(`${API_URL}/tasks/${taskToFinish.id}/status?email=${encodeURIComponent(email)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "completed" }),
      });
      // 3. Stop running session (records actual minutes)
      await stopSession(true);
      // 4. Fetch all updated data
      fetchAllData();
    } catch (e) {
      console.error("Error completing task:", e);
    }
  };

  const toggleTaskStatus = async (taskId: string, currentStatus: string) => {
    const nextStatus = currentStatus === "completed" ? "pending" : "completed";
    try {
      const res = await fetchWithAuth(`${API_URL}/tasks/${taskId}/status?email=${encodeURIComponent(email)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (res.ok) {
        setTasks((prev) =>
          prev.map((t) => (t.id === taskId ? { ...t, status: nextStatus } : t))
        );
        fetchAllData();
      }
    } catch {
      /* offline */
    }
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

  const stopSession = async (forceComplete = false) => {
    if (!forceComplete && activeSession) {
      const task = tasks.find((t) => t.id === activeSession);
      if (task) {
        const totalSec = (task.estimatedMinutes || 30) * 60;
        const spentSec = (task.actualMinutesSpent || 0) * 60 + elapsed;
        if (spentSec >= totalSec) {
          setTimeUpTask(task);
          setShowTimeUpModal(true);
          setHasPrompted(true);
          return;
        }
      }
    }
    try {
      if (sessionId) {
        await fetchWithAuth(`${API_URL}/sessions/${sessionId}/stop`, { method: "PUT" });
      } else {
        const res = await fetchWithAuth(`${API_URL}/sessions/active`);
        if (res.ok) {
          const active = await res.json();
          if (active?.id) {
            await fetchWithAuth(`${API_URL}/sessions/${active.id}/stop`, { method: "PUT" });
          }
        }
      }
    } catch (e) {
      console.error("Failed to stop session:", e);
    } finally {
      setActiveSession(null);
      setSessionId(null);
      setElapsed(0);
      fetchAllData();
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
        statusText: "Completed",
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
          statusText: "In Progress",
          isLive: true,
          isOvertime: false,
        };
      } else {
        const overSec = Math.abs(remainingSec);
        const overM = Math.floor(overSec / 60);
        const overS = overSec % 60;
        return {
          label: `+${overM}m ${String(overS).padStart(2, "0")}s overtime`,
          statusText: "In Progress",
          isLive: true,
          isOvertime: true,
        };
      }
    }

    if ((task.actualMinutesSpent || 0) > 0) {
      const remM = Math.max(0, (task.estimatedMinutes || 30) - (task.actualMinutesSpent || 0));
      return {
        label: `${remM}m left of ${task.estimatedMinutes}m · Pending`,
        statusText: "Pending",
        isLive: false,
        isOvertime: false,
      };
    }

    return {
      label: `${task.estimatedMinutes}m · Pending`,
      statusText: "Pending",
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

          <WeeklyHourGrid
            tasks={tasks}
            schedules={weeklySchedules}
            userSleep={userSleep}
            onToggleTask={toggleTaskStatus}
          />
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
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-[#F5EFE8] flex items-center justify-center">
                    <Brain size={16} className="text-[#A0785A]" />
                  </div>
                  <h2 className="font-heading font-600 text-[#1A1A1A]">AI Coach</h2>
                </div>
                <button
                  type="button"
                  onClick={fetchCoach}
                  disabled={coachLoading}
                  className="text-xs text-[#A0785A] hover:underline flex items-center gap-1 cursor-pointer disabled:opacity-50"
                  title="Refresh AI coaching recommendations"
                >
                  <RotateCw size={12} className={coachLoading ? "animate-spin" : ""} />
                  <span>Refresh</span>
                </button>
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
            <div className="bg-white rounded-2xl border border-[#E8E2D9] p-6 flex flex-col items-center justify-center gap-3 text-center">
              <div className="w-12 h-12 rounded-2xl bg-[#F5EFE8] flex items-center justify-center">
                <Clock size={22} className={`text-[#A0785A] ${activeSession ? "animate-pulse" : ""}`} />
              </div>
              <div>
                <p className="text-center text-xs text-[#6B7280] mb-0.5">
                  {activeSession ? "Session in progress" : "Focus Timer"}
                </p>
                {activeSession && (
                  <p className="text-xs font-semibold text-[#A0785A] truncate max-w-[200px] mx-auto">
                    {tasks.find((t) => t.id === activeSession)?.title || "Active Task"}
                  </p>
                )}
                <p className="font-heading text-4xl font-700 text-[#1A1A1A] text-center tabular-nums mt-1">
                  {fmtTime(elapsed)}
                </p>
              </div>

              {activeSession ? (
                <button
                  type="button"
                  onClick={() => stopSession()}
                  className="flex items-center gap-2 bg-[#DC2626] text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-red-700 transition-all cursor-pointer shadow-xs"
                >
                  <Square size={13} fill="white" /> Stop Session
                </button>
              ) : (
                <div className="w-full space-y-2 mt-1">
                  {tasks.filter((t) => t.status !== "completed").length > 0 ? (
                    <>
                      <select
                        value={timerSelectedTaskId}
                        onChange={(e) => setTimerSelectedTaskId(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-[#E8E2D9] text-[#1A1A1A] bg-[#FAFAF8] focus:outline-none focus:border-[#A0785A]"
                      >
                        <option value="">Select a task to focus on...</option>
                        {tasks
                          .filter((t) => t.status !== "completed")
                          .map((t) => (
                            <option key={t.id} value={t.id}>
                              {t.title} ({t.estimatedMinutes}m)
                            </option>
                          ))}
                      </select>
                      <button
                        type="button"
                        disabled={!timerSelectedTaskId}
                        onClick={() => {
                          const task = tasks.find((t) => t.id === timerSelectedTaskId);
                          if (task) startSession(task);
                        }}
                        className="w-full flex items-center justify-center gap-2 bg-[#A0785A] text-white px-4 py-2 rounded-xl text-xs font-semibold hover:bg-[#7D5C42] transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-xs"
                      >
                        <Play size={12} fill="white" /> Start Timer
                      </button>
                    </>
                  ) : (
                    <Link
                      href="/tasks"
                      className="inline-block text-xs text-[#A0785A] hover:underline font-semibold"
                    >
                      + Create a task to start tracking
                    </Link>
                  )}
                </div>
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
                            className={`w-1.5 h-8 rounded-full shrink-0 ${isActive ? "animate-pulse ring-2 ring-[#A0785A]/30" : ""}`}
                            style={{ backgroundColor: task.color || BRAND }}
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
                          <div>
                            <p
                              className={`text-sm font-medium ${
                                task.status === "completed" ? "line-through text-[#6B7280]" : "text-[#1A1A1A]"
                              }`}
                            >
                              {task.title}
                            </p>
                            <div className="flex items-center gap-2 mt-0.5">
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
                              <span
                                className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                                  task.status === "completed"
                                    ? "bg-green-50 text-[#16A34A]"
                                    : isActive
                                    ? "bg-[#F5EFE8] text-[#A0785A]"
                                    : "bg-gray-100 text-gray-600"
                                }`}
                              >
                                {isActive ? "In Progress (Live)" : task.status === "completed" ? "Completed" : "Pending"}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
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
    </div>
  );
}
