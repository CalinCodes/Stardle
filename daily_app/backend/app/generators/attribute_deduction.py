"""
Attribute Deduction puzzle generator using Gemini.
Generates a 'mini-universe' of entities and their attributes for a given topic.
"""
import logging
from typing import Optional

from pydantic import BaseModel, Field

from app.services.gemini_client import GeminiClient

logger = logging.getLogger(__name__)


class AttributeEntity(BaseModel):
    name: str = Field(description="Name of the entity (e.g., 'Brazil')")
    attributes: dict[str, str] = Field(description="Dictionary of attribute keys to their string values")


class AttributeDeductionResponse(BaseModel):
    """Structured response from Gemini for an attribute deduction dataset."""
    attribute_keys: list[str] = Field(description="Ordered list of 4-6 attribute column names (e.g., ['Continent', 'Language', 'Hemisphere', 'Population Size'])")
    entities: list[AttributeEntity] = Field(description="List of 20-40 unique entities and their exact attribute values")


def generate_attribute_dataset(
    client: GeminiClient,
    model: str,
    topic_name: str,
    count: int = 30,
) -> Optional[AttributeDeductionResponse]:
    """
    Use Gemini to generate a mini-universe of entities for an Attribute Deduction game.
    """
    prompt = f"""Generate a dataset for a LoLdle-style deduction game about the topic "{topic_name}".

Rules:
- Select 4 to 6 defining attributes that apply to EVERY entity in this topic.
- Generate between {count-10} and {count+10} highly recognizable entities related to "{topic_name}".
- For each entity, provide its exact value for each of the selected attributes.
- Ensure values are standardized (e.g., if one entity's continent is 'North America', use exactly 'North America' for others in the same continent, not 'N. America').
- No duplicate entities.

Return the result strictly conforming to the JSON schema.
"""

    try:
        result = client.generate_structured(
            model=model,
            prompt=prompt,
            schema=AttributeDeductionResponse,
            temperature=0.7,
        )
        return result
    except Exception as e:
        logger.error(f"Failed to generate attribute dataset for topic '{topic_name}': {e}")
        return None


def create_attribute_deduction_puzzles(
    dataset: AttributeDeductionResponse,
    topic_slug: str,
    topic_name: str,
    max_attempts: int = 8,
) -> list[dict]:
    """
    Create puzzle payloads from the generated dataset.
    Every entity becomes its own puzzle answer, while the payload contains the full universe
    so the client/backend can validate and evaluate guesses.
    """
    puzzles = []
    
    # Normalize entity dictionary for O(1) lookup
    entities_dict = {}
    for entity in dataset.entities:
        # Standardize keys (e.g., lowercase for lookup)
        entities_dict[entity.name] = entity.attributes
    
    for entity in dataset.entities:
        puzzles.append({
            "payload": {
                "max_attempts": max_attempts,
                "attribute_keys": dataset.attribute_keys,
                "entities": entities_dict,  # The full universe
            },
            "solution": {
                "answer": entity.name,
            },
        })
        
    return puzzles
