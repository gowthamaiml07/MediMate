import { getSupabaseBrowserClient } from "./supabase/client";
import { isSupabaseConfigured } from "./supabase/config";
import { mockAppointments } from "./mockData";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export interface DoctorDirectoryItemDto {
  id: string;
  name: string;
  speciality: string;
  hospital: string;
  phone?: string;
  email?: string;
  rating: number;
  consultation_types: string[];
  is_verified: boolean;
  available_days: string[];
  clinic_address?: string;
}

export interface AppointmentAuditRecordDto {
  action: string;
  timestamp: string;
  actor: string;
  details?: string;
  previous_state?: Record<string, any>;
}

export interface AppointmentItemDto {
  id: string;
  user_id?: string;
  doctor_id?: string;
  doctor_name: string;
  speciality: string;
  appointment_date: string;
  appointment_time: string;
  duration_minutes: number;
  visit_type: "In-Person" | "Online";
  location?: string;
  clinic_name?: string;
  clinic_phone?: string;
  clinic_email?: string;
  clinic_address?: string;
  teleconsult_url?: string;
  status: "Upcoming" | "Completed" | "Cancelled" | "Rescheduled" | "Scheduled";
  is_locally_managed: boolean;
  is_verified_doctor: boolean;
  reminder_offsets: number[];
  visit_purpose?: string;
  questions_to_ask: string[];
  personal_notes?: string;
  follow_up_instructions?: string;
  follow_up_recommended_date?: string;
  date?: string;
  time?: string;
  notes?: string;
  history: AppointmentAuditRecordDto[];
  cancellation_reason?: string;
  rescheduled_from?: string;
  created_at?: string;
  updated_at?: string;
}

export interface AppointmentCreatePayload {
  doctor_name: string;
  speciality: string;
  doctor_id?: string;
  appointment_date: string;
  appointment_time: string;
  duration_minutes?: number;
  visit_type?: "In-Person" | "Online";
  location?: string;
  clinic_name?: string;
  clinic_phone?: string;
  clinic_email?: string;
  clinic_address?: string;
  teleconsult_url?: string;
  visit_purpose?: string;
  questions_to_ask?: string[];
  personal_notes?: string;
  follow_up_instructions?: string;
  reminder_offsets?: number[];
  allow_overlap?: boolean;
  timezone?: string;
}

export interface CalendarDaySummaryDto {
  date: string;
  day_number: number;
  is_current_month: boolean;
  appointment_count: number;
  statuses: string[];
  appointments: AppointmentItemDto[];
}

export interface CalendarMonthSummaryDto {
  year: number;
  month: number;
  month_name: string;
  total_appointments: number;
  days: CalendarDaySummaryDto[];
}

export interface ICSExportResponseDto {
  filename: string;
  ics_content: string;
  disclaimer: string;
}

async function getAuthHeaders(): Promise<HeadersInit> {
  const headers: HeadersInit = { "Content-Type": "application/json" };
  if (isSupabaseConfigured()) {
    try {
      const supabase = getSupabaseBrowserClient();
      const { data } = await supabase.auth.getSession();
      if (data.session?.access_token) {
        headers["Authorization"] = `Bearer ${data.session.access_token}`;
      }
    } catch {
      // In demo mode or if auth is not initialized, proceed with standard headers
    }
  }
  return headers;
}

