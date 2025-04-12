import os
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse
from typing import List, Optional
import tempfile
import uuid

from ....core.config import settings
from ....core.security import save_upload_file, secure_delete_file, is_valid_file_extension
from ....services.pdf_utils import compress_pdf

router = APIRouter()


@router.post("/compress", summary="Compresser un fichier PDF")
async def compress_pdf_file(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    quality: str = Form("medium"),  # low, medium, high
    output_filename: str = Form(None)
):
    """
    Compresse un fichier PDF pour réduire sa taille.
    
    - **file**: Fichier PDF à compresser
    - **quality**: Niveau de qualité (low, medium, high)
    - **output_filename**: Nom du fichier de sortie (optionnel)
    """
    
    # Vérifier que le fichier est un PDF
    if not is_valid_file_extension(file.filename, settings.ALLOWED_EXTENSIONS["pdf"]):
        raise HTTPException(status_code=400, detail="Le fichier n'est pas un PDF valide")
    
    # Vérifier que la qualité est valide
    valid_qualities = ["low", "medium", "high"]
    if quality not in valid_qualities:
        raise HTTPException(
            status_code=400,
            detail=f"Qualité invalide. Valeurs acceptées: {', '.join(valid_qualities)}"
        )
    
    # Créer un identifiant unique pour cette opération
    operation_id = str(uuid.uuid4())
    
    # Préparer les chemins des fichiers
    temp_dir = os.path.join(settings.TEMP_DIR, operation_id)
    os.makedirs(temp_dir, exist_ok=True)
    
    try:
        # Sauvegarder le fichier PDF
        pdf_path = save_upload_file(file, temp_dir, "upload")
        
        # Définir le nom du fichier de sortie
        if not output_filename:
            base_name = os.path.splitext(os.path.basename(file.filename))[0]
            output_filename = f"{base_name}_compresse.pdf"
        elif not output_filename.lower().endswith(".pdf"):
            output_filename += ".pdf"
            
        output_path = os.path.join(temp_dir, output_filename)
        
        # Compresser le PDF
        compress_pdf(str(pdf_path), output_path, quality)
        
        # Supprimer le fichier intermédiaire en arrière-plan
        if settings.SECURE_MODE:
            background_tasks.add_task(secure_delete_file, str(pdf_path))
        
        # Supprimer le fichier de sortie après envoi
        background_tasks.add_task(secure_delete_file, output_path)
        
        return FileResponse(
            path=output_path,
            filename=output_filename,
            media_type="application/pdf",
            background=background_tasks
        )
        
    except Exception as e:
        # Nettoyer en cas d'erreur
        if 'pdf_path' in locals():
            secure_delete_file(str(pdf_path))
        
        raise HTTPException(status_code=500, detail=str(e)) 