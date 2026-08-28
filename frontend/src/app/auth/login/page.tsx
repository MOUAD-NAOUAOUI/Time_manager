"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Eye, EyeOff, ArrowRight } from "lucide-react";
import { API_URL } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ email: "", password: "" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        const data = await res.json();
        localStorage.setItem("token", data.token);
        localStorage.setItem("email", data.email || form.email);
        document.cookie = `auth_token=${data.token}; path=/; SameSite=Strict; max-age=86400`;
        router.push("/dashboard");
      } else {
        const errData = await res.json().catch(() => null);
        alert(errData?.message || "Invalid credentials. Please try again.");
      }
    } catch (err: unknown) {
      alert("Login Connection Error: " + (err instanceof Error ? err.message : String(err)));
      console.error("Login fetch error:", err);
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
          <h1 className="font-heading text-2xl font-700 text-[#1A1A1A] mb-1">Welcome back</h1>
          <p className="text-sm text-[#6B7280] mb-8">Sign in to your account to continue.</p>

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
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full px-4 py-3 rounded-xl border border-[#E8E2D9] text-[#1A1A1A] text-sm bg-white placeholder:text-[#6B7280] focus:outline-none focus:border-[#A0785A] focus:ring-2 focus:ring-[#A0785A]/15 transition-all"
              />
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium text-[#1A1A1A]" htmlFor="password">
                  Password
                </label>
                <a href="#" className="text-xs text-[#A0785A] hover:underline">Forgot password?</a>
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="••••••••"
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

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="flex items-center justify-center gap-2 bg-[#A0785A] text-white py-3 rounded-xl font-semibold text-sm hover:bg-[#7D5C42] transition-all hover:shadow-lg hover:shadow-[#A0785A]/25 disabled:opacity-60 disabled:cursor-not-allowed mt-1"
            >
              {loading ? "Signing in..." : <>Sign in <ArrowRight size={15} /></>}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-[#6B7280] mt-6">
          Don&apos;t have an account?{" "}
          <Link href="/auth/register" className="text-[#A0785A] font-medium hover:underline">
            Create one for free
          </Link>
        </p>
      </div>
    </main>
  );
}
