from pathlib import Path
import tempfile
import os
from pydantic import BaseSettings

# Configuration de base
class Settings(BaseSettings):
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "PDF-Reader API"
    
    # Dossier temporaire sécurisé pour les fichiers
    TEMP_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "tmp")
    
    # Durée max de conservation des fichiers (en secondes)
    FILE_RETENTION_SECONDS: int = 3600  # 1 heure par défaut
    
    # Taille max des fichiers (en Mo)
    MAX_FILE_SIZE_MB: int = 100
    
    # Extensions supportées
    ALLOWED_EXTENSIONS = {
        "pdf": ["pdf"],
        "image": ["jpg", "jpeg", "png", "gif", "webp", "tiff"],
        "office": ["doc", "docx", "xls", "xlsx", "ppt", "pptx"],
    }
    
    # CORS
    CORS_ORIGINS: list = ["http://localhost:5173", "http://localhost:3000"]  # Frontend dev servers
    
    # Sécurité
    SECURE_MODE: bool = True  # Mode ultra-sécurisé (nettoyage auto)
    
    class Config:
        case_sensitive = True


settings = Settings()

# Création du dossier temporaire s'il n'existe pas
os.makedirs(settings.TEMP_DIR, exist_ok=True)
