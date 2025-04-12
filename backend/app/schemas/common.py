from typing import List, Optional, Dict, Any
from pydantic import BaseModel


class FileResponse(BaseModel):
    """Schéma de réponse pour un fichier traité"""
    filename: str
    file_id: str
    download_url: str
    file_size: Optional[int] = None
    mime_type: Optional[str] = None


class GenericResponse(BaseModel):
    """Schéma de réponse générique"""
    success: bool
    message: str
    data: Optional[Dict[str, Any]] = None


class ErrorResponse(BaseModel):
    """Schéma de réponse d'erreur"""
    success: bool = False
    error: str
    error_code: Optional[str] = None
    details: Optional[Dict[str, Any]] = None
