"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { AppLayout } from "@/components/layout/AppLayout";
import { mockSamplePrescription } from "@/lib/mockData";
import { ExtractedMedicine } from "@/types";
import {
  ArrowLeft,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Save,
  RotateCw,
  FileText,
  Eye,
  ShieldCheck,
  AlertCircle,
  HelpCircle,
  Check,
  Edit2
} from "lucide-react";
import {
  fetchPrescriptionReview,
  savePrescriptionDraft,
  confirmPrescriptionApi,
  PrescriptionExtractionData
} from "@/lib/prescriptionApi";

function PrescriptionReviewContent() {
  const router = useRouter();
  const params = useParams();
  const prescriptionId = (params?.id as string) || "rx-sample-001";

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Prescription Data
  const [prescriptionData, setPrescriptionData] = useState<PrescriptionExtractionData | null>(null);
  const [doctorName, setDoctorName] = useState("Dr. R. Mehta");
  const [speciality, setSpeciality] = useState("General Physician");
  const [prescriptionDate, setPrescriptionDate] = useState("28 Aug 2025");
  const [medicines, setMedicines] = useState<ExtractedMedicine[]>(mockSamplePrescription.medicines);
  const [showOcrText, setShowOcrText] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [userAcknowledged, setUserAcknowledged] = useState(false);

  // Active medicine being edited in right panel
  const [selectedMedIndex, setSelectedMedIndex] = useState<number>(0);

  useEffect(() => {
    loadPrescription();
  }, [prescriptionId]);

  const loadPrescription = async () => {
    setIsLoading(true);
    setStatusMessage(null);
    try {
      const data = await fetchPrescriptionReview(prescriptionId);
      setPrescriptionData(data);
      setDoctorName(data.metadata.doctor_name || "Dr. R. Mehta");
      setSpeciality(data.metadata.speciality || "General Physician");
      setMedicines(data.medicines);
      if (data.medicines.length > 0) {
        setSelectedMedIndex(0);
      }
    } catch {
      // Fallback to sample data if backend is offline
      setMedicines(mockSamplePrescription.medicines);
    } finally {
      setIsLoading(false);
    }
  };

  const handleMedicineChange = (index: number, field: keyof ExtractedMedicine, value: any) => {
    setMedicines((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        [field]: value,
      };
      // If user edits instructions, automatically remove the uncertainty flag if satisfied
      if (field === "instructions" || field === "frequency" || field === "strength") {
        updated[index].needsConfirmation = false;
        updated[index].isUnclear = false;
      }
      return updated;
    });
  };

  const handleSaveDraft = async () => {
    setIsSaving(true);
    setStatusMessage(null);
    try {
      await savePrescriptionDraft(prescriptionId, {
        doctor_name: doctorName,
        speciality: speciality,
        prescription_date: prescriptionDate,
        medicines: medicines,
      });
      setStatusMessage({ type: "success", text: "Draft corrections saved securely." });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save draft.";
      setStatusMessage({ type: "error", text: msg });
    } finally {
      setIsSaving(false);
    }
  };

  const handleConfirmPrescription = async () => {
    if (!userAcknowledged) {
      setStatusMessage({
        type: "error",
        text: "You must certify that you have verified these medications against the original prescription document.",
      });
      return;
    }

    setIsConfirming(true);
    setStatusMessage(null);

    try {
      await confirmPrescriptionApi(prescriptionId, {
        doctor_name: doctorName,
        speciality: speciality,
        prescription_date: prescriptionDate,
        medicines: medicines,
        create_schedules: true,
        user_acknowledgement: true,
      });

      setShowConfirmModal(false);
      // Navigate to schedule screen where confirmed medications are now active
      router.push("/medications/schedule");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to confirm prescription.";
      setStatusMessage({ type: "error", text: msg });
      setShowConfirmModal(false);
    } finally {
      setIsConfirming(false);
    }
  };

  const uncertainCount = medicines.filter((m) => m.needsConfirmation || m.isUnclear || m.hasConflictingInstructions).length;
  const activeMed = medicines[selectedMedIndex] || medicines[0];

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header matching Screen 4: ← Prescription Review */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/prescriptions/upload"
              className="p-1.5 -ml-1.5 rounded-xl text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 stroke-[2.2]" />
            </Link>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900">
                Prescription Review
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                Step 3 of 4: Verify OCR transcription and AI proposed medication schedule
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSaveDraft}
              disabled={isSaving}
              className="hidden sm:flex items-center gap-1.5 py-2 px-3.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-semibold shadow-2xs transition-all cursor-pointer"
            >
              <Save className="w-3.5 h-3.5 text-slate-500" />
              <span>{isSaving ? "Saving..." : "Save Draft"}</span>
            </button>
          </div>
        </div>

        {/* Status notification toast */}
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

        {/* Two-Column Layout matching Screen 4 */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
          {/* Left Column: Original Document + Medicines (AI Extracted) */}
          <div className="md:col-span-6 bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs space-y-5">
            {/* Header with OCR toggle */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-blue-600" />
                <span>Original Document</span>
              </span>
              <button
                type="button"
                onClick={() => setShowOcrText(!showOcrText)}
                className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                <Eye className="w-3 h-3" />
                <span>{showOcrText ? "View Visual Document" : "View Verbatim OCR"}</span>
              </button>
            </div>

            {/* Original Prescription Document Card */}
            <div>
              {!showOcrText ? (
                <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 shadow-2xs font-mono text-slate-700 text-xs space-y-2 select-none">
                  <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                    <span className="font-bold text-slate-900 font-sans text-xs">
                      {doctorName.toUpperCase()}, MD
                    </span>
                    <span className="text-[11px] text-slate-400 font-sans">
                      {prescriptionDate}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 font-sans">
                    Patient: Priya Sharma • Age: 34F • Reg No: MED-74921
                  </div>
                  <div className="pt-1 text-slate-800 font-serif italic text-xs leading-5">
                    1. Tab. Metformin 500mg - 1 tab BID (p.c.) x 30d
                    <br />
                    2. Tab. Atorvastatin 10mg - 1 tab HS x 30d
                    <br />
                    3. Tab. Vitamin D3 1000IU - 1 tab weekly with meal x 8w [dosage check]
                  </div>
                  <div className="pt-2 text-right">
                    <span className="text-[10px] text-slate-400 border-t border-slate-300 px-3 pt-0.5">
                      {doctorName} (Signed)
                    </span>
                  </div>
                </div>
              ) : (
                /* Raw Verbatim OCR Transcription View */
                <div className="bg-slate-900 text-emerald-400 p-4 rounded-2xl font-mono text-[11px] leading-relaxed max-h-56 overflow-y-auto border border-slate-800">
                  <div className="text-slate-400 text-[10px] pb-1 border-b border-slate-800 mb-2">
                    -- VERBATIM OCR TRANSCRIPTION --
                  </div>
                  <pre className="whitespace-pre-wrap font-mono">
                    {prescriptionData?.raw_ocr_text ||
                      "DR. R. MEHTA, MD\nGeneral Physician | Reg No: MED-74921\nMetro Specialty Clinic, Bangalore\nDate: 28 Aug 2025\nPatient: Priya Sharma • Age: 34F\n\nRx:\n1. Tab. Metformin 500mg - 1 tab BID (p.c.) after food x 30d\n2. Tab. Atorvastatin 10mg - 1 tab HS after food x 30d\n3. Tab. Vitamin D3 1000IU - 1 tab weekly with breakfast x 8w"}
                  </pre>
                </div>
              )}
            </div>

            {/* Section: Medicines (AI Extracted) matching Screen 4 */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Medicines (AI Extracted)
                </h2>
                <span className="text-[11px] font-medium text-slate-400">
                  Click to edit details
                </span>
              </div>

              <div className="space-y-2.5">
                {medicines.map((med, idx) => {
                  const isHigh = med.confidence >= 90;
                  const isSelected = selectedMedIndex === idx;
                  const hasWarning = med.needsConfirmation || med.isUnclear || med.hasConflictingInstructions;

                  return (
                    <div
                      key={med.id || idx}
                      onClick={() => setSelectedMedIndex(idx)}
                      className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 cursor-pointer ${
                        isSelected
                          ? "ring-2 ring-blue-600 border-blue-500 bg-blue-50/30"
                          : hasWarning
                          ? "border-amber-200 bg-amber-50/20 hover:bg-amber-50/40"
                          : "border-slate-100 bg-slate-50/60 hover:bg-slate-50"
                      }`}
                    >
                      <div className="min-w-0 flex items-start gap-2.5">
                        <div className="mt-0.5">
                          {hasWarning ? (
                            <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                          ) : (
                            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-slate-900 truncate">
                            Tab. {med.name} {med.strength}
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5 truncate">
                            {med.frequency || "Frequency not specified"} • {med.duration || "Duration not specified"}
                          </div>
                          {med.sourceText && (
                            <div className="text-[10px] text-slate-400 italic mt-0.5 line-clamp-1">
                              &ldquo;{med.sourceText}&rdquo;
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            isHigh
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {med.confidence}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Column: AI Extracted Information matching Screen 4 */}
          <div className="md:col-span-6 bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-900">
                  AI Extracted Information
                </h2>
                {prescriptionData?.provider_info?.is_mock && (
                  <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                    Mock Mode Active
                  </span>
                )}
              </div>

              {/* Clinician and Prescription Metadata Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Doctor Name */}
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                    Doctor Name
                  </label>
                  <input
                    type="text"
                    value={doctorName}
                    onChange={(e) => setDoctorName(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 rounded-xl border border-slate-200/80 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                {/* Speciality */}
                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                    Speciality
                  </label>
                  <input
                    type="text"
                    value={speciality}
                    onChange={(e) => setSpeciality(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 rounded-xl border border-slate-200/80 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Date */}
              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                  Prescription Date
                </label>
                <input
                  type="text"
                  value={prescriptionDate}
                  onChange={(e) => setPrescriptionDate(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 rounded-xl border border-slate-200/80 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Active Medication Field Editor */}
              {activeMed && (
                <div className="p-4 rounded-2xl border border-blue-100 bg-blue-50/20 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                      <Edit2 className="w-3.5 h-3.5 text-blue-600" />
                      <span>Editing: {activeMed.name}</span>
                    </span>
                    <span className="text-[10px] text-blue-600 font-semibold">
                      Medicine {selectedMedIndex + 1} of {medicines.length}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-[10px] font-medium text-slate-500 block mb-0.5">
                        Medication Name
                      </label>
                      <input
                        type="text"
                        value={activeMed.name}
                        onChange={(e) => handleMedicineChange(selectedMedIndex, "name", e.target.value)}
                        className="w-full p-2 bg-white rounded-lg border border-slate-200 text-xs font-semibold text-slate-800"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-medium text-slate-500 block mb-0.5">
                        Strength
                      </label>
                      <input
                        type="text"
                        value={activeMed.strength || ""}
                        onChange={(e) => handleMedicineChange(selectedMedIndex, "strength", e.target.value)}
                        placeholder="e.g. 500mg"
                        className="w-full p-2 bg-white rounded-lg border border-slate-200 text-xs font-semibold text-slate-800"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="text-[10px] font-medium text-slate-500 block mb-0.5">
                        Frequency
                      </label>
                      <input
                        type="text"
                        value={activeMed.frequency || ""}
                        onChange={(e) => handleMedicineChange(selectedMedIndex, "frequency", e.target.value)}
                        placeholder="e.g. Twice daily"
                        className="w-full p-2 bg-white rounded-lg border border-slate-200 text-xs text-slate-800"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-medium text-slate-500 block mb-0.5">
                        Duration
                      </label>
                      <input
                        type="text"
                        value={activeMed.duration || ""}
                        onChange={(e) => handleMedicineChange(selectedMedIndex, "duration", e.target.value)}
                        placeholder="e.g. 30 days"
                        className="w-full p-2 bg-white rounded-lg border border-slate-200 text-xs text-slate-800"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-medium text-slate-500 block mb-0.5">
                      Instructions & Timing Relation
                    </label>
                    <input
                      type="text"
                      value={activeMed.instructions || ""}
                      onChange={(e) => handleMedicineChange(selectedMedIndex, "instructions", e.target.value)}
                      placeholder="e.g. After food"
                      className="w-full p-2 bg-white rounded-lg border border-slate-200 text-xs text-slate-800"
                    />
                  </div>

                  {activeMed.sourceText && (
                    <div className="text-[10px] text-slate-500 bg-white/80 p-2 rounded-lg border border-slate-100">
                      <span className="font-semibold text-slate-600">OCR Evidence:</span> &ldquo;{activeMed.sourceText}&rdquo;
                    </div>
                  )}
                </div>
              )}

              {/* Warning Alert Banner matching Screen 4 */}
              {uncertainCount > 0 && (
                <div className="p-3.5 bg-amber-50 border border-amber-200/80 rounded-2xl flex items-start gap-3">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-amber-900">
                      Some fields need your confirmation
                    </h4>
                    <p className="text-[11px] text-amber-700 mt-0.5">
                      Please review and correct any uncertain items before finalizing your schedule.
                    </p>
                  </div>
                </div>
              )}

              {/* Medical Safety Advisory Banner */}
              <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <p className="text-[11px] text-slate-600 leading-normal">
                  <span className="font-bold text-slate-800">Medical Safety Rule:</span> Always verify extracted dosages against the original document. If any instruction is illegible, contact your doctor or pharmacist.
                </p>
              </div>
            </div>

            {/* Review & Confirm Button matching Screen 4 */}
            <div className="pt-2 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(true)}
                className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-xs sm:text-sm rounded-xl shadow-xs shadow-blue-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Review & Confirm</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="flex sm:hidden">
                <button
                  type="button"
                  onClick={handleSaveDraft}
                  disabled={isSaving}
                  className="w-full py-2.5 px-3 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
                >
                  {isSaving ? "Saving..." : "Save Draft"}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Confirmation Modal */}
        {showConfirmModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 border border-slate-200 shadow-xl space-y-4 animate-in fade-in zoom-in-95">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
                <ShieldCheck className="w-6 h-6" />
              </div>

              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Confirm Prescription Verification
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  You are about to generate an active medication schedule for {medicines.length} verified medicines.
                </p>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2 text-xs">
                <div className="font-semibold text-slate-800">Prescription Summary:</div>
                <ul className="text-slate-600 space-y-1 text-[11px]">
                  <li>• Doctor: {doctorName} ({speciality})</li>
                  <li>• Date: {prescriptionDate}</li>
                  <li>• Medications: {medicines.map((m) => `${m.name} ${m.strength || ""}`).join(", ")}</li>
                </ul>
              </div>

              {/* Mandatory acknowledgement checkbox */}
              <label className="flex items-start gap-2.5 cursor-pointer text-xs text-slate-700 pt-1">
                <input
                  type="checkbox"
                  checked={userAcknowledged}
                  onChange={(e) => setUserAcknowledged(e.target.checked)}
                  className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                />
                <span className="leading-snug">
                  I certify that I have verified the extracted medication details against the physical prescription and consulted my clinician for any unclear items.
                </span>
              </label>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowConfirmModal(false)}
                  className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-colors"
                >
                  Back to Review
                </button>
                <button
                  type="button"
                  onClick={handleConfirmPrescription}
                  disabled={!userAcknowledged || isConfirming}
                  className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-semibold text-white transition-all flex items-center justify-center gap-1.5 ${
                    userAcknowledged && !isConfirming
                      ? "bg-blue-600 hover:bg-blue-700 shadow-xs shadow-blue-500/20 cursor-pointer"
                      : "bg-slate-300 cursor-not-allowed"
                  }`}
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{isConfirming ? "Confirming..." : "Confirm & Activate"}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

export default function PrescriptionReviewPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <div className="text-center space-y-2">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-xs font-semibold text-slate-600">
              Loading Prescription Review...
            </p>
          </div>
        </div>
      }
    >
      <PrescriptionReviewContent />
    </Suspense>
  );
}
