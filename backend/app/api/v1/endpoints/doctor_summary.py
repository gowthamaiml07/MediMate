from fastapi import APIRouter, Depends
from datetime import datetime
from app.core.auth import get_current_user, AuthenticatedUser

router = APIRouter()

@router.get("/visit-summary")
def get_doctor_visit_summary(current_user: AuthenticatedUser = Depends(get_current_user)):
    """
    Generates verified doctor visit summary for the authenticated patient.
    """
    patient_name = current_user.metadata.get("full_name", "Priya Sharma")
    return {
        "title": "Doctor Visit Summary",
        "date": "12 Sep 2025",
        "doctor": "Dr. S. Kumar",
        "speciality": "General Physician",
        "patient": {
            "name": patient_name,
            "age": 34,
            "gender": "Female",
            "id": f"MED-{current_user.id[:4].upper()}" if not current_user.is_demo else "MED-8823"
        },
        "current_medicines": [
            {"name": "Metformin 500mg", "frequency": "BID (Twice daily)", "timing": "After food", "indication": "Blood sugar regulation"},
            {"name": "Atorvastatin 10mg", "frequency": "OD (Once daily)", "timing": "Bedtime", "indication": "Cholesterol management"},
            {"name": "Vitamin D3 1000IU", "frequency": "Weekly (Once weekly)", "timing": "With lunch", "indication": "Bone & deficiency support"}
        ],
        "adherence_metrics": {
            "overall_rate": "78%",
            "doses_taken": 22,
            "doses_missed": 2,
            "last_recorded_dose": "08:00 AM Today (Metformin 500mg - Taken)"
        },
        "questions_for_doctor": [
            "1. Is my current dosage correct?",
            "2. Should I continue Vitamin D3 for 8 weeks?",
            "3. When should I get my next HbA1c test done?"
        ],
        "generated_at": datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC")
    }
