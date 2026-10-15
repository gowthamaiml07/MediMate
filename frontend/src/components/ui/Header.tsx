"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Bell,
  Menu,
  Upload,
  Sparkles,
  CheckCircle2,
  Calendar,
  X,
} from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { useAuth } from "@/context/AuthContext";

interface HeaderProps {
  onToggleMobileMenu: () => void;
}

export function Header({ onToggleMobileMenu }: HeaderProps) {
  const { isConfigured, isDemoMode } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(2);

  const notifications = [
    {
      id: "n-1",
      title: "Medication Reminder",
      message: "Metformin 500mg taken at 08:00 AM.",
      time: "25 min ago",
      type: "success",
      icon: CheckCircle2,
    },
    {
      id: "n-2",
      title: "Upcoming Appointment",
      message: "Dr. S. Kumar (General Physician) on 12 Sep, 10:30 AM.",
      time: "2 hours ago",
      type: "info",
      icon: Calendar,
    },
    {
      id: "n-3",
      title: "Prescription AI Verified",
      message: "Dr. Mehta's prescription digitized with 92% confidence.",
      time: "Yesterday",
      type: "alert",
      icon: Sparkles,
    },
  ];

  return (
    <header className="sticky top-0 z-30 h-16 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-6 flex items-center justify-between transition-all">
      {/* Left: Mobile hamburger & Brand */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onToggleMobileMenu}
          className="lg:hidden p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
          aria-label="Toggle menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="lg:hidden">
          <Logo size="sm" showSubtitle={false} />
        </div>

        {/* Desktop Tagline from Reference Image Header */}
        <div className="hidden lg:flex items-center gap-2 text-xs text-slate-500">
          <span className="font-semibold text-slate-700">MediMate</span>
          <span>•</span>
          <span>From paper prescriptions to a smarter, healthier you</span>
        </div>
      </div>

      {/* Right: Actions, Demo Badge & Notifications */}
      <div className="flex items-center gap-2.5 sm:gap-3.5">
        {/* Live or Demo Status Badge */}
        {isConfigured && !isDemoMode ? (
          <div className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 border border-emerald-200/80 rounded-full text-[11px] font-medium text-emerald-800">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            Supabase Live
          </div>
        ) : (
          <div className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 border border-amber-200/70 rounded-full text-[11px] font-medium text-amber-800">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
            Demo Mode
          </div>
        )}

        {/* Upload Prescription Action Button */}
        <Link
          href="/prescriptions/upload"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs shadow-blue-500/20 transition-all hover:shadow-sm"
        >
          <Upload className="w-3.5 h-3.5 stroke-[2.2]" />
          <span className="hidden sm:inline">Upload Prescription</span>
          <span className="sm:hidden">Upload</span>
        </Link>

        {/* Notification Bell Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setShowNotifications(!showNotifications);
              if (unreadCount > 0) setUnreadCount(0);
            }}
            className="relative p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            aria-label="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-blue-600 rounded-full ring-2 ring-white"></span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-200 py-3 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between px-4 pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm text-slate-900">
                    Notifications
                  </span>
                  <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-bold">
                    3
                  </span>
                </div>
                <button
                  onClick={() => setShowNotifications(false)}
                  className="text-slate-400 hover:text-slate-600 p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
                {notifications.map((n) => {
                  const Icon = n.icon;
                  return (
                    <div
                      key={n.id}
                      className="p-3.5 hover:bg-slate-50/80 transition-colors flex gap-3 cursor-pointer"
                    >
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                          n.type === "success"
                            ? "bg-emerald-100 text-emerald-600"
                            : n.type === "info"
                            ? "bg-blue-100 text-blue-600"
                            : "bg-purple-100 text-purple-600"
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-slate-900">
                            {n.title}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {n.time}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 mt-0.5 line-clamp-2">
                          {n.message}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="px-4 pt-2 border-t border-slate-100 text-center">
                <Link
                  href="/medications/schedule"
                  onClick={() => setShowNotifications(false)}
                  className="text-xs font-medium text-blue-600 hover:text-blue-700"
                >
                  View full schedule & reminders
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* User avatar thumbnail */}
        <Link
          href="/settings"
          className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-200 to-rose-200 text-slate-800 flex items-center justify-center font-bold text-xs ring-2 ring-blue-500/20 hover:ring-blue-500/40 transition-all"
        >
          PS
        </Link>
      </div>
    </header>
  );
}
