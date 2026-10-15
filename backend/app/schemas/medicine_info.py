from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class MedicineSourceMetadata(BaseModel):
    source_name: str = Field(..., description="Authoritative health agency or database name")
    source_url: Optional[str] = Field(None, description="Direct URL to official monograph or leaflet")
    retrieved_at: str = Field(..., description="Timestamp when data was retrieved or verified")
    is_cached: bool = Field(False, description="Whether this response was served from cache")
    cache_expires_at: Optional[str] = Field(None, description="Cache expiration timestamp")
    licensing_notice: str = Field(
        "Public domain U.S. government medical monograph or openFDA documented public health data.",
        description="Data terms and usage disclosure"
    )

class MedicineDetailProfile(BaseModel):
    id: str
    name: str
    generic_name: Optional[str] = None
    brand_names: List[str] = Field(default_factory=list)
    active_ingredients: List[str] = Field(default_factory=list)
    category: str
    strength_options: List[str] = Field(default_factory=list)
    formulations: List[str] = Field(default_factory=list)
    routes: List[str] = Field(default_factory=list)
    overview: str
    approved_uses: List[str] = Field(default_factory=list)
    common_side_effects: List[str] = Field(default_factory=list)
    warnings_and_precautions: List[str] = Field(default_factory=list)
    contraindications: List[str] = Field(default_factory=list)
    storage_and_handling: Optional[str] = None
    patient_leaflet_url: Optional[str] = None
    source: MedicineSourceMetadata
    is_verified_source: bool = True

class MedicineSearchItem(BaseModel):
    id: str
    name: str
    generic_name: Optional[str] = None
    brand_names: List[str] = Field(default_factory=list)
    category: str
    snippet: str
    source_name: str

class MedicineSearchResponse(BaseModel):
    query: str
    total_results: int
    results: List[MedicineSearchItem]
    suggestions: List[str] = Field(default_factory=list)

class DrugInteractionItem(BaseModel):
    id: str
    medication_a: str
    medication_b: str
    severity: str = Field(..., description="'Major' | 'Moderate' | 'Minor' | 'Duplicate Active Ingredient'")
    clinical_effect: str = Field(..., description="Mechanism and physiological consequences of combination")
    management_advice: str = Field(..., description="Recommended clinical precaution or scheduling adjustment")
    source: MedicineSourceMetadata

class InteractionCheckRequest(BaseModel):
    medication_names: Optional[List[str]] = Field(
        None,
        description="Optional explicit list of medications. If omitted, checks user's confirmed active medications."
    )
    additional_medication: Optional[str] = Field(
        None,
        description="Optional new or OTC medication candidate to evaluate against current regimen."
    )

class InteractionCheckResponse(BaseModel):
    patient_active_medications: List[str]
    checked_medications: List[str]
    interactions_found: List[DrugInteractionItem]
    has_major_interactions: bool = False
    has_duplicate_ingredients: bool = False
    safety_advisory: str
    disclaimer: str = (
        "Medical Notice: Automated interaction checks are informational aids and not a guarantee of safety. "
        "A missing warning does NOT prove a combination is safe. Do not stop or alter prescribed medications "
        "without consulting your doctor or pharmacist."
    )

class SearchHistoryItem(BaseModel):
    id: str
    query: str
    medicine_name: Optional[str] = None
    searched_at: str

class AIExplainRequest(BaseModel):
    topic: str = Field(..., description="'medicine_profile' | 'drug_interaction'")
    medicine_name: Optional[str] = None
    interaction_id: Optional[str] = None
    context_passage: str = Field(..., description="Exact verified source passage to explain in plain language")
    source_name: str
    source_url: Optional[str] = None

class AIExplainResponse(BaseModel):
    topic: str
    plain_language_explanation: str
    key_takeaways: List[str] = Field(default_factory=list)
    questions_for_pharmacist: List[str] = Field(default_factory=list)
    source: MedicineSourceMetadata
    disclaimer: str = (
        "This AI summary is for patient education only. It does not replace professional consultation "
        "with your pharmacist or prescribing physician."
    )

class SourceProviderMetadataDto(BaseModel):
    provider_name: str
    jurisdiction: str
    base_url: str
    is_live: bool
    requires_key: bool
    rate_limits: str
    terms_url: str
    last_sync: str
