import os
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse
from typing import List
import tempfile
import uuid

from ....core.config import settings
from ....core.security import save_upload_file, secure_delete_file, is_valid_file_extension
from ....services.pdf_utils import remove_pages

router = APIRouter()


@router.post("/remove-pages", summary="Supprimer des pages d'un PDF")
async def remove_pdf_pages(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    pages: str = Form(...),  # Format: "1,3,5-7"
    output_filename: str = Form(None)
):
    """
    Supprime des pages spécifiques d'un fichier PDF.
    
    - **file**: Fichier PDF source
    - **pages**: Pages à supprimer (format: "1,3,5-7")
    - **output_filename**: Nom du fichier de sortie (optionnel)
    """
    
    # Vérifier que le fichier est un PDF
    if not is_valid_file_extension(file.filename, settings.ALLOWED_EXTENSIONS["pdf"]):
        raise HTTPException(status_code=400, detail="Le fichier n'est pas un PDF valide")
    
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
            output_filename = f"{base_name}_modifie.pdf"
        elif not output_filename.lower().endswith(".pdf"):
            output_filename += ".pdf"
            
        output_path = os.path.join(temp_dir, output_filename)
        
        # Traiter la chaîne de pages (convertir "1,3,5-7" en liste d'entiers)
        page_list = []
        for part in pages.split(','):
            part = part.strip()
            if '-' in part:
                start, end = map(int, part.split('-'))
                page_list.extend(range(start, end + 1))
            else:
                page_list.append(int(part))
        
        # Supprimer les pages
        remove_pages(str(pdf_path), output_path, page_list)
        
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