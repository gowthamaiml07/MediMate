import {
  UserProfile,
  Medication,
  Prescription,
  Appointment,
  AdherenceData,
  ChatMessage,
  MedicineInfo,
  HealthRecord,
} from "@/types";

export const mockUser: UserProfile = {
  name: "Priya Sharma",
  email: "priya.sharma@example.com",
  role: "Patient",
  phone: "+1 (555) 234-5678",
  bloodGroup: "B+",
  emergencyContact: "+1 (555) 987-6543",
};

export const mockTodayMedications: Medication[] = [
  {
    id: "med-1",
    name: "Metformin",
    strength: "500mg",
    category: "Antidiabetic",
    instructions: "After food",
    frequency: "Twice daily",
    timing: "Morning",
    duration: "30 days",
    status: "Taken",
    scheduledTime: "08:00 AM",
    isTaken: true,
  },
  {
    id: "med-2",
    name: "Metformin",
    strength: "500mg",
    category: "Antidiabetic",
    instructions: "After food",
    frequency: "Twice daily",
    timing: "Afternoon",
    duration: "30 days",
    status: "Upcoming",
    scheduledTime: "01:00 PM",
    isTaken: false,
  },
  {
    id: "med-3",
    name: "Vitamin D3",
    strength: "1000 IU",
    category: "Vitamin & Supplement",
    instructions: "After food",
    frequency: "Once weekly",
    timing: "Evening",
    duration: "8 weeks",
    status: "Upcoming",
    scheduledTime: "08:00 PM",
    isTaken: false,
  },
  {
    id: "med-4",
    name: "Atorvastatin",
    strength: "10mg",
    category: "Cholesterol",
    instructions: "After food",
    frequency: "Once daily at night",
    timing: "Night",
    duration: "30 days",
    status: "Upcoming",
    scheduledTime: "10:00 PM",
    isTaken: false,
  },
];

export const mockSamplePrescription: Prescription = {
  id: "rx-sample-001",
  fileName: "prescription_dr_mehta_aug2025.png",
  uploadedAt: "28 Aug 2025, 10:45 AM",
  doctorName: "Dr. R. Mehta",
  speciality: "General Physician",
  date: "28 Aug 2025",
  patientName: "Priya Sharma",
  overallConfidence: 92,
  status: "Reviewed",
  medicines: [
    {
      id: "ex-1",
      name: "Metformin",
      strength: "500mg",
      frequency: "Twice daily after food",
      duration: "30 days",
      confidence: 95,
      instructions: "After food • Morning & Evening",
      needsConfirmation: false,
    },
    {
      id: "ex-2",
      name: "Atorvastatin",
      strength: "10mg",
      frequency: "Once daily at night",
      duration: "30 days",
      confidence: 92,
      instructions: "At bedtime with water",
      needsConfirmation: false,
    },
    {
      id: "ex-3",
      name: "Vitamin D3",
      strength: "1000IU",
      frequency: "Once weekly",
      duration: "8 weeks",
      confidence: 88,
      instructions: "With breakfast every Sunday",
      needsConfirmation: true,
    },
  ],
};

export const mockAppointments: Appointment[] = [
  {
    id: "apt-1",
    doctorName: "Dr. S. Kumar",
    speciality: "General Physician",
    date: "12 Sep 2025",
    time: "10:30 AM",
    status: "Upcoming",
    location: "Apollo Clinic, 3rd Floor, Room 302",
    notes: "Review recent HbA1c blood test results and check response to Metformin adjustment.",
  },
  {
    id: "apt-2",
    doctorName: "Dr. Lakshmi",
    speciality: "Cardiologist",
    date: "28 Sep 2025",
    time: "03:00 PM",
    status: "Upcoming",
    location: "Heart Care Institute, Wing B",
    notes: "Follow-up lipid profile and cardiovascular fitness check.",
  },
  {
    id: "apt-3",
    doctorName: "Follow-up Visit",
    speciality: "General Physician",
    date: "15 Oct 2025",
    time: "11:00 AM",
    status: "Upcoming",
    location: "Apollo Clinic",
    notes: "Routine quarterly evaluation and prescription renewal check.",
  },
  {
    id: "apt-4",
    doctorName: "Dr. R. Mehta",
    speciality: "General Physician",
    date: "28 Aug 2025",
    time: "10:00 AM",
    status: "Past",
    location: "Apollo Clinic",
    notes: "Prescribed Metformin, Atorvastatin and Vitamin D3.",
  },
];

