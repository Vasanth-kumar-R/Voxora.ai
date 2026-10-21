"""
Recording and Audio Storage Service for Voxora AI.
Handles secure upload, validation, persistence, and safe streaming of call audio files,
supporting both private Supabase Storage and persistent local storage.
"""

import os
from pathlib import Path
from typing import Optional, Tuple
import logging
import httpx
from fastapi import UploadFile, HTTPException
from app.config import settings, RECORDINGS_DIR

logger = logging.getLogger("voxora.storage")

ALLOWED_AUDIO_TYPES = {
    "audio/webm",
    "audio/wav",
    "audio/x-wav",
    "audio/ogg",
    "audio/mp4",
    "audio/mpeg",
    "video/webm",
}

MAX_FILE_BYTES = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024


class StorageService:
    def __init__(self, storage_dir: Optional[Path] = None):
        self.storage_dir = storage_dir or RECORDINGS_DIR
        self.storage_dir.mkdir(parents=True, exist_ok=True)

    def _is_supabase_configured(self) -> bool:
        return bool(settings.SUPABASE_URL and settings.SUPABASE_SECRET_KEY)

    async def save_recording(
        self,
        call_id: str,
        upload_file: UploadFile
    ) -> Tuple[str, str]:
        """
        Validates content-type and size, then persists the audio file safely in Supabase Storage
        and local cache.
        Returns: (filename, relative_url)
        """
        content_type = upload_file.content_type or "audio/webm"
        if content_type not in ALLOWED_AUDIO_TYPES and not content_type.startswith("audio/"):
            logger.warning(f"Unusual audio content-type: {content_type}")

        ext = ".webm"
        if "wav" in content_type:
            ext = ".wav"
        elif "ogg" in content_type:
            ext = ".ogg"
        elif "mp4" in content_type:
            ext = ".mp4"

        filename = f"call_{call_id}{ext}"
        destination = self.storage_dir / filename

        # Read into memory / local file while checking size
        total_bytes = 0
        file_bytes = bytearray()
        while chunk := await upload_file.read(1024 * 64):
            total_bytes += len(chunk)
            if total_bytes > MAX_FILE_BYTES:
                if destination.exists():
                    destination.unlink()
                raise HTTPException(
                    status_code=413,
                    detail=f"Audio file exceeds maximum size limit of {settings.MAX_UPLOAD_SIZE_MB}MB"
                )
            file_bytes.extend(chunk)

        # Write local copy
        with open(destination, "wb") as f:
            f.write(file_bytes)

        # Upload to Supabase Storage if configured
        if self._is_supabase_configured():
            try:
                headers = {
                    "apikey": settings.SUPABASE_SECRET_KEY,
                    "Authorization": f"Bearer {settings.SUPABASE_SECRET_KEY}",
                    "Content-Type": content_type
                }
                upload_url = f"{settings.SUPABASE_URL}/storage/v1/object/{settings.SUPABASE_STORAGE_BUCKET}/{filename}"
                async with httpx.AsyncClient(timeout=30.0) as client:
                    resp = await client.post(upload_url, headers=headers, content=bytes(file_bytes))
                    if resp.status_code in [200, 201]:
                        logger.info(f"Successfully uploaded {filename} to Supabase bucket '{settings.SUPABASE_STORAGE_BUCKET}'")
                    else:
                        logger.warning(f"Supabase storage upload returned status {resp.status_code}: {resp.text}")
            except Exception as e:
                logger.error(f"Error uploading to Supabase storage: {e}")

        relative_url = f"/api/calls/{call_id}/recording"
        logger.info(f"Successfully saved recording for call {call_id}: {filename} ({total_bytes} bytes)")
        return filename, relative_url

    def get_recording_path(self, filename: str) -> Optional[Path]:
        """Safely resolves recording file path within local storage directory"""
        safe_name = Path(filename).name
        target = self.storage_dir / safe_name
        if target.exists() and target.is_file():
            return target
        return None

    async def get_recording_bytes(self, filename: str) -> Optional[Tuple[bytes, str]]:
        """
        Retrieves recording bytes either from local cache or directly from private Supabase Storage.
        Returns: (bytes, content_type)
        """
        # 1. Try local disk first
        local_path = self.get_recording_path(filename)
        if local_path and local_path.exists():
            with open(local_path, "rb") as f:
                data = f.read()
            media_type = "audio/webm"
            if local_path.suffix == ".wav":
                media_type = "audio/wav"
            elif local_path.suffix == ".mp4":
                media_type = "audio/mp4"
            return data, media_type

        # 2. Try fetching from Supabase Storage private bucket
        if self._is_supabase_configured():
            try:
                headers = {
                    "apikey": settings.SUPABASE_SECRET_KEY,
                    "Authorization": f"Bearer {settings.SUPABASE_SECRET_KEY}"
                }
                obj_url = f"{settings.SUPABASE_URL}/storage/v1/object/{settings.SUPABASE_STORAGE_BUCKET}/{filename}"
                async with httpx.AsyncClient(timeout=30.0) as client:
                    resp = await client.get(obj_url, headers=headers)
                    if resp.status_code == 200:
                        content_type = resp.headers.get("content-type", "audio/webm")
                        # Cache locally
                        try:
                            with open(self.storage_dir / filename, "wb") as f:
                                f.write(resp.content)
                        except Exception as e:
                            logger.warning(f"Failed to cache Supabase audio locally: {e}")
                        return resp.content, content_type
            except Exception as e:
                logger.error(f"Failed to download audio from Supabase: {e}")

        return None

    def delete_recording(self, filename: str) -> bool:
        """Deletes recording file from disk and Supabase Storage"""
        deleted_local = False
        target = self.get_recording_path(filename)
        if target and target.exists():
            try:
                target.unlink()
                deleted_local = True
            except Exception as e:
                logger.error(f"Failed to delete local recording {filename}: {e}")

        # Delete from Supabase Storage
        if self._is_supabase_configured():
            try:
                headers = {
                    "apikey": settings.SUPABASE_SECRET_KEY,
                    "Authorization": f"Bearer {settings.SUPABASE_SECRET_KEY}",
                    "Content-Type": "application/json"
                }
                del_url = f"{settings.SUPABASE_URL}/storage/v1/object/{settings.SUPABASE_STORAGE_BUCKET}"
                with httpx.Client(timeout=10.0) as client:
                    client.request("DELETE", del_url, headers=headers, json={"prefixes": [filename]})
            except Exception as e:
                logger.error(f"Failed to delete audio from Supabase storage: {e}")

        return deleted_local


storage_service = StorageService()
