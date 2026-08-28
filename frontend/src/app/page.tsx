import Link from "next/link";
import Image from "next/image";
import { Zap, ChevronRight } from "lucide-react";

export default function LandingPage() {
  return (
    <main className="flex flex-col min-h-screen bg-white">
      {/* ── NAVBAR ── */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-[#E8E2D9]">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Image src="/images/logo/logo.webp" alt="TimeSpace" width={32} height={32} className="w-8 h-8" priority />
            <span className="font-heading font-700 text-lg text-[#1A1A1A]">TimeSpace</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-[#6B7280]">
            <a href="#pricing" className="hover:text-[#A0785A] transition-colors">Pricing</a>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/auth/login"
              className="text-sm text-[#6B7280] hover:text-[#A0785A] transition-colors font-medium"
            >
              Sign In
            </Link>
            <Link
              href="/auth/register"
              className="text-sm bg-[#A0785A] text-white px-4 py-2 rounded-lg hover:bg-[#7D5C42] transition-colors font-medium"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="relative flex-1 flex items-center justify-center pt-20 pb-28 px-6 overflow-hidden">
        <div
          className="absolute inset-0 opacity-40"
          style={{
            background:
              "radial-gradient(ellipse 80% 60% at 50% 0%, #F5EFE8 0%, transparent 70%)",
          }}
        />
        <div className="relative z-10 max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-[#F5EFE8] text-[#A0785A] text-xs font-semibold px-3 py-1.5 rounded-full mb-6 uppercase tracking-widest">
            <Zap size={12} />
            Intelligent Time Management
          </div>
          <h1 className="font-heading text-5xl md:text-6xl font-800 text-[#1A1A1A] leading-tight mb-6">
            Your time,{" "}
            <span className="text-[#A0785A]">intelligently</span>{" "}
            managed.
          </h1>
          <p className="text-lg text-[#6B7280] max-w-xl mx-auto mb-10 leading-relaxed">
            TimeSpace tracks your habits, analyzes your performance, and automatically
            schedules your day so you always focus on what matters most.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/auth/register"
              className="flex items-center gap-2 bg-[#A0785A] text-white px-8 py-3.5 rounded-xl font-semibold hover:bg-[#7D5C42] transition-all hover:shadow-lg hover:shadow-[#A0785A]/20 hover:-translate-y-0.5"
            >
              Start for free <ChevronRight size={16} />
            </Link>
            <Link
              href="/dashboard"
              className="flex items-center gap-2 text-[#6B7280] border border-[#E8E2D9] px-8 py-3.5 rounded-xl font-semibold hover:border-[#A0785A] hover:text-[#A0785A] transition-all"
            >
              View Demo Dashboard
            </Link>
          </div>
          <p className="text-xs text-[#6B7280] mt-4">No credit card required. Free forever for personal use.</p>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-24 px-6 bg-[#A0785A]">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="font-heading text-4xl font-800 text-white mb-4">
            Ready to take back your time?
          </h2>
          <p className="text-[#F5EFE8] mb-8 text-lg">
            Join thousands of professionals who stopped guessing and started achieving.
          </p>
          <Link
            href="/auth/register"
            className="inline-flex items-center gap-2 bg-white text-[#A0785A] px-8 py-3.5 rounded-xl font-semibold hover:bg-[#F5EFE8] transition-all hover:shadow-xl hover:-translate-y-0.5"
          >
            Create your free account <ChevronRight size={16} />
          </Link>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="py-8 px-6 border-t border-[#E8E2D9] bg-white">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Image src="/images/logo/logo.webp" alt="TimeSpace" width={24} height={24} className="w-6 h-6" />
            <span className="font-heading font-600 text-sm text-[#1A1A1A]">TimeSpace</span>
          </div>
          <p className="text-xs text-[#6B7280]">
            © 2025 TimeSpace. Built to make every minute count.
          </p>
        </div>
      </footer>
    </main>
  );
}