export const mockAdherenceData: AdherenceData = {
  period: "1 Sep - 7 Sep 2025",
  adherenceRate: 78,
  taken: 22,
  missed: 2,
  skipped: 1,
  snoozed: 0,
  dailyBreakdown: [
    { day: "Mon", rate: 85, taken: 4, missed: 0 },
    { day: "Tue", rate: 100, taken: 4, missed: 0 },
    { day: "Wed", rate: 75, taken: 3, missed: 1 },
    { day: "Thu", rate: 100, taken: 4, missed: 0 },
    { day: "Fri", rate: 100, taken: 4, missed: 0 },
    { day: "Sat", rate: 50, taken: 2, missed: 1 },
    { day: "Sun", rate: 100, taken: 1, missed: 0 },
  ],
};

export const mockInitialMessages: ChatMessage[] = [
  {
    id: "msg-1",
    role: "user",
    content: "What is Metformin used for? Are there any common side effects?",
    timestamp: "10:14 AM",
  },
  {
    id: "msg-2",
    role: "assistant",
    content: `Metformin is a medicine used to help control blood sugar levels, mainly in type 2 diabetes. It works by improving how your body uses insulin.

**Common side effects (general):**
• Stomach upset
• Nausea
• Diarrhea

Note: This is general information. Your prescription and dosage may be different. Always follow your doctor's instructions.`,
    sources: [
      "Prescription #rx-sample-001 (Dr. R. Mehta)",
      "Official Clinical Drug Reference",
    ],
    timestamp: "10:14 AM",
  },
];

export const mockMedicineCatalogue: MedicineInfo[] = [
  {
    id: "med-info-1",
    name: "Metformin 500mg",
    brandNames: ["Glucophage", "Glycomet", "Fortamet"],
    category: "Oral Hypoglycemic",
    badge: "Antidiabetic",
    overview:
      "Metformin helps control blood sugar levels and improves insulin sensitivity. It reduces glucose production in the liver and absorption in the intestines.",
    sideEffects: [
      "Stomach upset or mild nausea",
      "Diarrhea or loose stools (usually temporary)",
      "Metallic taste in mouth",
      "Decreased appetite",
    ],
    precautions: [
      "Take with meals to minimize digestive side effects",
      "Avoid excessive alcohol consumption",
      "Inform your doctor if you have kidney or liver issues",
      "Stay well hydrated throughout the day",
    ],
    storage: "Store below 25°C away from moisture and direct sunlight.",
  },
  {
    id: "med-info-2",
    name: "Atorvastatin 10mg",
    brandNames: ["Lipitor", "Atorva", "Storvas"],
    category: "HMG-CoA Reductase Inhibitor",
    badge: "Cardiovascular",
    overview:
      "Atorvastatin belongs to the statin group of medicines. It works by lowering 'bad' LDL cholesterol and triglycerides in your blood, helping prevent cardiovascular events.",
    sideEffects: [
      "Mild muscle ache or joint discomfort",
      "Headache",
      "Mild digestive changes",
    ],
    precautions: [
      "Usually taken once daily at bedtime",
      "Avoid large amounts of grapefruit juice",
      "Report unexplained muscle tenderness promptly to your doctor",
    ],
    storage: "Store in a cool, dry place.",
  },
  {
    id: "med-info-3",
    name: "Vitamin D3 1000IU",
    brandNames: ["Cholecalciferol", "Calcirol", "D-Rise"],
    category: "Vitamin Supplement",
    badge: "Bone & Immunity",
    overview:
      "Vitamin D3 facilitates the absorption of calcium and phosphorus in the body. It helps build and maintain strong bones and supports immune system defense.",
    sideEffects: [
      "Generally very well tolerated at standard prescribed doses",
      "Excessive high doses over prolonged periods may cause hypercalcemia",
    ],
    precautions: [
      "Best absorbed when taken with meals containing healthy fats",
      "Do not double up doses if you miss a weekly pill",
    ],
    storage: "Store in airtight container protected from heat and light.",
  },
];

export const mockHealthRecords: HealthRecord[] = [
  {
    id: "rec-1",
    title: "Prescription - Dr. R. Mehta",
    type: "Prescription",
    doctor: "Dr. R. Mehta (General Physician)",
    date: "28 Aug 2025",
    fileSize: "1.4 MB",
    status: "Digitized & Verified",
  },
  {
    id: "rec-2",
    title: "HbA1c & Fasting Glucose Report",
    type: "Lab Report",
    doctor: "Quest Diagnostics Lab",
    date: "25 Aug 2025",
    fileSize: "840 KB",
    status: "Normal / Controlled",
  },
  {
    id: "rec-3",
    title: "Lipid Profile Panel Report",
    type: "Lab Report",
    doctor: "Apollo Diagnostics",
    date: "14 Jul 2025",
    fileSize: "620 KB",
    status: "Archived",
  },
  {
    id: "rec-4",
    title: "Annual Health Consultation Summary",
    type: "Consultation",
    doctor: "Dr. S. Kumar",
    date: "10 Jan 2025",
    fileSize: "1.1 MB",
    status: "Completed",
  },
];
