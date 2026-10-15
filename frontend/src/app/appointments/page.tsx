"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/context/AuthContext";
import {
  fetchAllAppointments,
  fetchDoctorDirectory,
  createAppointmentApi,
  updateAppointmentApi,
  rescheduleAppointmentApi,
  cancelAppointmentApi,
  exportAppointmentIcsApi,
  downloadIcsFile,
  AppointmentItemDto,
  DoctorDirectoryItemDto,
  CalendarDaySummaryDto,
  fetchCalendarMonthSummary,
} from "@/lib/appointmentApi";
import {
  Calendar as CalendarIcon,
  Plus,
  X,
  Search,
  Filter,
  Clock,
  MapPin,
  Video,
  User,
  ShieldCheck,
  Download,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  List,
  CalendarDays,
  FileText,
  Phone,
  Mail,
  Info,
  Building,
} from "lucide-react";

export default function AppointmentsPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<"Upcoming" | "Past">("Upcoming");
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const [appointments, setAppointments] = useState<AppointmentItemDto[]>([]);
  const [doctorDirectory, setDoctorDirectory] = useState<DoctorDirectoryItemDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [specialityFilter, setSpecialityFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [visitTypeFilter, setVisitTypeFilter] = useState("All");

  // Selected Appointment Modal
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentItemDto | null>(null);

  // Create Appointment Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [doctorSelectionMode, setDoctorSelectionMode] = useState<"directory" | "custom">("directory");
  const [newDoctorId, setNewDoctorId] = useState("");
  const [newDoctorName, setNewDoctorName] = useState("");
  const [newSpeciality, setNewSpeciality] = useState("General Physician");
  const [newDate, setNewDate] = useState("2025-09-20");
  const [newTime, setNewTime] = useState("11:30 AM");
  const [newDuration, setNewDuration] = useState(30);
  const [newVisitType, setNewVisitType] = useState<"In-Person" | "Online">("In-Person");
  const [newClinicName, setNewClinicName] = useState("Apollo Clinic");
  const [newClinicAddress, setNewClinicAddress] = useState("Floor 3, Room 302, Sector 7");
  const [newTeleconsultUrl, setNewTeleconsultUrl] = useState("");
  const [newVisitPurpose, setNewVisitPurpose] = useState("");
  const [newQuestions, setNewQuestions] = useState<string[]>([""]);
  const [newPersonalNotes, setNewPersonalNotes] = useState("");
  const [allowOverlap, setAllowOverlap] = useState(false);
  const [overlapWarning, setOverlapWarning] = useState<string | null>(null);
  const [isSubmittingAdd, setIsSubmittingAdd] = useState(false);

  // Reschedule Modal State
  const [reschedulingApt, setReschedulingApt] = useState<AppointmentItemDto | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState("2025-10-05");
  const [rescheduleTime, setRescheduleTime] = useState("03:00 PM");
  const [rescheduleReason, setRescheduleReason] = useState("");
  const [rescheduleAllowOverlap, setRescheduleAllowOverlap] = useState(false);
  const [rescheduleWarning, setRescheduleWarning] = useState<string | null>(null);
  const [isSubmittingReschedule, setIsSubmittingReschedule] = useState(false);

  // Cancel Modal State
  const [cancellingApt, setCancellingApt] = useState<AppointmentItemDto | null>(null);
  const [cancellationReason, setCancellationReason] = useState("");
  const [isSubmittingCancel, setIsSubmittingCancel] = useState(false);

  // Calendar View State
  const [calendarYear, setCalendarYear] = useState(2025);
  const [calendarMonth, setCalendarMonth] = useState(9); // September
  const [calendarSummary, setCalendarSummary] = useState<any>(null);
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string | null>("2025-09-12");

  useEffect(() => {
    loadAppointments();
    loadDoctorDirectory();
  }, [user?.id]);

  useEffect(() => {
    if (viewMode === "calendar") {
      loadCalendarData(calendarYear, calendarMonth);
    }
  }, [viewMode, calendarYear, calendarMonth]);

  const loadAppointments = async () => {
    setIsLoading(true);
    try {
      const data = await fetchAllAppointments();
      setAppointments(data);
    } catch (err) {
      console.error("Failed to load appointments:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadDoctorDirectory = async () => {
    try {
      const docs = await fetchDoctorDirectory();
      setDoctorDirectory(docs);
      if (docs.length > 0) {
        setNewDoctorId(docs[0].id);
        setNewDoctorName(docs[0].name);
        setNewSpeciality(docs[0].speciality);
        setNewClinicName(docs[0].hospital);
        setNewClinicAddress(docs[0].clinic_address || "Outpatient Clinic");
      }
    } catch (err) {
      console.warn("Could not load doctor directory:", err);
    }
  };

  const loadCalendarData = async (year: number, month: number) => {
    try {
      const summary = await fetchCalendarMonthSummary(year, month);
      setCalendarSummary(summary);
    } catch (err) {
      console.warn("Could not load calendar summary:", err);
    }
  };

  const handleSelectDirectoryDoctor = (docId: string) => {
    const doc = doctorDirectory.find((d) => d.id === docId);
    if (doc) {
      setNewDoctorId(doc.id);
      setNewDoctorName(doc.name);
      setNewSpeciality(doc.speciality);
      setNewClinicName(doc.hospital);
      setNewClinicAddress(doc.clinic_address || "Clinic Facility");
    }
  };

  const handleAddQuestion = () => {
    setNewQuestions([...newQuestions, ""]);
  };

  const handleQuestionChange = (index: number, val: string) => {
    const updated = [...newQuestions];
    updated[index] = val;
    setNewQuestions(updated);
  };

  const handleRemoveQuestion = (index: number) => {
    setNewQuestions(newQuestions.filter((_, idx) => idx !== index));
  };

  const handleCreateAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDoctorName.trim()) return;

    setIsSubmittingAdd(true);
    setOverlapWarning(null);

    try {
      const created = await createAppointmentApi({
        doctor_name: newDoctorName.trim(),
        speciality: newSpeciality,
        doctor_id: doctorSelectionMode === "directory" ? newDoctorId : undefined,
        appointment_date: newDate,
        appointment_time: newTime,
        duration_minutes: Number(newDuration),
        visit_type: newVisitType,
        location: newVisitType === "Online" ? "Online Consultation" : newClinicAddress || newClinicName,
        clinic_name: newClinicName,
        clinic_address: newClinicAddress,
        teleconsult_url: newVisitType === "Online" ? newTeleconsultUrl || "https://meet.apolloclinic.com/consult" : undefined,
        visit_purpose: newVisitPurpose.trim() || undefined,
        questions_to_ask: newQuestions.filter((q) => q.trim().length > 0),
        personal_notes: newPersonalNotes.trim() || undefined,
        reminder_offsets: [1440, 60],
        allow_overlap: allowOverlap,
      });

      setAppointments([created, ...appointments]);
      setShowAddModal(false);
      setAllowOverlap(false);
      setStatusMessage({
        type: "success",
        text: `Appointment with ${created.doctor_name} scheduled successfully.`,
      });
      loadAppointments();
    } catch (err: any) {
      if (err.isConflict) {
        setOverlapWarning(err.conflictDetails?.message || err.message);
      } else {
        setStatusMessage({ type: "error", text: err.message || "Failed to schedule appointment." });
      }
    } finally {
      setIsSubmittingAdd(false);
    }
  };

  const handleOpenReschedule = (apt: AppointmentItemDto) => {
    setReschedulingApt(apt);
    setRescheduleDate(apt.appointment_date);
    setRescheduleTime(apt.appointment_time);
    setRescheduleReason("");
    setRescheduleAllowOverlap(false);
    setRescheduleWarning(null);
  };

  const handleSubmitReschedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reschedulingApt) return;

    setIsSubmittingReschedule(true);
    setRescheduleWarning(null);

    try {
      const updated = await rescheduleAppointmentApi(reschedulingApt.id, {
        new_date: rescheduleDate,
        new_time: rescheduleTime,
        reason: rescheduleReason.trim() || undefined,
        allow_overlap: rescheduleAllowOverlap,
      });

      setAppointments(appointments.map((a) => (a.id === updated.id ? updated : a)));
      if (selectedAppointment?.id === updated.id) {
        setSelectedAppointment(updated);
      }
      setReschedulingApt(null);
      setStatusMessage({
        type: "success",
        text: `Appointment rescheduled to ${updated.appointment_date} at ${updated.appointment_time}.`,
      });
      loadAppointments();
    } catch (err: any) {
      if (err.isConflict) {
        setRescheduleWarning(err.conflictDetails?.message || err.message);
      } else {
        setStatusMessage({ type: "error", text: err.message || "Failed to reschedule appointment." });
      }
    } finally {
      setIsSubmittingReschedule(false);
    }
  };

  const handleOpenCancel = (apt: AppointmentItemDto) => {
    setCancellingApt(apt);
    setCancellationReason("");
  };

  const handleSubmitCancel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancellingApt || !cancellationReason.trim()) return;

    setIsSubmittingCancel(true);
    try {
      const cancelled = await cancelAppointmentApi(cancellingApt.id, cancellationReason.trim());
      setAppointments(appointments.map((a) => (a.id === cancelled.id ? cancelled : a)));
      if (selectedAppointment?.id === cancelled.id) {
        setSelectedAppointment(cancelled);
      }
      setCancellingApt(null);
      setStatusMessage({
        type: "success",
        text: `Appointment cancelled. Scheduled reminders were automatically cancelled.`,
      });
      loadAppointments();
    } catch (err: any) {
      setStatusMessage({ type: "error", text: err.message || "Failed to cancel appointment." });
    } finally {
      setIsSubmittingCancel(false);
    }
  };

  const handleExportIcs = async (apt: AppointmentItemDto) => {
    try {
      const res = await exportAppointmentIcsApi(apt.id);
      downloadIcsFile(res.filename, res.ics_content);
      setStatusMessage({
        type: "success",
        text: `Calendar event (.ics) downloaded. ${res.disclaimer}`,
      });
    } catch (err: any) {
      setStatusMessage({ type: "error", text: err.message || "Failed to export calendar event." });
    }
  };

  // Filtered Appointments
  const filteredAppointments = useMemo(() => {
    return appointments.filter((apt) => {
      // Primary Tab
      const isPast = apt.status === "Completed";
      const isUpcoming = apt.status === "Upcoming" || apt.status === "Scheduled" || apt.status === "Rescheduled";
      if (tab === "Upcoming" && !isUpcoming && apt.status !== "Cancelled") return false;
      if (tab === "Past" && !isPast && apt.status !== "Cancelled") return false;

      // Status Filter
      if (statusFilter !== "All" && apt.status.toLowerCase() !== statusFilter.toLowerCase()) return false;

      // Speciality Filter
      if (specialityFilter !== "All" && apt.speciality.toLowerCase() !== specialityFilter.toLowerCase()) return false;

      // Visit Type Filter
      if (visitTypeFilter !== "All" && apt.visit_type.toLowerCase() !== visitTypeFilter.toLowerCase()) return false;

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const corpus = `${apt.doctor_name} ${apt.speciality} ${apt.clinic_name || ""} ${apt.location || ""} ${apt.visit_purpose || ""}`.toLowerCase();
        if (!corpus.includes(q)) return false;
      }

      return true;
    });
  }, [appointments, tab, statusFilter, specialityFilter, visitTypeFilter, searchQuery]);

  // Statistics
  const upcomingCount = appointments.filter((a) => a.status === "Upcoming" || a.status === "Rescheduled").length;
  const completedCount = appointments.filter((a) => a.status === "Completed").length;
  const cancelledCount = appointments.filter((a) => a.status === "Cancelled").length;

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto space-y-5 pb-12">
        {/* Top Header matching Screen 8 */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              Appointments
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Consultations, calendar schedule, healthcare visit notes, and reminders
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* View Switcher: List vs Calendar */}
            <div className="bg-slate-100 p-0.5 rounded-xl border border-slate-200/80 flex items-center">
              <button
                type="button"
                onClick={() => setViewMode("list")}
                className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                  viewMode === "list"
                    ? "bg-white text-blue-600 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
                title="List View"
              >
                <List className="w-4 h-4" />
                <span className="hidden sm:inline">List</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("calendar")}
                className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                  viewMode === "calendar"
                    ? "bg-white text-blue-600 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
                title="Calendar View"
              >
                <CalendarDays className="w-4 h-4" />
                <span className="hidden sm:inline">Calendar</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                setOverlapWarning(null);
                setShowAddModal(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl text-xs font-semibold shadow-xs shadow-blue-500/20 transition-all cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Add Appointment</span>
            </button>
          </div>
        </div>

        {/* Status Notification Banner */}
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
              className="text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Key Metrics Statistics Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold text-slate-500 block">Total Bookings</span>
              <span className="text-lg font-bold text-slate-900">{appointments.length}</span>
            </div>
            <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
              <CalendarIcon className="w-4 h-4" />
            </div>
          </div>

          <div className="p-3 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold text-slate-500 block">Upcoming</span>
              <span className="text-lg font-bold text-blue-600">{upcomingCount}</span>
            </div>
            <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
              <Clock className="w-4 h-4" />
            </div>
          </div>

          <div className="p-3 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold text-slate-500 block">Completed</span>
              <span className="text-lg font-bold text-emerald-600">{completedCount}</span>
            </div>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>

          <div className="p-3 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
            <div>
              <span className="text-[11px] font-semibold text-slate-500 block">Cancelled</span>
              <span className="text-lg font-bold text-slate-600">{cancelledCount}</span>
            </div>
            <div className="w-8 h-8 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600">
              <X className="w-4 h-4" />
            </div>
          </div>
        </div>

        {/* Primary Tabs [ Upcoming ] | [ Past ] matching Screen 8 */}
        <div className="bg-slate-100/90 p-1 rounded-2xl flex items-center justify-between">
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
                {t} ({t === "Upcoming" ? upcomingCount : completedCount})
              </button>
            );
          })}
        </div>

        {/* Search & Filters Row */}
        <div className="bg-white rounded-2xl p-3 border border-slate-200/80 shadow-xs space-y-3">
          <div className="flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by doctor, clinic, speciality, or purpose..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
              <select
                value={specialityFilter}
                onChange={(e) => setSpecialityFilter(e.target.value)}
                className="px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-medium focus:outline-hidden"
              >
                <option value="All">All Specialities</option>
                <option value="General Physician">General Physician</option>
                <option value="Endocrinologist & Diabetologist">Endocrinology</option>
                <option value="Cardiologist">Cardiology</option>
                <option value="Dermatologist">Dermatology</option>
                <option value="Orthopedic Surgeon">Orthopedics</option>
              </select>

              <select
                value={visitTypeFilter}
                onChange={(e) => setVisitTypeFilter(e.target.value)}
                className="px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-medium focus:outline-hidden"
              >
                <option value="All">All Visit Types</option>
                <option value="In-Person">In-Person</option>
                <option value="Online">Online / Telehealth</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 font-medium focus:outline-hidden"
              >
                <option value="All">All Statuses</option>
                <option value="Upcoming">Upcoming</option>
                <option value="Completed">Completed</option>
                <option value="Rescheduled">Rescheduled</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>
          </div>
        </div>

        {/* CALENDAR VIEW */}
        {viewMode === "calendar" && (
          <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarDays className="w-5 h-5 text-blue-600" />
                <h2 className="text-base font-bold text-slate-900">
                  {calendarSummary?.month_name || "September"} {calendarYear}
                </h2>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    if (calendarMonth === 1) {
                      setCalendarMonth(12);
                      setCalendarYear(calendarYear - 1);
                    } else {
                      setCalendarMonth(calendarMonth - 1);
                    }
                  }}
                  className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                  title="Previous Month"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="text-xs font-bold text-slate-700 px-2">
                  {calendarSummary?.month_name?.slice(0, 3)} {calendarYear}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    if (calendarMonth === 12) {
                      setCalendarMonth(1);
                      setCalendarYear(calendarYear + 1);
                    } else {
                      setCalendarMonth(calendarMonth + 1);
                    }
                  }}
                  className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                  title="Next Month"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Calendar Days Grid */}
            <div className="grid grid-cols-7 gap-1 text-center">
              {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => (
                <div key={d} className="py-1 text-[11px] font-bold text-slate-400 uppercase">
                  {d}
                </div>
              ))}

              {(calendarSummary?.days || []).map((day: any, idx: number) => {
                const isSelected = selectedCalendarDate === day.date;
                const hasAppointments = day.appointment_count > 0;
                const isCancelled = day.statuses?.includes("Cancelled");
                const isCompleted = day.statuses?.includes("Completed");

                return (
                  <button
                    key={`${day.date}-${idx}`}
                    type="button"
                    onClick={() => setSelectedCalendarDate(day.date)}
                    className={`min-h-16 p-1.5 rounded-xl border flex flex-col items-center justify-between transition-all cursor-pointer ${
                      isSelected
                        ? "border-blue-600 bg-blue-50/60 ring-2 ring-blue-500/20"
                        : day.is_current_month
                        ? "border-slate-100 hover:border-slate-200 bg-white"
                        : "border-transparent bg-slate-50/40 text-slate-300"
                    }`}
                  >
                    <span
                      className={`text-xs font-bold ${
                        isSelected
                          ? "text-blue-700"
                          : day.is_current_month
                          ? "text-slate-800"
                          : "text-slate-300"
                      }`}
                    >
                      {day.day_number}
                    </span>

                    {hasAppointments && (
                      <div className="flex items-center gap-1 mt-1">
                        <span
                          className={`w-2 h-2 rounded-full ${
                            isCancelled
                              ? "bg-rose-500"
                              : isCompleted
                              ? "bg-emerald-500"
                              : "bg-blue-600"
                          }`}
                        />
                        <span className="text-[10px] font-bold text-slate-700">
                          {day.appointment_count}
                        </span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Selected Day Agenda View */}
            {selectedCalendarDate && (
              <div className="pt-3 border-t border-slate-100 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">
                    Appointments on {selectedCalendarDate}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Click an appointment card below to view visit notes
                  </span>
                </div>

                {appointments.filter((a) => a.appointment_date === selectedCalendarDate).length === 0 ? (
                  <p className="text-xs text-slate-400 py-3 text-center bg-slate-50 rounded-xl">
                    No appointments scheduled for this date.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {appointments
                      .filter((a) => a.appointment_date === selectedCalendarDate)
                      .map((apt) => (
                        <div
                          key={apt.id}
                          onClick={() => setSelectedAppointment(apt)}
                          className="p-3 rounded-xl border border-slate-200 hover:border-blue-300 bg-white shadow-2xs flex items-center justify-between cursor-pointer transition-all"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs">
                              <CalendarIcon className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="text-xs font-bold text-slate-900">{apt.doctor_name}</p>
                              <p className="text-[11px] text-slate-500">
                                {apt.speciality} • {apt.appointment_time} ({apt.duration_minutes}m)
                              </p>
                            </div>
                          </div>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              apt.status === "Completed"
                                ? "bg-emerald-50 text-emerald-700"
                                : apt.status === "Cancelled"
                                ? "bg-rose-50 text-rose-700"
                                : apt.status === "Rescheduled"
                                ? "bg-amber-50 text-amber-700"
                                : "bg-blue-50 text-blue-700"
                            }`}
                          >
                            {apt.status}
                          </span>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* LIST VIEW — Appointment Cards matching Screen 8 */}
        {viewMode === "list" && (
          <div className="space-y-3">
            {isLoading ? (
              <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-xs text-slate-400">
                Loading appointments...
              </div>
            ) : filteredAppointments.length > 0 ? (
              filteredAppointments.map((apt) => {
                const isCancelled = apt.status === "Cancelled";
                const isCompleted = apt.status === "Completed";
                const isRescheduled = apt.status === "Rescheduled";

                return (
                  <div
                    key={apt.id}
                    className={`bg-white rounded-2xl p-4 sm:p-5 border shadow-xs transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                      isCancelled
                        ? "border-rose-200/80 bg-rose-50/20"
                        : "border-slate-200/80 hover:border-slate-300"
                    }`}
                  >
                    <div className="flex items-start gap-3.5 min-w-0">
                      {/* Calendar Icon in Blue Square matching Screen 8 */}
                      <div
                        className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border ${
                          isCancelled
                            ? "bg-rose-50 text-rose-600 border-rose-100"
                            : isCompleted
                            ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                            : "bg-blue-50 text-blue-600 border-blue-100"
                        }`}
                      >
                        <CalendarIcon className="w-5 h-5 stroke-[2.2]" />
                      </div>

                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider block">
                            {apt.date || apt.appointment_date}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              isCancelled
                                ? "bg-rose-100 text-rose-700"
                                : isCompleted
                                ? "bg-emerald-100 text-emerald-700"
                                : isRescheduled
                                ? "bg-amber-100 text-amber-700"
                                : "bg-blue-100 text-blue-700"
                            }`}
                          >
                            {apt.status}
                          </span>
                          <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded flex items-center gap-1">
                            {apt.visit_type === "Online" ? (
                              <Video className="w-3 h-3 text-purple-600" />
                            ) : (
                              <MapPin className="w-3 h-3 text-emerald-600" />
                            )}
                            <span>{apt.visit_type}</span>
                          </span>
                          <span className="text-[10px] font-semibold text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">
                            {apt.duration_minutes}m
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <h3 className="text-sm sm:text-base font-bold text-slate-900 truncate">
                            {apt.doctor_name}
                          </h3>
                          {apt.is_verified_doctor && (
                            <span
                              className="text-blue-600"
                              title="Verified Doctor from Clinical Directory"
                            >
                              <ShieldCheck className="w-3.5 h-3.5 fill-blue-50" />
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-slate-500">
                          {apt.speciality} • {apt.appointment_time || apt.time}
                        </p>

                        <div className="flex items-center gap-3 text-[11px] text-slate-500 pt-0.5">
                          <span className="flex items-center gap-1 truncate">
                            <Building className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>{apt.clinic_name || apt.location || "Apollo Clinic"}</span>
                          </span>
                          {apt.visit_purpose && (
                            <span className="hidden sm:inline text-slate-400 truncate max-w-xs">
                              • Purpose: {apt.visit_purpose}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions on right */}
                    <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                      <button
                        type="button"
                        onClick={() => handleExportIcs(apt)}
                        className="p-2 text-slate-600 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-all cursor-pointer"
                        title="Download .ics Calendar Event"
                      >
                        <Download className="w-4 h-4 text-slate-600" />
                      </button>

                      {!isCancelled && !isCompleted && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleOpenReschedule(apt)}
                            className="px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 border border-slate-200 rounded-xl transition-all cursor-pointer"
                          >
                            Reschedule
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenCancel(apt)}
                            className="px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-xl transition-all cursor-pointer"
                          >
                            Cancel
                          </button>
                        </>
                      )}

                      {/* View Details Action matching Screen 8 */}
                      <button
                        type="button"
                        onClick={() => setSelectedAppointment(apt)}
                        className="px-3.5 py-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 hover:bg-blue-50 border border-blue-200 rounded-xl transition-all shrink-0 cursor-pointer"
                      >
                        View Details
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 space-y-2">
                <CalendarIcon className="w-8 h-8 text-slate-300 mx-auto mb-1" />
                <p className="text-sm font-semibold text-slate-700">
                  No {tab.toLowerCase()} appointments found
                </p>
                <p className="text-xs text-slate-400">
                  Try adjusting your search query, speciality filter, or book a new appointment.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Doctor Summary Shortcut Card matching Screen 8 bottom */}
        <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100 flex items-center justify-between">
          <div className="text-xs text-slate-600">
            Preparing for your visit? Generate a tailored clinical report for your doctor.
          </div>
          <Link
            href="/doctor-summary"
            className="text-xs font-bold text-blue-600 hover:text-blue-700"
          >
            Export Doctor Summary →
          </Link>
        </div>
      </div>

      {/* APPOINTMENT DETAILS & VISIT NOTES MODAL */}
      {selectedAppointment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-lg bg-white rounded-3xl p-6 shadow-2xl border border-slate-200 space-y-4 my-8 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <CalendarIcon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Appointment Details</h3>
                  <span className="text-[10px] text-slate-400">
                    ID: {selectedAppointment.id} • {selectedAppointment.is_locally_managed ? "User-Managed Booking" : "EHR Integrated"}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedAppointment(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5 max-h-[70vh] overflow-y-auto pr-1">
              {/* Doctor Header Box */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Doctor & Speciality
                  </span>
                  {selectedAppointment.is_verified_doctor ? (
                    <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-blue-600" />
                      <span>Verified Clinician</span>
                    </span>
                  ) : (
                    <span className="text-[10px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                      User-Entered Doctor
                    </span>
                  )}
                </div>
                <p className="text-sm font-bold text-slate-900">
                  {selectedAppointment.doctor_name}
                </p>
                <p className="text-xs text-slate-600">
                  {selectedAppointment.speciality}
                </p>
              </div>

              {/* Date, Time, Duration, and Type Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Date & Time
                  </span>
                  <p className="text-xs font-semibold text-slate-800">
                    {selectedAppointment.date || selectedAppointment.appointment_date}
                  </p>
                  <p className="text-xs text-slate-500">
                    {selectedAppointment.appointment_time || selectedAppointment.time} ({selectedAppointment.duration_minutes} mins)
                  </p>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    Visit Mode & Status
                  </span>
                  <p className="text-xs font-semibold text-slate-800 flex items-center gap-1">
                    {selectedAppointment.visit_type === "Online" ? (
                      <Video className="w-3 h-3 text-purple-600" />
                    ) : (
                      <MapPin className="w-3 h-3 text-emerald-600" />
                    )}
                    <span>{selectedAppointment.visit_type}</span>
                  </p>
                  <p className="text-xs font-bold text-blue-600">
                    Status: {selectedAppointment.status}
                  </p>
                </div>
              </div>

              {/* Clinic / Location Details */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Location & Contact
                </span>
                <p className="text-xs font-semibold text-slate-800">
                  {selectedAppointment.clinic_name || selectedAppointment.location}
                </p>
                {selectedAppointment.clinic_address && (
                  <p className="text-[11px] text-slate-500">
                    {selectedAppointment.clinic_address}
                  </p>
                )}
                {selectedAppointment.clinic_phone && (
                  <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                    <Phone className="w-3 h-3 text-slate-400" />
                    <span>{selectedAppointment.clinic_phone}</span>
                  </p>
                )}
                {selectedAppointment.teleconsult_url && (
                  <a
                    href={selectedAppointment.teleconsult_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-700 mt-1"
                  >
                    <Video className="w-3 h-3" />
                    <span>Join Online Consultation Room →</span>
                  </a>
                )}
              </div>

              {/* HEALTHCARE VISIT NOTES SECTION */}
              <div className="p-4 bg-blue-50/40 rounded-2xl border border-blue-100 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-blue-600" />
                    <h4 className="text-xs font-bold text-blue-900">Patient Visit Notes</h4>
                  </div>
                  <span className="text-[10px] text-slate-400">Personal Health Organization</span>
                </div>

                {selectedAppointment.visit_purpose && (
                  <div>
                    <span className="text-[10px] font-bold text-blue-800 block">Visit Purpose:</span>
                    <p className="text-xs text-slate-700">{selectedAppointment.visit_purpose}</p>
                  </div>
                )}

                {selectedAppointment.questions_to_ask && selectedAppointment.questions_to_ask.length > 0 && (
                  <div>
                    <span className="text-[10px] font-bold text-blue-800 block mb-1">
                      Questions to ask Doctor:
                    </span>
                    <ul className="space-y-1">
                      {selectedAppointment.questions_to_ask.map((q, idx) => (
                        <li key={idx} className="text-xs text-slate-700 flex items-start gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                          <span>{q}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {selectedAppointment.personal_notes && (
                  <div>
                    <span className="text-[10px] font-bold text-blue-800 block">Personal Notes:</span>
                    <p className="text-xs text-slate-700 italic">&quot;{selectedAppointment.personal_notes}&quot;</p>
                  </div>
                )}

                {selectedAppointment.follow_up_instructions && (
                  <div className="pt-1.5 border-t border-blue-100">
                    <span className="text-[10px] font-bold text-blue-800 block">Follow-up Instructions:</span>
                    <p className="text-xs text-slate-700">{selectedAppointment.follow_up_instructions}</p>
                  </div>
                )}

                {/* Medical Disclaimer */}
                <div className="p-2.5 bg-white/80 rounded-xl border border-blue-100 text-[10px] text-slate-500 leading-relaxed flex items-start gap-1.5">
                  <Info className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
                  <span>
                    <strong>Patient Personal Notes Disclaimer:</strong> Notes recorded here are for your personal organization and preparation. They do not constitute official clinical medical records or prescriptions.
                  </span>
                </div>
              </div>

              {/* History / Audit Log */}
              {selectedAppointment.history && selectedAppointment.history.length > 0 && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Change Log & Audit Trail
                  </span>
                  <div className="space-y-1">
                    {selectedAppointment.history.map((h, i) => (
                      <div key={i} className="text-[11px] text-slate-600 flex items-center justify-between">
                        <span>• {h.details || h.action}</span>
                        <span className="text-[10px] text-slate-400">{h.timestamp.slice(0, 10)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => handleExportIcs(selectedAppointment)}
                className="py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export .ics</span>
              </button>

              {selectedAppointment.status !== "Cancelled" && selectedAppointment.status !== "Completed" && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      const apt = selectedAppointment;
                      setSelectedAppointment(null);
                      handleOpenReschedule(apt);
                    }}
                    className="py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-colors cursor-pointer"
                  >
                    Reschedule
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const apt = selectedAppointment;
                      setSelectedAppointment(null);
                      handleOpenCancel(apt);
                    }}
                    className="py-2 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold text-xs rounded-xl transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                </>
              )}

              <Link
                href="/doctor-summary"
                onClick={() => setSelectedAppointment(null)}
                className="flex-1 py-2 px-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl text-center shadow-xs transition-colors"
              >
                Generate Doctor Summary
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* CREATE APPOINTMENT MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-lg bg-white rounded-3xl p-6 shadow-2xl border border-slate-200 space-y-4 my-8 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Plus className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-slate-900">Add New Appointment</h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAppointment} className="space-y-3.5 max-h-[70vh] overflow-y-auto pr-1">
              {/* Overlap Conflict Alert */}
              {overlapWarning && (
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-xs space-y-2">
                  <div className="flex items-center gap-2 font-bold">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Appointment Conflict Warning</span>
                  </div>
                  <p className="text-[11px] leading-relaxed">{overlapWarning}</p>
                  <label className="flex items-center gap-2 text-xs font-semibold text-amber-900 pt-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={allowOverlap}
                      onChange={(e) => setAllowOverlap(e.target.checked)}
                      className="rounded border-amber-300 text-blue-600"
                    />
                    <span>I acknowledge the overlap and want to schedule anyway</span>
                  </label>
                </div>
              )}

              {/* Mode Selector: Directory vs Custom */}
              <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-xl">
                <button
                  type="button"
                  onClick={() => setDoctorSelectionMode("directory")}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    doctorSelectionMode === "directory" ? "bg-white text-blue-600 shadow-xs" : "text-slate-600"
                  }`}
                >
                  Verified Doctor Directory
                </button>
                <button
                  type="button"
                  onClick={() => setDoctorSelectionMode("custom")}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                    doctorSelectionMode === "custom" ? "bg-white text-blue-600 shadow-xs" : "text-slate-600"
                  }`}
                >
                  Custom Doctor
                </button>
              </div>

              {doctorSelectionMode === "directory" ? (
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Select Doctor from Directory
                  </label>
                  <select
                    value={newDoctorId}
                    onChange={(e) => handleSelectDirectoryDoctor(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
                  >
                    {doctorDirectory.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} — {d.speciality} ({d.hospital})
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">Doctor Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Dr. Rajesh Khanna"
                      value={newDoctorName}
                      onChange={(e) => setNewDoctorName(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 block mb-1">Speciality</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Neurologist"
                      value={newSpeciality}
                      onChange={(e) => setNewSpeciality(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                </div>
              )}

              {/* Date, Time, Duration */}
              <div className="grid grid-cols-3 gap-2.5">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Date</label>
                  <input
                    type="date"
                    required
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Time</label>
                  <input
                    type="text"
                    required
                    placeholder="10:30 AM"
                    value={newTime}
                    onChange={(e) => setNewTime(e.target.value)}
                    className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Duration</label>
                  <select
                    value={newDuration}
                    onChange={(e) => setNewDuration(Number(e.target.value))}
                    className="w-full px-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value={15}>15 mins</option>
                    <option value={30}>30 mins</option>
                    <option value={45}>45 mins</option>
                    <option value={60}>60 mins</option>
                  </select>
                </div>
              </div>

              {/* Visit Type & Clinic Info */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Visit Type</label>
                  <select
                    value={newVisitType}
                    onChange={(e) => setNewVisitType(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value="In-Person">In-Person Clinic Visit</option>
                    <option value="Online">Online / Telehealth Video</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Clinic Name</label>
                  <input
                    type="text"
                    value={newClinicName}
                    onChange={(e) => setNewClinicName(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              {newVisitType === "In-Person" ? (
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Clinic Address</label>
                  <input
                    type="text"
                    value={newClinicAddress}
                    onChange={(e) => setNewClinicAddress(e.target.value)}
                    placeholder="e.g. Apollo Clinic, Room 302, Sector 7"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              ) : (
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">Telehealth URL</label>
                  <input
                    type="text"
                    value={newTeleconsultUrl}
                    onChange={(e) => setNewTeleconsultUrl(e.target.value)}
                    placeholder="https://meet.apolloclinic.com/consult-room"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              )}

              {/* Visit Purpose & Questions */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Purpose of Visit</label>
                <input
                  type="text"
                  value={newVisitPurpose}
                  onChange={(e) => setNewVisitPurpose(e.target.value)}
                  placeholder="e.g. Routine 3-month diabetes follow-up and blood work review"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              {/* Questions to ask */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700">Questions for the Doctor</label>
                  <button
                    type="button"
                    onClick={handleAddQuestion}
                    className="text-[11px] font-bold text-blue-600 hover:text-blue-700"
                  >
                    + Add Question
                  </button>
                </div>
                {newQuestions.map((q, idx) => (
                  <div key={idx} className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={q}
                      onChange={(e) => handleQuestionChange(idx, e.target.value)}
                      placeholder={`Question ${idx + 1}`}
                      className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden"
                    />
                    {newQuestions.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveQuestion(idx)}
                        className="text-slate-400 hover:text-slate-600 p-1"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Personal Notes */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Personal Notes</label>
                <textarea
                  rows={2}
                  value={newPersonalNotes}
                  onChange={(e) => setNewPersonalNotes(e.target.value)}
                  placeholder="Private reminders for yourself before the visit..."
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden"
                />
              </div>

              {/* Transparency Notice */}
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-[10px] text-slate-500">
                <strong>Locally Managed Booking:</strong> This record is securely tracked in MediMate AI for calendar planning and reminders. External EHR booking is unconfigured.
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAdd}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingAdd ? "Saving..." : "Save Appointment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RESCHEDULE MODAL */}
      {reschedulingApt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-blue-600" />
                <h3 className="text-base font-bold text-slate-900">Reschedule Appointment</h3>
              </div>
              <button
                onClick={() => setReschedulingApt(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitReschedule} className="space-y-3.5">
              <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100 text-xs text-blue-900 space-y-1">
                <p className="font-bold">{reschedulingApt.doctor_name}</p>
                <p className="text-[11px] text-blue-700">
                  Current: {reschedulingApt.date || reschedulingApt.appointment_date} at {reschedulingApt.appointment_time}
                </p>
              </div>

              {rescheduleWarning && (
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-xs space-y-2">
                  <div className="flex items-center gap-1.5 font-bold">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Conflict Warning</span>
                  </div>
                  <p className="text-[11px] leading-relaxed">{rescheduleWarning}</p>
                  <label className="flex items-center gap-2 text-xs font-semibold text-amber-900 pt-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={rescheduleAllowOverlap}
                      onChange={(e) => setRescheduleAllowOverlap(e.target.checked)}
                      className="rounded border-amber-300 text-blue-600"
                    />
                    <span>Override conflict and reschedule anyway</span>
                  </label>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">New Date</label>
                  <input
                    type="date"
                    required
                    value={rescheduleDate}
                    onChange={(e) => setRescheduleDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1">New Time</label>
                  <input
                    type="text"
                    required
                    value={rescheduleTime}
                    onChange={(e) => setRescheduleTime(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Reason for Rescheduling
                </label>
                <input
                  type="text"
                  placeholder="e.g. Schedule conflict, doctor request, or routine change"
                  value={rescheduleReason}
                  onChange={(e) => setRescheduleReason(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setReschedulingApt(null)}
                  className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingReschedule}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingReschedule ? "Saving..." : "Confirm Reschedule"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CANCEL MODAL */}
      {cancellingApt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-rose-600">
                <AlertTriangle className="w-4 h-4" />
                <h3 className="text-base font-bold text-slate-900">Cancel Appointment</h3>
              </div>
              <button
                onClick={() => setCancellingApt(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitCancel} className="space-y-3.5">
              <div className="p-3 bg-rose-50/50 rounded-xl border border-rose-100 text-xs text-rose-900 space-y-1">
                <p className="font-bold">
                  Cancel visit with {cancellingApt.doctor_name}?
                </p>
                <p className="text-[11px] text-rose-700">
                  Scheduled for: {cancellingApt.date || cancellingApt.appointment_date} at {cancellingApt.appointment_time}
                </p>
                <p className="text-[11px] text-slate-600">
                  Cancelling this appointment will automatically cancel any pending reminder notifications.
                </p>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Cancellation Reason (Required for Audit Record)
                </label>
                <textarea
                  required
                  rows={3}
                  value={cancellationReason}
                  onChange={(e) => setCancellationReason(e.target.value)}
                  placeholder="e.g. Symptoms resolved, postponed by doctor, or patient schedule conflict."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-hidden"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCancellingApt(null)}
                  className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Keep Appointment
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingCancel || !cancellationReason.trim()}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs rounded-xl shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingCancel ? "Cancelling..." : "Confirm Cancellation"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
