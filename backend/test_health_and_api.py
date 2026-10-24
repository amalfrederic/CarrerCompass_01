"""
Unit tests for FastAPI Health Endpoint, CORS headers, and Authentication security.
"""

import unittest
from fastapi.testclient import TestClient
from main import app
from auth import create_access_token, SECRET_KEY, ALGORITHM
from jose import jwt


class TestHealthAndAPI(unittest.TestCase):

    def setUp(self):
        self.client = TestClient(app)

    def test_root_endpoint(self):
        """Verifies root endpoint returns 200 OK and online status."""
        response = self.client.get("/")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data.get("status"), "online")
        self.assertIn("CareerCompass", data.get("service", ""))

    def test_health_check_endpoint(self):
        """Verifies /health endpoint returns 200 OK with service and db status."""
        response = self.client.get("/health")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data.get("service"), "careercompass-backend")
        self.assertIn(data.get("status"), ["healthy", "degraded"])
        self.assertIn("database", data)
        self.assertIn("llm_provider", data)

    def test_cors_headers(self):
        """Verifies CORS preflight and headers for local development origin."""
        response = self.client.options(
            "/health",
            headers={
                "Origin": "http://localhost:5173",
                "Access-Control-Request-Method": "GET"
            }
        )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.headers.get("access-control-allow-origin"), "http://localhost:5173")

    def test_jwt_token_creation_and_payload(self):
        """Verifies JWT token generation and decoding with configured SECRET_KEY."""
        token = create_access_token(data={"sub": "cloud_tester@example.com"})
        self.assertIsInstance(token, str)

        decoded = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        self.assertEqual(decoded.get("sub"), "cloud_tester@example.com")
        self.assertIn("exp", decoded)


if __name__ == "__main__":
    unittest.main()
