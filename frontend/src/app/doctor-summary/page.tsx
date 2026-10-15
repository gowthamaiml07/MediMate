"use client";

import React, { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { mockUser, mockAdherenceData } from "@/lib/mockData";
import {
  FileText,
  Download,
  Printer,
  Plus,
  Trash2,
} from "lucide-react";

export default function DoctorVisitSummaryPage() {
  const [questions, setQuestions] = useState<string[]>([
    "Is my current dosage correct?",
    "Should I continue Vitamin D3 for 8 weeks?",
  ]);
  const [newQuestion, setNewQuestion] = useState("");
  const [isDownloading, setIsDownloading] = useState(false);

  const addQuestion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuestion.trim()) return;
    setQuestions([...questions, newQuestion.trim()]);
    setNewQuestion("");
  };

  const removeQuestion = (idx: number) => {
    setQuestions(questions.filter((_, i) => i !== idx));
  };

  const handleDownload = () => {
    setIsDownloading(true);
    setTimeout(() => {
      setIsDownloading(false);
      window.print();
    }, 400);
  };

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-5">
        {/* Top Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              Doctor Visit Summary
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Print or export your health snapshot before your appointment.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="p-2 text-slate-600 hover:text-blue-600 hover:bg-blue-50 border border-slate-200 rounded-xl text-xs font-medium transition-colors"
              title="Print Summary"
            >
              <Printer className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Card matching Screen 12 */}
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
          {/* Header of the summary card matching Screen 12 */}
          <div className="flex items-start gap-4 pb-5 border-b border-slate-100">
            <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 border border-purple-100">
              <FileText className="w-6 h-6 stroke-[2]" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                Summary for 12 Sep 2025
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 font-medium">
                Dr. S. Kumar — General Physician
              </p>
              <div className="mt-2 flex items-center gap-2 text-[11px] text-slate-400">
                <span>Patient: {mockUser.name}</span>
                <span>•</span>
                <span>Adherence: {mockAdherenceData.adherenceRate}% On Track</span>
              </div>
            </div>
          </div>

          {/* Section 1: Current Medicines matching Screen 12 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Current Medicines
              </h3>
              <span className="text-[11px] text-emerald-600 font-semibold">
                3 Confirmed
              </span>
            </div>

            <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-xs sm:text-sm text-slate-800 space-y-2 font-medium">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
                <span>Metformin 500mg (BID)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
                <span>Atorvastatin 10mg (OD)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600"></span>
                <span>Vitamin D3 1000IU (Weekly)</span>
              </div>
            </div>
          </div>

          {/* Section 2: Questions for Doctor matching Screen 12 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Questions for Doctor
              </h3>
              <span className="text-[11px] text-slate-400">
                {questions.length} prepared
              </span>
            </div>

            <div className="space-y-2">
              {questions.map((q, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 bg-blue-50/40 rounded-xl border border-blue-100 text-xs sm:text-sm text-slate-800 font-medium group"
                >
                  <span className="pr-2">
                    {idx + 1}. {q}
                  </span>
                  <button
                    type="button"
                    onClick={() => removeQuestion(idx)}
                    className="text-slate-400 hover:text-rose-600 p-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Remove question"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {/* Add another question form */}
            <form onSubmit={addQuestion} className="flex gap-2 pt-1">
              <input
                type="text"
                value={newQuestion}
                onChange={(e) => setNewQuestion(e.target.value)}
                placeholder="Add another question for Dr. Kumar..."
                className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
              <button
                type="submit"
                disabled={!newQuestion.trim()}
                className="px-3.5 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 disabled:opacity-50 border border-blue-200 text-xs font-bold rounded-xl transition-colors shrink-0 flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            </form>
          </div>

          {/* Primary Action Button matching Screen 12 bottom */}
          <div className="pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={handleDownload}
              disabled={isDownloading}
              className="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-xs sm:text-sm rounded-xl shadow-xs shadow-blue-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>{isDownloading ? "Preparing PDF..." : "Download Summary"}</span>
            </button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
