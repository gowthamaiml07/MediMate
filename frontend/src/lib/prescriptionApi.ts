import { getSupabaseBrowserClient } from "./supabase/client";
import { isSupabaseConfigured } from "./supabase/config";
import { ExtractedMedicine } from "@/types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

export interface PrescriptionExtractionData {
  prescription_id: string;
  user_id?: string;
  status: string;
  file_name: string;
  file_size_bytes?: number;
  mime_type?: string;
  extracted_at: string;
  metadata: {
    doctor_name: string;
    speciality: string;
    hospital_clinic?: string;
    license_number?: string;
    confidence: number;
  };
  medicines: ExtractedMedicine[];
  confidence_overall: number;
  uncertain_fields_count: number;
  raw_ocr_text?: string;
  provider_info: {
    ocr_provider: string;
    ocr_model?: string;
    llm_provider: string;
    llm_model?: string;
    is_mock: boolean;
    provider_notes?: string;
  };
  safety_advisories: string[];
  document_url?: string;
  is_confirmed: boolean;
}

export interface PrescriptionHistoryItem {
  prescription_id: string;
  file_name: string;
  file_size_bytes: number;
  mime_type: string;
  status: string;
  doctor_name?: string;
  prescription_date?: string;
  medication_count: number;
  created_at: string;
  is_mock: boolean;
}

