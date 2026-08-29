"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Calendar, CheckCircle2, LayoutDashboard, LogOut } from "lucide-react";
import { logout } from "@/lib/api";

const navigation = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/tasks", label: "Tasks", icon: CheckCircle2 },
    { href: "/schedule", label: "Schedule", icon: Calendar },
];

export default function Sidebar({ active }: { active: "Dashboard" | "Tasks" | "Schedule" }) {
    const router = useRouter();

    return (
        <aside className="hidden md:flex w-56 min-h-screen shrink-0 flex-col gap-1 border-r border-[#E8E2D9] bg-white px-4 py-6">
            <div className="mb-8 flex items-center gap-2 px-2">
                <Image src="/images/logo/logo.webp" alt="TimeSpace" width={32} height={32} priority />
                <span className="font-heading font-700 text-[#1A1A1A]">TimeSpace</span>
            </div>
            <nav aria-label="Primary navigation" className="overflow-hidden rounded-xl border border-[#E8E2D9]">
                {navigation.map(({ href, label, icon: Icon }) => (
                    <Link
                        key={href}
                        href={href}
                        className={`flex w-full items-center gap-3 border-b border-[#E8E2D9] px-3 py-3 text-sm font-medium transition-all last:border-b-0 ${active === label
                            ? "bg-[#F5EFE8] text-[#A0785A]"
                            : "bg-white text-[#6B7280] hover:bg-[#FAFAF8] hover:text-[#1A1A1A]"
                            }`}
                    >
                        <Icon size={16} />
                        {label}
                    </Link>
                ))}
            </nav>
            <div className="mt-auto">
                <button
                    onClick={() => logout(router.push)}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-[#6B7280] transition-all hover:bg-red-50 hover:text-[#DC2626]"
                >
                    <LogOut size={16} />
                    Sign out
                </button>
            </div>
        </aside>
    );
}
