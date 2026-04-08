"""Storage service abstraction for customer document objects."""

from __future__ import annotations

from typing import BinaryIO, Literal, Mapping

from app.core.config import Settings, get_settings
from app.services.storage_backends import (
    AzureBlobStorageBackend,
    DownloadAccess,
    LocalStorageBackend,
    StorageBackend,
    StoredObjectMetadata,
    UploadSession,
)


class StorageService:
    """Facade over local and Azure Blob storage backends."""

    def __init__(self, *, settings: Settings | None = None, backend: StorageBackend | None = None) -> None:
        self._settings = settings or get_settings()
        self._backend = backend or self._build_backend(self._settings)

    @property
    def provider(self) -> str:
        return self._backend.provider_name

    @staticmethod
    def _build_backend(settings: Settings) -> StorageBackend:
        provider = (settings.storage_provider or "local").strip().lower()
        if provider == "azure_blob":
            return AzureBlobStorageBackend(
                account_url=settings.azure_blob_account_url or "",
                connection_string=settings.azure_blob_connection_string,
                sas_upload_enabled=settings.azure_blob_sas_upload_enabled,
            )
        return LocalStorageBackend(root_path=settings.storage_local_root)

    def resolve_container(self, kind: Literal["raw", "derived"]) -> str:
        if kind == "raw":
            if self.provider == "azure_blob":
                return self._settings.azure_blob_container_raw
            return self._settings.storage_container_raw
        if self.provider == "azure_blob":
            return self._settings.azure_blob_container_derived
        return self._settings.storage_container_derived

    def save_object(
        self,
        *,
        container_name: str,
        object_key: str,
        content: bytes | BinaryIO,
        content_type: str | None = None,
        metadata: Mapping[str, str] | None = None,
    ) -> StoredObjectMetadata:
        return self._backend.save_object(
            container_name=container_name,
            object_key=object_key,
            content=content,
            content_type=content_type,
            metadata=metadata,
        )

    def open_object(self, *, container_name: str, object_key: str) -> BinaryIO:
        return self._backend.open_object(container_name=container_name, object_key=object_key)

    def get_object_metadata(self, *, container_name: str, object_key: str) -> StoredObjectMetadata | None:
        return self._backend.get_object_metadata(container_name=container_name, object_key=object_key)

    def delete_object(self, *, container_name: str, object_key: str) -> bool:
        return self._backend.delete_object(container_name=container_name, object_key=object_key)

    def generate_download_access(
        self,
        *,
        container_name: str,
        object_key: str,
        expires_in_seconds: int | None = None,
    ) -> DownloadAccess:
        ttl = expires_in_seconds or self._settings.storage_default_download_ttl_seconds
        return self._backend.generate_download_access(
            container_name=container_name,
            object_key=object_key,
            expires_in_seconds=ttl,
        )

    def generate_upload_session(
        self,
        *,
        container_name: str,
        object_key: str,
        content_type: str | None = None,
        expires_in_seconds: int | None = None,
    ) -> UploadSession | None:
        ttl = expires_in_seconds or self._settings.storage_default_download_ttl_seconds
        return self._backend.generate_upload_session(
            container_name=container_name,
            object_key=object_key,
            content_type=content_type,
            expires_in_seconds=ttl,
        )
