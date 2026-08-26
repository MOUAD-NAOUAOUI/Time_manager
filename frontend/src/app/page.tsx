import Link from "next/link";
import { Clock, Brain, BarChart3, Zap, ChevronRight, Target, TrendingUp, Calendar } from "lucide-react";

export default function LandingPage() {
  return (
    <main className="flex flex-col min-h-screen bg-white">
      {/* ── NAVBAR ── */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-[#E8E2D9]">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#A0785A] flex items-center justify-center">
              <Clock size={16} className="text-white" />
            </div>
            <span className="font-heading font-700 text-lg text-[#1A1A1A]">TimeAI</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm text-[#6B7280]">
            <a href="#features" className="hover:text-[#A0785A] transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-[#A0785A] transition-colors">How It Works</a>
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
            AI-Powered Productivity
          </div>
          <h1 className="font-heading text-5xl md:text-6xl font-800 text-[#1A1A1A] leading-tight mb-6">
            Your time,{" "}
            <span className="text-[#A0785A]">intelligently</span>{" "}
            managed.
          </h1>
          <p className="text-lg text-[#6B7280] max-w-xl mx-auto mb-10 leading-relaxed">
            TimeAI tracks your habits, analyzes your performance, and automatically
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

      {/* ── ARCHITECTURE HIGHLIGHTS ── */}
      <section className="bg-[#FAFAF8] border-y border-[#E8E2D9] py-10">
        <div className="max-w-5xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[
            { value: "Constraint AI", label: "Automated schedule optimizer" },
            { value: "Live Tracking", label: "Real-time focus sessions" },
            { value: "AES-256 GCM", label: "Encrypted data layer" },
            { value: "LLaMA 3.3", label: "Personalized AI coaching" },
          ].map((item) => (
            <div key={item.label}>
              <div className="font-heading text-xl font-800 text-[#A0785A]">{item.value}</div>
              <div className="text-xs text-[#6B7280] mt-1">{item.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-heading text-4xl font-700 text-[#1A1A1A] mb-4">
              Everything you need to be elite
            </h2>
            <p className="text-[#6B7280] max-w-xl mx-auto">
              Built for professionals who refuse to leave productivity to chance.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: Brain,
                title: "AI Scheduling",
                desc: "The AI reads your habits and auto-schedules every task into your perfect day.",
              },
              {
                icon: Clock,
                title: "Time Tracking",
                desc: "One-click timers that log exactly where your hours go — no manual entry.",
              },
              {
                icon: BarChart3,
                title: "Power BI Dashboard",
                desc: "Interactive charts showing your productivity, focus trends, and time distribution.",
              },
              {
                icon: Target,
                title: "AI Coaching",
                desc: "Weekly analysis of your weaknesses with actionable recommendations to fix them.",
              },
            ].map((feat) => (
              <div
                key={feat.title}
                className="group p-6 rounded-2xl border border-[#E8E2D9] bg-white hover:border-[#A0785A] hover:shadow-lg hover:shadow-[#A0785A]/10 transition-all hover:-translate-y-1"
              >
                <div className="w-10 h-10 rounded-xl bg-[#F5EFE8] flex items-center justify-center mb-4 group-hover:bg-[#A0785A] transition-colors">
                  <feat.icon size={20} className="text-[#A0785A] group-hover:text-white transition-colors" />
                </div>
                <h3 className="font-heading font-600 text-[#1A1A1A] mb-2">{feat.title}</h3>
                <p className="text-sm text-[#6B7280] leading-relaxed">{feat.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="how-it-works" className="py-24 px-6 bg-[#FAFAF8]">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-heading text-4xl font-700 text-[#1A1A1A] mb-4">How it works</h2>
            <p className="text-[#6B7280]">Three steps to a perfectly optimized workday.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {[
              { step: "01", icon: Calendar, title: "Add your tasks", desc: "Input tasks with estimated durations, deadlines, and custom colors for instant recognition." },
              { step: "02", icon: Brain, title: "AI builds your day", desc: "Our engine analyzes your peak performance hours and builds an optimal schedule — automatically." },
              { step: "03", icon: TrendingUp, title: "Track & improve", desc: "Real-time coaching identifies bottlenecks and rewires your schedule week over week." },
            ].map((item) => (
              <div key={item.step} className="flex flex-col items-center text-center">
                <div className="relative w-16 h-16 rounded-2xl bg-[#A0785A] flex items-center justify-center mb-5 shadow-lg shadow-[#A0785A]/20">
                  <item.icon size={24} className="text-white" />
                  <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-[#1A1A1A] text-white text-xs flex items-center justify-center font-semibold">
                    {item.step.slice(1)}
                  </span>
                </div>
                <h3 className="font-heading font-600 text-[#1A1A1A] mb-2">{item.title}</h3>
                <p className="text-sm text-[#6B7280] leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
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
            <div className="w-6 h-6 rounded-md bg-[#A0785A] flex items-center justify-center">
              <Clock size={12} className="text-white" />
            </div>
            <span className="font-heading font-600 text-sm text-[#1A1A1A]">TimeAI</span>
          </div>
          <p className="text-xs text-[#6B7280]">
            © 2025 Intelligent Time Manager. Built to make every minute count.
          </p>
        </div>
      </footer>
    </main>
  );
}
