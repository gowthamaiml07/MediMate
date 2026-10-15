import { getSupabaseBrowserClient } from "./supabase/client";
import { isSupabaseConfigured } from "./supabase/config";
import { mockTodayMedications, mockAdherenceData } from "./mockData";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export interface MedicationDetailDto {
  id: string;
  user_id: string;
  prescription_id?: string;
  name: string;
  strength: string;
  formulation: string;
  category: string;
  instructions: string;
  frequency: string;
  duration?: string;
  route: string;
  start_date: string;
  end_date?: string;
  status: "Active" | "Paused" | "Completed" | "Discontinued";
  next_scheduled_dose?: string;
  scheduled_times: string[];
  timing_relation: string;
  timezone: string;
  reminder_enabled: boolean;
  reminder_offset_minutes: number;
  original_source_text?: string;
  user_corrections?: Record<string, any>;
  is_user_edited: boolean;
  is_verified_by_user: boolean;
  created_at: string;
  updated_at: string;
}

export interface DoseTimelineItemDto {
  id: string;
  schedule_id: string;
  medication_id: string;
  medication_name: string;
  strength: string;
  formulation: string;
  instructions: string;
  timing_relation: string;
  scheduled_for: string;
  scheduled_time: string;
  local_date: string;
  status: "Upcoming" | "Taken" | "Skipped" | "Missed" | "Snoozed";
  is_overdue: boolean;
  logged_at?: string;
  event_id?: string;
  notes?: string;
}

export interface AdherenceSummaryDto {
  period: string;
  adherence_rate: number;
  taken: number;
  missed: number;
  skipped: number;
  snoozed: number;
  total_due: number;
  formula_description: string;
  missed_dose_guidance: string;
  daily_breakdown: Array<{
    day: string;
    date: string;
    rate: number;
    taken: number;
    missed: number;
    skipped: number;
    total_due: number;
  }>;
}

export interface ReminderJobDto {
  id: string;
  user_id: string;
  medication_id: string;
  medication_name: string;
  schedule_id: string;
  scheduled_for: string;
  reminder_time: string;
  channel: string;
  status: "pending" | "sent" | "failed" | "cancelled";
  sent_at?: string;
  error_message?: string;
  is_mock: boolean;
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
      // In demo mode or if auth is not initialized, continue
    }
  }
  return headers;
}

export async function fetchAllMedications(statusFilter?: string): Promise<MedicationDetailDto[]> {
  try {
    const headers = await getAuthHeaders();
    const query = statusFilter && statusFilter !== "All" ? `?status=${encodeURIComponent(statusFilter)}` : "";
    const res = await fetch(`${API_BASE}/medications${query}`, { headers });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn("Backend /medications unreachable, using local fallback.", err);
    return mockTodayMedications.map((m) => ({
      id: m.id,
      user_id: "00000000-0000-0000-0000-000000000001",
      name: m.name,
      strength: m.strength,
      formulation: "Tablet",
      category: m.category || "Prescription",
      instructions: m.instructions,
      frequency: m.frequency,
      duration: m.duration,
      route: "Oral",
      start_date: "2025-08-28",
      status: "Active",
      next_scheduled_dose: new Date(Date.now() + 3600000).toISOString(),
      scheduled_times: [m.scheduledTime.slice(0, 5) || "08:00"],
      timing_relation: m.timing || "After food",
      timezone: "UTC",
      reminder_enabled: true,
      reminder_offset_minutes: 10,
      is_user_edited: false,
      is_verified_by_user: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }));
  }
}

export async function createMedicationApi(payload: {
  name: string;
  strength: string;
  formulation?: string;
  instructions: string;
  frequency: string;
  duration?: string;
  route?: string;
  start_date?: string;
  end_date?: string;
  timing_relation?: string;
  scheduled_times: string[];
  timezone?: string;
  reminder_enabled?: boolean;
  reminder_offset_minutes?: number;
  original_source_text?: string;
  prescription_id?: string;
  is_user_edited?: boolean;
}): Promise<MedicationDetailDto> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/medications`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errorJson = await res.json().catch(() => ({}));
    throw new Error(errorJson.detail || `Failed to create medication (HTTP ${res.status})`);
  }
  return res.json();
}

export async function updateMedicationStatusApi(
  medId: string,
  targetStatus: "Active" | "Paused" | "Completed" | "Discontinued",
  reason?: string
): Promise<MedicationDetailDto> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/medications/${medId}/status`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({ status: targetStatus, reason }),
  });
  if (!res.ok) {
    const errorJson = await res.json().catch(() => ({}));
    throw new Error(errorJson.detail || `Failed to update status (HTTP ${res.status})`);
  }
  return res.json();
}

