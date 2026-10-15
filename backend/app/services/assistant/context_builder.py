import logging
from typing import Dict, Any, List, Optional, Tuple
from app.services.medication_store import medication_store
from app.services.appointment_store import appointment_store
from app.services.assistant.medical_reference import MedicalReferenceService
from app.schemas.ai import CitationItem

logger = logging.getLogger("medimate.assistant.context")

class PatientContextBuilder:
    """
    Retrieves and prepares minimal, permission-checked clinical context for the authenticated user.
    Adheres strictly to the Minimum Necessary Context Principle:
    - Never dumps whole database or raw unreviewed documents.
    - Excludes other users' records, secret keys, internal IDs, and PII.
    - Accurately distinguishes between confirmed patient records and external medical literature.
    """

    @classmethod
    def build_user_context(
        cls,
        user_id: str,
        query: str
    ) -> Tuple[str, List[CitationItem], Dict[str, Any]]:
        """
        Retrieves context scoped strictly to user_id.
        Returns:
            (context_prompt_block: str, citations: List[CitationItem], metadata: Dict[str, Any])
        """
        query_lower = (query or "").lower()
        context_lines: List[str] = []
        citations: List[CitationItem] = []
        user_med_names: List[str] = []

        # 1. Fetch authenticated user's confirmed active medications
        try:
            active_meds = medication_store.list_medications(user_id=user_id, status_filter="Active")
        except Exception as e:
            logger.warning(f"Error fetching active medications for user {user_id}: {e}")
            active_meds = []

        # 2. Fetch authenticated user's upcoming appointments
        try:
            upcoming_apts = appointment_store.get_appointments(user_id=user_id, status_filter="Upcoming")
        except Exception as e:
            logger.warning(f"Error fetching appointments for user {user_id}: {e}")
            upcoming_apts = []

        # Determine context relevance
        mentions_medication = any(
            k in query_lower for k in ["medication", "medicine", "pill", "prescription", "dose", "side effect", "refill", "schedule", "rx", "reminder"]
        )
        mentions_appointment = any(
            k in query_lower for k in ["appointment", "doctor", "visit", "clinic", "hospital", "physician", "checkup", "consultation"]
        )

        # Context Section: Confirmed Medications
        med_summaries: List[str] = []
        if active_meds:
            for med in active_meds:
                user_med_names.append(med.name)
                # Check for query relevance or general profile
                is_relevant = (
                    mentions_medication 
                    or med.name.lower() in query_lower 
                    or not (mentions_appointment)
                )
                if is_relevant:
                    med_str = f"• {med.name} {med.strength or ''} ({med.formulation or 'Oral'}): {med.frequency or 'As directed'}, {med.timing_relation or 'With food'} - Instructions: '{med.instructions or 'Take as prescribed'}'"
                    med_summaries.append(med_str)
                    
                    # Check if authoritative monograph exists for this user medication
                    if med.name.lower() in query_lower or len(active_meds) <= 3:
                        cit = MedicalReferenceService.get_citation_by_med_name(med.name)
                        if cit and not any(c.title == cit.title for c in citations):
                            citations.append(cit)

        if med_summaries:
            context_lines.append("[CONFIRMED USER MEDICATIONS (ACTIVE)]")
            context_lines.extend(med_summaries)
        else:
            context_lines.append("[CONFIRMED USER MEDICATIONS]: No active confirmed medications recorded.")

        # Context Section: Upcoming Appointments
        apt_summaries: List[str] = []
        if upcoming_apts:
            for apt in upcoming_apts[:3]: # Cap to next 3 upcoming
                is_relevant = (
                    mentions_appointment
                    or (apt.doctor_name and apt.doctor_name.lower() in query_lower)
                    or not (mentions_medication)
                )
                if is_relevant:
                    apt_str = f"• {apt.appointment_date} at {apt.appointment_time} with {apt.doctor_name} ({apt.speciality or 'Specialist'}) at {apt.hospital or 'Clinic'} [{apt.visit_type or 'In-Person'}]"
                    apt_summaries.append(apt_str)

        if apt_summaries:
            context_lines.append("\n[UPCOMING SCHEDULED APPOINTMENTS]")
            context_lines.extend(apt_summaries)
        elif mentions_appointment:
            context_lines.append("\n[UPCOMING SCHEDULED APPOINTMENTS]: No upcoming appointments scheduled.")

        # 3. Retrieve authoritative medical citations for terms in query
        query_citations, monograph_passages = MedicalReferenceService.search_monographs(query)
        for qc in query_citations:
            if not any(c.title == qc.title for c in citations):
                citations.append(qc)

        if monograph_passages:
            context_lines.append(f"\n[VERIFIED AUTHORITATIVE MEDICAL MONOGRAPHS]\n{monograph_passages}")
        else:
            context_lines.append("\n[VERIFIED AUTHORITATIVE MEDICAL MONOGRAPHS]: No specific monograph matched in the local catalog. External medical verification unavailable for this query.")

        context_prompt_block = "\n".join(context_lines)
        metadata = {
            "active_medication_count": len(active_meds),
            "upcoming_appointment_count": len(upcoming_apts),
            "citations_found": len(citations),
            "user_med_names": user_med_names
        }

        return context_prompt_block, citations, metadata
