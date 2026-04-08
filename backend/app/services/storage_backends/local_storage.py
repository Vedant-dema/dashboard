"""Local filesystem storage backend for development and tests."""

from __future__ import annotations

import datetime as dt
import hashlib
from pathlib import Path
from typing import BinaryIO, Mapping

from app.services.storage_backends.base import (
    DownloadAccess,
    StoredObjectMetadata,
    UploadSession,
)


def _clean_segment(raw: str, *, field_name: str) -> str:
    cleaned = raw.replace("\\", "/").strip().strip("/")
    if not cleaned:
        raise ValueError(f"{field_name} must be a non-empty path segment")
    parts = [part for part in cleaned.split("/") if part not in {"", "."}]
    if any(part == ".." for part in parts):
        raise ValueError(f"{field_name} contains invalid path traversal segments")
    return "/".join(parts)


def _checksum_sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        while True:
            chunk = handle.read(8192)
            if not chunk:
                break
            digest.update(chunk)
    return digest.hexdigest()


def _coerce_bytes(content: bytes | BinaryIO) -> bytes:
    if isinstance(content, bytes):
        return content
    return content.read()


class LocalStorageBackend:
    provider_name = "local"

    def __init__(self, root_path: str) -> None:
        self._root_path = Path(root_path).expanduser().resolve()
        self._root_path.mkdir(parents=True, exist_ok=True)

    def _container_root(self, container_name: str) -> Path:
        container = _clean_segment(container_name, field_name="container_name")
        path = (self._root_path / container).resolve()
        path.mkdir(parents=True, exist_ok=True)
        return path

    def _object_path(self, *, container_name: str, object_key: str, create_parent: bool) -> Path:
        container_root = self._container_root(container_name)
        clean_key = _clean_segment(object_key, field_name="object_key")
        path = (container_root / Path(*clean_key.split("/"))).resolve()
        path.relative_to(container_root)
        if create_parent:
            path.parent.mkdir(parents=True, exist_ok=True)
        return path

    def save_object(
        self,
        *,
        container_name: str,
        object_key: str,
        content: bytes | BinaryIO,
        content_type: str | None = None,
        metadata: Mapping[str, str] | None = None,
    ) -> StoredObjectMetadata:
        payload = _coerce_bytes(content)
        path = self._object_path(container_name=container_name, object_key=object_key, create_parent=True)
        path.write_bytes(payload)
        stat = path.stat()
        return StoredObjectMetadata(
            provider=self.provider_name,
            container_name=_clean_segment(container_name, field_name="container_name"),
            object_key=_clean_segment(object_key, field_name="object_key"),
            size_bytes=int(stat.st_size),
            content_type=content_type,
            checksum_sha256=_checksum_sha256(path),
            updated_at=dt.datetime.fromtimestamp(stat.st_mtime, tz=dt.timezone.utc),
            metadata=dict(metadata or {}),
        )

    def open_object(self, *, container_name: str, object_key: str) -> BinaryIO:
        path = self._object_path(container_name=container_name, object_key=object_key, create_parent=False)
        return path.open("rb")

    def get_object_metadata(self, *, container_name: str, object_key: str) -> StoredObjectMetadata | None:
        path = self._object_path(container_name=container_name, object_key=object_key, create_parent=False)
        if not path.exists() or not path.is_file():
            return None
        stat = path.stat()
        return StoredObjectMetadata(
            provider=self.provider_name,
            container_name=_clean_segment(container_name, field_name="container_name"),
            object_key=_clean_segment(object_key, field_name="object_key"),
            size_bytes=int(stat.st_size),
            checksum_sha256=_checksum_sha256(path),
            updated_at=dt.datetime.fromtimestamp(stat.st_mtime, tz=dt.timezone.utc),
        )

    def delete_object(self, *, container_name: str, object_key: str) -> bool:
        path = self._object_path(container_name=container_name, object_key=object_key, create_parent=False)
        if not path.exists():
            return False
        path.unlink()
        return True

    def generate_download_access(
        self,
        *,
        container_name: str,
        object_key: str,
        expires_in_seconds: int,
    ) -> DownloadAccess:
        expires_at = dt.datetime.now(dt.timezone.utc) + dt.timedelta(seconds=max(60, expires_in_seconds))
        location = f"{_clean_segment(container_name, field_name='container_name')}/{_clean_segment(object_key, field_name='object_key')}"
        return DownloadAccess(
            strategy="backend_stream",
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
    ) -> UploadSession:
        expires_at = dt.datetime.now(dt.timezone.utc) + dt.timedelta(seconds=max(60, expires_in_seconds))
        _ = content_type
        return UploadSession(
            strategy="backend_proxy_upload",
            object_key=f"{_clean_segment(container_name, field_name='container_name')}/{_clean_segment(object_key, field_name='object_key')}",
            upload_url=None,
            expires_at=expires_at,
        )
