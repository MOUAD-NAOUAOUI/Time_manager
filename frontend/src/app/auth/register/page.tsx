"use client";
import { useState } from "react";
import Link from "next/link";
import { Clock, Eye, EyeOff, ArrowRight } from "lucide-react";
import { API_URL } from "@/lib/api";

export default function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ email: "", password: "", timezone: "UTC" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        const data = await res.json();
        localStorage.setItem("token", data.token);
        localStorage.setItem("email", data.email || form.email);
        document.cookie = `auth_token=${data.token}; path=/; SameSite=Strict; max-age=86400`;
        window.location.href = "/dashboard";
      } else {
        const err = await res.json();
        alert(err.message || "Registration failed. Email may already be in use.");
      }
    } catch (err: any) {
      alert("Registration Connection Error: " + err.message);
      console.error("Fetch error details:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#FAFAF8] flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-10">
          <div className="w-9 h-9 rounded-xl bg-[#A0785A] flex items-center justify-center shadow-lg shadow-[#A0785A]/30">
            <Clock size={18} className="text-white" />
          </div>
          <span className="font-heading font-700 text-xl text-[#1A1A1A]">TimeAI</span>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl border border-[#E8E2D9] p-8 shadow-sm">
          <h1 className="font-heading text-2xl font-700 text-[#1A1A1A] mb-1">Create your account</h1>
          <p className="text-sm text-[#6B7280] mb-8">Start managing your time intelligently — for free.</p>

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
                onChange={(e) => setForm({ ...form, email: e.target.value })}
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
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
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
              {loading ? "Creating account..." : <>Create account <ArrowRight size={15} /></>}
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
