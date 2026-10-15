from fastapi import APIRouter
from app.api.v1.endpoints import (
    health,
    auth,
    prescriptions,
    medications,
    appointments,
    ai_chat,
    doctor_summary
)

api_router = APIRouter()

api_router.include_router(health.router, tags=["Health"])
api_router.include_router(auth.router, prefix="/auth", tags=["Auth"])
api_router.include_router(prescriptions.router, prefix="/prescriptions", tags=["Prescriptions"])
api_router.include_router(medications.router, prefix="/medications", tags=["Medications"])
api_router.include_router(appointments.router, prefix="/appointments", tags=["Appointments"])
api_router.include_router(ai_chat.router, prefix="/ai", tags=["AI Assistant"])
api_router.include_router(doctor_summary.router, prefix="/doctor", tags=["Doctor Summary"])
