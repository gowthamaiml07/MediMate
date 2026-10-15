import { getSupabaseBrowserClient } from "./client";
import { isSupabaseConfigured } from "./config";
import {
  Medication,
  MedicationStatus,
  Appointment,
  HealthRecord,
  UserProfile,
} from "@/types";
import {
  mockTodayMedications,
  mockAppointments,
  mockHealthRecords,
} from "@/lib/mockData";

interface ScheduleRow {
  id: string;
  scheduled_time: string;
  timing_relation: string;
  status: string;
  is_confirmed: boolean;
  medications: {
    id: string;
    name: string;
    strength: string;
    category?: string;
    instructions: string;
    frequency: string;
    duration?: string;
  } | null;
}

interface AppointmentRow {
  id: string;
  doctor_name: string;
  speciality: string;
  appointment_date: string;
  appointment_time: string | null;
  location?: string | null;
  status: string;
  notes?: string | null;
}

interface PrescriptionRow {
  id: string;
  file_name: string;
  doctor_name: string;
  prescription_date: string | null;
  file_size_bytes: number | null;
  status: string;
}

/**
 * Fetch patient medications and schedule.
 * If Supabase is connected, queries medication_schedules joined with medications.
 * Otherwise returns structured demo data.
 */
export async function fetchPatientMedications(userId?: string): Promise<Medication[]> {
  if (!isSupabaseConfigured() || !userId) {
    return mockTodayMedications;
  }

  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("medication_schedules")
    .select(`
      id,
      scheduled_time,
      timing_relation,
      status,
      is_confirmed,
      medications (
        id,
        name,
        strength,
        category,
        instructions,
        frequency,
        duration
      )
    `)
    .eq("user_id", userId)
    .order("scheduled_time", { ascending: true });

  if (error || !data || data.length === 0) {
    return mockTodayMedications;
  }

  return (data as unknown as ScheduleRow[]).map((item) => {
    const med = item.medications;
    return {
      id: item.id,
      name: med?.name || "Medication",
      strength: med?.strength || "",
      category: med?.category || "Prescription",
      instructions: `${item.timing_relation || "After food"} • ${item.scheduled_time?.slice(0, 5) || "08:00"}`,
      frequency: med?.frequency || "Daily",
      timing: item.timing_relation || "After food",
      duration: med?.duration || "30 days",
      status: (item.status === "Active" ? "Upcoming" : item.status) as MedicationStatus,
      scheduledTime: item.scheduled_time?.slice(0, 5) || "08:00 AM",
      isTaken: false,
    };
  });
}

/**
 * Record a patient dose event (Taken, Snoozed, Skipped, Upcoming)
 */
export async function recordDoseEvent(
  scheduleId: string,
  userId: string,
  status: MedicationStatus
): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured() || !userId) {
    // In demo mode, succeed locally
    return { success: true };
  }

  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.from("dose_events").insert({
    schedule_id: scheduleId,
    user_id: userId,
    scheduled_for: new Date().toISOString(),
    status,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Fetch patient appointments
 */
export async function fetchPatientAppointments(userId?: string): Promise<Appointment[]> {
  if (!isSupabaseConfigured() || !userId) {
    return mockAppointments;
  }

  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("appointments")
    .select("id, doctor_name, speciality, appointment_date, appointment_time, location, status, notes")
    .eq("user_id", userId)
    .order("appointment_date", { ascending: true });

  if (error || !data || data.length === 0) {
    return mockAppointments;
  }

  return (data as unknown as AppointmentRow[]).map((item) => ({
    id: item.id,
    doctorName: item.doctor_name,
    speciality: item.speciality,
    date: item.appointment_date,
    time: item.appointment_time?.slice(0, 5) || "10:00 AM",
    location: item.location || undefined,
    status: (item.status === "Completed" ? "Past" : "Upcoming") as "Upcoming" | "Past",
    notes: item.notes || undefined,
  }));
}

/**
 * Create a new appointment
 */
export async function createPatientAppointment(
  userId: string,
  appointment: Omit<Appointment, "id">
): Promise<{ success: boolean; data?: Appointment; error?: string }> {
  if (!isSupabaseConfigured() || !userId) {
    const newDemoAppt: Appointment = {
      id: `apt-${Date.now()}`,
      ...appointment,
    };
    return { success: true, data: newDemoAppt };
  }

  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase
    .from("appointments")
    .insert({
      user_id: userId,
      doctor_name: appointment.doctorName,
      speciality: appointment.speciality,
      appointment_date: appointment.date,
      appointment_time: appointment.time,
      location: appointment.location,
      status: appointment.status === "Past" ? "Completed" : "Upcoming",
      notes: appointment.notes,
    })
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  return {
    success: true,
    data: {
      id: data.id,
      doctorName: data.doctor_name,
      speciality: data.speciality,
      date: data.appointment_date,
      time: data.appointment_time?.slice(0, 5) || "10:00 AM",
      location: data.location || undefined,
      status: data.status === "Completed" ? "Past" : "Upcoming",
      notes: data.notes || undefined,
    },
  };
}

/**
 * Fetch patient health records (prescriptions and consultation notes)
 */
export async function fetchPatientHealthRecords(userId?: string): Promise<HealthRecord[]> {
  if (!isSupabaseConfigured() || !userId) {
    return mockHealthRecords;
  }

  const supabase = getSupabaseBrowserClient();
  const { data: rxData } = await supabase
    .from("prescriptions")
    .select("id, file_name, doctor_name, prescription_date, file_size_bytes, status")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (!rxData || rxData.length === 0) {
    return mockHealthRecords;
  }

  return (rxData as unknown as PrescriptionRow[]).map((rx) => ({
    id: rx.id,
    title: rx.file_name || "Prescription Document",
    type: "Prescription",
    doctor: rx.doctor_name || "Physician",
    date: rx.prescription_date || "Recent",
    fileSize: rx.file_size_bytes ? `${Math.round(rx.file_size_bytes / 1024)} KB` : "1.2 MB",
    status: rx.status || "Confirmed",
  }));
}

/**
 * Update patient profile
 */
export async function updatePatientProfile(
  userId: string,
  updates: Partial<UserProfile>
): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured() || !userId) {
    return { success: true };
  }

  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: updates.name,
      phone: updates.phone,
      blood_group: updates.bloodGroup,
      emergency_contact: updates.emergencyContact,
    })
    .eq("id", userId);

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}

/**
 * Update patient notification preferences
 */
export async function updateNotificationPreferences(
  userId: string,
  prefs: { pushReminders: boolean; smsAlerts: boolean; appointmentAlerts: boolean }
): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured() || !userId) {
    return { success: true };
  }

  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase
    .from("notification_preferences")
    .upsert({
      user_id: userId,
      push_reminders: prefs.pushReminders,
      sms_alerts: prefs.smsAlerts,
      appointment_alerts_24h: prefs.appointmentAlerts,
    });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
}
