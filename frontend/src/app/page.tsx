"use client";

import React from "react";
import Link from "next/link";
import { Logo } from "@/components/ui/Logo";
import {
  Scan,
  ShieldCheck,
  Bell,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Server,
  ChevronRight,
} from "lucide-react";

export default function HomePage() {
  const screens = [
    {
      num: 1,
      title: "Login / Sign Up",
      desc: "Clean authentication with MediMate branding & privacy notice",
      href: "/login",
      color: "from-blue-500 to-indigo-600",
      badge: "Auth",
    },
    {
      num: 2,
      title: "Dashboard (Home)",
      desc: "Greeting, 3 summary cards, today's medicines & next appointment",
      href: "/dashboard",
      color: "from-blue-600 to-blue-700",
      badge: "Core UI",
    },
    {
      num: 3,
      title: "Upload Prescription",
      desc: "Drag-and-drop, camera/upload actions, 4-step progress bar",
      href: "/prescriptions/upload",
      color: "from-sky-500 to-blue-600",
      badge: "Scan & OCR",
    },
    {
      num: 4,
      title: "AI Extraction / Review",
      desc: "Split-panel review: original document + extracted items with % confidence",
      href: "/prescriptions/rx-sample-001/review",
      color: "from-indigo-500 to-purple-600",
      badge: "AI Vision",
    },
    {
      num: 5,
      title: "Confirm & Edit",
      desc: "Medication edit cards with dosage, duration & confirmation flow",
      href: "/medications/confirm",
      color: "from-purple-500 to-pink-600",
      badge: "Verification",
    },
    {
      num: 6,
      title: "Medication Schedule",
      desc: "Today, 7-day, all tabs with date navigator & interactive dose badges",
      href: "/medications/schedule",
      color: "from-emerald-500 to-teal-600",
      badge: "Schedule",
    },
    {
      num: 7,
      title: "Adherence Tracker",
      desc: "78% adherence donut chart + Recharts daily breakdown bar chart",
      href: "/adherence",
      color: "from-teal-500 to-emerald-600",
      badge: "Analytics",
    },
    {
      num: 8,
      title: "Appointments",
      desc: "Upcoming/past tabs, doctor cards, and add-appointment action",
      href: "/appointments",
      color: "from-blue-500 to-cyan-600",
      badge: "Visits",
    },
    {
      num: 9,
      title: "AI Assistant / Chat",
      desc: "Conversational health chat with source references and disclaimer",
      href: "/assistant",
      color: "from-violet-500 to-indigo-600",
      badge: "AI Chat",
    },
    {
      num: 10,
      title: "Medicine Information",
      desc: "Search catalogue with overview, side effects, and precautions",
      href: "/medicine-information",
      color: "from-cyan-500 to-blue-600",
      badge: "Drug Guide",
    },
    {
      num: 11,
      title: "Health Records",
      desc: "Searchable prescription archive, consultation logs, and documents",
      href: "/health-records",
      color: "from-slate-600 to-slate-800",
      badge: "Records",
    },
    {
      num: 12,
      title: "Doctor Visit Summary",
      desc: "Current medications, adherence metrics, doctor questions & PDF export",
      href: "/doctor-summary",
      color: "from-purple-600 to-indigo-700",
      badge: "Clinical Summary",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col antialiased">
      {/* Top Banner matching reference image showcase header */}
      <header className="bg-white border-b border-slate-200/80 px-4 sm:px-8 py-4 sm:py-6 sticky top-0 z-30 shadow-xs">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <Logo size="md" showSubtitle={true} />
            <div className="hidden lg:block h-8 w-px bg-slate-200 mx-2"></div>
            <div className="hidden lg:block text-xs text-slate-500">
              <span className="font-bold text-slate-800">
                AI-Powered Personal Medication & Healthcare Assistant
              </span>
              <p className="text-[11px] text-slate-400">
                From paper prescriptions to a smarter, healthier you.
              </p>
            </div>
          </div>

          {/* Feature Badges from reference top-right */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-700 rounded-full font-medium border border-blue-100">
              <Scan className="w-3.5 h-3.5" /> Scan & Extract
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-50 text-purple-700 rounded-full font-medium border border-purple-100">
              <ShieldCheck className="w-3.5 h-3.5" /> Verified Plan
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full font-medium border border-emerald-100">
              <Bell className="w-3.5 h-3.5" /> Smart Reminders
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-cyan-50 text-cyan-700 rounded-full font-medium border border-cyan-100">
              <Sparkles className="w-3.5 h-3.5" /> AI Assistant
            </span>
          </div>
        </div>
      </header>

      {/* Hero Action Callout */}
      <section className="bg-gradient-to-b from-blue-50/60 to-white border-b border-slate-200/70 py-10 px-4 sm:px-8">
        <div className="max-w-4xl mx-auto text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            Complete Interactive Reference Implementation
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
            Pixel-Accurate MediMate Showcase
          </h1>
          <p className="text-sm sm:text-base text-slate-600 max-w-2xl mx-auto">
            Explore all 12 interconnected screens faithfully translated from the primary
            design specification into a responsive, high-performance Next.js application.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Link
              href="/dashboard"
              className="py-3 px-6 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-xl shadow-sm shadow-blue-500/25 transition-all flex items-center gap-2"
            >
              <span>Launch Live Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              href="/login"
              className="py-3 px-6 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-sm rounded-xl transition-all"
            >
              View Login Screen
            </Link>
          </div>
        </div>
      </section>

      {/* 12 Screens Grid matching reference showcase */}
      <section className="max-w-7xl mx-auto px-4 sm:px-8 py-10 flex-1">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              Interactive Application Screens
            </h2>
            <p className="text-xs text-slate-500">
              Click any card to inspect and interact with the live page.
            </p>
          </div>
          <span className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
            12 of 12 Routes Available
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {screens.map((screen) => (
            <Link
              key={screen.num}
              href={screen.href}
              className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:border-blue-400 hover:shadow-md transition-all flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center">
                      {screen.num}
                    </span>
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      Screen {screen.num}
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 group-hover:bg-blue-50 group-hover:text-blue-700 transition-colors">
                    {screen.badge}
                  </span>
                </div>

                <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                  {screen.title}
                </h3>
                <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                  {screen.desc}
                </p>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-blue-600">
                <span>Open Screen</span>
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* System Architecture & Future Plan matching reference bottom sections */}
      <section className="bg-white border-t border-slate-200/80 py-12 px-4 sm:px-8">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* System Architecture (Backend) matching diagram */}
            <div className="lg:col-span-6 bg-slate-50 rounded-2xl p-6 border border-slate-200 space-y-4">
              <div className="flex items-center gap-2 text-blue-700">
                <Server className="w-5 h-5" />
                <h3 className="text-base font-bold text-slate-900">
                  System Architecture (Backend)
                </h3>
              </div>
              <p className="text-xs text-slate-500">
                Modular architecture connecting the Next.js frontend with the Python FastAPI
                core, background job workers, and database.
              </p>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-white rounded-xl border border-slate-200">
                  <span className="font-bold text-slate-900 block mb-0.5">
                    Frontend Layer
                  </span>
                  <span className="text-slate-500">
                    Next.js App Router (TypeScript, Tailwind, Recharts)
                  </span>
                </div>
                <div className="p-3 bg-white rounded-xl border border-slate-200">
                  <span className="font-bold text-slate-900 block mb-0.5">
                    API Layer
                  </span>
                  <span className="text-slate-500">
                    FastAPI (Pydantic v2, CORS, async endpoints)
                  </span>
                </div>
                <div className="p-3 bg-white rounded-xl border border-slate-200">
                  <span className="font-bold text-slate-900 block mb-0.5">
                    AI Vision & OCR
                  </span>
                  <span className="text-slate-500">
                    Configurable LLMs (Gemini, OpenAI, Groq) + Vision API
                  </span>
                </div>
                <div className="p-3 bg-white rounded-xl border border-slate-200">
                  <span className="font-bold text-slate-900 block mb-0.5">
                    Storage & Auth
                  </span>
                  <span className="text-slate-500">
                    Supabase PostgreSQL, Auth & Encrypted Rx Storage
                  </span>
                </div>
              </div>
            </div>

            {/* Key Features at a Glance */}
            <div className="lg:col-span-6 bg-slate-50 rounded-2xl p-6 border border-slate-200 flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center gap-2 text-emerald-700 mb-2">
                  <CheckCircle2 className="w-5 h-5" />
                  <h3 className="text-base font-bold text-slate-900">
                    Key Features at a Glance
                  </h3>
                </div>
                <ul className="text-xs text-slate-700 space-y-2 font-medium">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>AI-powered prescription scanning & extraction</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>User-confirmed digital medication plan</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Smart reminders & adherence tracking</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Appointments & consultation history</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Medicine information assistant</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Personal AI assistant (uses your data)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Secure, private and HIPAA-style care</span>
                  </li>
                </ul>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-between text-xs italic text-blue-700 font-semibold">
                <span>Better reminders. Clearer information. Healthier tomorrow. 💜</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-100 border-t border-slate-200 py-6 px-4 sm:px-8 text-center text-xs text-slate-500">
        <p>© 2026 MediMate Healthcare. All rights reserved. Demo Mode Active.</p>
      </footer>
    </div>
  );
}
