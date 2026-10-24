"""
LLM Provider Abstraction Module for CareerCompass
Supports:
  1. Groq API (Default)
  2. Amazon Bedrock (Optional AWS Native Service)
"""

import os
import logging
from typing import Dict, Any, List, Union

from groq_service import (
    generate_response,
    clean_json_response,
    extract_job_skills,
    classify_job_skills,
    evaluate_resume_skills,
    generate_skill_hierarchy,
    generate_roles_from_domain,
    extract_resume_skills_llm,
    generate_learning_path_llm,
    suggest_roles_llm,
    estimate_salary_llm,
    generate_roles_with_skills,
    generate_career_synthesis,
)
from bedrock_service import generate_bedrock_response

logger = logging.getLogger("careercompass.llm_provider")


def get_active_provider() -> str:
    """Returns the currently configured LLM provider ('groq' or 'bedrock')."""
    return os.getenv("LLM_PROVIDER", "groq").lower()


def get_provider_info() -> Dict[str, Any]:
    """Returns metadata about the active LLM provider configuration."""
    provider = get_active_provider()
    if provider == "bedrock":
        return {
            "provider": "bedrock",
            "region": os.getenv("AWS_REGION", "us-east-1"),
            "model_id": os.getenv("BEDROCK_MODEL_ID", "amazon.nova-micro-v1:0"),
            "description": "Amazon Bedrock Foundation Model",
        }
    return {
        "provider": "groq",
        "models": {
            "general": "openai/gpt-oss-20b",
            "classification": "openai/gpt-oss-120b",
        },
        "description": "Groq LPU Inference Engine",
    }


__all__ = [
    "get_active_provider",
    "get_provider_info",
    "generate_response",
    "generate_bedrock_response",
    "clean_json_response",
    "extract_job_skills",
    "classify_job_skills",
    "evaluate_resume_skills",
    "generate_skill_hierarchy",
    "generate_roles_from_domain",
    "extract_resume_skills_llm",
    "generate_learning_path_llm",
    "suggest_roles_llm",
    "estimate_salary_llm",
    "generate_roles_with_skills",
    "generate_career_synthesis",
]
