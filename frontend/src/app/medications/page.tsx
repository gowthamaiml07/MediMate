"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  MedicationDetailDto,
  fetchAllMedications,
  updateMedicationStatusApi,
  updateMedicationApi
} from "@/lib/medicationApi";
import {
  Pill,
  Search,
  Filter,
  Plus,
  Clock,
  Calendar,
  AlertCircle,
  PauseCircle,
  PlayCircle,
  XCircle,
  CheckCircle2,
  Edit2,
  ChevronRight,
  ShieldAlert,
  Bell,
  RefreshCw,
  FileText
} from "lucide-react";

export default function MedicationsDashboardPage() {
  const [medications, setMedications] = useState<MedicationDetailDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<"All" | "Active" | "Paused" | "Completed" | "Discontinued">("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Selected med for detail/action modals
  const [selectedMed, setSelectedMed] = useState<MedicationDetailDto | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [actionConfirmModal, setActionConfirmModal] = useState<{
    targetMed: MedicationDetailDto;
    action: "Pause" | "Resume" | "Discontinue";
  } | null>(null);
  const [actionReason, setActionReason] = useState("");
  const [isActionLoading, setIsActionLoading] = useState(false);

  useEffect(() => {
    loadMedications();
  }, [activeFilter]);

  const loadMedications = async () => {
    setIsLoading(true);
    try {
      const data = await fetchAllMedications(activeFilter);
      setMedications(data);
    } catch {
      // Fallback handled in API
    } finally {
      setIsLoading(false);
    }
  };

  const handleStatusChange = async () => {
    if (!actionConfirmModal) return;
    setIsActionLoading(true);
    setStatusMessage(null);

    const { targetMed, action } = actionConfirmModal;
    let targetStatus: "Active" | "Paused" | "Completed" | "Discontinued" = "Active";
    if (action === "Pause") targetStatus = "Paused";
    else if (action === "Resume") targetStatus = "Active";
    else if (action === "Discontinue") targetStatus = "Discontinued";

    try {
      await updateMedicationStatusApi(targetMed.id, targetStatus, actionReason);
      setStatusMessage({
        type: "success",
        text: `Medication '${targetMed.name}' has been ${action === "Pause" ? "paused" : action === "Resume" ? "resumed" : "discontinued"}.`,
      });
      setActionConfirmModal(null);
      setActionReason("");
      loadMedications();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update medication status.";
      setStatusMessage({ type: "error", text: msg });
    } finally {
      setIsActionLoading(false);
    }
  };

  const filteredMeds = medications.filter((m) => {
    const matchesSearch =
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.instructions.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.strength.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Active":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "Paused":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "Completed":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "Discontinued":
        return "bg-slate-100 text-slate-600 border-slate-200";
      default:
        return "bg-slate-100 text-slate-600 border-slate-200";
    }
  };

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              Medication Management
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              View, edit, and safely manage your active treatment courses and scheduled doses
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/prescriptions/upload"
              className="inline-flex items-center gap-1.5 py-2 px-3.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl text-xs font-semibold shadow-xs shadow-blue-500/20 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add From Prescription</span>
            </Link>
          </div>
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

        {/* Filter and Search Bar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search medication name, strength, instructions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
              {(["All", "Active", "Paused", "Discontinued"] as const).map((tab) => {
                const isActive = activeFilter === tab;
                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setActiveFilter(tab)}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-all shrink-0 cursor-pointer ${
                      isActive
                        ? "bg-blue-600 text-white shadow-2xs"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
                    }`}
                  >
                    {tab}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Medication Cards List */}
        <div className="space-y-4">
          {isLoading ? (
            <div className="py-12 text-center space-y-3">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="text-xs font-semibold text-slate-500">Loading your medications...</p>
            </div>
          ) : filteredMeds.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/80 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <Pill className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-800">No medications found</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                {searchQuery
                  ? "Try searching for a different keyword or change your status filter."
                  : "You do not have any medications in this status category."}
              </p>
            </div>
          ) : (
            filteredMeds.map((med) => {
              const isActive = med.status === "Active";
              const isPaused = med.status === "Paused";

              return (
                <div
                  key={med.id}
                  className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="flex items-start gap-3.5 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center shrink-0 mt-0.5">
                        <Pill className="w-5 h-5" />
                      </div>

                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h2 className="text-base font-bold text-slate-900 truncate">
                            {med.name} {med.strength}
                          </h2>
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getStatusBadge(
                              med.status
                            )}`}
                          >
                            {med.status}
                          </span>
                          {med.is_user_edited && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                              User Corrected
                            </span>
                          )}
                        </div>

                        <p className="text-xs sm:text-sm font-medium text-slate-700">
                          {med.instructions}
                        </p>

                        <div className="flex items-center gap-3 text-xs text-slate-400 flex-wrap pt-0.5">
                          <span>Frequency: <strong className="text-slate-600">{med.frequency}</strong></span>
                          <span>•</span>
                          <span>Route: <strong className="text-slate-600">{med.route}</strong></span>
                          <span>•</span>
                          <span>Times: <strong className="text-slate-600">{med.scheduled_times.join(", ") || "08:00 AM"}</strong></span>
                        </div>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 self-end sm:self-start shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedMed(med);
                          setShowDetailModal(true);
                        }}
                        className="p-2 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl border border-slate-200 transition-colors"
                        title="View details"
                      >
                        <FileText className="w-4 h-4" />
                      </button>

                      {isActive ? (
                        <button
                          type="button"
                          onClick={() => setActionConfirmModal({ targetMed: med, action: "Pause" })}
                          className="px-3 py-1.5 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
                        >
                          <PauseCircle className="w-3.5 h-3.5" />
                          <span>Pause</span>
                        </button>
                      ) : isPaused ? (
                        <button
                          type="button"
                          onClick={() => setActionConfirmModal({ targetMed: med, action: "Resume" })}
                          className="px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
                        >
                          <PlayCircle className="w-3.5 h-3.5" />
                          <span>Resume</span>
                        </button>
                      ) : null}

                      {med.status !== "Discontinued" && (
                        <button
                          type="button"
                          onClick={() => setActionConfirmModal({ targetMed: med, action: "Discontinue" })}
                          className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-red-700 hover:bg-red-50 border border-slate-200 hover:border-red-200 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Discontinue</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Next Dose and Schedule Information Box */}
                  <div className="bg-slate-50/80 rounded-xl p-3 border border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2 text-slate-600">
                      <Clock className="w-4 h-4 text-blue-600 shrink-0" />
                      {isActive && med.next_scheduled_dose ? (
                        <span>
                          Next Scheduled Dose:{" "}
                          <strong className="text-slate-900">
                            {new Date(med.next_scheduled_dose).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </strong>{" "}
                          ({med.timing_relation})
                        </span>
                      ) : isActive ? (
                        <span>Next Dose: <strong className="text-slate-900">Scheduled for today</strong> ({med.timing_relation})</span>
                      ) : (
                        <span className="text-slate-400 italic">Doses paused while status is {med.status}</span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-slate-400">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>
                        Started: {med.start_date || "28 Aug 2025"} {med.end_date ? `• Ends: ${med.end_date}` : "• Ongoing"}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Detail Modal */}
        {showDetailModal && selectedMed && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 border border-slate-200 shadow-xl space-y-5 animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                    <Pill className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-slate-900">
                      {selectedMed.name} {selectedMed.strength}
                    </h3>
                    <span className="text-[11px] text-slate-400">Treatment Plan Details</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowDetailModal(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl">
                  <span className="text-slate-400 block mb-0.5">Formulation</span>
                  <span className="font-bold text-slate-800">{selectedMed.formulation}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl">
                  <span className="text-slate-400 block mb-0.5">Route</span>
                  <span className="font-bold text-slate-800">{selectedMed.route}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl">
                  <span className="text-slate-400 block mb-0.5">Frequency</span>
                  <span className="font-bold text-slate-800">{selectedMed.frequency}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl">
                  <span className="text-slate-400 block mb-0.5">Timing Relation</span>
                  <span className="font-bold text-slate-800">{selectedMed.timing_relation}</span>
                </div>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-xl text-xs space-y-1">
                <span className="text-slate-400 font-semibold block">Prescribed Instructions:</span>
                <p className="text-slate-800 font-medium">{selectedMed.instructions}</p>
                {selectedMed.original_source_text && (
                  <p className="text-[10px] text-slate-400 italic pt-1">
                    OCR Source Evidence: &ldquo;{selectedMed.original_source_text}&rdquo;
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between text-xs text-slate-600 bg-blue-50/50 p-3 rounded-xl border border-blue-100">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-blue-600" />
                  <span>Dose Reminders: <strong>{selectedMed.reminder_enabled ? "Enabled" : "Disabled"}</strong></span>
                </div>
                <span className="text-[11px] text-slate-400">{selectedMed.reminder_offset_minutes}m before dose</span>
              </div>

              <button
                type="button"
                onClick={() => setShowDetailModal(false)}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        )}

        {/* Confirmation Modal for Pause / Discontinue */}
        {actionConfirmModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 border border-slate-200 shadow-xl space-y-4 animate-in fade-in zoom-in-95">
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                  actionConfirmModal.action === "Discontinue"
                    ? "bg-red-50 text-red-600 border border-red-100"
                    : "bg-amber-50 text-amber-600 border border-amber-100"
                }`}
              >
                <ShieldAlert className="w-6 h-6" />
              </div>

              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Confirm {actionConfirmModal.action} of {actionConfirmModal.targetMed.name}?
                </h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  {actionConfirmModal.action === "Pause"
                    ? "Pausing will temporarily stop scheduled reminders. You can resume at any time without losing adherence history."
                    : actionConfirmModal.action === "Discontinue"
                    ? "Discontinuing will mark this treatment course complete. Historical dose adherence records are permanently preserved."
                    : "Resuming will reactivate scheduled doses and reminders."}
                </p>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                  Reason for status change (optional audit record):
                </label>
                <input
                  type="text"
                  placeholder="e.g. Consulted doctor; course finished; temporary side effect"
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setActionConfirmModal(null)}
                  className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isActionLoading}
                  onClick={handleStatusChange}
                  className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-semibold text-white transition-all cursor-pointer ${
                    actionConfirmModal.action === "Discontinue"
                      ? "bg-red-600 hover:bg-red-700"
                      : "bg-blue-600 hover:bg-blue-700"
                  }`}
                >
                  {isActionLoading ? "Updating..." : `Yes, ${actionConfirmModal.action}`}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
