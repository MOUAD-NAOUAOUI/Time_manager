"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Plus, Trash2, Clock, CheckCircle2, Circle, LayoutDashboard, LogOut } from "lucide-react";

interface Task {
  id: string;
  title: string;
  status: string;
  estimatedMinutes: number;
  color: string;
  deadline?: string;
}

const COLORS = ["#A0785A", "#16A34A", "#D97706", "#2563EB", "#9333EA", "#DC2626", "#0891B2"];

export default function TasksPage() {
  const [tasks, setTasks]       = useState<Task[]>([]);
  const [loading, setLoading]   = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    title: "",
    estimatedMinutes: 30,
    color: "#A0785A",
    deadline: "",
  });

  const email  = typeof window !== "undefined" ? localStorage.getItem("email") || "" : "";
  const token  = typeof window !== "undefined" ? localStorage.getItem("token") || "" : "";
  const headers = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

  const fetchTasks = () => {
    fetch(`http://127.0.0.1:8080/tasks?email=${encodeURIComponent(email)}`, { headers })
      .then((r) => r.ok ? r.json() : [])
      .then((d) => Array.isArray(d) && setTasks(d))
      .catch(() => {});
  };

  useEffect(() => { fetchTasks(); }, []); // eslint-disable-line

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("http://127.0.0.1:8080/tasks", {
        method: "POST",
        headers,
        body: JSON.stringify({ ...form, userEmail: email }),
      });
      if (res.ok) {
        setForm({ title: "", estimatedMinutes: 30, color: "#A0785A", deadline: "" });
        setShowForm(false);
        fetchTasks();
      }
    } catch { /* offline */ }
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen bg-[#FAFAF8]">
      {/* Sidebar */}
      <aside className="hidden md:flex flex-col w-56 min-h-screen bg-white border-r border-[#E8E2D9] py-6 px-4 gap-1">
        <div className="flex items-center gap-2 px-2 mb-8">
          <div className="w-8 h-8 rounded-lg bg-[#A0785A] flex items-center justify-center">
            <Clock size={15} className="text-white" />
          </div>
          <span className="font-heading font-700 text-[#1A1A1A]">TimeAI</span>
        </div>
        {[
          { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
          { href: "/tasks",     label: "Tasks",     icon: CheckCircle2 },
        ].map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
              l.label === "Tasks"
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

      {/* Main */}
      <div className="flex-1 flex flex-col">
        <header className="bg-white border-b border-[#E8E2D9] px-6 py-4 flex items-center justify-between">
          <div>
            <h1 className="font-heading text-xl font-700 text-[#1A1A1A]">Tasks</h1>
            <p className="text-xs text-[#6B7280]">{tasks.length} total · {tasks.filter((t) => t.status === "completed").length} completed</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-2 bg-[#A0785A] text-white text-sm px-4 py-2 rounded-xl font-semibold hover:bg-[#7D5C42] transition-all"
          >
            <Plus size={14} /> New Task
          </button>
        </header>

        <main className="flex-1 p-6 max-w-4xl mx-auto w-full space-y-4">

          {/* Create Form */}
          {showForm && (
            <div className="bg-white rounded-2xl border border-[#A0785A]/30 p-6 shadow-sm">
              <h2 className="font-heading font-600 text-[#1A1A1A] mb-5">Create new task</h2>
              <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-[#1A1A1A] mb-1.5">Task title *</label>
                  <input
                    required
                    placeholder="e.g. Write project report"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    className="w-full px-4 py-3 rounded-xl border border-[#E8E2D9] text-sm text-[#1A1A1A] placeholder:text-[#6B7280] focus:outline-none focus:border-[#A0785A] focus:ring-2 focus:ring-[#A0785A]/15 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#1A1A1A] mb-1.5">Estimated duration (minutes)</label>
                  <input
                    type="number"
                    min={5}
                    max={480}
                    value={form.estimatedMinutes}
                    onChange={(e) => setForm({ ...form, estimatedMinutes: Number(e.target.value) })}
                    className="w-full px-4 py-3 rounded-xl border border-[#E8E2D9] text-sm text-[#1A1A1A] focus:outline-none focus:border-[#A0785A] focus:ring-2 focus:ring-[#A0785A]/15 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#1A1A1A] mb-1.5">Deadline (optional)</label>
                  <input
                    type="datetime-local"
                    value={form.deadline}
                    onChange={(e) => setForm({ ...form, deadline: e.target.value })}
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
                        onClick={() => setForm({ ...form, color: c })}
                        className="w-7 h-7 rounded-full transition-all hover:scale-110"
                        style={{
                          backgroundColor: c,
                          outline: form.color === c ? `3px solid ${c}` : "none",
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
                    {loading ? "Creating…" : "Create Task"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowForm(false)}
                    className="px-6 border border-[#E8E2D9] text-[#6B7280] py-3 rounded-xl text-sm font-semibold hover:border-[#A0785A] transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Task List */}
          {tasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="w-16 h-16 rounded-2xl bg-[#F5EFE8] flex items-center justify-center mb-4">
                <CheckCircle2 size={28} className="text-[#A0785A]" />
              </div>
              <p className="font-heading font-600 text-[#1A1A1A] mb-2">No tasks yet</p>
              <p className="text-sm text-[#6B7280] mb-6">Create your first task and let the AI schedule your day.</p>
              <button
                onClick={() => setShowForm(true)}
                className="flex items-center gap-2 bg-[#A0785A] text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#7D5C42] transition-all"
              >
                <Plus size={14} /> Create first task
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  className="bg-white rounded-2xl border border-[#E8E2D9] p-4 flex items-center gap-4 hover:border-[#A0785A]/30 hover:shadow-sm transition-all"
                >
                  <div className="w-1 h-10 rounded-full shrink-0" style={{ backgroundColor: task.color || "#A0785A" }} />
                  <div className="flex items-center gap-2 shrink-0">
                    {task.status === "completed"
                      ? <CheckCircle2 size={18} className="text-[#16A34A]" />
                      : <Circle size={18} className="text-[#E8E2D9]" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${task.status === "completed" ? "line-through text-[#6B7280]" : "text-[#1A1A1A]"}`}>
                      {task.title}
                    </p>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-xs text-[#6B7280] flex items-center gap-1">
                        <Clock size={10} /> {task.estimatedMinutes}m
                      </span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        task.status === "completed"
                          ? "bg-green-50 text-[#16A34A]"
                          : "bg-[#F5EFE8] text-[#A0785A]"
                      }`}>
                        {task.status}
                      </span>
                    </div>
                  </div>
                  <Link
                    href="/dashboard"
                    className="text-xs text-[#A0785A] border border-[#A0785A]/30 px-3 py-1.5 rounded-lg hover:bg-[#F5EFE8] transition-all font-medium shrink-0"
                  >
                    Track
                  </Link>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
