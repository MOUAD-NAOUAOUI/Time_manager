"use client";
import { useState, useEffect } from "react";
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
  Square
} from "lucide-react";
import { API_URL, fetchWithAuth, getUserEmail } from "@/lib/api";
import Sidebar from "@/components/Sidebar";

interface Task {
  id: string;
  title: string;
  status: string;
  estimatedMinutes: number;
  color: string;
  deadline?: string;
  actualMinutesSpent?: number;
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
  const [manualForm, setManualForm] = useState({
    title: "",
    estimatedMinutes: 30,
    color: "#A0785A",
    deadline: "",
  });

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

  const fetchTasks = () => {
    fetchWithAuth(`${API_URL}/tasks`)
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => Array.isArray(d) && setTasks(d))
      .catch(() => { });
  };

  const fetchActiveSession = () => {
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
  }, []);

  // Live timer tick
  useEffect(() => {
    if (!activeSession) return;
    const t = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [activeSession]);

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
          prev.map((t) => (t.id === task.id ? { ...t, status: "in_progress" } : t))
        );
      }
    } catch { /* offline */ }
  };

  const stopSession = async () => {
    if (!sessionId) return;
    try {
      await fetchWithAuth(`${API_URL}/sessions/${sessionId}/stop`, { method: "PUT" });
      fetchTasks();
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

    if (task.status === "in_progress" && (task.actualMinutesSpent || 0) > 0) {
      const remM = Math.max(0, (task.estimatedMinutes || 30) - (task.actualMinutesSpent || 0));
      return {
        label: `${remM}m left of ${task.estimatedMinutes}m · in_progress`,
        isLive: false,
        isOvertime: false,
      };
    }

    return {
      label: `${task.estimatedMinutes}m · ${task.status}`,
      isLive: false,
      isOvertime: false,
    };
  };

  // 1. Handle Manual Task Creation
  const handleManualCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetchWithAuth(`${API_URL}/tasks`, {
        method: "POST",
        body: JSON.stringify({ ...manualForm, userEmail: getUserEmail() }),
      });
      if (res.ok) {
        setManualForm({ title: "", estimatedMinutes: 30, color: "#A0785A", deadline: "" });
        setShowManualForm(false);
        fetchTasks();
      }
    } catch {
      /* offline */
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
      const res = await fetchWithAuth(url, {
        method: "POST",
        body: JSON.stringify({ message: aiPrompt }),
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
      const res = await fetchWithAuth(`${API_URL}/ai/chat/confirm`, {
        method: "POST",
        body: JSON.stringify({ tasks: proposal.extracted_tasks }),
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
                  <label className="block text-sm font-medium text-[#1A1A1A] mb-1.5">Deadline (optional)</label>
                  <input
                    type="datetime-local"
                    value={manualForm.deadline}
                    onChange={(e) => setManualForm({ ...manualForm, deadline: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-[#E8E2D9] text-sm text-[#1A1A1A] focus:outline-none focus:border-[#A0785A] focus:ring-2 focus:ring-[#A0785A]/15 transition-all"
                  />
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

          {/* 3. Task List */}
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
          ) : (
            <div className="flex flex-col gap-3">
              {tasks.map((task) => {
                const timeInfo = getTaskRemainingDisplay(task);
                const isActive = activeSession === task.id;
                return (
                  <div
                    key={task.id}
                    className={`bg-white rounded-2xl border p-4 flex items-center gap-4 transition-all ${
                      isActive
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
                          className={`text-xs flex items-center gap-1 font-medium ${
                            timeInfo.isOvertime
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
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            task.status === "completed"
                              ? "bg-green-50 text-[#16A34A]"
                              : isActive || task.status === "in_progress"
                              ? "bg-[#F5EFE8] text-[#A0785A]"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {isActive ? "in_progress (live)" : task.status}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
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
    </div>
  );
}