export async function fetchAllAppointments(
  statusFilter?: string,
  searchQuery?: string,
  dateFilter?: string
): Promise<AppointmentItemDto[]> {
  try {
    const headers = await getAuthHeaders();
    const query = new URLSearchParams();
    if (statusFilter && statusFilter !== "All") query.set("status", statusFilter);
    if (searchQuery) query.set("search", searchQuery);
    if (dateFilter) query.set("date", dateFilter);

    const qs = query.toString() ? `?${query.toString()}` : "";
    const res = await fetch(`${API_BASE}/appointments${qs}`, { headers });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn("Backend /appointments unreachable, using local fallback.", err);
    return mockAppointments.map((m, idx) => ({
      id: m.id,
      user_id: "00000000-0000-0000-0000-000000000001",
      doctor_name: m.doctorName,
      speciality: m.speciality,
      appointment_date: idx === 0 ? "2025-09-12" : idx === 1 ? "2025-09-28" : idx === 2 ? "2025-10-15" : "2025-08-28",
      appointment_time: m.time,
      duration_minutes: 30,
      visit_type: idx === 2 ? "Online" : "In-Person",
      location: m.location || "Apollo Clinic, Room 302",
      clinic_name: "Apollo Clinic",
      clinic_phone: "+91 98450 67890",
      clinic_email: "appointments@apolloclinic.com",
      status: m.status === "Past" ? "Completed" : "Upcoming",
      is_locally_managed: true,
      is_verified_doctor: true,
      reminder_offsets: [1440, 60],
      visit_purpose: m.notes || "Regular consultation review",
      questions_to_ask: ["Discuss recent lab readings and dosage schedule."],
      personal_notes: "Bring previous month prescription notes.",
      date: m.date,
      time: m.time,
      notes: m.notes,
      history: [
        {
          action: "created",
          timestamp: "2025-08-28T09:00:00Z",
          actor: "patient",
          details: "Appointment recorded in MediMate",
        },
      ],
      created_at: "2025-08-28T09:00:00Z",
      updated_at: "2025-08-28T09:00:00Z",
    }));
  }
}

export async function fetchDoctorDirectory(): Promise<DoctorDirectoryItemDto[]> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE}/appointments/doctors`, { headers });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch {
    return [
      {
        id: "doc-mehta",
        name: "Dr. R. Mehta",
        speciality: "General Physician",
        hospital: "Care Hospital",
        phone: "+91 98200 12345",
        email: "dr.mehta@carehospital.com",
        rating: 4.9,
        consultation_types: ["In-Person", "Online"],
        is_verified: true,
        available_days: ["Monday", "Tuesday", "Thursday", "Saturday"],
        clinic_address: "Care Hospital, Wing A, Room 102",
      },
      {
        id: "doc-kumar",
        name: "Dr. S. Kumar",
        speciality: "Endocrinologist & Diabetologist",
        hospital: "Apollo Clinic",
        phone: "+91 98450 67890",
        email: "dr.kumar@apolloclinic.com",
        rating: 4.8,
        consultation_types: ["In-Person", "Online"],
        is_verified: true,
        available_days: ["Monday", "Wednesday", "Friday"],
        clinic_address: "Apollo Clinic, Room 302, Sector 7",
      },
      {
        id: "doc-lakshmi",
        name: "Dr. Lakshmi Prasad",
        speciality: "Cardiologist",
        hospital: "Heart Care Institute",
        phone: "+91 97110 54321",
        email: "dr.lakshmi@heartcare.org",
        rating: 4.9,
        consultation_types: ["In-Person", "Online"],
        is_verified: true,
        available_days: ["Tuesday", "Wednesday", "Thursday"],
        clinic_address: "Heart Care Institute, Cardiology Wing",
      },
      {
        id: "doc-davis",
        name: "Dr. Jennifer Davis",
        speciality: "Dermatologist",
        hospital: "City Skin & Wellness",
        phone: "+91 99000 88776",
        email: "info@cityskin.com",
        rating: 4.7,
        consultation_types: ["In-Person", "Online"],
        is_verified: true,
        available_days: ["Monday", "Thursday", "Friday"],
        clinic_address: "City Skin Clinic, Suite 104",
      },
      {
        id: "doc-verma",
        name: "Dr. Anand Verma",
        speciality: "Orthopedic Surgeon",
        hospital: "Apollo Hospital",
        phone: "+91 98111 22334",
        email: "dr.verma@apollohospitals.com",
        rating: 4.8,
        consultation_types: ["In-Person"],
        is_verified: true,
        available_days: ["Monday", "Wednesday", "Saturday"],
        clinic_address: "Apollo Hospital, Ortho Outpatient Dept",
      },
    ];
  }
}

export async function createAppointmentApi(
  payload: AppointmentCreatePayload
): Promise<AppointmentItemDto> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/appointments`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorJson = await res.json().catch(() => ({}));
    if (res.status === 409) {
      // Overlap warning
      const conflictErr = new Error(errorJson.detail?.message || "Appointment conflict detected");
      (conflictErr as any).isConflict = true;
      (conflictErr as any).conflictDetails = errorJson.detail;
      throw conflictErr;
    }
    throw new Error(errorJson.detail || `Failed to create appointment (HTTP ${res.status})`);
  }
  return res.json();
}

