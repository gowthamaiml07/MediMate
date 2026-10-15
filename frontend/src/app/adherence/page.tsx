"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/context/AuthContext";
import {
  fetchAdherenceSummaryApi,
  fetchDoseTimelineApi,
  logDoseEventApi,
  correctDoseEventApi,
  AdherenceSummaryDto,
  DoseTimelineItemDto,
} from "@/lib/medicationApi";
import {
  ChevronLeft,
  ChevronRight,
  Award,
  AlertTriangle,
  ShieldAlert,
  Check,
  CheckCircle2,
  Clock,
  RotateCcw,
  Info,
  X,
  AlertCircle,
  HelpCircle,
} from "lucide-react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from "recharts";

export default function AdherenceTrackerPage() {
  const { user } = useAuth();
  const [filter, setFilter] = useState<"Weekly" | "Monthly" | "All">("Weekly");
  const [summary, setSummary] = useState<AdherenceSummaryDto | null>(null);
  const [doses, setDoses] = useState<DoseTimelineItemDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Correction Modal state
  const [correctingDose, setCorrectingDose] = useState<DoseTimelineItemDto | null>(null);
  const [correctionReason, setCorrectionReason] = useState("");
  const [isSubmittingCorrection, setIsSubmittingCorrection] = useState(false);

  useEffect(() => {
    loadAdherenceData();
  }, [filter]);

  const loadAdherenceData = async () => {
    setIsLoading(true);
    const days = filter === "Weekly" ? 7 : filter === "Monthly" ? 30 : 90;
    try {
      const [summaryRes, dosesRes] = await Promise.all([
        fetchAdherenceSummaryApi(days),
        fetchDoseTimelineApi(undefined, Math.min(days, 7)),
      ]);
      setSummary(summaryRes);
      setDoses(dosesRes);
    } catch (err) {
      console.error("Error loading adherence data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleDose = async (dose: DoseTimelineItemDto) => {
    const nextStatus: "Taken" | "Upcoming" = dose.status === "Taken" ? "Upcoming" : "Taken";

    // Optimistic UI update
    setDoses((prev) =>
      prev.map((d) => (d.id === dose.id ? { ...d, status: nextStatus, is_overdue: false } : d))
    );

    try {
      await logDoseEventApi({
        schedule_id: dose.schedule_id,
        scheduled_for: dose.scheduled_for,
        status: nextStatus,
      });
      setStatusMessage({
        type: "success",
        text: `Dose of ${dose.medication_name} recorded as ${nextStatus}.`,
      });
      loadAdherenceData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to record dose.";
      setStatusMessage({ type: "error", text: msg });
      loadAdherenceData();
    }
  };

  const handleMarkSkipped = async (dose: DoseTimelineItemDto) => {
    setDoses((prev) =>
      prev.map((d) => (d.id === dose.id ? { ...d, status: "Skipped", is_overdue: false } : d))
    );

    try {
      await logDoseEventApi({
        schedule_id: dose.schedule_id,
        scheduled_for: dose.scheduled_for,
        status: "Skipped",
      });
      setStatusMessage({
        type: "success",
        text: `Dose of ${dose.medication_name} marked as skipped.`,
      });
      loadAdherenceData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to skip dose.";
      setStatusMessage({ type: "error", text: msg });
      loadAdherenceData();
    }
  };

  const handleOpenCorrection = (dose: DoseTimelineItemDto) => {
    setCorrectingDose(dose);
    setCorrectionReason("");
  };

  const handleSubmitCorrection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!correctingDose || !correctionReason.trim()) return;

    setIsSubmittingCorrection(true);
    try {
      const eventId = correctingDose.event_id || `evt-${correctingDose.id}`;
      const newStatus = correctingDose.status === "Taken" ? "Upcoming" : "Taken";

      await correctDoseEventApi(eventId, {
        new_status: newStatus,
        correction_reason: correctionReason.trim(),
      });

      setStatusMessage({
        type: "success",
        text: `Dose log entry corrected with audit record: "${correctionReason.trim()}".`,
      });
      setCorrectingDose(null);
      loadAdherenceData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Correction failed.";
      setStatusMessage({ type: "error", text: msg });
    } finally {
      setIsSubmittingCorrection(false);
    }
  };

  // Safe defaults if summary is loading
  const adherenceRate = summary?.adherence_rate ?? 0;
  const takenCount = summary?.taken ?? 0;
  const missedCount = summary?.missed ?? 0;
  const skippedCount = summary?.skipped ?? 0;
  const snoozedCount = summary?.snoozed ?? 0;
  const totalDueCount = summary?.total_due ?? (takenCount + missedCount + skippedCount);

  // Circular progress calculations
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (adherenceRate / 100) * circumference;

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto space-y-5 pb-12">
        {/* Header matching Screen 7 */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              Adherence Tracker
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Verified clinical adherence tracking and dose timeline
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200">
            <Award className="w-4 h-4 text-emerald-600" />
            <span>{adherenceRate >= 80 ? "Good Progress" : "Action Needed"}</span>
          </div>
        </div>

        {/* Status Notification */}
        {statusMessage && (
          <div
            className={`p-3.5 rounded-xl text-xs font-medium flex items-center justify-between border animate-in fade-in ${
              statusMessage.type === "success"
                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                : "bg-rose-50 border-rose-200 text-rose-800"
            }`}
          >
            <div className="flex items-center gap-2">
              {statusMessage.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              )}
              <span>{statusMessage.text}</span>
            </div>
            <button
              onClick={() => setStatusMessage(null)}
              className="text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* View Switcher Tabs matching Screen 7 */}
        <div className="bg-slate-100/90 p-1 rounded-2xl flex items-center justify-between">
          {(["Weekly", "Monthly", "All"] as const).map((tab) => {
            const isActive = filter === tab;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setFilter(tab)}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                  isActive
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {tab}
              </button>
            );
          })}
        </div>

        {/* Date Navigator */}
        <div className="bg-white rounded-2xl p-3 border border-slate-200/80 shadow-xs flex items-center justify-between select-none">
          <button
            type="button"
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <span className="text-xs sm:text-sm font-bold text-slate-800">
            {summary?.period || "Current Reporting Period"}
          </span>
          <button
            type="button"
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Radial Adherence Donut Card matching Screen 7 */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs">
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-6 items-center">
            {/* SVG Circular Donut Chart */}
            <div className="sm:col-span-6 flex flex-col items-center justify-center">
              <div className="relative w-36 h-36 flex items-center justify-center">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="72"
                    cy="72"
                    r={radius}
                    stroke="#e2e8f0"
                    strokeWidth="11"
                    fill="transparent"
                  />
                  <circle
                    cx="72"
                    cy="72"
                    r={radius}
                    stroke={adherenceRate >= 80 ? "#059669" : adherenceRate >= 50 ? "#0284c7" : "#e11d48"}
                    strokeWidth="11"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    fill="transparent"
                    className="transition-all duration-700 ease-out"
                  />
                </svg>

                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-3xl font-extrabold text-slate-900 leading-none">
                    {adherenceRate}%
                  </span>
                  <span className="text-[11px] font-semibold text-slate-400 mt-1">
                    Adherence Rate
                  </span>
                </div>
              </div>
            </div>

            {/* Counts Legend on Right matching Screen 7 */}
            <div className="sm:col-span-6 space-y-2.5 sm:border-l sm:border-slate-100 sm:pl-6">
              <div className="flex items-center justify-between text-xs py-1">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                  <span className="text-slate-600 font-medium">Taken</span>
                </div>
                <span className="font-bold text-slate-900 text-sm">{takenCount}</span>
              </div>

              <div className="flex items-center justify-between text-xs py-1">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
                  <span className="text-slate-600 font-medium">Missed / Overdue</span>
                </div>
                <span className="font-bold text-slate-900 text-sm">{missedCount}</span>
              </div>

              <div className="flex items-center justify-between text-xs py-1">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
                  <span className="text-slate-600 font-medium">Skipped</span>
                </div>
                <span className="font-bold text-slate-900 text-sm">{skippedCount}</span>
              </div>

              <div className="flex items-center justify-between text-xs py-1">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                  <span className="text-slate-600 font-medium">Snoozed</span>
                </div>
                <span className="font-bold text-slate-900 text-sm">{snoozedCount}</span>
              </div>

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                <span>Total Past Doses Due</span>
                <span className="font-bold text-slate-700">{totalDueCount}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Documented Adherence Formula & Transparency Box */}
        <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200/90 space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
            <Info className="w-4 h-4 text-blue-600" />
            <span>Documented Adherence Calculation Formula</span>
          </div>
          <div className="p-2.5 bg-white rounded-xl border border-slate-200 font-mono text-[11px] text-blue-700 font-bold">
            Adherence Rate % = (Taken Doses / Total Past Due Doses) × 100
          </div>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            Where <strong>Total Past Due Doses</strong> includes doses recorded as Taken, Missed, or Skipped whose scheduled time has passed. Doses scheduled in the future are strictly excluded from the calculation. Unlogged past doses are never assumed taken.
          </p>
        </div>

        {/* CRITICAL MEDICAL SAFETY ADVISORY */}
        <div className="p-4 bg-amber-50/90 rounded-2xl border border-amber-200/90 space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
            <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Critical Clinical Safety Notice — Missed Doses</span>
          </div>
          <p className="text-xs text-amber-800 leading-relaxed">
            <strong>Never take a double or extra dose</strong> to make up for a missed or forgotten dose. Taking excess medication can cause serious toxicity or adverse drug interactions. If you have missed a dose, follow your doctor&apos;s specific prescription guidance or consult your prescribing physician or licensed pharmacist immediately.
          </p>
        </div>

        {/* Daily Breakdown Bar Chart */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-slate-900">Daily Breakdown</h2>
            <span className="text-xs text-slate-400 font-medium">
              Adherence rate by day (%)
            </span>
          </div>

          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={summary?.daily_breakdown || []}
                margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
              >
                <XAxis
                  dataKey="day"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 11, fill: "#64748b" }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: "#94a3b8" }}
                  domain={[0, 100]}
                />
                <Tooltip
                  formatter={(val) => [`${val}%`, "Adherence"]}
                  contentStyle={{
                    backgroundColor: "#ffffff",
                    borderRadius: "12px",
                    border: "1px solid #e2e8f0",
                    fontSize: "12px",
                    boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
                  }}
                />
                <Bar
                  dataKey="rate"
                  radius={[6, 6, 0, 0]}
                  fill="#0ea5e9"
                  maxBarSize={32}
                >
                  {(summary?.daily_breakdown || []).map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.rate >= 80 ? "#0284c7" : entry.rate >= 50 ? "#38bdf8" : "#f43f5e"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Daily Medication Timeline & Action Section */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Daily Dose Log & Timeline</h2>
              <p className="text-xs text-slate-400">
                Log doses taken or skipped, or submit an audited correction
              </p>
            </div>
            <Link
              href="/medications/schedule"
              className="text-xs font-bold text-blue-600 hover:text-blue-700"
            >
              Full Schedule →
            </Link>
          </div>

          {isLoading ? (
            <div className="py-8 text-center text-xs text-slate-400">
              Loading dose events...
            </div>
          ) : doses.length === 0 ? (
            <div className="py-8 text-center bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-500">
              No doses scheduled for this timeframe.
            </div>
          ) : (
            <div className="space-y-3">
              {doses.map((dose) => {
                const isTaken = dose.status === "Taken";
                const isSkipped = dose.status === "Skipped";
                const isOverdue = dose.is_overdue || dose.status === "Missed";

                return (
                  <div
                    key={dose.id}
                    className={`p-3.5 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                      isTaken
                        ? "bg-emerald-50/40 border-emerald-200"
                        : isSkipped
                        ? "bg-amber-50/30 border-amber-200"
                        : isOverdue
                        ? "bg-rose-50/40 border-rose-200"
                        : "bg-slate-50/40 border-slate-200"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <button
                        type="button"
                        onClick={() => handleToggleDose(dose)}
                        className={`w-7 h-7 rounded-lg flex items-center justify-center border transition-all shrink-0 cursor-pointer ${
                          isTaken
                            ? "bg-emerald-600 border-emerald-600 text-white shadow-xs"
                            : "bg-white border-slate-300 text-transparent hover:border-blue-500"
                        }`}
                        title={isTaken ? "Mark upcoming" : "Mark as taken"}
                      >
                        <Check className="w-4 h-4 stroke-[3]" />
                      </button>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-xs sm:text-sm truncate">
                            {dose.medication_name}
                          </span>
                          <span className="text-[10px] font-semibold text-slate-500 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                            {dose.strength}
                          </span>
                          {isOverdue && !isTaken && !isSkipped && (
                            <span className="text-[10px] font-bold text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded">
                              Overdue
                            </span>
                          )}
                          {isSkipped && (
                            <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
                              Skipped
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>{dose.scheduled_time}</span>
                          <span>•</span>
                          <span>{dose.timing_relation}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {!isTaken && !isSkipped && (
                        <button
                          type="button"
                          onClick={() => handleMarkSkipped(dose)}
                          className="px-2.5 py-1 text-[11px] font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg border border-amber-200 transition-colors"
                        >
                          Skip
                        </button>
                      )}

                      {(isTaken || isSkipped || isOverdue) && (
                        <button
                          type="button"
                          onClick={() => handleOpenCorrection(dose)}
                          className="px-2 py-1 text-[11px] font-semibold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 rounded-lg border border-slate-200 flex items-center gap-1 transition-colors"
                          title="Correct accidental log entry with audit reason"
                        >
                          <RotateCcw className="w-3 h-3 text-slate-500" />
                          <span className="hidden sm:inline">Correct</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Doctor Summary shortcut */}
        <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100 flex items-center justify-between">
          <div className="text-xs text-slate-600">
            Need to share this adherence record with your doctor?
          </div>
          <Link
            href="/doctor-summary"
            className="text-xs font-bold text-blue-600 hover:text-blue-700"
          >
            Export Clinical Summary →
          </Link>
        </div>
      </div>

      {/* Audit Correction Modal */}
      {correctingDose && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-blue-600" />
                <h3 className="font-bold text-sm text-slate-900">Correct Dose Record</h3>
              </div>
              <button
                onClick={() => setCorrectingDose(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitCorrection} className="p-5 space-y-4">
              <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100 text-xs text-blue-900 space-y-1">
                <p className="font-bold">
                  {correctingDose.medication_name} ({correctingDose.strength})
                </p>
                <p className="text-[11px] text-blue-700">
                  Scheduled for: {correctingDose.scheduled_time} ({correctingDose.local_date})
                </p>
                <p className="text-[11px] text-slate-600">
                  Current Status: <strong>{correctingDose.status}</strong> → Changing to{" "}
                  <strong>{correctingDose.status === "Taken" ? "Upcoming / Missed" : "Taken"}</strong>
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Reason for Correction (Required for Audit Trail)
                </label>
                <textarea
                  required
                  rows={3}
                  value={correctionReason}
                  onChange={(e) => setCorrectionReason(e.target.value)}
                  placeholder="e.g. Accidentally clicked 'taken', dose was taken at a later time, or medication was skipped."
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCorrectingDose(null)}
                  className="px-3.5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingCorrection || !correctionReason.trim()}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl disabled:opacity-50 shadow-xs cursor-pointer"
                >
                  {isSubmittingCorrection ? "Submitting..." : "Confirm & Save Audit Record"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
