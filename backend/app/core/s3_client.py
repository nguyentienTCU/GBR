from functools import lru_cache
from urllib.parse import urlparse

import boto3

from app.core.config import get_settings


class S3Client:
    """Small S3 wrapper for storing generated backend artifacts."""

    def __init__(self) -> None:
        self.settings = get_settings()
        self.bucket = self.settings.s3_contract_bucket
        client_kwargs = {"region_name": self.settings.aws_region}

        if self.settings.aws_access_key_id and self.settings.aws_secret_access_key:
            client_kwargs.update(
                {
                    "aws_access_key_id": self.settings.aws_access_key_id,
                    "aws_secret_access_key": self.settings.aws_secret_access_key,
                }
            )
        elif self.settings.aws_access_key_id or self.settings.aws_secret_access_key:
            raise ValueError(
                "Both AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY must be set for S3."
            )

        self.client = boto3.client("s3", **client_kwargs)

    def upload_pdf(
        self,
        *,
        key: str,
        body: bytes,
    ) -> str:
        self.client.put_object(
            Bucket=self.bucket,
            Key=key,
            Body=body,
            ContentType="application/pdf",
        )
        return f"s3://{self.bucket}/{key}"

    def retrieve_pdf(self, *, key: str) -> bytes:
        response = self.client.get_object(Bucket=self.bucket, Key=key)
        return response["Body"].read()

    def retrieve_pdf_from_url(self, s3_url: str) -> bytes:
        key = self._key_from_s3_url(s3_url)
        return self.retrieve_pdf(key=key)

    def _key_from_s3_url(self, s3_url: str) -> str:
        parsed = urlparse(s3_url)
        if parsed.scheme != "s3" or parsed.netloc != self.bucket:
            raise ValueError("Contract file URL does not match the configured S3 bucket.")

        key = parsed.path.lstrip("/")
        if not key:
            raise ValueError("Contract file URL is missing an S3 object key.")

        return key


@lru_cache
def get_s3_client() -> S3Client:
    return S3Client()
