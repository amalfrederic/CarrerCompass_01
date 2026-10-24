"""
Unit tests for Amazon Bedrock integration using unittest.mock.
MANDATORY: All AWS Bedrock calls are strictly mocked so NO real API calls are made and NO charges are incurred.
"""

import os
import unittest
from unittest.mock import MagicMock, patch
from botocore.exceptions import ClientError

import bedrock_service
import llm_provider


class TestBedrockMock(unittest.TestCase):

    def test_default_provider_is_groq(self):
        """Verifies that the default LLM provider is 'groq' when not specified."""
        with patch.dict(os.environ, {}, clear=False):
            if "LLM_PROVIDER" in os.environ:
                del os.environ["LLM_PROVIDER"]
            self.assertEqual(llm_provider.get_active_provider(), "groq")
            info = llm_provider.get_provider_info()
            self.assertEqual(info["provider"], "groq")

    @patch("bedrock_service.boto3.client")
    def test_bedrock_converse_mocked(self, mock_boto_client):
        """
        Verifies Bedrock Converse API is called with correct parameters without actual AWS network calls.
        """
        mock_client_instance = MagicMock()
        mock_boto_client.return_value = mock_client_instance

        # Simulated Bedrock Converse API response payload
        mock_client_instance.converse.return_value = {
            "output": {
                "message": {
                    "role": "assistant",
                    "content": [{"text": '["Python", "FastAPI", "Docker"]'}]
                }
            },
            "stopReason": "end_turn",
            "usage": {"inputTokens": 25, "outputTokens": 10}
        }

        # Reset singleton cache in bedrock_service
        bedrock_service._bedrock_client = None

        with patch.dict(os.environ, {"LLM_PROVIDER": "bedrock", "BEDROCK_MODEL_ID": "amazon.nova-micro-v1:0"}):
            response = bedrock_service.generate_bedrock_response("Extract skills", task="extraction")

            # Assert client was created with bedrock-runtime
            mock_boto_client.assert_called_with("bedrock-runtime", region_name="us-east-1")

            # Assert converse was called with expected model and inferenceConfig
            mock_client_instance.converse.assert_called_once()
            call_kwargs = mock_client_instance.converse.call_args[1]
            self.assertEqual(call_kwargs["modelId"], "amazon.nova-micro-v1:0")
            self.assertEqual(call_kwargs["messages"][0]["content"][0]["text"], "Extract skills")
            self.assertEqual(response, '["Python", "FastAPI", "Docker"]')

    @patch("bedrock_service.boto3.client")
    def test_bedrock_client_error_handling(self, mock_boto_client):
        """Verifies that AWS ClientError (e.g. AccessDeniedException) is caught gracefully."""
        mock_client_instance = MagicMock()
        mock_boto_client.return_value = mock_client_instance

        error_response = {
            "Error": {
                "Code": "AccessDeniedException",
                "Message": "User is not authorized to perform: bedrock:InvokeModel"
            }
        }
        mock_client_instance.converse.side_effect = ClientError(error_response, "Converse")
        bedrock_service._bedrock_client = None

        response = bedrock_service.generate_bedrock_response("Test prompt")
        self.assertIsInstance(response, dict)
        self.assertIn("error", response)
        self.assertIn("AccessDeniedException", response["error"])

    @patch("bedrock_service.generate_bedrock_response")
    def test_llm_provider_routing_to_bedrock(self, mock_bedrock_resp):
        """Verifies that llm_provider dispatches to Bedrock when LLM_PROVIDER=bedrock."""
        mock_bedrock_resp.return_value = "Mocked Bedrock Output"

        with patch.dict(os.environ, {"LLM_PROVIDER": "bedrock"}):
            self.assertEqual(llm_provider.get_active_provider(), "bedrock")
            result = llm_provider.generate_response("Hello Bedrock")
            mock_bedrock_resp.assert_called_once_with("Hello Bedrock", task="general")
            self.assertEqual(result, "Mocked Bedrock Output")

    def test_clean_json_response(self):
        """Verifies that markdown fences are stripped from LLM JSON responses."""
        fenced_text = "```json\n[\"Python\", \"AWS\"]\n```"
        cleaned = llm_provider.clean_json_response(fenced_text)
        self.assertEqual(cleaned, "[\"Python\", \"AWS\"]")


if __name__ == "__main__":
    unittest.main()
