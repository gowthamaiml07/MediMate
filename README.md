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

## 🧪 Automated Testing

MediMate includes 21 automated backend tests validating authentication, JWT verification, file upload constraints, OCR edge cases, medical safety rules, and cross-user data isolation.

To run the test suite:
```bash
cd backend
python -m pytest tests/ -v
```

Test coverage includes:
- ✅ `test_upload_valid_image_png`, `test_upload_valid_pdf`, `test_upload_valid_webp`
- ✅ `test_upload_unsupported_file_extension` & `test_upload_unsupported_mime_type`
- ✅ `test_upload_empty_file` & `test_upload_oversized_file` (> 10MB rejection)
- ✅ `test_blurry_illegible_prescription` (flags unclear fields and emits clinician safety advisory)
- ✅ `test_conflicting_instructions_prescription` (flags contradictory dosage)
- ✅ `test_missing_instructions_prescription` (identifies missing parameters)
- ✅ `test_multiple_medications_extraction` (multi-drug parsing)
- ✅ `test_cross_user_prescription_access_blocked` (User B cannot view, edit, or download User A's prescription)
- ✅ `test_save_corrections_draft_and_confirmation` (draft persistence & final schedule generation)
- ✅ `test_unconfirmed_prescription_cannot_activate_without_acknowledgement` (enforces medical safety certification)

---

## 🔒 Demo Mode Notice

The application runs in visual development **Demo Mode** with realistic clinical data matching the reference document (Patient Priya Sharma, Dr. R. Mehta, Dr. S. Kumar, Metformin 500mg, Atorvastatin 10mg, Vitamin D3 1000IU). Simulated AI scanning, medication status toggles, and chat responses are fully interactive without requiring active third-party API keys upfront.