export async function updateMedicationApi(
  medId: string,
  payload: Partial<MedicationDetailDto>
): Promise<MedicationDetailDto> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/medications/${medId}`, {
    method: "PUT",
    headers,
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errorJson = await res.json().catch(() => ({}));
    throw new Error(errorJson.detail || `Failed to update medication (HTTP ${res.status})`);
  }
  return res.json();
}

export async function fetchDoseTimelineApi(
  targetDate?: string,
  days: number = 1,
  tz: string = "UTC"
): Promise<DoseTimelineItemDto[]> {
  try {
    const headers = await getAuthHeaders();
    const query = new URLSearchParams();
    if (targetDate) query.set("target_date", targetDate);
    query.set("days", days.toString());
    query.set("tz", tz);

    const res = await fetch(`${API_BASE}/medications/timeline/doses?${query.toString()}`, { headers });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn("Backend /timeline/doses unreachable, using fallback.", err);
    return mockTodayMedications.map((m, idx) => ({
      id: `dose-${m.id}-${idx}`,
      schedule_id: `sch-${m.id}`,
      medication_id: m.id,
      medication_name: m.name,
      strength: m.strength,
      formulation: "Tablet",
      instructions: m.instructions,
      timing_relation: m.timing || "After food",
      scheduled_for: new Date().toISOString(),
      scheduled_time: m.scheduledTime,
      local_date: targetDate || "2025-09-08",
      status: m.status as any,
      is_overdue: false,
    }));
  }
}

export async function logDoseEventApi(payload: {
  schedule_id: string;
  scheduled_for: string;
  status: "Taken" | "Skipped" | "Missed" | "Snoozed" | "Upcoming";
  notes?: string;
  timezone?: string;
}): Promise<{ status: string; event_id: string; message: string }> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/medications/doses/log`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errorJson = await res.json().catch(() => ({}));
    throw new Error(errorJson.detail || `Failed to log dose (HTTP ${res.status})`);
  }
  return res.json();
}

export async function correctDoseEventApi(
  eventId: string,
  payload: {
    new_status: "Taken" | "Skipped" | "Missed" | "Upcoming";
    correction_reason: string;
  }
): Promise<{ status: string; event_id: string; message: string }> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_BASE}/medications/doses/${eventId}/correct`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errorJson = await res.json().catch(() => ({}));
    throw new Error(errorJson.detail || `Failed to correct dose (HTTP ${res.status})`);
  }
  return res.json();
}

export async function fetchAdherenceSummaryApi(days: number = 7): Promise<AdherenceSummaryDto> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE}/medications/adherence/summary?days=${days}`, { headers });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn("Backend /adherence/summary unreachable, using fallback.", err);
    return {
      period: mockAdherenceData.period,
      adherence_rate: mockAdherenceData.adherenceRate,
      taken: mockAdherenceData.taken,
      missed: mockAdherenceData.missed,
      skipped: mockAdherenceData.skipped,
      snoozed: mockAdherenceData.snoozed,
      total_due: mockAdherenceData.taken + mockAdherenceData.missed + mockAdherenceData.skipped,
      formula_description: "Adherence % = (Taken Doses / Total Past Due Doses) * 100",
      missed_dose_guidance: "Medical Safety Guidance: Never take a double dose to make up for a missed dose. Contact your doctor or pharmacist if unsure.",
      daily_breakdown: mockAdherenceData.dailyBreakdown.map((d) => ({
        day: d.day,
        date: "2025-09-08",
        rate: d.rate,
        taken: d.taken,
        missed: d.missed,
        skipped: 0,
        total_due: d.taken + d.missed,
      })),
    };
  }
}

export async function fetchRemindersApi(): Promise<ReminderJobDto[]> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_BASE}/medications/reminders`, { headers });
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}
