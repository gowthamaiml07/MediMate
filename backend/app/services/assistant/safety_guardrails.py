import re
from typing import Tuple, Optional, List

class SafetyGuardrails:
    """
    Deterministic safety guardrail engine for MediMate AI.
    Executes BEFORE and INDEPENDENTLY of LLM generation to detect:
    1. Acute medical emergencies / red-flag symptoms
    2. Missed dose queries requiring strict 'never double-dose' guidance
    3. Adversarial prompt injection attacks
    4. Diagnostic / prescribing boundary enforcement
    """

    # Comprehensive emergency pattern sets
    EMERGENCY_PATTERNS = [
        # Cardiac & Severe Chest Pain
        r"\b(crushing|severe|radiating|squeezing)\s+chest\s+pain\b",
        r"\b(chest\s+pain|angina|heart\s+attack|cardiac\s+arrest)\b",
        r"\b(chest\s+tightness|chest\s+pressure)\s+and\s+(shortness\s+of\s+breath|sweating|jaw\s+pain|left\s+arm\s+pain)\b",
        
        # Stroke / Cerebrovascular Signs (FAST criteria)
        r"\b(facial\s+droop(ing)?|face\s+droop(ing)?|drooping\s+face)\b",
        r"\b(slurred\s+speech|cannot\s+speak|unable\s+to\s+speak|difficulty\s+speaking)\b",
        r"\b(arm\s+weakness|leg\s+weakness|one-sided\s+weakness|hemiparesis|numbness\s+on\s+one\s+side)\b",
        r"\b(sudden\s+loss\s+of\s+vision|sudden\s+blindness)\b",
        
        # Anaphylaxis / Airway Compromise
        r"\b(throat\s+swelling|swollen\s+throat|throat\s+closing|tongue\s+swelling|swollen\s+tongue)\b",
        r"\b(anaphylaxis|anaphylactic\s+shock)\b",
        r"\b(hives|rash)\s+and\s+(trouble\s+breathing|wheezing|throat\s+tightness|stridor)\b",
        r"\b(can'?t\s+breathe|gasping\s+for\s+air|severe\s+shortness\s+of\s+breath|choking)\b",
        
        # Severe Hemorrhage & Trauma
        r"\b(coughing\s+up\s+blood|hemoptysis)\b",
        r"\b(vomiting\s+blood|hematemesis|black\s+tarry\s+stool)\b",
        r"\b(uncontrolled\s+bleeding|severe\s+blood\s+loss)\b",
        
        # Acute Poisoning / Overdose
        r"\b(swallowed\s+poison|took\s+an\s+entire\s+bottle|overdose|drank\s+bleach|ingested\s+battery)\b",
        
        # Crisis / Self-Harm / Suicide
        r"\b(want\s+to\s+kill\s+myself|want\s+to\s+die|suicide|commit\s+suicide|end\s+my\s+life|ending\s+my\s+life)\b",
        r"\b(feel\s+like\s+hurting\s+myself|overdosing\s+on\s+pills\s+on\s+purpose)\b"
    ]

    # Missed dose query patterns
    MISSED_DOSE_PATTERNS = [
        r"\bmissed\s+(a\s+|my\s+)?(dose|pill|medication|tablet)\b",
        r"\bforgot\s+(to\s+take|my)\s+(dose|pill|medication|medicine|tablet)\b",
        r"\bcan\s+i\s+(take\s+two|double\s+up|double\s+the\s+dose|take\s+double)\b",
        r"\bshould\s+i\s+take\s+(two|double)\b",
        r"\bskipped\s+(a\s+|my\s+)?(dose|pill|medicine)\b"
    ]

    # Prompt injection / jailbreak patterns
    INJECTION_PATTERNS = [
        r"ignore\s+(all\s+)?(previous|prior|above)\s+instructions",
        r"system\s*override",
        r"you\s+are\s+now\s+(an\s+)?unrestricted",
        r"dan\s+mode",
        r"bypass\s+(medical\s+)?(guardrails|safety|rules)",
        r"reveal\s+(the\s+)?(system\s+prompt|developer\s+instructions|secret\s+key|api\s+key)",
        r"disregard\s+(the\s+)?(safety\s+filter|medical\s+guidelines)",
        r"pretend\s+you\s+are\s+a\s+licensed\s+medical\s+doctor\s+authorized\s+to\s+prescribe",
        r"diagnose\s+me\s+with\s+100%\s+certainty",
        r"tell\s+me\s+to\s+stop\s+taking\s+all\s+my\s+meds"
    ]

    @classmethod
    def check_emergency(cls, text: str) -> Tuple[bool, Optional[str]]:
        """
        Inspects message for acute red-flag symptoms requiring emergency intervention.
        Returns: (is_emergency: bool, emergency_response: Optional[str])
        """
        text_clean = (text or "").lower()
        
        for pattern in cls.EMERGENCY_PATTERNS:
            if re.search(pattern, text_clean, re.IGNORECASE):
                # Check for suicide crisis specifically
                if re.search(r"\b(kill\s+myself|want\s+to\s+die|suicide|end\s+my\s+life)\b", text_clean, re.IGNORECASE):
                    return True, (
                        "🚨 **IMMEDIATE CRISIS ASSISTANCE REQUIRED**\n\n"
                        "If you or someone you know is in distress or experiencing thoughts of self-harm, please reach out for immediate support. You are not alone.\n\n"
                        "• **United States / Canada:** Call or text **988** (Suicide & Crisis Lifeline, available 24/7, free and confidential)\n"
                        "• **United Kingdom:** Call **111** (NHS Mental Health Services) or text SHOUT to **85258**\n"
                        "• **India:** Call **112** (Emergency) or **9152987821** (iCall)\n"
                        "• **European Union:** Call **112**\n"
                        "• **International:** Go directly to your nearest hospital emergency room or contact your local emergency service.\n\n"
                        "MediMate AI is an educational assistant and cannot provide crisis intervention. Please connect with emergency services right away."
                    )
                
                # Physical medical emergency
                return True, (
                    "🚨 **MEDICAL EMERGENCY ALERT — SEEK IMMEDIATE EMERGENCY CARE**\n\n"
                    "The symptoms you described (such as severe chest pain, stroke signs, difficulty breathing, or severe hemorrhage) can indicate a life-threatening medical emergency.\n\n"
                    "**TAKE IMMEDIATE ACTION:**\n"
                    "• **Call emergency services immediately:** Dial **911** (US), **112** (EU / India), **999** (UK), or your local emergency number.\n"
                    "• Do **NOT** wait to see if symptoms improve.\n"
                    "• Do **NOT** rely on chatbot exchanges or online information.\n"
                    "• If you are alone, unlock your front door and inform a family member or neighbor while waiting for paramedics.\n\n"
                    "*MediMate AI is designed strictly for routine medication organization and health education. It cannot diagnose or manage medical emergencies.*"
                )

        return False, None

    @classmethod
    def check_missed_dose(cls, text: str) -> Tuple[bool, Optional[str]]:
        """
        Enforces strict clinical rule: NEVER recommend doubling up for a missed dose.
        """
        text_clean = (text or "").lower()
        for pattern in cls.MISSED_DOSE_PATTERNS:
            if re.search(pattern, text_clean, re.IGNORECASE):
                return True, (
                    "**Important Medication Safety Guidance on Missed Doses:**\n\n"
                    "• **NEVER take a double or extra dose to make up for a missed dose.** Taking double doses can cause dangerous drug accumulation or toxicity.\n"
                    "• **General Rule:** Take the missed dose as soon as you remember. However, if it is already close to the time for your next scheduled dose, **skip the missed dose** and resume your regular schedule.\n"
                    "• **Check Your Prescription Label:** Different medications (like blood thinners, insulin, antibiotics, or blood pressure medicines) have specific manufacturer guidelines for missed doses.\n"
                    "• **Contact Your Pharmacist or Doctor:** If you are unsure or missed multiple consecutive doses, contact your dispensing pharmacy or prescribing clinician for personalized instructions."
                )
        return False, None

    @classmethod
    def sanitize_input(cls, user_text: str) -> Tuple[str, bool]:
        """
        Detects prompt injection attempts and wraps untrusted user input safely.
        Returns: (sanitized_prompt: str, is_suspicious: bool)
        """
        text = user_text or ""
        text_lower = text.lower()
        is_suspicious = False

        for pattern in cls.INJECTION_PATTERNS:
            if re.search(pattern, text_lower, re.IGNORECASE):
                is_suspicious = True
                break

        # Strip null bytes and non-printable control characters (keep regular newlines/tabs)
        clean_text = "".join(ch for ch in text if ch == "\n" or ch == "\t" or (32 <= ord(ch) <= 126 or ord(ch) > 127))
        
        # Enforce character limit
        if len(clean_text) > 4000:
            clean_text = clean_text[:4000]

        return clean_text.strip(), is_suspicious

    @classmethod
    def get_system_safety_prompt(cls) -> str:
        """
        Defines the clinical boundaries and zero-hallucination instructions for LLM providers.
        """
        return """You are MediMate AI, a secure, compassionate healthcare assistant designed exclusively for health education, medication schedule organization, and doctor visit preparation.

CRITICAL MEDICAL SAFETY DIRECTIVES:
1. NO DIAGNOSIS: Never diagnose diseases, disorders, or conditions. If asked 'Do I have X?', explain what the condition generally is and advise consulting a healthcare professional for clinical evaluation.
2. NO PRESCRIBING OR DOSE ADJUSTMENT: Never prescribe medications. Never recommend starting, stopping, increasing, or decreasing a dose. Emphasize that all dosage modifications must be authorized by the prescribing clinician.
3. NEVER RECOMMEND DOUBLE DOSES: If asked about missed doses, strictly state: 'Never take a double or extra dose to make up for a missed dose.'
4. RESPECT CONFIRMED USER HEALTH RECORDS: Prioritize the patient's confirmed medications and upcoming appointments provided in the context. Clearly distinguish between confirmed patient records and general medical education.
5. NO INVENTING OR HALLUCINATING: Never fabricate citations, drug interactions, clinical trial results, or medical instructions. If information is unknown or unverified, state so explicitly.
6. CITATION INTEGRITY: When medical reference monographs are provided, reference the exact authoritative sources. If external monographs are not configured, explicitly mention that the guidance is general educational information not verified against an external reference.
7. CLEAR DISCLAIMER: MediMate AI provides health education and organizational assistance, not licensed medical advice."""
