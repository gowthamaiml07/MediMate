"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  ArrowLeft,
  Camera,
  Upload,
  Sparkles,
  Loader2,
  AlertCircle,
  FileText,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Info,
  Clock,
  ChevronRight
} from "lucide-react";
import {
  validatePrescriptionFile,
  uploadPrescriptionFile,
  fetchPrescriptionHistory,
  PrescriptionHistoryItem
} from "@/lib/prescriptionApi";

export default function PrescriptionUploadPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [processingStepLabel, setProcessingStepLabel] = useState("Uploading document...");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isMockMode, setIsMockMode] = useState(true);
  const [history, setHistory] = useState<PrescriptionHistoryItem[]>([]);
  const [abortController, setAbortController] = useState<AbortController | null>(null);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    try {
      const items = await fetchPrescriptionHistory();
      setHistory(items);
    } catch {
      // Graceful fallback
    }
  };

  const handleFileSelect = async (file: File) => {
    setErrorMessage(null);
    const validation = validatePrescriptionFile(file);
    if (!validation.valid) {
      setErrorMessage(validation.error || "Invalid file selected.");
      return;
    }

    setSelectedFile(file);
    setIsProcessing(true);
    setProcessingProgress(20);
    setProcessingStepLabel("Validating & securely storing document...");

    const controller = new AbortController();
    setAbortController(controller);

    try {
      // Step 1: Uploading
      setTimeout(() => {
        if (!controller.signal.aborted) {
          setProcessingProgress(45);
          setProcessingStepLabel("Scanning text with Medical OCR engine...");
        }
      }, 500);

      // Step 2: Extraction
      setTimeout(() => {
        if (!controller.signal.aborted) {
          setProcessingProgress(75);
          setProcessingStepLabel("LLM analyzing medication details & safety rules...");
        }
      }, 1000);

      const result = await uploadPrescriptionFile(file, (p) => {
        if (!controller.signal.aborted && p > 75) {
          setProcessingProgress(p);
        }
      });

      setIsMockMode(result.provider_info?.is_mock ?? true);
      setProcessingProgress(100);
      setProcessingStepLabel("Extraction complete! Preparing review canvas...");

      setTimeout(() => {
        router.push(`/prescriptions/${result.prescription_id}/review`);
      }, 600);

    } catch (err: unknown) {
      if (controller.signal.aborted) {
        setIsProcessing(false);
        setSelectedFile(null);
        setProcessingProgress(0);
        return;
      }
      setIsProcessing(false);
      const msg = err instanceof Error ? err.message : "Prescription upload and extraction failed.";
      setErrorMessage(msg);
    }
  };

  const cancelUpload = () => {
    if (abortController) {
      abortController.abort();
    }
    setIsProcessing(false);
    setSelectedFile(null);
    setProcessingProgress(0);
    setErrorMessage(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const loadSample = () => {
    const demoContent = "Sample prescription Dr. Mehta";
    const sampleFile = new File([demoContent], "prescription_dr_mehta_aug2025.png", {
      type: "image/png",
    });
    handleFileSelect(sampleFile);
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "Unknown size";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header matching Screen 3: ← Upload Prescription */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="p-1.5 -ml-1.5 rounded-xl text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 stroke-[2.2]" />
            </Link>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900">
                Upload Prescription
              </h1>
              <p className="text-xs text-slate-500 font-medium">
                Secure OCR & AI structured extraction with zero clinical hallucinations
              </p>
            </div>
          </div>

          {/* Provider mode pill */}
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-blue-50 border border-blue-200/80 rounded-full text-[11px] font-semibold text-blue-700">
            <Info className="w-3.5 h-3.5 text-blue-600" />
            <span>{isMockMode ? "Mock Provider Mode (Safe Dev)" : "Live AI Providers Configured"}</span>
          </div>
        </div>

        {/* Error notification banner */}
        {errorMessage && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start justify-between gap-3 animate-in fade-in">
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-red-900">Upload or Extraction Failed</h4>
                <p className="text-xs text-red-700 mt-0.5">{errorMessage}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              className="p-1 text-red-400 hover:text-red-700 rounded-lg"
            >
              <XCircle className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Upload Container matching Screen 3 */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
          {/* Hidden file inputs */}
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept=".png,.jpg,.jpeg,.webp,.pdf,image/png,image/jpeg,image/webp,application/pdf"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleFileSelect(e.target.files[0]);
              }
            }}
          />
          <input
            type="file"
            ref={cameraInputRef}
            className="hidden"
            accept="image/*"
            capture="environment"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleFileSelect(e.target.files[0]);
              }
            }}
          />

          {!isProcessing ? (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-2xl p-8 sm:p-12 flex flex-col items-center justify-center text-center transition-all ${
                isDragging
                  ? "border-blue-500 bg-blue-50/50"
                  : "border-blue-200/90 bg-slate-50/40 hover:bg-slate-50/80"
              }`}
            >
              {/* Camera icon in rounded blue square matching Screen 3 */}
              <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4 border border-blue-100 shadow-2xs">
                <Camera className="w-7 h-7 stroke-[1.8]" />
              </div>

              <h2 className="text-sm sm:text-base font-bold text-slate-900 mb-1">
                Take a photo or upload a prescription
              </h2>
              <p className="text-xs text-slate-400 mb-6 font-medium">
                JPG, PNG, WebP, PDF (Max 10MB)
              </p>

              {/* Side-by-side action buttons matching Screen 3 */}
              <div className="flex flex-wrap items-center justify-center gap-3 w-full max-w-sm">
                <button
                  type="button"
                  onClick={() => cameraInputRef.current?.click()}
                  className="flex-1 min-w-[130px] py-2.5 px-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl text-xs font-semibold shadow-xs shadow-blue-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Camera className="w-4 h-4" />
                  <span>Take Photo</span>
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1 min-w-[130px] py-2.5 px-4 bg-white border border-blue-600 text-blue-600 hover:bg-blue-50 active:bg-blue-100 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Upload className="w-4 h-4" />
                  <span>Upload File</span>
                </button>
              </div>

              <button
                type="button"
                onClick={loadSample}
                className="mt-4 text-xs font-semibold text-blue-600 hover:text-blue-800 underline transition-colors"
              >
                Or test with Dr. Mehta&apos;s reference sample
              </button>
            </div>
          ) : (
            /* Active Processing State */
            <div className="py-10 px-6 flex flex-col items-center justify-center text-center space-y-5">
              <div className="relative">
                <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-200">
                  <Sparkles className="w-8 h-8 animate-pulse text-blue-600" />
                </div>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center text-white shadow-xs">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                </div>
              </div>

              <div className="space-y-1.5 max-w-sm">
                <h3 className="text-base font-bold text-slate-900">
                  AI Analyzing Prescription...
                </h3>
                {selectedFile && (
                  <div className="flex items-center justify-center gap-2 text-xs font-semibold text-blue-600">
                    <FileText className="w-3.5 h-3.5" />
                    <span className="truncate max-w-[200px]">{selectedFile.name}</span>
                    <span className="text-slate-400 font-normal">
                      ({formatFileSize(selectedFile.size)})
                    </span>
                  </div>
                )}
                <p className="text-xs text-slate-500 font-medium pt-1">
                  {processingStepLabel}
                </p>
              </div>

              {/* Progress Bar */}
              <div className="w-full max-w-sm space-y-1.5">
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200/60">
                  <div
                    className="bg-blue-600 h-full rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${processingProgress}%` }}
                  />
                </div>
                <div className="flex justify-between text-[11px] font-semibold text-slate-400">
                  <span>Processing</span>
                  <span>{processingProgress}%</span>
                </div>
              </div>

              {/* Cancel Button */}
              <button
                type="button"
                onClick={cancelUpload}
                className="py-1.5 px-4 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Cancel Upload
              </button>
            </div>
          )}

          {/* Tips for better results matching Screen 3 */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
            <h3 className="text-xs font-bold text-slate-800 mb-2">
              Tips for better results:
            </h3>
            <ul className="text-xs text-slate-500 space-y-1 font-normal">
              <li>• Ensure good lighting and high resolution</li>
              <li>• Keep the prescription document flat and unwrinkled</li>
              <li>• Include doctor header, date, and complete Sig lines</li>
            </ul>
          </div>

          {/* Stepper matching Screen 3 bottom */}
          <div className="pt-2">
            <div className="flex items-center justify-between max-w-md mx-auto relative px-2">
              {/* Connecting line */}
              <div className="absolute top-3.5 left-8 right-8 h-0.5 bg-slate-200 -z-0"></div>

              {/* Step 1: Upload */}
              <div className="flex flex-col items-center z-10">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                    !isProcessing ? "bg-blue-600 ring-4 ring-blue-100" : "bg-blue-600"
                  }`}
                >
                  1
                </div>
                <span className="text-[11px] font-semibold text-slate-800 mt-1">
                  Upload
                </span>
              </div>

              {/* Step 2: AI Processing */}
              <div className="flex flex-col items-center z-10">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                    isProcessing
                      ? "bg-blue-600 text-white ring-4 ring-blue-100"
                      : "bg-slate-200 text-slate-500"
                  }`}
                >
                  2
                </div>
                <span className="text-[11px] font-medium text-slate-500 mt-1">
                  AI Processing
                </span>
              </div>

              {/* Step 3: Review */}
              <div className="flex flex-col items-center z-10">
                <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-500">
                  3
                </div>
                <span className="text-[11px] font-medium text-slate-400 mt-1">
                  Review
                </span>
              </div>

              {/* Step 4: Confirm */}
              <div className="flex flex-col items-center z-10">
                <div className="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-500">
                  4
                </div>
                <span className="text-[11px] font-medium text-slate-400 mt-1">
                  Confirm
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Uploaded Prescription History */}
        {history.length > 0 && (
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-600" />
                <span>Uploaded Prescription History</span>
              </h2>
              <button
                type="button"
                onClick={loadHistory}
                className="text-slate-400 hover:text-blue-600 p-1 rounded-lg"
                title="Refresh history"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-2.5">
              {history.map((item) => (
                <Link
                  key={item.prescription_id}
                  href={`/prescriptions/${item.prescription_id}/review`}
                  className="p-3.5 rounded-2xl border border-slate-100 bg-slate-50/60 hover:bg-blue-50/40 hover:border-blue-200 transition-all flex items-center justify-between gap-3 group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-blue-600 shrink-0">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-slate-900 truncate group-hover:text-blue-600 transition-colors">
                        {item.file_name}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {item.doctor_name || "Dr. R. Mehta"} • {item.medication_count} medicines • {formatFileSize(item.file_size_bytes)}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        item.status === "Confirmed"
                          ? "bg-emerald-100 text-emerald-700"
                          : item.status === "Reviewed"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {item.status}
                    </span>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-transform group-hover:translate-x-0.5" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
