"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/context/AuthContext";
import { fetchPatientAppointments, createPatientAppointment } from "@/lib/supabase/data";
import { mockAppointments } from "@/lib/mockData";
import { Appointment } from "@/types";
import { Calendar, Plus, X } from "lucide-react";

export default function AppointmentsPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<"Upcoming" | "Past">("Upcoming");
  const [appointments, setAppointments] = useState<Appointment[]>(mockAppointments);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(
    null
  );
  const aptCounter = useRef(100);

  // New Appointment Form
  const [newDoctor, setNewDoctor] = useState("");
  const [newSpeciality, setNewSpeciality] = useState("General Physician");
  const [newDate, setNewDate] = useState("20 Sep 2025");
  const [newTime, setNewTime] = useState("11:30 AM");
  const [newLocation, setNewLocation] = useState("Apollo Clinic");

  useEffect(() => {
    if (user?.id) {
      fetchPatientAppointments(user.id).then((data) => {
        if (data && data.length > 0) {
          setAppointments(data);
        }
      });
    }
  }, [user?.id]);

  const handleAddAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDoctor) return;

    aptCounter.current += 1;
    const newItem: Omit<Appointment, "id"> = {
      doctorName: newDoctor,
      speciality: newSpeciality,
      date: newDate,
      time: newTime,
      location: newLocation,
      status: "Upcoming",
      notes: "Newly booked consultation via MediMate Assistant.",
    };

    if (user?.id) {
      const res = await createPatientAppointment(user.id, newItem);
      if (res.data) {
        setAppointments([res.data, ...appointments]);
      } else {
        setAppointments([{ id: `apt-${aptCounter.current}`, ...newItem }, ...appointments]);
      }
    } else {
      setAppointments([{ id: `apt-${aptCounter.current}`, ...newItem }, ...appointments]);
    }

    setShowAddModal(false);
    setNewDoctor("");
  };

  const filteredAppointments = appointments.filter((apt) => apt.status === tab);

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-5">
        {/* Header with "+ Add" button matching Screen 8 */}
        <div className="flex items-center justify-between">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
            Appointments
          </h1>
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl text-xs font-semibold shadow-xs shadow-blue-500/20 transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Add</span>
          </button>
        </div>

        {/* Tabs [ Upcoming ] | [ Past ] matching Screen 8 */}
        <div className="bg-slate-100/80 p-1 rounded-2xl flex items-center justify-between">
          {(["Upcoming", "Past"] as const).map((t) => {
            const isActive = tab === t;
            return (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
                  isActive
                    ? "bg-blue-600 text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                {t}
              </button>
            );
          })}
        </div>

        {/* Appointment Cards matching Screen 8 */}
        <div className="space-y-3">
          {filteredAppointments.length > 0 ? (
            filteredAppointments.map((apt) => (
              <div
                key={apt.id}
                className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs flex items-center justify-between gap-4 hover:border-slate-300 transition-all"
              >
                <div className="flex items-start gap-3.5 min-w-0">
                  {/* Calendar icon in blue square */}
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 border border-blue-100">
                    <Calendar className="w-5 h-5 stroke-[2]" />
                  </div>

                  <div className="min-w-0">
                    <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider block">
                      {apt.date}
                    </span>
                    <h3 className="text-sm sm:text-base font-bold text-slate-900 truncate">
                      {apt.doctorName}
                    </h3>
                    <p className="text-xs text-slate-500">
                      {apt.speciality} • {apt.time}
                    </p>
                  </div>
                </div>

                {/* View Details Action matching Screen 8 */}
                <button
                  type="button"
                  onClick={() => setSelectedAppointment(apt)}
                  className="px-3.5 py-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 hover:bg-blue-50 border border-blue-200 rounded-xl transition-all shrink-0 cursor-pointer"
                >
                  View Details
                </button>
              </div>
            ))
          ) : (
            <div className="p-8 text-center bg-white rounded-2xl border border-slate-200">
              <Calendar className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-700">
                No {tab.toLowerCase()} appointments found
              </p>
            </div>
          )}
        </div>

        {/* Details Modal */}
        {selectedAppointment && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
            <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900">
                    Appointment Details
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedAppointment(null)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3">
                <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Doctor & Speciality
                  </span>
                  <p className="text-sm font-bold text-slate-900">
                    {selectedAppointment.doctorName}
                  </p>
                  <p className="text-xs text-slate-600">
                    {selectedAppointment.speciality}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                      Date & Time
                    </span>
                    <p className="text-xs font-semibold text-slate-800">
                      {selectedAppointment.date}
                    </p>
                    <p className="text-xs text-slate-500">
                      {selectedAppointment.time}
                    </p>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                      Location
                    </span>
                    <p className="text-xs font-semibold text-slate-800">
                      {selectedAppointment.location || "Apollo Clinic"}
                    </p>
                  </div>
                </div>

                {selectedAppointment.notes && (
                  <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100 text-xs text-slate-700">
                    <span className="font-semibold text-blue-900 block mb-0.5">
                      Consultation Note:
                    </span>
                    {selectedAppointment.notes}
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <Link
                  href="/doctor-summary"
                  onClick={() => setSelectedAppointment(null)}
                  className="flex-1 py-2.5 px-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl text-center shadow-xs transition-colors"
                >
                  Generate Doctor Summary
                </Link>
                <button
                  type="button"
                  onClick={() => setSelectedAppointment(null)}
                  className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs rounded-xl transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add Appointment Modal */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
            <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-base font-bold text-slate-900">
                  Add Appointment
                </h3>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleAddAppointment} className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Doctor Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Dr. Jennifer Davis"
                    value={newDoctor}
                    onChange={(e) => setNewDoctor(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Speciality
                    </label>
                    <select
                      value={newSpeciality}
                      onChange={(e) => setNewSpeciality(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    >
                      <option>General Physician</option>
                      <option>Cardiologist</option>
                      <option>Endocrinologist</option>
                      <option>Dermatologist</option>
                      <option>Neurologist</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">
                      Time
                    </label>
                    <input
                      type="text"
                      value={newTime}
                      onChange={(e) => setNewTime(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Date
                  </label>
                  <input
                    type="text"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Clinic / Location
                  </label>
                  <input
                    type="text"
                    value={newLocation}
                    onChange={(e) => setNewLocation(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors"
                  >
                    Save Appointment
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
