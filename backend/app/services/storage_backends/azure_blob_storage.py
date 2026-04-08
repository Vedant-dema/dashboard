"""Azure Blob storage backend (enterprise production target)."""

from __future__ import annotations

import datetime as dt
from io import BytesIO
from typing import Any, BinaryIO, Mapping

from app.services.storage_backends.base import (
    DownloadAccess,
    StoredObjectMetadata,
    UploadSession,
)

try:
    from azure.storage.blob import BlobServiceClient, ContentSettings

    AZURE_BLOB_SDK_AVAILABLE = True
except ModuleNotFoundError:
    BlobServiceClient = None  # type: ignore[assignment]
    ContentSettings = None  # type: ignore[assignment]
    AZURE_BLOB_SDK_AVAILABLE = False


class AzureBlobStorageBackend:
    provider_name = "azure_blob"

    def __init__(
        self,
        *,
        account_url: str,
        connection_string: str | None = None,
        sas_upload_enabled: bool = False,
    ) -> None:
        self._account_url = account_url.strip()
        self._connection_string = (connection_string or "").strip() or None
        self._sas_upload_enabled = sas_upload_enabled
        self._client: Any | None = None
        if AZURE_BLOB_SDK_AVAILABLE:
            if self._connection_string:
                self._client = BlobServiceClient.from_connection_string(self._connection_string)
            elif self._account_url:
                self._client = BlobServiceClient(account_url=self._account_url)

    def _require_client(self) -> Any:
        if not AZURE_BLOB_SDK_AVAILABLE:
            raise RuntimeError(
                "azure-storage-blob is not installed. Install the Azure SDK before using STORAGE_PROVIDER=azure_blob."
            )
        if self._client is None:
            raise RuntimeError(
                "Azure Blob client is not configured. Set AZURE_BLOB_ACCOUNT_URL and provide backend credentials."
            )
        return self._client

    @staticmethod
    def _clean_segment(raw: str, *, field_name: str) -> str:
        cleaned = raw.replace("\\", "/").strip().strip("/")
        if not cleaned:
            raise ValueError(f"{field_name} must be non-empty")
        if ".." in cleaned.split("/"):
            raise ValueError(f"{field_name} contains invalid path traversal segments")
        return cleaned

    def save_object(
        self,
        *,
        container_name: str,
        object_key: str,
        content: bytes | BinaryIO,
        content_type: str | None = None,
        metadata: Mapping[str, str] | None = None,
    ) -> StoredObjectMetadata:
        client = self._require_client()
        container = self._clean_segment(container_name, field_name="container_name")
        key = self._clean_segment(object_key, field_name="object_key")
        payload = content if isinstance(content, bytes) else content.read()
        blob_client = client.get_blob_client(container=container, blob=key)
        content_settings = ContentSettings(content_type=content_type) if content_type else None
        blob_client.upload_blob(payload, overwrite=True, metadata=dict(metadata or {}), content_settings=content_settings)
        props = blob_client.get_blob_properties()
        return StoredObjectMetadata(
            provider=self.provider_name,
            container_name=container,
            object_key=key,
            size_bytes=int(props.size),
            content_type=getattr(getattr(props, "content_settings", None), "content_type", None),
            etag=str(getattr(props, "etag", "")) or None,
            updated_at=getattr(props, "last_modified", None),
            metadata=dict(getattr(props, "metadata", {}) or {}),
        )

    def open_object(self, *, container_name: str, object_key: str) -> BinaryIO:
        client = self._require_client()
        container = self._clean_segment(container_name, field_name="container_name")
        key = self._clean_segment(object_key, field_name="object_key")
        blob_client = client.get_blob_client(container=container, blob=key)
        payload = blob_client.download_blob().readall()
        return BytesIO(payload)

    def get_object_metadata(self, *, container_name: str, object_key: str) -> StoredObjectMetadata | None:
        client = self._require_client()
        container = self._clean_segment(container_name, field_name="container_name")
        key = self._clean_segment(object_key, field_name="object_key")
        blob_client = client.get_blob_client(container=container, blob=key)
        try:
            props = blob_client.get_blob_properties()
        except Exception:
            return None
        return StoredObjectMetadata(
            provider=self.provider_name,
            container_name=container,
            object_key=key,
            size_bytes=int(props.size),
            content_type=getattr(getattr(props, "content_settings", None), "content_type", None),
            etag=str(getattr(props, "etag", "")) or None,
            updated_at=getattr(props, "last_modified", None),
            metadata=dict(getattr(props, "metadata", {}) or {}),
        )

    def delete_object(self, *, container_name: str, object_key: str) -> bool:
        client = self._require_client()
        container = self._clean_segment(container_name, field_name="container_name")
        key = self._clean_segment(object_key, field_name="object_key")
        blob_client = client.get_blob_client(container=container, blob=key)
        try:
            blob_client.delete_blob(delete_snapshots="include")
            return True
        except Exception:
            return False

    def generate_download_access(
        self,
        *,
        container_name: str,
        object_key: str,
        expires_in_seconds: int,
    ) -> DownloadAccess:
        expires_at = dt.datetime.now(dt.timezone.utc) + dt.timedelta(seconds=max(60, expires_in_seconds))
        location = f"{self._clean_segment(container_name, field_name='container_name')}/{self._clean_segment(object_key, field_name='object_key')}"
        return DownloadAccess(
            strategy="backend_proxy",
            location=location,
            expires_at=expires_at,
        )

    def generate_upload_session(
        self,
        *,
        container_name: str,
        object_key: str,
        content_type: str | None,
        expires_in_seconds: int,
    ) -> UploadSession | None:
        _ = content_type
        _ = expires_in_seconds
        _ = container_name
        _ = object_key
        if not self._sas_upload_enabled:
            return None
        return None
