"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/context/AuthContext";
import {
  fetchDoseTimelineApi,
  logDoseEventApi,
  correctDoseEventApi,
  DoseTimelineItemDto,
  createMedicationApi
} from "@/lib/medicationApi";
import {
  ChevronLeft,
  ChevronRight,
  Check,
  Bell,
  Clock,
  Plus,
  CheckCircle2,
  AlertCircle,
  X,
  ShieldCheck,
  Calendar,
  Globe,
  RotateCcw,
  Sparkles
} from "lucide-react";

export default function MedicationSchedulePage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"Today" | "7 Days" | "All">("Today");
  const [currentDateIndex, setCurrentDateIndex] = useState(0);
  const [doses, setDoses] = useState<DoseTimelineItemDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Configure Schedule Modal State
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [configName, setConfigName] = useState("Metformin");
  const [configStrength, setConfigStrength] = useState("500mg");
  const [configFrequency, setConfigFrequency] = useState("Twice daily");
  const [configTimes, setConfigTimes] = useState<string[]>(["08:00", "20:00"]);
  const [configTimingRelation, setConfigTimingRelation] = useState("After food");
  const [configStartDate, setConfigStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [configDuration, setConfigDuration] = useState("30 days");
  const [configTimezone, setConfigTimezone] = useState(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    } catch {
      return "UTC";
    }
  });
  const [configReminder, setConfigReminder] = useState(true);
  const [configOffset, setConfigOffset] = useState(10);
  const [configReviewStep, setConfigReviewStep] = useState(false);
  const [isSubmittingConfig, setIsSubmittingConfig] = useState(false);

  // Correction Modal State
  const [correctingDose, setCorrectingDose] = useState<DoseTimelineItemDto | null>(null);
  const [correctionReason, setCorrectionReason] = useState("");

  const dates = [
    { label: "Mon, 8 Sep 2025", dateStr: "2025-09-08" },
    { label: "Tue, 9 Sep 2025", dateStr: "2025-09-09" },
    { label: "Wed, 10 Sep 2025", dateStr: "2025-09-10" },
    { label: "Thu, 11 Sep 2025", dateStr: "2025-09-11" },
    { label: "Fri, 12 Sep 2025", dateStr: "2025-09-12" },
    { label: "Sat, 13 Sep 2025", dateStr: "2025-09-13" },
    { label: "Sun, 14 Sep 2025", dateStr: "2025-09-14" },
  ];

  useEffect(() => {
    loadDoseTimeline();
  }, [activeTab, currentDateIndex]);

  const loadDoseTimeline = async () => {
    setIsLoading(true);
    const targetDate = dates[currentDateIndex]?.dateStr || "2025-09-08";
    const days = activeTab === "Today" ? 1 : activeTab === "7 Days" ? 7 : 14;

    try {
      const data = await fetchDoseTimelineApi(targetDate, days, configTimezone);
      setDoses(data);
    } catch {
      // Fallback handled in API
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
        timezone: configTimezone,
      });
      setStatusMessage({
        type: "success",
        text: `Dose of ${dose.medication_name} marked as ${nextStatus}.`,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to record dose.";
      setStatusMessage({ type: "error", text: msg });
      loadDoseTimeline();
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
        notes: "Marked skipped by patient",
        timezone: configTimezone,
      });
      setStatusMessage({
        type: "success",
        text: `Dose of ${dose.medication_name} marked as Skipped.`,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to log skipped dose.";
      setStatusMessage({ type: "error", text: msg });
    }
  };

  const handleConfirmCorrection = async () => {
    if (!correctingDose || !correctingDose.event_id) return;
    try {
      await correctDoseEventApi(correctingDose.event_id, {
        new_status: correctingDose.status === "Taken" ? "Skipped" : "Taken",
        correction_reason: correctionReason || "Corrected accidental log entry",
      });
      setStatusMessage({ type: "success", text: "Dose record corrected with audit trail." });
      setCorrectingDose(null);
      setCorrectionReason("");
      loadDoseTimeline();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to correct dose.";
      setStatusMessage({ type: "error", text: msg });
    }
  };

  const handleFrequencyPresetChange = (freq: string) => {
    setConfigFrequency(freq);
    if (freq === "Once daily in morning") setConfigTimes(["08:00"]);
    else if (freq === "Once daily at night") setConfigTimes(["21:00"]);
    else if (freq === "Twice daily") setConfigTimes(["08:00", "20:00"]);
    else if (freq === "Three times daily") setConfigTimes(["08:00", "13:00", "20:00"]);
    else if (freq === "Once weekly") setConfigTimes(["09:00"]);
  };

  const handleSaveCustomSchedule = async () => {
    setIsSubmittingConfig(true);
    setStatusMessage(null);

    try {
      await createMedicationApi({
        name: configName,
        strength: configStrength,
        formulation: "Tablet",
        instructions: `${configTimingRelation} with water`,
        frequency: configFrequency,
        duration: configDuration,
        timing_relation: configTimingRelation,
        scheduled_times: configTimes,
        timezone: configTimezone,
        reminder_enabled: configReminder,
        reminder_offset_minutes: configOffset,
        start_date: configStartDate,
        is_user_edited: true,
      });

      setShowConfigModal(false);
      setConfigReviewStep(false);
      setStatusMessage({
        type: "success",
        text: `Schedule successfully activated for ${configName}. Reminders scheduled.`,
      });
      loadDoseTimeline();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to configure schedule.";
      setStatusMessage({ type: "error", text: msg });
    } finally {
      setIsSubmittingConfig(false);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-5">
        {/* Top Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              Medication Schedule
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              Deterministic timetable matching clinician-prescribed frequencies
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setConfigReviewStep(false);
              setShowConfigModal(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs shadow-blue-500/20 transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Configure Schedule</span>
          </button>
        </div>

        {/* Status Toast */}
        {statusMessage && (
          <div
            className={`p-3.5 rounded-2xl border text-xs font-medium flex items-center justify-between gap-3 ${
              statusMessage.type === "success"
                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                : "bg-red-50 border-red-200 text-red-800"
            }`}
          >
            <div className="flex items-center gap-2">
              {statusMessage.type === "success" ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              )}
              <span>{statusMessage.text}</span>
            </div>
            <button
              type="button"
              onClick={() => setStatusMessage(null)}
              className="text-slate-400 hover:text-slate-700 text-xs font-bold"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* View Switcher Tabs matching Screen 6 top */}
        <div className="bg-slate-100/80 p-1 rounded-2xl flex items-center justify-between">
          {(["Today", "7 Days", "All"] as const).map((tab) => {
            const isActive = activeTab === tab;
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
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

        {/* Date Navigator Bar matching Screen 6 */}
        <div className="bg-white p-3 sm:p-4 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
          <button
            type="button"
            onClick={() => setCurrentDateIndex((prev) => Math.max(0, prev - 1))}
            disabled={currentDateIndex === 0}
            className="p-1.5 rounded-xl hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent text-slate-700 transition-colors"
          >
            <ChevronLeft className="w-5 h-5 stroke-[2.2]" />
          </button>

          <div className="text-center">
            <span className="text-xs sm:text-sm font-bold text-slate-900">
              {dates[currentDateIndex]?.label}
            </span>
            <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400 mt-0.5">
              <Globe className="w-3 h-3 text-slate-400" />
              <span>Timezone: {configTimezone}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setCurrentDateIndex((prev) => Math.min(dates.length - 1, prev + 1))}
            disabled={currentDateIndex === dates.length - 1}
            className="p-1.5 rounded-xl hover:bg-slate-100 disabled:opacity-30 disabled:hover:bg-transparent text-slate-700 transition-colors"
          >
            <ChevronRight className="w-5 h-5 stroke-[2.2]" />
          </button>
        </div>

        {/* Medication Schedule Timeline matching Screen 6 */}
        <div className="space-y-3.5">
          {isLoading ? (
            <div className="py-12 text-center space-y-3">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="text-xs font-semibold text-slate-500">Loading schedule timeline...</p>
            </div>
          ) : doses.length === 0 ? (
            <div className="bg-white rounded-3xl p-10 text-center border border-slate-200/80 space-y-2">
              <Clock className="w-8 h-8 text-slate-300 mx-auto" />
              <h3 className="text-sm font-bold text-slate-800">No scheduled doses for this period</h3>
              <p className="text-xs text-slate-400">All doses are completed or no medication is scheduled on this date.</p>
            </div>
          ) : (
            doses.map((dose) => {
              const isTaken = dose.status === "Taken";
              const isSkipped = dose.status === "Skipped";
              const isMissed = dose.status === "Missed" || dose.is_overdue;

              return (
                <div
                  key={dose.id}
                  className={`bg-white rounded-2xl p-4 sm:p-5 border transition-all space-y-3 ${
                    isTaken
                      ? "border-emerald-200/80 bg-emerald-50/20"
                      : isMissed
                      ? "border-red-200/80 bg-red-50/20"
                      : isSkipped
                      ? "border-slate-200 bg-slate-50/50 opacity-75"
                      : "border-slate-200/80 shadow-xs hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">
                          {dose.scheduled_time}
                        </span>
                        <span className="text-[11px] text-slate-400 font-medium">
                          ({dose.timing_relation})
                        </span>
                        {isTaken && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700">
                            Taken
                          </span>
                        )}
                        {isMissed && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700">
                            Overdue
                          </span>
                        )}
                        {isSkipped && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                            Skipped
                          </span>
                        )}
                      </div>

                      <h2 className="text-sm sm:text-base font-bold text-slate-900 truncate">
                        {dose.medication_name} {dose.strength}
                      </h2>
                      <p className="text-xs text-slate-600">
                        {dose.instructions}
                      </p>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
                      <button
                        type="button"
                        onClick={() => handleToggleDose(dose)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                          isTaken
                            ? "bg-emerald-600 text-white shadow-xs"
                            : "bg-blue-600 hover:bg-blue-700 text-white shadow-xs shadow-blue-500/20"
                        }`}
                      >
                        <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                        <span>{isTaken ? "Taken" : "Take Dose"}</span>
                      </button>

                      {!isTaken && !isSkipped && (
                        <button
                          type="button"
                          onClick={() => handleMarkSkipped(dose)}
                          className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-semibold transition-colors"
                          title="Mark dose skipped"
                        >
                          Skip
                        </button>
                      )}

                      {dose.event_id && (
                        <button
                          type="button"
                          onClick={() => setCorrectingDose(dose)}
                          className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                          title="Correct log mistake"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Clinical Safety Banner */}
        <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
          <div className="text-xs text-slate-600 space-y-0.5">
            <span className="font-bold text-slate-800">Medical Safety Notice:</span>
            <p className="leading-relaxed">
              MediMate AI enforces doctor-prescribed scheduling only and does not guess missing times. For missed doses, do not take a double dose; consult your prescription or clinician.
            </p>
          </div>
        </div>

        {/* Configure Schedule Modal */}
        {showConfigModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 border border-slate-200 shadow-xl space-y-5 animate-in fade-in zoom-in-95">
              {!configReviewStep ? (
                /* Step 1: Schedule Configuration Form */
                <>
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div>
                      <h3 className="text-base font-bold text-slate-900">
                        Configure Medication Schedule
                      </h3>
                      <p className="text-xs text-slate-500">
                        Deterministic schedule creation with validated times
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowConfigModal(false)}
                      className="p-1 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="space-y-3.5 text-xs">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="font-semibold text-slate-600 block mb-1">Medication Name</label>
                        <input
                          type="text"
                          value={configName}
                          onChange={(e) => setConfigName(e.target.value)}
                          className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-900"
                        />
                      </div>
                      <div>
                        <label className="font-semibold text-slate-600 block mb-1">Strength</label>
                        <input
                          type="text"
                          value={configStrength}
                          onChange={(e) => setConfigStrength(e.target.value)}
                          className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-900"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="font-semibold text-slate-600 block mb-1">Frequency Preset</label>
                      <select
                        value={configFrequency}
                        onChange={(e) => handleFrequencyPresetChange(e.target.value)}
                        className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800"
                      >
                        <option value="Once daily in morning">Once daily in morning (08:00 AM)</option>
                        <option value="Once daily at night">Once daily at night (09:00 PM)</option>
                        <option value="Twice daily">Twice daily (08:00 AM, 08:00 PM)</option>
                        <option value="Three times daily">Three times daily (08:00 AM, 01:00 PM, 08:00 PM)</option>
                        <option value="Once weekly">Once weekly (09:00 AM)</option>
                      </select>
                    </div>

                    <div>
                      <label className="font-semibold text-slate-600 block mb-1">Scheduled Dose Times (24h)</label>
                      <div className="flex gap-2 flex-wrap">
                        {configTimes.map((t, idx) => (
                          <input
                            key={idx}
                            type="time"
                            value={t}
                            onChange={(e) => {
                              const copy = [...configTimes];
                              copy[idx] = e.target.value;
                              setConfigTimes(copy);
                            }}
                            className="p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900"
                          />
                        ))}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="font-semibold text-slate-600 block mb-1">Timing Relation</label>
                        <select
                          value={configTimingRelation}
                          onChange={(e) => setConfigTimingRelation(e.target.value)}
                          className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
                        >
                          <option value="After food">After food</option>
                          <option value="Before food">Before food</option>
                          <option value="With food">With food</option>
                          <option value="Empty stomach">Empty stomach</option>
                          <option value="At bedtime">At bedtime</option>
                        </select>
                      </div>

                      <div>
                        <label className="font-semibold text-slate-600 block mb-1">Patient Timezone</label>
                        <input
                          type="text"
                          value={configTimezone}
                          onChange={(e) => setConfigTimezone(e.target.value)}
                          className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-3 bg-blue-50/60 rounded-xl border border-blue-100">
                      <div className="flex items-center gap-2">
                        <Bell className="w-4 h-4 text-blue-600" />
                        <div>
                          <span className="font-bold text-blue-900 block">Dose Reminders</span>
                          <span className="text-[11px] text-blue-700">Deliver notifications before scheduled times</span>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={configReminder}
                        onChange={(e) => setConfigReminder(e.target.checked)}
                        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pt-3">
                    <button
                      type="button"
                      onClick={() => setShowConfigModal(false)}
                      className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfigReviewStep(true)}
                      className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-xs"
                    >
                      Review Schedule
                    </button>
                  </div>
                </>
              ) : (
                /* Step 2: Schedule Review Dialog before Activation */
                <>
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5 text-blue-600" />
                      <h3 className="text-base font-bold text-slate-900">
                        Review Schedule Before Activation
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => setConfigReviewStep(false)}
                      className="p-1 text-slate-400 hover:text-slate-600"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Medication:</span>
                      <strong className="text-slate-900">{configName} {configStrength}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Frequency:</span>
                      <strong className="text-slate-900">{configFrequency}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Daily Times:</span>
                      <strong className="text-slate-900">{configTimes.join(", ")} ({configTimingRelation})</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Start Date:</span>
                      <strong className="text-slate-900">{configStartDate}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Timezone:</span>
                      <strong className="text-slate-900">{configTimezone}</strong>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Reminders:</span>
                      <strong className="text-slate-900">{configReminder ? `Enabled (${configOffset}m before)` : "Disabled"}</strong>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-500 italic">
                    Activating this schedule will generate daily dose tracking instances and queue notifications.
                  </p>

                  <div className="flex items-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setConfigReviewStep(false)}
                      className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl"
                    >
                      Back to Edit
                    </button>
                    <button
                      type="button"
                      disabled={isSubmittingConfig}
                      onClick={handleSaveCustomSchedule}
                      className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-xs"
                    >
                      {isSubmittingConfig ? "Activating..." : "Confirm & Activate"}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Dose Correction Modal */}
        {correctingDose && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 border border-slate-200 shadow-xl space-y-4 animate-in fade-in zoom-in-95">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <RotateCcw className="w-5 h-5" />
              </div>

              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Correct Logged Dose Record
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Change dose status for {correctingDose.medication_name} ({correctingDose.scheduled_time}) with an audit entry.
                </p>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                  Correction Reason (Preserved in Audit Trail):
                </label>
                <input
                  type="text"
                  placeholder="e.g. Accidentally marked Taken; Took late"
                  value={correctionReason}
                  onChange={(e) => setCorrectionReason(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setCorrectingDose(null)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmCorrection}
                  className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-xs"
                >
                  Save Correction
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
