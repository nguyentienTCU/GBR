import pytest

from app.core.config import get_settings
from app.core.s3_client import S3Client, get_s3_client
import app.core.s3_client as s3_module


def _clear_settings_caches() -> None:
    get_settings.cache_clear()
    get_s3_client.cache_clear()


def test_s3_client_uses_configured_aws_credentials(monkeypatch):
    captured = {}

    def fake_boto3_client(service_name, **kwargs):
        captured["service_name"] = service_name
        captured["kwargs"] = kwargs
        return object()

    monkeypatch.setenv("AWS_REGION", "us-west-2")
    monkeypatch.setenv("AWS_ACCESS_KEY_ID", "test-access-key")
    monkeypatch.setenv("AWS_SECRET_ACCESS_KEY", "test-secret-key")
    monkeypatch.setattr(s3_module.boto3, "client", fake_boto3_client)
    _clear_settings_caches()

    S3Client()

    assert captured == {
        "service_name": "s3",
        "kwargs": {
            "region_name": "us-west-2",
            "aws_access_key_id": "test-access-key",
            "aws_secret_access_key": "test-secret-key",
        },
    }


def test_s3_client_rejects_partial_aws_credentials(monkeypatch):
    monkeypatch.setenv("AWS_ACCESS_KEY_ID", "test-access-key")
    monkeypatch.setenv("AWS_SECRET_ACCESS_KEY", "")
    monkeypatch.setattr(s3_module.boto3, "client", lambda *_args, **_kwargs: object())
    _clear_settings_caches()

    with pytest.raises(ValueError, match="Both AWS_ACCESS_KEY_ID"):
        S3Client()


def test_s3_client_retrieves_pdf_from_s3_url(monkeypatch):
    class FakeBody:
        def read(self):
            return b"pdf-body"

    class FakeClient:
        def get_object(self, **kwargs):
            assert kwargs == {
                "Bucket": "contract-bucket",
                "Key": "contracts/local/contract.pdf",
            }
            return {"Body": FakeBody()}

    monkeypatch.delenv("AWS_ACCESS_KEY_ID", raising=False)
    monkeypatch.delenv("AWS_SECRET_ACCESS_KEY", raising=False)
    monkeypatch.setattr(s3_module.boto3, "client", lambda *_args, **_kwargs: FakeClient())
    _clear_settings_caches()

    client = S3Client()

    assert (
        client.retrieve_pdf_from_url("s3://contract-bucket/contracts/local/contract.pdf")
        == b"pdf-body"
    )


def test_s3_client_rejects_s3_url_for_different_bucket(monkeypatch):
    monkeypatch.delenv("AWS_ACCESS_KEY_ID", raising=False)
    monkeypatch.delenv("AWS_SECRET_ACCESS_KEY", raising=False)
    monkeypatch.setattr(s3_module.boto3, "client", lambda *_args, **_kwargs: object())
    _clear_settings_caches()

    client = S3Client()

    with pytest.raises(ValueError, match="configured S3 bucket"):
        client.retrieve_pdf_from_url("s3://other-bucket/contracts/local/contract.pdf")