export async function updateAppointmentApi(
  appointmentId: string,
  payload: Partial<AppointmentItemDto>
): Promise<AppointmentItemDto> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/appointments/${appointmentId}`, {
    method: "PUT",
    headers,
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errorJson = await res.json().catch(() => ({}));
    throw new Error(errorJson.detail || `Failed to update appointment (HTTP ${res.status})`);
  }
  return res.json();
}

export async function rescheduleAppointmentApi(
  appointmentId: string,
  payload: { new_date: string; new_time: string; reason?: string; allow_overlap?: boolean }
): Promise<AppointmentItemDto> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/appointments/${appointmentId}/reschedule`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errorJson = await res.json().catch(() => ({}));
    if (res.status === 409) {
      const conflictErr = new Error(errorJson.detail?.message || "Appointment conflict detected");
      (conflictErr as any).isConflict = true;
      (conflictErr as any).conflictDetails = errorJson.detail;
      throw conflictErr;
    }
    throw new Error(errorJson.detail || `Failed to reschedule appointment (HTTP ${res.status})`);
  }
  return res.json();
}

export async function cancelAppointmentApi(
  appointmentId: string,
  reason: string
): Promise<AppointmentItemDto> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/appointments/${appointmentId}/cancel`, {
    method: "POST",
    headers,
    body: JSON.stringify({ reason }),
  });
  if (!res.ok) {
    const errorJson = await res.json().catch(() => ({}));
    throw new Error(errorJson.detail || `Failed to cancel appointment (HTTP ${res.status})`);
  }
  return res.json();
}

export async function completeAppointmentApi(
  appointmentId: string
): Promise<AppointmentItemDto> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/appointments/${appointmentId}/complete`, {
    method: "POST",
    headers,
  });
  if (!res.ok) {
    const errorJson = await res.json().catch(() => ({}));
    throw new Error(errorJson.detail || `Failed to complete appointment (HTTP ${res.status})`);
  }
  return res.json();
}

export async function fetchCalendarMonthSummary(
  year: number,
  month: number
): Promise<CalendarMonthSummaryDto> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE}/appointments/calendar/month?year=${year}&month=${month}`, {
      headers,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch {
    // Generate fallback month grid locally
    const monthNames = [
      "", "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    return {
      year,
      month,
      month_name: monthNames[month] || "September",
      total_appointments: 3,
      days: Array.from({ length: 30 }, (_, i) => {
        const d = (i + 1).toString().padStart(2, "0");
        const dateStr = `${year}-${month.toString().padStart(2, "0")}-${d}`;
        const hasApt = i === 11 || i === 27; // Sep 12, Sep 28
        return {
          date: dateStr,
          day_number: i + 1,
          is_current_month: true,
          appointment_count: hasApt ? 1 : 0,
          statuses: hasApt ? ["Upcoming"] : [],
          appointments: [],
        };
      }),
    };
  }
}

export async function exportAppointmentIcsApi(
  appointmentId: string
): Promise<ICSExportResponseDto> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/appointments/${appointmentId}/export-ics`, { headers });
  if (!res.ok) {
    throw new Error(`Failed to export calendar (HTTP ${res.status})`);
  }
  return res.json();
}

/**
 * Helper to trigger native browser download of .ics event file
 */
export function downloadIcsFile(filename: string, icsContent: string) {
  const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}
