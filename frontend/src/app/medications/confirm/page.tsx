"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppLayout } from "@/components/layout/AppLayout";
import { mockSamplePrescription } from "@/lib/mockData";
import { ExtractedMedicine } from "@/types";
import {
  ArrowLeft,
  Check,
  X,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  FileText,
  Edit2,
  Sparkles,
  Info
} from "lucide-react";
import { createMedicationApi } from "@/lib/medicationApi";

interface EditableConfirmedMedicine extends ExtractedMedicine {
  isUserEdited?: boolean;
  originalName?: string;
  originalStrength?: string;
}

export default function ConfirmMedicationsPage() {
  const router = useRouter();
  const [medicines, setMedicines] = useState<EditableConfirmedMedicine[]>(() =>
    mockSamplePrescription.medicines.map((m) => ({
      ...m,
      isUserEdited: false,
      originalName: m.name,
      originalStrength: m.strength,
    }))
  );

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditableConfirmedMedicine | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [userCertified, setUserCertified] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const startEdit = (med: EditableConfirmedMedicine) => {
    setEditingId(med.id);
    setEditForm({ ...med });
  };

  const handleSaveEdit = () => {
    if (editForm) {
      const isChanged =
        editForm.name !== editForm.originalName ||
        editForm.strength !== editForm.originalStrength;

      setMedicines((prev) =>
        prev.map((m) =>
          m.id === editForm.id
            ? { ...editForm, isUserEdited: m.isUserEdited || isChanged }
            : m
        )
      );
      setEditingId(null);
      setEditForm(null);
    }
  };

  const handleConfirmAll = async () => {
    if (!userCertified) {
      setErrorMessage("Please check the confirmation box certifying that you verified these medications.");
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    try {
      // Create confirmed active medication records in store
      for (const med of medicines) {
        const times = med.frequency.toLowerCase().includes("twice") || med.frequency.toLowerCase().includes("bid")
          ? ["08:00", "20:00"]
          : ["08:00"];

        await createMedicationApi({
          name: med.name,
          strength: med.strength,
          formulation: med.formulation || "Tablet",
          instructions: med.instructions || "After food",
          frequency: med.frequency,
          duration: med.duration,
          route: med.route || "Oral",
          timing_relation: "After food",
          scheduled_times: times,
          is_user_edited: med.isUserEdited ?? false,
          original_source_text: med.sourceText,
        }).catch((err) => {
          console.warn("Backend creation notice:", err);
        });
      }

      router.push("/medications/schedule");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to confirm medications.";
      setErrorMessage(msg);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-5">
        {/* Header matching Screen 5: ← Please review the extracted information... */}
        <div className="flex items-start gap-3">
          <Link
            href="/prescriptions/rx-sample-001/review"
            className="p-1 -ml-1 rounded-xl text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition-colors mt-0.5"
          >
            <ArrowLeft className="w-5 h-5 stroke-[2.2]" />
          </Link>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
              Please review the extracted information and make any necessary changes.
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Step 4 of 4: Distinguish prescription details from user corrections before schedule activation
            </p>
          </div>
        </div>

        {/* Safety Note */}
        <div className="p-3.5 bg-blue-50/70 border border-blue-200/80 rounded-2xl flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
          <div className="text-xs text-blue-900 space-y-0.5">
            <span className="font-bold">Medical Zero-Hallucination Rule:</span>
            <p className="text-blue-700 leading-relaxed">
              MediMate AI will never automatically activate unverified prescription items or change doses. Please review each medicine below and adjust if needed.
            </p>
          </div>
        </div>

        {errorMessage && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 font-medium">
            {errorMessage}
          </div>
        )}

        {/* Medication Cards List matching Screen 5 */}
        <div className="space-y-3.5">
          {medicines.map((med) => {
            const isEditing = editingId === med.id;

            return (
              <div
                key={med.id}
                className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:border-slate-300 transition-all space-y-3"
              >
                {!isEditing ? (
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm sm:text-base font-bold text-slate-900">
                          {med.name} {med.strength}
                        </h3>
                        {/* Origin badge distinguishing prescription-derived from user-edited */}
                        {med.isUserEdited ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700 border border-purple-200">
                            User Corrected
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                            Prescription Extracted
                          </span>
                        )}
                      </div>

                      <p className="text-xs sm:text-sm text-slate-700 font-medium">
                        {med.frequency}
                      </p>

                      <div className="flex items-center gap-3 text-xs text-slate-400">
                        <span>Duration: {med.duration || "30 days"}</span>
                        <span>•</span>
                        <span>Route: {med.route || "Oral"}</span>
                      </div>

                      {med.sourceText && (
                        <div className="text-[11px] text-slate-500 bg-slate-50 p-2 rounded-lg border border-slate-100 font-mono text-[10px]">
                          <span className="font-semibold font-sans text-slate-400">Prescription source:</span> &ldquo;{med.sourceText}&rdquo;
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => startEdit(med)}
                      className="px-3.5 py-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 hover:bg-blue-50 border border-blue-200 rounded-xl transition-all shrink-0 cursor-pointer flex items-center gap-1.5"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                      <span>Edit</span>
                    </button>
                  </div>
                ) : (
                  /* Inline Edit Form */
                  <div className="space-y-3 pt-1">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <span className="text-xs font-bold text-blue-600 flex items-center gap-1.5">
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>Editing Medication Details</span>
                      </span>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="text-slate-400 hover:text-slate-600 p-1"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                          Medicine Name
                        </label>
                        <input
                          type="text"
                          value={editForm?.name || ""}
                          onChange={(e) =>
                            setEditForm((prev) =>
                              prev ? { ...prev, name: e.target.value } : null
                            )
                          }
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                          Strength & Unit
                        </label>
                        <input
                          type="text"
                          value={editForm?.strength || ""}
                          onChange={(e) =>
                            setEditForm((prev) =>
                              prev ? { ...prev, strength: e.target.value } : null
                            )
                          }
                          placeholder="e.g. 500mg"
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                          Frequency
                        </label>
                        <input
                          type="text"
                          value={editForm?.frequency || ""}
                          onChange={(e) =>
                            setEditForm((prev) =>
                              prev ? { ...prev, frequency: e.target.value } : null
                            )
                          }
                          placeholder="e.g. Twice daily"
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                          Duration
                        </label>
                        <input
                          type="text"
                          value={editForm?.duration || ""}
                          onChange={(e) =>
                            setEditForm((prev) =>
                              prev ? { ...prev, duration: e.target.value } : null
                            )
                          }
                          placeholder="e.g. 30 days"
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveEdit}
                        className="px-4 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Apply Correction</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Explicit Confirmation Checkbox */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-2">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={userCertified}
              onChange={(e) => setUserCertified(e.target.checked)}
              className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
            />
            <span className="text-xs text-slate-700 leading-relaxed font-medium">
              I certify that I have verified each medication name, dosage strength, and frequency against my doctor&apos;s physical prescription. I understand MediMate does not prescribe or change dosages.
            </span>
          </label>
        </div>

        {/* Primary Save & Continue button matching Screen 5 bottom */}
        <div className="pt-2">
          <button
            type="button"
            disabled={isSaving || !userCertified}
            onClick={handleConfirmAll}
            className={`w-full py-3.5 px-4 rounded-xl font-semibold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 ${
              userCertified && !isSaving
                ? "bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white shadow-xs shadow-blue-500/20 cursor-pointer"
                : "bg-slate-200 text-slate-400 cursor-not-allowed"
            }`}
          >
            <span>{isSaving ? "Activating Schedule..." : "Save & Continue to Schedule"}</span>
            {!isSaving && <ArrowRight className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </AppLayout>
  );
}
