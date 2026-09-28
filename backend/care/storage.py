"""Private Cloudflare R2 object storage for marketplace media."""

from __future__ import annotations

from uuid import uuid4

from .config import settings


class R2Storage:
    def __init__(self) -> None:
        if not settings.r2_configured:
            raise RuntimeError("Cloudflare R2 is not configured")
        import boto3

        self.client = boto3.client(
            "s3",
            endpoint_url=settings.r2_endpoint,
            aws_access_key_id=settings.r2_access_key_id,
            aws_secret_access_key=settings.r2_secret_access_key,
            region_name=settings.r2_region,
        )

    def verify(self) -> None:
        self.client.head_bucket(Bucket=settings.r2_private_bucket)
        self.client.head_bucket(Bucket=settings.r2_avatars_bucket)

    def upload(self, *, bucket: str, owner_id: str, file_name: str, content: bytes, content_type: str) -> str:
        suffix = file_name.rsplit(".", 1)[-1].lower() if "." in file_name else "bin"
        key = f"{owner_id}/{uuid4().hex}.{suffix}"
        self.client.put_object(Bucket=bucket, Key=key, Body=content, ContentType=content_type)
        return key

    def signed_download_url(self, *, bucket: str, key: str, expires_in: int = 300) -> str:
        return self.client.generate_presigned_url(
            "get_object", Params={"Bucket": bucket, "Key": key}, ExpiresIn=expires_in
        )


def get_r2_storage() -> R2Storage:
    return R2Storage()
