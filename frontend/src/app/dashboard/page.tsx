"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/context/AuthContext";
import { fetchPatientMedications, recordDoseEvent } from "@/lib/supabase/data";
import {
  Pill,
  Calendar,
  Bell,
  Check,
  Clock,
  User,
} from "lucide-react";

export default function DashboardPage() {
  const { user, profile } = useAuth();

  // Today's 2 key medicines matching Screen 2 in reference image
  const [meds, setMeds] = useState([
    {
      id: "med-1",
      name: "Metformin 500mg",
      instructions: "After food • 8:00 AM",
      status: "Taken",
      iconBg: "bg-amber-100 text-amber-600",
    },
    {
      id: "med-2",
      name: "Vitamin D3 1000 IU",
      instructions: "After food • 8:00 PM",
      status: "Upcoming",
      iconBg: "bg-blue-100 text-blue-600",
    },
  ]);

  useEffect(() => {
    if (user?.id) {
      fetchPatientMedications(user.id).then((patientMeds) => {
        if (patientMeds && patientMeds.length > 0) {
          const formatted = patientMeds.slice(0, 2).map((m, idx) => ({
            id: m.id,
            name: `${m.name} ${m.strength}`,
            instructions: m.instructions,
            status: m.status,
            iconBg: idx % 2 === 0 ? "bg-amber-100 text-amber-600" : "bg-blue-100 text-blue-600",
          }));
          setMeds(formatted);
        }
      });
    }
  }, [user?.id]);

  const toggleMedStatus = async (id: string) => {
    setMeds((prev) =>
      prev.map((m) => {
        if (m.id === id) {
          const nextStatus = m.status === "Taken" ? "Upcoming" : "Taken";
          if (user?.id) {
            recordDoseEvent(id, user.id, nextStatus as "Taken" | "Upcoming");
          }
          return { ...m, status: nextStatus };
        }
        return m;
      })
    );
  };

  const displayName = profile?.name ? profile.name.split(" ")[0] : "Priya";

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header Greeting matching Screen 2 */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            Good morning, {displayName}! 👋
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Here&apos;s your health summary for today.
          </p>
        </div>

        {/* 3 Summary Stat Cards in a row matching Screen 2 */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Card 1: Medicines due today (2) */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center gap-4 hover:border-slate-300 transition-all">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
              <Pill className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 leading-none">
                2
              </div>
              <div className="text-xs font-medium text-slate-500 mt-1">
                Medicines due today
              </div>
            </div>
          </div>

          {/* Card 2: Upcoming appointment (1) */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center gap-4 hover:border-slate-300 transition-all">
            <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 border border-purple-100">
              <Calendar className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 leading-none">
                1
              </div>
              <div className="text-xs font-medium text-slate-500 mt-1">
                Upcoming appointment
              </div>
            </div>
          </div>

          {/* Card 3: Refills needed (0) */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs flex items-center gap-4 hover:border-slate-300 transition-all">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
              <Bell className="w-6 h-6 stroke-[2.2]" />
            </div>
            <div>
              <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 leading-none">
                0
              </div>
              <div className="text-xs font-medium text-slate-500 mt-1">
                Refills needed
              </div>
            </div>
          </div>
        </div>

        {/* Section 1: Today's Medications matching Screen 2 */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">
              Today&apos;s Medications
            </h2>
            <Link
              href="/medications/schedule"
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors"
            >
              View all
            </Link>
          </div>

          <div className="space-y-3">
            {meds.map((med) => {
              const isTaken = med.status === "Taken";
              return (
                <div
                  key={med.id}
                  onClick={() => toggleMedStatus(med.id)}
                  className="flex items-center justify-between p-3.5 sm:p-4 rounded-xl border border-slate-100 hover:border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-3.5">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${med.iconBg}`}
                    >
                      <Pill className="w-5 h-5 stroke-[2]" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">
                        {med.name}
                      </h3>
                      <p className="text-xs text-slate-500">
                        {med.instructions}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleMedStatus(med.id);
                    }}
                    className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer ${
                      isTaken
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                        : "bg-slate-100 text-slate-600 hover:bg-blue-50 hover:text-blue-700 border border-transparent"
                    }`}
                  >
                    {isTaken ? (
                      <>
                        <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                        <span>Taken</span>
                      </>
                    ) : (
                      <>
                        <Clock className="w-3.5 h-3.5" />
                        <span>Upcoming</span>
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Section 2: Upcoming Appointment matching Screen 2 */}
        <div className="bg-white rounded-2xl p-5 sm:p-6 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">
              Upcoming Appointment
            </h2>
            <Link
              href="/appointments"
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors"
            >
              View all
            </Link>
          </div>

          <Link
            href="/appointments"
            className="block p-4 rounded-xl border border-blue-100 bg-blue-50/40 hover:bg-blue-50/70 transition-all group"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <User className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 group-hover:text-blue-700 transition-colors">
                  Dr. S. Kumar (General Physician)
                </h3>
                <div className="mt-1 flex items-center gap-2 text-xs text-blue-700 font-medium">
                  <Calendar className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span>12 Sep 2025 • 10:30 AM</span>
                </div>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </AppLayout>
  );
}
