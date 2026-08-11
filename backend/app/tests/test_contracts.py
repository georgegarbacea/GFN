import unittest

from pydantic import ValidationError

from app.routers.auth import router as auth_router
from app.routers.controls import normalize_payload_text
from app.schemas.auth import ApproveUserRequest, RegisterRequest
from app.schemas.control import ControlPayload


class AuthenticationContractTests(unittest.TestCase):
    def test_development_admin_routes_are_not_exposed(self):
        paths = [route.path for route in auth_router.routes]
        self.assertNotIn("/auth/dev-approve-user", paths)
        self.assertNotIn("/auth/dev-set-password", paths)
        self.assertEqual(paths.count("/auth/users"), 1)

    def test_registration_rejects_weak_password(self):
        with self.assertRaises(ValidationError):
            RegisterRequest(
                email="test@example.test",
                password="weak",
                first_name="Test",
                last_name="User",
            )

    def test_approval_rejects_unknown_role(self):
        with self.assertRaises(ValidationError):
            ApproveUserRequest(user_id=1, is_approved=True, role="unknown")


class ControlContractTests(unittest.TestCase):
    def test_form_specific_fields_are_declared(self):
        expected = {
            "este_sesizare",
            "numar_sesizare",
            "nume_petitionar",
            "legal",
            "prejudiciu_silvic",
            "confiscari_silvic",
            "masuri_complementare_extinse",
        }
        self.assertTrue(expected.issubset(ControlPayload.model_fields))

    def test_payload_text_preserves_original_characters(self):
        payload = {
            "nume": "\u0218tefan",
            "localitate": "T\u00e2rgu Mure\u0219",
        }
        self.assertEqual(normalize_payload_text(payload), payload)


if __name__ == "__main__":
    unittest.main()
