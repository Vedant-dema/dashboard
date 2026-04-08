"""Storage backend contracts for customer document objects."""

from __future__ import annotations

import datetime as dt
from dataclasses import dataclass, field
from typing import BinaryIO, Mapping, Protocol


@dataclass(frozen=True)
class StoredObjectMetadata:
    provider: str
    container_name: str
    object_key: str
    size_bytes: int
    content_type: str | None = None
    checksum_sha256: str | None = None
    etag: str | None = None
    updated_at: dt.datetime | None = None
    metadata: dict[str, str] = field(default_factory=dict)


@dataclass(frozen=True)
class DownloadAccess:
    strategy: str
    location: str
    expires_at: dt.datetime | None = None
    headers: dict[str, str] = field(default_factory=dict)


@dataclass(frozen=True)
class UploadSession:
    strategy: str
    object_key: str
    upload_url: str | None
    expires_at: dt.datetime | None = None
    headers: dict[str, str] = field(default_factory=dict)


class StorageBackend(Protocol):
    provider_name: str

    def save_object(
        self,
        *,
        container_name: str,
        object_key: str,
        content: bytes | BinaryIO,
        content_type: str | None = None,
        metadata: Mapping[str, str] | None = None,
    ) -> StoredObjectMetadata:
        """Store an object and return persisted metadata."""

    def open_object(self, *, container_name: str, object_key: str) -> BinaryIO:
        """Open an existing object for reading."""

    def get_object_metadata(self, *, container_name: str, object_key: str) -> StoredObjectMetadata | None:
        """Read object metadata without downloading the full payload."""

    def delete_object(self, *, container_name: str, object_key: str) -> bool:
        """Delete an object. Returns True when an object existed and was removed."""

    def generate_download_access(
        self,
        *,
        container_name: str,
        object_key: str,
        expires_in_seconds: int,
    ) -> DownloadAccess:
        """Generate backend-controlled download strategy metadata."""

    def generate_upload_session(
        self,
        *,
        container_name: str,
        object_key: str,
        content_type: str | None,
        expires_in_seconds: int,
    ) -> UploadSession | None:
        """Optionally create a future direct-upload contract (SAS/presigned URL)."""
