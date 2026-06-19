"""
Gemini API client wrapper with retry logic, structured output, and rate limiting.
Uses the google-genai SDK to access Gemini 3 models.
"""
import time
import logging
from typing import TypeVar

from pydantic import BaseModel

logger = logging.getLogger(__name__)
T = TypeVar("T", bound=BaseModel)

# Retry configuration
MAX_RETRIES = 3
BASE_DELAY = 1.0  # seconds
MAX_DELAY = 30.0


class GeminiClient:
    """Wrapper around the Google GenAI SDK with retries and structured output."""

    def __init__(self, api_key: str):
        from google import genai
        self.client = genai.Client(api_key=api_key)

    def generate_structured(
        self,
        model: str,
        prompt: str,
        schema: type[T],
        temperature: float = 0.7,
        max_retries: int = MAX_RETRIES,
    ) -> T:
        """
        Generate content using Gemini with structured JSON output.

        Args:
            model: Model identifier (e.g., 'gemini-3.5-flash')
            prompt: The generation prompt
            schema: Pydantic model class defining the expected response shape
            temperature: Generation temperature
            max_retries: Number of retry attempts

        Returns:
            Parsed Pydantic model instance
        """
        delay = BASE_DELAY

        for attempt in range(max_retries):
            try:
                response = self.client.models.generate_content(
                    model=model,
                    contents=prompt,
                    config={
                        "response_mime_type": "application/json",
                        "response_schema": schema,
                        "temperature": temperature,
                    },
                )
                return response.parsed

            except Exception as e:
                error_msg = str(e)
                logger.warning(
                    f"Gemini API call failed (attempt {attempt + 1}/{max_retries}): {error_msg}"
                )

                if attempt == max_retries - 1:
                    raise

                # Exponential backoff with jitter
                time.sleep(min(delay, MAX_DELAY))
                delay *= 2

    def generate_text(
        self,
        model: str,
        prompt: str,
        temperature: float = 0.7,
        max_retries: int = MAX_RETRIES,
    ) -> str:
        """
        Generate plain text content (for judge/validation passes).
        """
        delay = BASE_DELAY

        for attempt in range(max_retries):
            try:
                response = self.client.models.generate_content(
                    model=model,
                    contents=prompt,
                    config={"temperature": temperature},
                )
                return response.text

            except Exception as e:
                logger.warning(
                    f"Gemini text call failed (attempt {attempt + 1}/{max_retries}): {e}"
                )
                if attempt == max_retries - 1:
                    raise
                time.sleep(min(delay, MAX_DELAY))
                delay *= 2

        return ""  # Should not reach here
