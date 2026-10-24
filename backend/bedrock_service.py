import os
import json
import logging
from typing import Dict, Any, Union
import boto3
from botocore.exceptions import ClientError

logger = logging.getLogger("careercompass.bedrock")

# Configurable Bedrock Settings
AWS_REGION = os.getenv("AWS_REGION", "us-east-1")
# Default model: Amazon Nova Micro (fast, low latency, economical for structured tasks)
# Alternative supported models: anthropic.claude-3-haiku-20240307-v1:0, meta.llama3-8b-instruct-v1:0
BEDROCK_MODEL_ID = os.getenv("BEDROCK_MODEL_ID", "amazon.nova-micro-v1:0")

_bedrock_client = None


def get_bedrock_client():
    """Returns a singleton or cached boto3 bedrock-runtime client."""
    global _bedrock_client
    if _bedrock_client is None:
        _bedrock_client = boto3.client("bedrock-runtime", region_name=AWS_REGION)
    return _bedrock_client


def generate_bedrock_response(prompt: str, task: str = "general") -> Union[str, Dict[str, Any]]:
    """
    Invokes Amazon Bedrock using the unified Converse API.
    Supports Nova, Claude, Llama, and Mistral models without model-specific payload formats.
    """
    temperature = 0.1 if task in ["classification", "evaluation"] else 0.2
    model_id = os.getenv("BEDROCK_MODEL_ID", BEDROCK_MODEL_ID)

    try:
        client = get_bedrock_client()
        logger.info(f"Invoking Amazon Bedrock model '{model_id}' (task={task}, region={AWS_REGION})")

        response = client.converse(
            modelId=model_id,
            messages=[
                {
                    "role": "user",
                    "content": [{"text": prompt}]
                }
            ],
            inferenceConfig={
                "temperature": temperature,
                "maxTokens": 2048,
            }
        )

        output_message = response.get("output", {}).get("message", {})
        content_blocks = output_message.get("content", [])
        if content_blocks and "text" in content_blocks[0]:
            return content_blocks[0]["text"]

        logger.error(f"Unexpected Bedrock response structure: {response}")
        return {"error": "Empty or unrecognized response from Amazon Bedrock"}

    except ClientError as e:
        error_code = e.response.get("Error", {}).get("Code", "Unknown")
        error_msg = e.response.get("Error", {}).get("Message", str(e))
        logger.error(f"Amazon Bedrock ClientError [{error_code}]: {error_msg}")
        return {"error": f"Bedrock API error [{error_code}]: {error_msg}"}
    except Exception as e:
        logger.error(f"Unexpected error calling Amazon Bedrock: {e}")
        return {"error": str(e)}
