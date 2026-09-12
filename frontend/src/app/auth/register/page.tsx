"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Eye, EyeOff, ArrowRight, AlertCircle, Loader2 } from "lucide-react";
import { API_URL } from "@/lib/api";

export default function RegisterPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ email: "", password: "", timezone: "UTC" });
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ ...form, email: form.email.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        localStorage.setItem("email", data.email || form.email.trim());
        router.push("/dashboard");
      } else {
        const err = await res.json().catch(() => null);
        const msg = err?.message || "";
        if (res.status === 409) {
          setError("An account with this email already exists. Try signing in instead.");
        } else if (res.status === 400 && msg.toLowerCase().includes("password")) {
          setError("Password must be at least 8 characters with uppercase, lowercase, a number, and a special character (@#$%^&+=!_-.).");
        } else {
          setError(msg || "Registration failed. Please check your details and try again.");
        }
      }
    } catch {
      setError("Cannot connect to the server. Please check your connection and try again.");
    } finally {
      setLoading(false);
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
          <h1 className="font-heading text-2xl font-700 text-[#1A1A1A] mb-1">Create your account</h1>
          <p className="text-sm text-[#6B7280] mb-8">Start managing your time intelligently — for free.</p>

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
              <label className="block text-sm font-medium text-[#1A1A1A] mb-1.5" htmlFor="reg-email">
                Email address
              </label>
              <input
                id="reg-email"
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
              <label className="block text-sm font-medium text-[#1A1A1A] mb-1.5" htmlFor="reg-password">
                Password
              </label>
              <div className="relative">
                <input
                  id="reg-password"
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={8}
                  placeholder="Min. 8 characters"
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
              <p className="text-xs text-[#9CA3AF] mt-1.5">
                Min. 8 chars · uppercase · lowercase · number · special character (@#\$%^&amp;+=!_-.)
              </p>
            </div>

            {/* Timezone */}
            <div>
              <label className="block text-sm font-medium text-[#1A1A1A] mb-1.5" htmlFor="timezone">
                Your timezone
              </label>
              <select
                id="timezone"
                value={form.timezone}
                onChange={(e) => setForm({ ...form, timezone: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-[#E8E2D9] text-[#1A1A1A] text-sm bg-white focus:outline-none focus:border-[#A0785A] focus:ring-2 focus:ring-[#A0785A]/15 transition-all"
              >
                <option value="UTC">UTC</option>
                <option value="Europe/Paris">Europe/Paris (CET)</option>
                <option value="America/New_York">America/New_York (EST)</option>
                <option value="America/Los_Angeles">America/Los_Angeles (PST)</option>
                <option value="Asia/Dubai">Asia/Dubai (GST)</option>
                <option value="Asia/Tokyo">Asia/Tokyo (JST)</option>
              </select>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="flex items-center justify-center gap-2 bg-[#A0785A] text-white py-3 rounded-xl font-semibold text-sm hover:bg-[#7D5C42] transition-all hover:shadow-lg hover:shadow-[#A0785A]/25 disabled:opacity-60 disabled:cursor-not-allowed mt-1"
            >
              {loading ? (
                <><Loader2 size={15} className="animate-spin" /> Creating account...</>
              ) : (
                <>Create account <ArrowRight size={15} /></>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-[#6B7280] mt-6">
          Already have an account?{" "}
          <Link href="/auth/login" className="text-[#A0785A] font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
