from fastapi import APIRouter, UploadFile, File, HTTPException, BackgroundTasks
from typing import List
from PyPDF2 import PdfReader
import os
import tempfile
import uuid
import io
import logging

from ....core.config import settings
from ....core.security import save_upload_file, secure_delete_file, is_valid_file_extension

router = APIRouter()
logger = logging.getLogger(__name__)

@router.post("/pagecount", summary="Compter le nombre de pages dans un PDF")
@router.post("/get-pdf-info", summary="Obtenir les informations d'un fichier PDF")
async def pdf_page_count(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...)
):
    """
    Compte le nombre de pages dans un fichier PDF.
    
    - **file**: Fichier PDF à analyser
    """
    # Vérifier que le fichier est un PDF
    if not is_valid_file_extension(file.filename, settings.ALLOWED_EXTENSIONS["pdf"]):
        raise HTTPException(status_code=400, detail="Le fichier n'est pas un PDF valide")
    
    try:
        # Remettre le curseur du fichier au début
        file.file.seek(0)
        
        # Lire le fichier en mémoire et compter les pages
        pdf_data = await file.read()
        
        # Utiliser BytesIO pour créer un objet fichier en mémoire
        with io.BytesIO(pdf_data) as pdf_stream:
            reader = PdfReader(pdf_stream)
            page_count = len(reader.pages)
        
        # Retourner le nombre de pages - S'assurer d'avoir la même clé entre pagecount et get-pdf-info
        return {"page_count": page_count, "pageCount": page_count}
    
    except Exception as e:
        logger.error(f"Erreur lors du comptage des pages: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Impossible de compter les pages: {str(e)}")
    
    finally:
        # Remettre le curseur au début au cas où le fichier serait réutilisé
        file.file.seek(0)

@router.post("/upload", summary="Upload d'un fichier PDF")
async def upload_pdf(
    file: UploadFile = File(...)
):
    """
    Upload d'un fichier PDF.
    
    - **file**: Fichier PDF à uploader
    """
    # Vérifier que le fichier est un PDF
    if not is_valid_file_extension(file.filename, settings.ALLOWED_EXTENSIONS["pdf"]):
        raise HTTPException(
            status_code=400,
            detail=f"Le fichier {file.filename} n'est pas un PDF valide"
        )
    
    try:
        # Sauvegarder le fichier sur le disque
        file_path = save_upload_file(file)
        
        return {"file_path": file_path}
        
    except Exception as e:
        # Gérer les erreurs
        raise HTTPException(status_code=500, detail=f"Erreur lors de la sauvegarde du fichier: {str(e)}") 