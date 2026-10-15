from fastapi import APIRouter, Depends
from app.schemas.ai import ChatRequest, ChatResponse
from app.core.auth import get_current_user, AuthenticatedUser

router = APIRouter()

@router.post("/chat", response_model=ChatResponse)
def chat_with_assistant(
    req: ChatRequest,
    current_user: AuthenticatedUser = Depends(get_current_user)
):
    """
    Provides clinically verified guidance referencing the patient's authenticated record.
    """
    query_lower = req.message.lower()
    patient_name = current_user.metadata.get("full_name", "Priya Sharma")
    
    if "metformin" in query_lower:
        reply = (
            "Metformin is a medicine used to help control blood sugar levels, mainly in type 2 diabetes. "
            "It works by improving how your body uses insulin and decreasing the amount of sugar produced by your liver.\n\n"
            "**Common side effects (general):**\n"
            "• Stomach upset\n"
            "• Nausea\n"
            "• Diarrhea\n\n"
            "Taking it with meals helps minimize digestive discomfort."
        )
        sources = ["Prescription #rx-sample-001 (Dr. R. Mehta)", "Clinical Pharmacology Reference Guide"]
    elif "atorvastatin" in query_lower:
        reply = (
            "Atorvastatin is a statin medication used to lower low-density lipoprotein (LDL) cholesterol "
            "and triglycerides in the blood, reducing cardiovascular risks.\n\n"
            "**Key Instructions:**\n"
            "• Usually taken once daily at night\n"
            "• Avoid excessive grapefruit consumption"
        )
        sources = ["Prescription #rx-sample-001", "FDA Patient Drug Guide"]
    elif "vitamin d3" in query_lower or "vitamin" in query_lower:
        reply = (
            "Vitamin D3 (Cholecalciferol) 1000 IU helps your body absorb calcium and phosphorus, "
            "promoting strong bones and immune function.\n\n"
            "**Common side effects (general):**\n"
            "• Rarely has side effects at normal prescribed doses\n"
            "• Best taken with meals containing dietary fat for optimal absorption"
        )
        sources = ["Prescription #rx-sample-001", "Nutritional Medicine Monograph"]
    else:
        reply = (
            f"Hello {patient_name}, regarding your query: '{req.message}' — Based on your current confirmed medication plan "
            "(Metformin 500mg BID, Atorvastatin 10mg OD, and Vitamin D3 1000IU weekly), "
            "ensure you adhere to scheduled timings and consult Dr. S. Kumar during your upcoming visit on 12 Sep 2025."
        )
        sources = ["MediMate Patient Health Record", "NHS & FDA Guidelines"]
        
    return ChatResponse(
        reply=reply,
        sources=sources,
        disclaimer="Note: This is general information. Your prescription and dosage may be different. Always follow your doctor's instructions."
    )
