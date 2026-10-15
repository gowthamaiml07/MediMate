"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/ui/Logo";
import { useAuth } from "@/context/AuthContext";
import {
  Home,
  Pill,
  Calendar,
  FileText,
  Sparkles,
  Settings,
  Upload,
  Activity,
  BookOpen,
  ClipboardList,
  CheckCircle2,
  ChevronRight,
} from "lucide-react";

interface SidebarProps {
  onCloseMobile?: () => void;
}

export function Sidebar({ onCloseMobile }: SidebarProps) {
  const pathname = usePathname();
  const { profile } = useAuth();

  const mainNavItems = [
    { name: "Home", href: "/dashboard", icon: Home },
    { name: "Medications", href: "/medications/schedule", icon: Pill },
    { name: "Appointments", href: "/appointments", icon: Calendar },
    { name: "Health Records", href: "/health-records", icon: FileText },
    { name: "AI Assistant", href: "/assistant", icon: Sparkles },
    { name: "Settings", href: "/settings", icon: Settings },
  ];

  const quickWorkflowItems = [
    { name: "Upload Rx", href: "/prescriptions/upload", icon: Upload },
    { name: "Review AI Rx", href: "/prescriptions/rx-sample-001/review", icon: FileText },
    { name: "Confirm Meds", href: "/medications/confirm", icon: CheckCircle2 },
    { name: "Adherence Tracker", href: "/adherence", icon: Activity },
    { name: "Medicine Info", href: "/medicine-information", icon: BookOpen },
    { name: "Doctor Summary", href: "/doctor-summary", icon: ClipboardList },
  ];

  const isActive = (href: string) => {
    if (href === "/dashboard") {
      return pathname === "/dashboard" || pathname === "/";
    }
    return pathname.startsWith(href);
  };

  return (
    <aside className="w-64 bg-white border-r border-slate-200/80 flex flex-col h-full shrink-0 select-none">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-100 flex items-center justify-between">
        <Logo size="sm" showSubtitle={true} />
      </div>

      {/* Navigation List */}
      <div className="flex-1 overflow-y-auto px-3.5 py-4 space-y-6">
        <div>
          <div className="px-3 mb-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Main Menu
          </div>
          <nav className="space-y-1">
            {mainNavItems.map((item) => {
              const active = isActive(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={onCloseMobile}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    active
                      ? "bg-blue-50 text-blue-700 shadow-xs font-semibold"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 transition-colors ${
                      active ? "text-blue-600 stroke-[2.4]" : "text-slate-400"
                    }`}
                  />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div>
          <div className="px-3 mb-2 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Workflows & Features
          </div>
          <nav className="space-y-1">
            {quickWorkflowItems.map((item) => {
              const active = pathname.startsWith(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={onCloseMobile}
                  className={`flex items-center justify-between px-3.5 py-2 rounded-lg text-xs font-medium transition-all ${
                    active
                      ? "bg-blue-50 text-blue-700 font-semibold"
                      : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon
                      className={`w-3.5 h-3.5 ${
                        active ? "text-blue-600" : "text-slate-400"
                      }`}
                    />
                    <span>{item.name}</span>
                  </div>
                  <ChevronRight className="w-3 h-3 text-slate-300" />
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* User Profile Card (Screen 2 reference style) */}
      <div className="p-3.5 border-t border-slate-100 bg-slate-50/60">
        <Link
          href="/settings"
          onClick={onCloseMobile}
          className="flex items-center gap-3 p-2 rounded-xl hover:bg-white hover:shadow-xs transition-all group"
        >
          <div className="relative">
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-amber-200 to-rose-200 text-slate-800 flex items-center justify-center font-bold text-sm border-2 border-white shadow-xs">
              {profile?.name
                ? profile.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()
                : "PT"}
            </div>
            <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full"></span>
          </div>
          <div className="flex flex-col flex-1 min-w-0">
            <span className="text-sm font-semibold text-slate-800 truncate group-hover:text-blue-600 transition-colors">
              {profile?.name || "Patient"}
            </span>
            <span className="text-xs text-slate-400">View Profile</span>
          </div>
        </Link>
      </div>
    </aside>
  );
}
