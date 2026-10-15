export type MedicationStatus = "Taken" | "Upcoming" | "Missed" | "Skipped" | "Snoozed";

export interface Medication {
  id: string;
  name: string;
  strength: string;
  category?: string;
  instructions: string;
  frequency: string;
  timing: string;
  duration: string;
  status: MedicationStatus;
  scheduledTime: string;
  isTaken?: boolean;
}

export interface ExtractedMedicine {
  id: string;
  name: string;
  strength: string;
  frequency: string;
  duration: string;
  confidence: number; // e.g. 95
  instructions: string;
  needsConfirmation?: boolean;
  sourceText?: string;
  formulation?: string;
  dosageInstructions?: string;
  route?: string;
  isUnclear?: boolean;
  hasConflictingInstructions?: boolean;
  missingFields?: string[];
  timingRelation?: string;
}


export interface Prescription {
  id: string;
  fileName: string;
  uploadedAt: string;
  doctorName: string;
  speciality: string;
  date: string;
  patientName: string;
  overallConfidence: number;
  medicines: ExtractedMedicine[];
  status: "Uploaded" | "Processing" | "Reviewed" | "Confirmed";
  originalImageUrl?: string;
}

export interface Appointment {
  id: string;
  doctorName: string;
  speciality: string;
  date: string;
  time: string;
  status: "Upcoming" | "Past";
  location?: string;
  notes?: string;
}

export interface AdherenceDayStat {
  day: string;
  rate: number;
  taken: number;
  missed: number;
}

export interface AdherenceData {
  period: string;
  adherenceRate: number;
  taken: number;
  missed: number;
  skipped: number;
  snoozed: number;
  dailyBreakdown: AdherenceDayStat[];
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: string[];
  timestamp: string;
}

export interface MedicineInfo {
  id: string;
  name: string;
  brandNames?: string[];
  category: string;
  badge: string;
  overview: string;
  sideEffects: string[];
  precautions: string[];
  storage: string;
}

export interface HealthRecord {
  id: string;
  title: string;
  type: "Prescription" | "Consultation" | "Lab Report";
  doctor: string;
  date: string;
  fileSize: string;
  status: string;
}

export interface UserProfile {
  name: string;
  email: string;
  avatarUrl?: string;
  role: string;
  phone?: string;
  emergencyContact?: string;
  bloodGroup?: string;
}
