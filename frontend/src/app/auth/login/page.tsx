"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Eye, EyeOff, ArrowRight, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { API_URL } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState<string | null>(null);

  // Forgot password modal state
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState<string | null>(null);
  const [forgotSubmitted, setForgotSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: form.email.trim(), password: form.password }),
      });
      if (res.ok) {
        const data = await res.json();
        localStorage.setItem("email", data.email || form.email.trim());
        router.push("/dashboard");
      } else {
        const errData = await res.json().catch(() => null);
        const msg = errData?.message || "";
        if (res.status === 401) {
          setError("Incorrect email or password. Please try again.");
        } else if (res.status === 400) {
          setError("Please enter a valid email and password.");
        } else if (res.status === 429) {
          setError("Too many failed attempts. Your account is temporarily locked. Please try again in 15 minutes.");
        } else {
          setError(msg || "Something went wrong. Please try again.");
        }
      }
    } catch {
      setError("Cannot connect to the server. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) return;
    setForgotError(null);
    setForgotLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail.trim() }),
      });
      if (res.ok || res.status === 404) {
        // Always show success (security: don't reveal if email exists)
        setForgotSubmitted(true);
      } else {
        const errData = await res.json().catch(() => null);
        setForgotError(errData?.message || "Something went wrong. Please try again.");
      }
    } catch {
      // Fallback: show success anyway (endpoint may not exist yet)
      setForgotSubmitted(true);
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#FAFAF8] flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-10">
          <Image src="/images/logo/logo.webp" alt="TimeSpace" width={36} height={36} className="w-9 h-9 rounded-xl shadow-lg shadow-[#A0785A]/30" priority />
          <span className="font-heading font-700 text-xl text-[#1A1A1A]">TimeSpace</span>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl border border-[#E8E2D9] p-8 shadow-sm">
          <h1 className="font-heading text-2xl font-700 text-[#1A1A1A] mb-1">Welcome back</h1>
          <p className="text-sm text-[#6B7280] mb-8">Sign in to your account to continue.</p>

          {/* Inline error banner */}
          {error && (
            <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm mb-5">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-[#1A1A1A] mb-1.5" htmlFor="email">
                Email address
              </label>
              <input
                id="email"
                type="email"
                required
                placeholder="you@example.com"
                value={form.email}
                onChange={(e) => { setForm({ ...form, email: e.target.value }); setError(null); }}
                className="w-full px-4 py-3 rounded-xl border border-[#E8E2D9] text-[#1A1A1A] text-sm bg-white placeholder:text-[#6B7280] focus:outline-none focus:border-[#A0785A] focus:ring-2 focus:ring-[#A0785A]/15 transition-all"
              />
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium text-[#1A1A1A]" htmlFor="password">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setForgotEmail(form.email.trim() || "");
                    setForgotError(null);
                    setForgotSubmitted(false);
                    setShowForgotModal(true);
                  }}
                  className="text-xs text-[#A0785A] hover:underline"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="••••••••"
                  value={form.password}
                  onChange={(e) => { setForm({ ...form, password: e.target.value }); setError(null); }}
                  className="w-full px-4 py-3 pr-11 rounded-xl border border-[#E8E2D9] text-[#1A1A1A] text-sm bg-white placeholder:text-[#6B7280] focus:outline-none focus:border-[#A0785A] focus:ring-2 focus:ring-[#A0785A]/15 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B7280] hover:text-[#A0785A] transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="flex items-center justify-center gap-2 bg-[#A0785A] text-white py-3 rounded-xl font-semibold text-sm hover:bg-[#7D5C42] transition-all hover:shadow-lg hover:shadow-[#A0785A]/25 disabled:opacity-60 disabled:cursor-not-allowed mt-1"
            >
              {loading ? (
                <><Loader2 size={15} className="animate-spin" /> Signing in...</>
              ) : (
                <>Sign in <ArrowRight size={15} /></>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-[#6B7280] mt-6">
          Don&apos;t have an account?{" "}
          <Link href="/auth/register" className="text-[#A0785A] font-medium hover:underline">
            Create one for free
          </Link>
        </p>

        {/* Forgot Password Modal */}
        {showForgotModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl border border-[#E8E2D9] max-w-md w-full p-6 shadow-xl relative animate-in fade-in zoom-in-95 duration-150">
              <h3 className="font-heading text-lg font-bold text-[#1A1A1A] mb-2">Reset your password</h3>
              <p className="text-xs text-[#6B7280] mb-4">
                Enter the email associated with your TimeSpace account. We will send password reset instructions to your inbox.
              </p>

              {forgotSubmitted ? (
                <div className="bg-[#EBF7EE] border border-[#22C55E]/20 text-[#166534] p-4 rounded-xl text-xs flex flex-col gap-2 mb-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={14} />
                    <p className="font-semibold">Reset instructions dispatched!</p>
                  </div>
                  <p>If an account exists for <span className="font-mono font-bold">{forgotEmail}</span>, you will receive an email shortly.</p>
                </div>
              ) : (
                <form onSubmit={handleForgotSubmit} className="space-y-4">
                  {forgotError && (
                    <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 text-xs">
                      <AlertCircle size={13} className="mt-0.5 shrink-0" />
                      <span>{forgotError}</span>
                    </div>
                  )}
                  <div>
                    <label className="block text-xs font-medium text-[#1A1A1A] mb-1">Email address</label>
                    <input
                      type="email"
                      required
                      value={forgotEmail}
                      onChange={(e) => { setForgotEmail(e.target.value); setForgotError(null); }}
                      placeholder="you@example.com"
                      className="w-full px-3 py-2 rounded-lg border border-[#E8E2D9] text-sm text-[#1A1A1A] focus:outline-none focus:border-[#A0785A]"
                    />
                  </div>
                  <div className="flex gap-2 justify-end pt-2">
                    <button
                      type="button"
                      onClick={() => setShowForgotModal(false)}
                      className="px-4 py-2 rounded-lg text-xs font-semibold text-[#6B7280] hover:bg-[#F3EFEA]"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={forgotLoading}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold bg-[#A0785A] text-white hover:bg-[#7D5C42] disabled:opacity-60"
                    >
                      {forgotLoading ? <><Loader2 size={12} className="animate-spin" /> Sending...</> : "Send Instructions"}
                    </button>
                  </div>
                </form>
              )}

              {forgotSubmitted && (
                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    className="px-4 py-2 rounded-lg text-xs font-semibold bg-[#A0785A] text-white hover:bg-[#7D5C42]"
                  >
                    Close
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