const ALLOWED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".pdf"];
const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export function validatePrescriptionFile(file: File): { valid: boolean; error?: string } {
  if (!file) {
    return { valid: false, error: "Please select a file to upload." };
  }

  if (file.size === 0) {
    return { valid: false, error: "The selected file is empty (0 bytes)." };
  }

  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File size exceeds the 10MB limit (${(file.size / (1024 * 1024)).toFixed(1)}MB). Please upload a smaller file.`,
    };
  }

  const name = file.name.toLowerCase();
  const ext = name.substring(name.lastIndexOf("."));
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return {
      valid: false,
      error: `Unsupported file type (${ext}). Please upload a PDF, PNG, JPEG, or WebP document.`,
    };
  }

  if (file.type && !ALLOWED_MIME_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: `Unsupported MIME type (${file.type}). Allowed formats: PDF, PNG, JPEG, WebP.`,
    };
  }

  return { valid: true };
}

async function getAuthHeaders(): Promise<HeadersInit> {
  const headers: HeadersInit = {};
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

export async function uploadPrescriptionFile(
  file: File,
  onProgress?: (progress: number) => void
): Promise<PrescriptionExtractionData> {
  const validation = validatePrescriptionFile(file);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const formData = new FormData();
  formData.append("file", file);

  const authHeaders = await getAuthHeaders();

  onProgress?.(25);

  try {
    const response = await fetch(`${API_BASE}/prescriptions/upload`, {
      method: "POST",
      headers: authHeaders,
      body: formData,
    });

    onProgress?.(75);

    if (!response.ok) {
      const errorJson = await response.json().catch(() => ({}));
      const errorDetail = errorJson.detail || `Upload failed (HTTP ${response.status})`;
      throw new Error(errorDetail);
    }

    const data: PrescriptionExtractionData = await response.json();
    onProgress?.(100);
    return data;
  } catch (err: unknown) {
    // If backend is completely offline during frontend-only development, provide graceful simulated extraction
    const errMsg = err instanceof Error ? err.message : String(err);
    if (errMsg.includes("Failed to fetch") || errMsg.includes("NetworkError")) {
      console.warn("Backend API unreachable. Falling back to client-side simulated mock extraction.");
      onProgress?.(100);
      return {
        prescription_id: `rx-${Date.now()}`,
        status: "Completed",
        file_name: file.name,
        file_size_bytes: file.size,
        mime_type: file.type || "image/png",
        extracted_at: new Date().toISOString(),
        metadata: {
          doctor_name: "Dr. R. Mehta",
          speciality: "General Physician",
          hospital_clinic: "Metro Specialty Clinic",
          confidence: 0.95,
        },
        medicines: [
          {
            id: "m-1",
            name: "Metformin",
            strength: "500mg",
            frequency: "Twice daily after food",
            duration: "30 days",
            confidence: 95,
            instructions: "After food",
            needsConfirmation: false,
            sourceText: "1. Tab. Metformin 500mg - 1 tab BID (p.c.) after food x 30d",
          },
          {
            id: "m-2",
            name: "Atorvastatin",
            strength: "10mg",
            frequency: "Once daily at night",
            duration: "30 days",
            confidence: 92,
            instructions: "At bedtime",
            needsConfirmation: false,
            sourceText: "2. Tab. Atorvastatin 10mg - 1 tab HS after food x 30d",
          },
          {
            id: "m-3",
            name: "Vitamin D3",
            strength: "1000IU",
            frequency: "Once weekly",
            duration: "8 weeks",
            confidence: 88,
            instructions: "With a meal",
            needsConfirmation: true,
            sourceText: "3. Tab. Vitamin D3 1000IU - 1 tab weekly with breakfast x 8w",
          },
        ],
        confidence_overall: 0.92,
        uncertain_fields_count: 1,
        raw_ocr_text: "DR. R. MEHTA, MD\nDate: 28 Aug 2025\n1. Tab. Metformin 500mg - 1 tab BID x 30d\n2. Tab. Atorvastatin 10mg - 1 tab HS x 30d\n3. Tab. Vitamin D3 1000IU - 1 tab weekly x 8w",
        provider_info: {
          ocr_provider: "mock",
          llm_provider: "mock",
          is_mock: true,
          provider_notes: "Simulated client fallback when backend is unreachable.",
        },
        safety_advisories: [
          "Running in client offline mock mode. Please start FastAPI backend for server-verified extraction.",
        ],
        is_confirmed: false,
      };
    }
    throw err;
  }
}

export async function fetchPrescriptionReview(
  prescriptionId: string
): Promise<PrescriptionExtractionData> {
  const authHeaders = await getAuthHeaders();
  const response = await fetch(`${API_BASE}/prescriptions/${prescriptionId}/review`, {
    headers: authHeaders,
  });

  if (!response.ok) {
    const errorJson = await response.json().catch(() => ({}));
    throw new Error(errorJson.detail || `Failed to fetch prescription review (HTTP ${response.status})`);
  }

  return response.json();
}

export async function savePrescriptionDraft(
  prescriptionId: string,
  payload: {
    doctor_name?: string;
    speciality?: string;
    prescription_date?: string;
    medicines: ExtractedMedicine[];
  }
): Promise<PrescriptionExtractionData> {
  const authHeaders = await getAuthHeaders();
  const response = await fetch(`${API_BASE}/prescriptions/${prescriptionId}/review`, {
    method: "PUT",
    headers: {
      ...authHeaders,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorJson = await response.json().catch(() => ({}));
    throw new Error(errorJson.detail || `Failed to save review draft (HTTP ${response.status})`);
  }

  return response.json();
}

export async function confirmPrescriptionApi(
  prescriptionId: string,
  payload: {
    medicines: ExtractedMedicine[];
    doctor_name?: string;
    speciality?: string;
    prescription_date?: string;
    create_schedules?: boolean;
    user_acknowledgement: boolean;
  }
): Promise<{ status: string; message: string; created_medication_ids?: string[] }> {
  const authHeaders = await getAuthHeaders();
  const response = await fetch(`${API_BASE}/prescriptions/${prescriptionId}/confirm`, {
    method: "POST",
    headers: {
      ...authHeaders,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorJson = await response.json().catch(() => ({}));
    throw new Error(errorJson.detail || `Failed to confirm prescription (HTTP ${response.status})`);
  }

  return response.json();
}

export async function fetchPrescriptionHistory(): Promise<PrescriptionHistoryItem[]> {
  try {
    const authHeaders = await getAuthHeaders();
    const response = await fetch(`${API_BASE}/prescriptions`, {
      headers: authHeaders,
    });
    if (!response.ok) {
      return [];
    }
    return response.json();
  } catch {
    return [];
  }
}
