from abc import ABC, abstractmethod
from typing import List, Optional
from app.schemas.medicine_info import (
    MedicineDetailProfile,
    MedicineSearchItem,
    DrugInteractionItem
)

class BaseMedicineProvider(ABC):
    @abstractmethod
    async def search(self, query: str) -> List[MedicineSearchItem]:
        """Searches medicine database by brand or generic name."""
        pass

    @abstractmethod
    async def get_profile(self, identifier: str) -> Optional[MedicineDetailProfile]:
        """Retrieves verified detailed medicine monograph profile."""
        pass

    @abstractmethod
    async def check_interactions(self, drugs: List[str]) -> List[DrugInteractionItem]:
        """Evaluates pairwise drug-drug and drug-substance interactions."""
        pass
