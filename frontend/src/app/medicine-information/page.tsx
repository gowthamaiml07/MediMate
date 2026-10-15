"use client";

import React, { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { mockMedicineCatalogue } from "@/lib/mockData";
import { MedicineInfo } from "@/types";
import {
  Search,
  Pill,
  AlertCircle,
  Info,
  CheckCircle2,
} from "lucide-react";

export default function MedicineInformationPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMed, setSelectedMed] = useState<MedicineInfo>(
    mockMedicineCatalogue[0]
  );
  const [subTab, setSubTab] = useState<"Overview" | "Side Effects" | "Precautions">(
    "Overview"
  );

  const filteredMedicines = mockMedicineCatalogue.filter((m) =>
    m.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-5">
        {/* Header */}
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Medicine Information
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Verified guidance on your prescribed and over-the-counter medications.
          </p>
        </div>

        {/* Search Bar matching Screen 10 */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search medicine name..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200/90 rounded-2xl text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 shadow-xs transition-all"
          />
        </div>

        {/* Quick select pills if searching */}
        {searchQuery && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {filteredMedicines.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                  setSelectedMed(m);
                  setSearchQuery("");
                }}
                className="px-3 py-1 bg-white border border-blue-200 text-blue-700 text-xs rounded-xl font-medium shadow-2xs hover:bg-blue-50"
              >
                {m.name}
              </button>
            ))}
          </div>
        )}

        {/* Selected Medicine Container matching Screen 10 */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs space-y-5">
          {/* Header of selected medicine */}
          <div className="flex items-center gap-3.5 pb-4 border-b border-slate-100">
            <div className="w-12 h-12 rounded-2xl bg-cyan-50 text-cyan-700 flex items-center justify-center shrink-0 border border-cyan-100">
              <Pill className="w-6 h-6 stroke-[2]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-900">
                  {selectedMed.name}
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-cyan-100 text-cyan-800 text-[11px] font-bold">
                  {selectedMed.badge}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Brand names: {selectedMed.brandNames?.join(", ")}
              </p>
            </div>
          </div>

          {/* Sub-Tabs: [ Overview ] | [ Side Effects ] | [ Precautions ] */}
          <div className="flex items-center gap-6 border-b border-slate-100 text-xs font-semibold">
            {(["Overview", "Side Effects", "Precautions"] as const).map((tab) => {
              const active = subTab === tab;
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setSubTab(tab)}
                  className={`pb-2.5 transition-all relative cursor-pointer ${
                    active
                      ? "text-blue-600 font-bold"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  {tab}
                  {active && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full"></span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Tab Content matching Screen 10 */}
          {subTab === "Overview" && (
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 mt-0.5">
                  <Info className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900 mb-1">
                    Overview
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    {selectedMed.overview}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 mt-0.5">
                  <AlertCircle className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900 mb-1.5">
                    Common side effects
                  </h3>
                  <ul className="text-xs sm:text-sm text-slate-600 space-y-1 list-disc pl-4">
                    {selectedMed.sideEffects.slice(0, 3).map((effect, idx) => (
                      <li key={idx}>{effect}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {subTab === "Side Effects" && (
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 mt-0.5">
                  <AlertCircle className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900 mb-2">
                    Common side effects (general):
                  </h3>
                  <ul className="text-xs sm:text-sm text-slate-600 space-y-1.5 list-disc pl-4">
                    {selectedMed.sideEffects.map((effect, idx) => (
                      <li key={idx}>{effect}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {subTab === "Precautions" && (
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900 mb-2">
                    Precautions & Interactions:
                  </h3>
                  <ul className="text-xs sm:text-sm text-slate-600 space-y-1.5 list-disc pl-4">
                    {selectedMed.precautions.map((prec, idx) => (
                      <li key={idx}>{prec}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Disclaimer Box matching Screen 10 */}
          <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl flex items-center gap-2.5 text-xs text-slate-500">
            <Info className="w-4 h-4 text-slate-400 shrink-0" />
            <span>
              This is general information. Your doctor&apos;s instructions are more important.
            </span>
          </div>
        </div>

        {/* Other medicines in your current plan */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
            In Your Active Prescription Plan:
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {mockMedicineCatalogue.map((med) => (
              <button
                key={med.id}
                type="button"
                onClick={() => setSelectedMed(med)}
                className={`p-3 rounded-xl border text-left transition-all flex items-center justify-between cursor-pointer ${
                  selectedMed.id === med.id
                    ? "border-blue-500 bg-blue-50/40"
                    : "border-slate-100 bg-slate-50/50 hover:bg-slate-50"
                }`}
              >
                <div>
                  <div className="text-xs font-bold text-slate-900">
                    {med.name}
                  </div>
                  <div className="text-[10px] text-slate-400">{med.category}</div>
                </div>
                <span className="text-xs font-semibold text-blue-600">
                  Select
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
