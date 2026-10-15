# MediMate — AI-Powered Personal Medication & Healthcare Assistant

> **"From paper prescriptions to a smarter, healthier you."**

MediMate is a patient-centric, pixel-accurate web and mobile application designed to bridge the gap between physical paper prescriptions and everyday health adherence. Built from the primary showcase specification, it provides automated prescription OCR digitization, AI-powered extraction, user-verified medication scheduling, smart adherence analytics, appointment tracking, an interactive clinical AI assistant, and exportable doctor consultation summaries.

---

## 📸 Reference Specification & Page Matrix

All 12 primary application screens from the design specification are fully implemented with responsive layouts:

| # | Screen / Route | Description | Key Features |
|---|----------------|-------------|--------------|
| **1** | [`/login`](http://localhost:3000/login) & [`/signup`](http://localhost:3000/signup) | Patient Authentication & Onboarding | MediMate brand logo, value proposition, email/password form, Google SSO, HIPAA privacy note |
| **2** | [`/dashboard`](http://localhost:3000/dashboard) | Personal Health Dashboard | Personalized greeting, 3 summary cards (Due today, Appointments, Refills), today's medication list with taken/upcoming badges, upcoming doctor card |
| **3** | [`/prescriptions/upload`](http://localhost:3000/prescriptions/upload) | Prescription Upload & Scanning | Drag-and-drop zone, camera/upload actions, 4-step progress stepper (Upload → AI Processing → Review → Confirm) |
| **4** | [`/prescriptions/[id]/review`](http://localhost:3000/prescriptions/rx-sample-001/review) | AI Extraction Review | Split-panel layout: original prescription preview alongside extracted medicines with % confidence badges and confirmation alerts |
| **5** | [`/medications/confirm`](http://localhost:3000/medications/confirm) | Verification & Inline Editing | Editable medicine cards (name, strength, frequency, duration, instructions) with "Save & Continue" action |
| **6** | [`/medications/schedule`](http://localhost:3000/medications/schedule) | Daily & Weekly Timeline | Today / 7 Days / All tabs, date navigator, timeline entries with interactive "Taken", "Upcoming", "Snoozed" toggles |
| **7** | [`/adherence`](http://localhost:3000/adherence) | Adherence Tracker | 78% adherence donut chart, Taken (22) / Missed (2) / Skipped (1) / Snoozed (0) counters, and Recharts daily breakdown bar chart |
| **8** | [`/appointments`](http://localhost:3000/appointments) | Consultation Management | Upcoming & Past tabs, doctor cards, appointment detail modal, and interactive "+ Add Appointment" workflow |
| **9** | [`/assistant`](http://localhost:3000/assistant) | Clinical AI Health Chat | Conversational chat interface with medical disclaimer, contextual prompt suggestions, and source citations |
| **10** | [`/medicine-information`](http://localhost:3000/medicine-information) | Medicine Knowledge Base | Searchable drug catalogue with Overview, Side Effects, and Precautions sub-tabs |
| **11** | [`/health-records`](http://localhost:3000/health-records) | Health Record Archive | Searchable prescription archive, consultation summaries, lab report filter, and document preview modal |
| **12** | [`/doctor-summary`](http://localhost:3000/doctor-summary) | Doctor Visit Summary | Printable/exportable consultation report with confirmed active medications, adherence rate, and patient questions |
| **13** | [`/settings`](http://localhost:3000/settings) | Patient Account & Preferences | Profile details, push & SMS reminder toggles, language, privacy, and data export |
| **14** | [`/`](http://localhost:3000/) | Live Showcase Portal | Visual interactive index with direct links to all screens and system architecture breakdown |

---

## 🛠️ Technology Stack

### Frontend
- **Framework**: Next.js 16 (App Router with Turbopack)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Data Visualization**: Recharts (Responsive bar and adherence charts)
- **State & Interactions**: Reactive state with simulated live sync

### Backend API
- **Framework**: Python FastAPI
- **Data Validation**: Pydantic v2
- **Server**: Uvicorn (ASGI)
- **CORS & Middleware**: Configured for local & production origins
- **Architecture**: Modular endpoints (`/auth`, `/prescriptions`, `/medications`, `/appointments`, `/ai`, `/doctor`, `/health`)

---

## 📐 System Architecture

```text
┌────────────────────────────────────────────────────────┐
│               Frontend: Next.js 16                     │
│   (Web & Mobile Responsive, Tailwind CSS, Recharts)    │
└──────────────────────────┬─────────────────────────────┘
                           │ HTTP / JSON API
┌──────────────────────────▼─────────────────────────────┐
│                 FastAPI Backend                        │
│                 (Port: 8000)                           │
├──────────────────────────┬─────────────────────────────┤
│   AI Services            │   Business Logic            │
│   • OCR (Vision / Text)  │   • Dose Scheduling         │
│   • LLM (Gemini/OpenAI)  │   • Adherence Analytics     │
├──────────────────────────┼─────────────────────────────┤
│   Background Workers     │   Security & Audit          │
│   • Push/SMS Reminders   │   • HIPAA-style Access Log  │
└──────────────────────────┬─────────────────────────────┘
                           │
┌──────────────────────────▼─────────────────────────────┐
│               Database & File Storage                  │
│       • PostgreSQL (Supabase / Local DB)               │
│       • Original Prescriptions Storage                 │
└────────────────────────────────────────────────────────┘
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** v18+ (tested on Node v24)
- **npm** v9+
- **Python** 3.10+ (tested on Python 3.12)

### 1. Clone & Setup Configuration
```bash
# Copy example environment configuration
cp .env.example frontend/.env.local
cp .env.example backend/.env
```

### 2. Run the Frontend (Next.js)
```bash
cd frontend
npm install
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

To verify production compilation and TypeScript checks:
```bash
cd frontend
npm run build
```

### 3. Run the Backend (FastAPI)
```bash
cd backend
python run.py
```
Or directly with uvicorn:
```bash
cd backend
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

- **API Documentation (Swagger UI)**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **Health Check Endpoint**: [http://localhost:8000/health](http://localhost:8000/health) or [http://localhost:8000/api/v1/health](http://localhost:8000/api/v1/health)

---

## 🎨 Design System Specifications

- **Primary Colors**: Royal Blue (`#2563eb`), Deep Indigo (`#4f46e5`), Slate Blue (`#1d4ed8`).
- **Background**: Soft clean canvas (`#f8fafc`) with pure white (`#ffffff`) card containers.
- **Accents**: Emerald Green (`#059669` / `#10b981`), Cyan (`#06b6d4`), Amber (`#d97706`), Violet (`#8b5cf6`).
- **Typography**: Crisp modern sans-serif typography with compact tracking and semantic font weights.
- **Card Styling**: Thin pale borders (`border-slate-200/80`), subtle elevations (`shadow-xs` to `shadow-sm`), rounded-2xl corners.
- **Badges**: Pill-shaped status indicators with semantic light backgrounds and dark text.
- **Logo**: Unified MediMate heart with medical cross emblem.

---

## 🔬 Secure Prescription OCR & AI Extraction Pipeline (Step 4)

MediMate includes a complete, clinical-grade prescription ingestion and extraction pipeline engineered with zero-hallucination medical safety rules.

```text
┌──────────────────┐       ┌────────────────────┐       ┌──────────────────────┐       ┌─────────────────────┐
│ 1. Document      │  OCR  │ 2. Verbatim Text   │  LLM  │ 3. Pydantic          │ User  │ 4. Verified Active  │
│ Upload (PNG/PDF) ├──────►│ Transcription      ├──────►│ Extraction Proposal  ├──────►│ Medication Schedule │
│ Max 10MB         │       │ (Raw OCR Preserved)│       │ (Unconfirmed Draft)  │ Review│ (Explicit Confirm)  │
└──────────────────┘       └────────────────────┘       └──────────────────────┘       └─────────────────────┘
```

### 1. Pluggable Provider Architecture
- **OCR Providers** (`app/services/ocr`):
  - `gemini_vision`: Google Gemini Multimodal Vision API (e.g., `gemini-1.5-flash`).
  - `openai_vision`: OpenAI Multimodal Vision API (e.g., `gpt-4o-mini`).
  - `mock`: Deterministic medical OCR simulator with Dr. Mehta reference data and edge cases (empty, blurry, multi-med, conflicting instructions).
- **LLM Extraction Providers** (`app/services/llm`):
  - `gemini`: Google Gemini structured JSON extraction with schema adherence.
  - `openai`: OpenAI `json_object` structured extraction.
  - `groq`: Ultra-fast Llama-3.3-70b-versatile via Groq API.
  - `mock`: Schema-validated mock extractor with explicit mock labeling.

### 2. Provider Environment Configuration
Configure providers via `.env` in `backend/`:
```bash
# LLM Provider selection ("gemini" | "openai" | "groq" | "mock")
DEFAULT_LLM_PROVIDER=gemini
LLM_MODEL=gemini-1.5-flash
OPENAI_API_KEY=your-openai-api-key-here
GEMINI_API_KEY=your-gemini-api-key-here
GROQ_API_KEY=your-groq-api-key-here

# OCR Provider selection ("mock" | "gemini_vision" | "openai_vision")
DEFAULT_OCR_PROVIDER=mock
OCR_MODEL=gemini-1.5-flash
OCR_API_KEY=your-ocr-api-key-here

# Document Storage & Security Constraints
STORAGE_DIR=storage/prescriptions
MAX_UPLOAD_SIZE_BYTES=10485760 # 10MB limit
SIGNED_URL_EXPIRATION_SECONDS=900
```
*Note: If external API keys are omitted, MediMate automatically falls back to the clearly labeled `mock` provider mode so development and review can proceed safely without runtime crashes.*

### 3. Critical Medical Safety Rules
- **Zero Hallucination**: The LLM is strictly instructed never to invent missing doses, strengths, formulations, or frequencies. Omitted fields are flagged in `missing_fields`.
- **No Guesswork**: The system never guesses administration times or routes.
- **Conflict Flagging**: Conflicting instructions (e.g. "once daily" and "morning & night") trigger `has_conflicting_instructions=True` and `needs_confirmation=True`.
- **Database Safety Constraint**: A PostgreSQL check constraint (`check_unverified_cannot_be_active`) guarantees that medication schedules cannot have status `'Active'` without `is_confirmed = TRUE`.
- **Patient Verification Mandatory**: Before creating active schedules, patients must review draft extractions, correct any OCR/LLM errors, and certify verification against the physical document.

### 4. Prescription Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/prescriptions/upload` | Validates file, runs OCR & LLM extraction, stores private document |
| `GET`  | `/api/v1/prescriptions` | Lists user's uploaded prescription history |
| `GET`  | `/api/v1/prescriptions/{id}/status` | Polls processing progress & step |
| `GET`  | `/api/v1/prescriptions/{id}/review` | Retrieves OCR text, candidate medications, confidence scores |
| `PUT`  | `/api/v1/prescriptions/{id}/review` | Saves user-corrected draft without activating schedules |
| `POST` | `/api/v1/prescriptions/{id}/confirm` | User-certifies verification, converts medicines to active schedules |
| `GET`  | `/api/v1/prescriptions/{id}/document` | Authenticated stream of original document (user isolation enforced) |

---

---

## 💊 Medication Management, Scheduling & Reminders (Step 5)

MediMate includes an end-to-end, clinically safe medication lifecycle management system adhering to strict medical safety guidelines:

```text
┌─────────────────────────┐       ┌─────────────────────────┐       ┌─────────────────────────┐
│ 1. AI Review / Draft    │  User │ 2. Explicit User        │ Valid │ 3. Deterministic Engine │
│ Unconfirmed Candidates  ├──────►│ Inline Corrections      ├──────►│ Timezone & Rule Schedule│
│ (Prescription-derived)  │ Confirm│ (Explicit Certification)│ Pass  │ (No LLM Guesswork)      │
└─────────────────────────┘       └─────────────────────────┘       └───────────┬─────────────┘
                                                                                │
                                  ┌─────────────────────────┐                   │
                                  │ 5. Provider Reminders   │◄──────────────────┤
                                  │ Idempotent Push / Mock  │                   │
                                  └─────────────────────────┘                   ▼
                                  ┌─────────────────────────┐       ┌─────────────────────────┐
                                  │ 6. Adherence Formula    │◄──────┤ 4. Dose Timeline Events │
                                  │ (Taken/Past Due) × 100  │ Logs  │ Taken / Skipped / Missed│
                                  │ Medical Safety Advisory │       │ Audited Dose Corrections│
                                  └─────────────────────────┘       └─────────────────────────┘
```

### 1. Medication Confirmation (`/medications/confirm`)
- **Strict Separation of Data Layers**: Preserves raw prescription text, AI candidate proposals, user corrections, and final verified active records in isolated database columns.
- **Visual Distinction**: User-corrected medication attributes display clear amber "User Corrected" badges versus cyan "Prescription Extracted" badges.
- **Mandatory User Certification**: Unreviewed or unconfirmed extractions can never be automatically activated. The user must explicitly certify accuracy against their original prescription before schedules are committed.
- **Safety Directive**: Never invents missing instructions or recommends dosage alterations.

### 2. Medication Dashboard (`/medications`)
- **Status Lifecycle**: Distinct management for `Active`, `Paused`, `Completed`, and `Discontinued` courses.
- **Next Dose Intelligence**: Dynamically computes next scheduled dose from active schedule instances.
- **Audited Status Transitions**: Modals for pausing, resuming, or discontinuing courses require confirmation and record mandatory audit reason strings.
- **Historical Immutability**: Schedule updates increment `schedule_version` and preserve historical dose events without deletion or overwriting.

### 3. Deterministic Scheduling Engine (`/medications/schedule`)
- **LLM Prohibited for Schedule Calculations**: Administration times and intervals are strictly computed using validated clinical algorithms in `DeterministicScheduler`, completely avoiding generative AI hallucination.
- **Ambiguity Detection**: Non-specific directions (e.g. "PRN", "as needed", "as directed") automatically flag `is_ambiguous=True` and pause activation, returning HTTP 422 to solicit explicit patient or pharmacist clarification.
- **Timezone Awareness**: All schedule calculations accept user local timezones (e.g. `Asia/Kolkata`, `America/New_York`), persist scheduled dose instances in ISO UTC, and render localized times.
- **Pre-Activation Review Screen**: Users review all generated timing slots, frequency, duration, and reminder preferences before committing.

### 4. Dose Tracking & Adherence Formula (`/adherence`)
- **Documented Mathematical Formula**:
  $$\text{Adherence Rate \%} = \left(\frac{\text{Taken Doses}}{\text{Total Past Due Doses}}\right) \times 100$$
  where $\text{Total Past Due Doses} = \text{Taken} + \text{Missed} + \text{Skipped}$. Future scheduled doses are strictly excluded from the calculation.
- **No Inferred Adherence**: Doses not logged by patients are marked as overdue or missed according to schedule rules, never assumed to be taken.
- **Audited Accidental Corrections**: Patients can correct mistakenly marked doses via `/api/v1/medications/doses/{id}/correct`. The system preserves `original_status`, stamps `corrected_at`, and requires a `correction_reason` audit log.
- **CRITICAL CLINICAL SAFETY ADVISORY**:
  > **Medical Safety Guidance**: *Never take a double or extra dose to make up for a missed or skipped dose. Taking excess medication can cause dangerous adverse reactions. If a dose is missed, follow specific clinician instructions or consult your doctor or pharmacist.*

### 5. Pluggable Reminder Service
- **Provider Abstraction** (`app/services/reminders`):
  - `BaseReminderProvider`: Common interface for queuing, dispatching, and cancelling reminder alerts.
  - `MockReminderProvider`: Deterministic local provider clearly labeled with `is_mock: True` to prevent false reporting when external SMS/push credentials are unconfigured.
- **Deduplication & State Machine**: Tracks reminder jobs through `pending`, `sent`, `failed`, and `cancelled` states.
- **Course Status Sync**: Pausing or discontinuing a medication automatically cancels all pending reminder jobs for that schedule.

### 6. Database Migration 4 (`20261014000004_medication_management_and_reminders.sql`)
- Adds `formulation`, `route`, `status`, `original_source_text`, and `is_user_edited` to `medications`.
- Adds `timezone`, `schedule_version`, and `reminder_offset_minutes` to `medication_schedules`.
- Adds `corrected_at`, `original_status`, and `correction_reason` to `dose_events` with unique constraint on `(schedule_id, scheduled_for)`.
- Creates `reminder_jobs` table with Row Level Security (RLS) policies enforcing complete user isolation.

---

---

## 📅 Appointments, Calendar & Healthcare Visit Notes (Step 6)

MediMate includes an end-to-end, patient-centric appointment and clinical visit management system with calendar integration, conflict detection, and structured healthcare visit notes:

```text
┌─────────────────────────┐       ┌─────────────────────────┐       ┌─────────────────────────┐
│ 1. Booking / Directory  │ Valid │ 2. Conflict Engine      │ Warn  │ 3. Appointments Hub     │
│ Verified Doctor Direct. ├──────►│ Overlap Detection Check ├──────►│ List & Monthly Calendar │
│ or Custom Practitioner  │ Pass  │ (Override with Audit)   │ Gate  │ (Upcoming & Past Views) │
└─────────────────────────┘       └─────────────────────────┘       └───────────┬─────────────┘
                                                                                │
                                  ┌─────────────────────────┐                   │
                                  │ 5. RFC 5545 Calendar    │◄──────────────────┤
                                  │ .ics Export (Escaped)   │                   │
                                  │ Local Sync Disclosure   │                   ▼
                                  └─────────────────────────┘       ┌─────────────────────────┐
                                  ┌─────────────────────────┐       │ 4. Patient Visit Notes  │
                                  │ 6. Appointment Reminders│◄──────┤ Purpose, Questions,     │
                                  │ 24h & 1h Config Offsets │ Logs  │ Personal Observations   │
                                  │ Automatic Cancel on Resch│      │ (Non-Clinical Record)   │
                                  └─────────────────────────┘       └─────────────────────────┘
```

### 1. Appointment Dashboard (`/appointments`)
- **Dual Perspectives**: Toggle seamlessly between **List View** (detailed patient cards matching Screen 8) and **Monthly Calendar View** (interactive agenda grid with day indicators).
- **Core Filters & Metrics**: Filter by Doctor, Medical Speciality, Visit Type (`In-Person` vs `Online`), and Status (`Upcoming`, `Completed`, `Rescheduled`, `Cancelled`). Real-time statistic counters for Total, Upcoming, Completed, and Cancelled bookings.
- **Provider Transparency**: Transparently badges bookings as `User-Managed` so patients are clearly aware that appointments are organized within MediMate AI rather than externally booked into an unconfigured hospital EHR.

### 2. Clinical Directory vs. User-Created Doctors
- **Isolated Directory Layer**: Pre-seeded directory of verified clinicians (`Dr. R. Mehta`, `Dr. S. Kumar`, `Dr. Lakshmi Prasad`, `Dr. Jennifer Davis`, `Dr. Anand Verma`) kept strictly separate from custom patient-entered doctor names.
- **Verification Badging**: Directory doctors receive a verified clinician badge (`ShieldCheck`), while custom doctors are clearly identified as patient-entered.

### 3. Conflict Detection & Overlapping Booking Warnings
- **Time-Span Overlap Engine**: Automatically inspects the user's active schedule on the target date. If a new appointment interval $[t_{\text{start}}, t_{\text{end}}]$ intersects an existing active booking, the engine returns HTTP 409 Conflict with details of the overlapping visit.
- **Patient Autonomy Override**: Patients can review the conflict alert and choose to acknowledge and schedule anyway (`allow_overlap=True`), recording an intentional override.

### 4. Calendar Integration & RFC 5545 `.ics` Export
- **Monthly Calendar Grid**: Navigate across months (`< September 2025 >`), with color-coded status dots and selected-day agenda lists.
- **Standardized iCalendar Generation**: Downloads standard `.ics` files compliant with RFC 5545 (`DTSTART`, `DTEND`, `UID`, `SUMMARY`, `LOCATION`, `DESCRIPTION`, and character escaping for `\,`, `\;`, and `\n`).
- **Sync Transparency**: Explicitly discloses that the calendar file is exported locally and direct cloud synchronization (Google Calendar / Apple iCloud / Outlook API) is unconfigured.

### 5. Patient Healthcare Visit Notes & Medical Safety
- **Structured Preparation**:
  - `visit_purpose`: Chief complaint or reason for visit.
  - `questions_to_ask`: Interactive checklist of questions the patient prepared for their doctor.
  - `personal_notes`: Private observations and reminders.
  - `follow_up_instructions`: Patient-recorded instructions following consultation.
- **Medical Disclaimer**:
  > **Patient Notes Disclaimer**: *Patient Visit Notes are private personal notes recorded by you for personal health organization. They do not constitute official clinical medical records or doctor prescriptions.*

### 6. Appointment Reminders & Lifecycle Integration
- **Reminder Offsets**: Configurable reminder alerts (e.g. 24 hours and 1 hour prior to appointment).
- **State Machine Synchronization**: Rescheduling an appointment automatically recalculates reminder timestamps; cancelling an appointment automatically cancels all pending reminder jobs in `reminder_jobs`.

### 7. Database Migration 5 (`20261015000005_appointments_calendar_and_notes.sql`)
- Adds `duration_minutes`, `visit_type`, `clinic_name`, `clinic_phone`, `clinic_email`, `clinic_address`, `teleconsult_url` to `appointments`.
- Adds `is_locally_managed` and `is_verified_doctor` flags.
- Adds `reminder_offsets`, `visit_purpose`, `questions_to_ask` (JSONB), `personal_notes`, `follow_up_instructions`, and `history` (JSONB audit trail).
- Enforces Row-Level Security (RLS) policies for complete cross-user isolation.

---

## 🧪 Automated Testing

MediMate includes 42 comprehensive automated backend tests covering authentication, OCR ingestion, clinical safety rules, deterministic medication scheduling, adherence calculations, appointment management, overlap warnings, and user data isolation.

To execute the test suite:
```bash
cd backend
python -m pytest tests/ -v
```

### Complete Test Coverage Matrix (42 Passed):
- **Appointments & Calendar (`test_appointments.py`)**:
  - ✅ `test_get_appointments_scoped_to_user` (Tenant isolation)
  - ✅ `test_get_doctors_directory` (Verified directory separation)
  - ✅ `test_create_appointment_success` (Creation with visit notes & reminders)
  - ✅ `test_create_appointment_invalid_date_or_time` (Rejects invalid dates/times)
  - ✅ `test_overlapping_appointment_warning_and_override` (Conflict detection & override)
  - ✅ `test_edit_appointment_and_visit_notes` (Visit notes CRUD & audit trail)
  - ✅ `test_reschedule_appointment_audit_log` (Rescheduling & reminder sync)
  - ✅ `test_cancel_appointment_and_cancel_reminders` (Cancellation & reminder cleanup)
  - ✅ `test_calendar_month_summary` (Calendar monthly aggregation)
  - ✅ `test_ics_export_generation_and_escaping` (RFC 5545 format & escaping)
  - ✅ `test_cross_user_appointment_isolation` (Blocks unauthorized access)
- **Authentication & Authorization (`test_auth.py`)**:
  - ✅ `test_health_check_unauthenticated`
  - ✅ `test_protected_route_missing_token_production`
  - ✅ `test_protected_route_invalid_token`
  - ✅ `test_protected_route_expired_token`
  - ✅ `test_protected_route_valid_token`
  - ✅ `test_appointments_scoped_to_authenticated_user`
  - ✅ `test_demo_mode_fallback`
- **Medication Scheduling & Adherence (`test_medications_scheduling.py`)**:
  - ✅ `test_create_and_confirm_medication` (Verified candidate activation)
  - ✅ `test_ambiguous_schedule_rejected` (Ambiguous PRN/as needed instructions reject automatic activation)
  - ✅ `test_invalid_schedule_time_format` (Rejects malformed time strings)
  - ✅ `test_timeline_timezone_conversion` (Validates UTC/local date conversion)
  - ✅ `test_dose_event_idempotency` (Guarantees no duplicate dose events for same scheduled slot)
  - ✅ `test_dose_correction_audit` (Audited accidental dose correction with preserved history)
  - ✅ `test_medication_pause_resume_discontinue` (Lifecycle state transitions and reminder cancellation)
  - ✅ `test_reminder_queue_mock_provider` (Reminder dispatch and mock safety labeling)
  - ✅ `test_user_data_isolation` (Cross-user access blocking on medication records)
  - ✅ `test_adherence_calculation_formula` (Strict mathematical adherence computation)
- **Prescription OCR & AI Extraction (`test_prescriptions_ocr.py`)**:
  - ✅ `test_upload_valid_image_png`, `test_upload_valid_pdf`, `test_upload_valid_webp`
  - ✅ `test_upload_unsupported_file_extension` & `test_upload_unsupported_mime_type`
  - ✅ `test_upload_empty_file` & `test_upload_oversized_file` (> 10MB rejection)
  - ✅ `test_blurry_illegible_prescription` (Flags unclear fields with clinician safety advisory)
  - ✅ `test_conflicting_instructions_prescription` (Identifies contradictory dosage)
  - ✅ `test_missing_instructions_prescription` (Flags missing frequency/duration)
  - ✅ `test_multiple_medications_extraction` (Multi-drug extraction)
  - ✅ `test_cross_user_prescription_access_blocked` (Tenant isolation)
  - ✅ `test_save_corrections_draft_and_confirmation` (Draft persistence & schedule generation)
  - ✅ `test_unconfirmed_prescription_cannot_activate_without_acknowledgement` (Zero unreviewed activations)

---

## 🤖 Secure AI Healthcare Assistant (Step 7)

MediMate includes a conversational healthcare assistant (`/assistant`) engineered with strict clinical safety guardrails, personalized context scoping, and verified medical literature citations.

```text
┌─────────────────────────┐
│ User Query              │
└────────────┬────────────┘
             │
             ▼
┌────────────────────────────────────────────────────────┐
│ 1. Safety Guardrails & Emergency Detection             │
│    • Acute red-flags (Chest pain, Stroke, Anaphylaxis) ├──► [Immediate 911 / 112 Alert]
│    • Suicide / Crisis Lifeline detection (988)        │     (No LLM delay)
│    • Missed-dose rule ("Never double up")             │
│    • Prompt injection sanitization                     │
└────────────┬───────────────────────────────────────────┘
             │ (Safe query)
             ▼
┌────────────────────────────────────────────────────────┐
│ 2. Scoped Patient Context & Medical Monograph Retrieval│
│    • Active confirmed medications & directions         │
│    • Upcoming doctor appointments                      │
│    • Authoritative monographs (MedlinePlus, FDA DailyMed)
│    • Strict tenant isolation (auth.uid() = user_id)    │
└────────────┬───────────────────────────────────────────┘
             │
             ▼
┌────────────────────────────────────────────────────────┐
│ 3. Configurable LLM Provider Engine                    │
│    • Gemini / OpenAI / Groq / Deterministic Mock      │
│    • Server-Sent Events (SSE) Streaming                │
│    • Transparent mock disclosure (is_mock=True)        │
└────────────┬───────────────────────────────────────────┘
             │
             ▼
┌────────────────────────────────────────────────────────┐
│ 4. Conversational Persistence & Client Interface       │
│    • Multi-turn chat drawer with rename/delete         │
│    • Verified medical citation accordion               │
│    • Non-duplicating retry & stop generation control   │
└────────────────────────────────────────────────────────┘
```

### 1. Medical Safety Guardrails & Disclaimers
- **No Medical Diagnosis or Prescribing**: The assistant provides health education, medication schedule organization, and consultation preparation only. It never issues diagnoses or modifies prescription dosages.
- **Deterministic Emergency Red-Flag Triage**:
  - Automatically identifies symptoms of myocardial infarction, acute stroke (FAST criteria), anaphylaxis, airway compromise, severe hemorrhage, and active crisis / suicidal ideation.
  - Immediately short-circuits the interaction with verified emergency dispatch numbers (**911**, **112**, **999**, **988**) without waiting for an LLM response.
- **Missed Dose Protocol**:
  - Strictly enforces the universal clinical directive: *"Never take a double or extra dose to make up for a missed dose."*
- **Adversarial Prompt Injection Defense**:
  - Sanitizes incoming prompts, strips malicious control tokens, and isolates untrusted user queries from system directives.

### 2. Authoritative Medical References & Citation Integrity
- Incorporates official public health monographs from:
  - **MedlinePlus (U.S. National Library of Medicine / NIH)**
  - **FDA DailyMed (U.S. Food and Drug Administration)**
  - **NHS Medicines A-Z (UK National Health Service)**
  - **NIH Office of Dietary Supplements (ODS)**
- Every claim is tied to a verified citation object containing the exact title, primary agency source, public URL, retrieval timestamp, and excerpt.
- When an unconfigured substance is queried, the assistant transparently declares that external verification is unavailable rather than fabricating citations.

### 3. API Endpoints (`/api/v1/assistant`)
- `GET /api/v1/assistant/conversations`: Lists user conversations ordered by last update.
- `POST /api/v1/assistant/conversations`: Creates a new conversation thread.
- `GET /api/v1/assistant/conversations/{id}`: Loads conversation detail and complete message history.
- `PATCH /api/v1/assistant/conversations/{id}`: Renames a conversation thread.
- `DELETE /api/v1/assistant/conversations/{id}`: Deletes a conversation and its messages.
- `DELETE /api/v1/assistant/conversations/{id}/clear`: Clears conversation messages while retaining the thread.
- `POST /api/v1/assistant/conversations/{id}/messages`: Dispatches user query (supports `stream: true` for Server-Sent Events).
- `POST /api/v1/assistant/conversations/{id}/retry`: Retries the last assistant turn without duplicating user messages.
- `GET /api/v1/assistant/suggested-prompts`: Returns curated clinical starter prompts.

### 4. Automated Test Suite (61 Total Passing Tests)
- **AI Healthcare Assistant (`test_assistant.py` — 19 Tests)**:
  - ✅ `test_mock_llm_provider_transparent_disclosure` (Validates `is_mock=True` and model naming)
  - ✅ `test_missing_credentials_graceful_fallback` (Safe fallback to mock provider when API keys are absent)
  - ✅ `test_emergency_chest_pain_triage` (Immediate red alert on chest pain)
  - ✅ `test_emergency_stroke_symptoms` (Immediate red alert on stroke symptoms)
  - ✅ `test_emergency_suicide_crisis_triage` (Immediate 988 Crisis Lifeline alert)
  - ✅ `test_routine_question_not_flagged_as_emergency` (Normal queries proceed without false alarms)
  - ✅ `test_missed_dose_prohibits_double_dose` (Strict "never double dose" enforcement)
  - ✅ `test_prompt_injection_sanitization` (Neutralizes adversarial prompt injection attempts)
  - ✅ `test_known_drug_citation_integrity` (Verified MedlinePlus/FDA DailyMed citations with valid URLs)
  - ✅ `test_unconfigured_substance_no_hallucinated_citation` (Zero fabricated citations)
  - ✅ `test_scoped_context_isolation` (Minimum necessary context without data leakage)
  - ✅ `test_create_and_list_conversations` (CRUD lifecycle for conversation threads)
  - ✅ `test_cross_user_conversation_isolation` (Blocks unauthorized cross-user access)
  - ✅ `test_send_message_with_citations_and_disclaimer` (Message dispatch with citations and disclaimers)
  - ✅ `test_send_emergency_message_endpoint` (Endpoint returns `is_emergency=True`)
  - ✅ `test_streaming_sse_response` (Server-Sent Events streaming with `start`, `chunk`, and `done` frames)
  - ✅ `test_retry_turn_prevents_duplicate_user_messages` (Clean retries without message duplication)
  - ✅ `test_get_suggested_prompts` (Returns required 5 clinical starter questions)
  - ✅ `test_no_credential_leakage_in_responses` (Guarantees zero API keys or secrets in responses)
- **Appointments & Calendar Management (`test_appointments.py` — 11 Tests)**: 100% passing.
- **Authentication & Authorization (`test_auth.py` — 7 Tests)**: 100% passing.
- **Medication Scheduling & Adherence (`test_medications_scheduling.py` — 10 Tests)**: 100% passing.
- **Prescription OCR & AI Extraction (`test_prescriptions_ocr.py` — 14 Tests)**: 100% passing.

---

## 🔒 Demo Mode Notice

The application runs in visual development **Demo Mode** with realistic clinical data matching the reference document (Patient Priya Sharma, Dr. R. Mehta, Dr. S. Kumar, Metformin 500mg, Atorvastatin 10mg, Vitamin D3 1000IU). Simulated AI scanning, medication status toggles, schedule creation, appointment booking, calendar export, and conversational assistant responses are fully interactive without requiring active third-party API keys upfront.




