import os
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse
from typing import List, Optional
import tempfile
import uuid

from ....core.config import settings
from ....core.security import save_upload_file, secure_delete_file, is_valid_file_extension
from ....services.pdf_utils import images_to_pdf

router = APIRouter()


@router.post("/images-to-pdf", summary="Convertir des images en PDF")
async def convert_images_to_pdf(
    background_tasks: BackgroundTasks,
    files: List[UploadFile] = File(...),
    output_filename: str = Form(None)
):
    """
    Convertit une ou plusieurs images en un fichier PDF.
    
    - **files**: Liste des fichiers image à convertir
    - **output_filename**: Nom du fichier PDF de sortie (optionnel)
    """
    
    if not files:
        raise HTTPException(status_code=400, detail="Aucune image fournie")
    
    # Vérifier que tous les fichiers sont des images supportées
    for file in files:
        if not is_valid_file_extension(file.filename, settings.ALLOWED_EXTENSIONS["image"]):
            raise HTTPException(
                status_code=400,
                detail=f"Le fichier {file.filename} n'est pas une image supportée. " +
                       f"Formats supportés: {', '.join(settings.ALLOWED_EXTENSIONS['image'])}"
            )
    
    # Créer un identifiant unique pour cette opération
    operation_id = str(uuid.uuid4())
    
    # Préparer les chemins des fichiers
    temp_dir = os.path.join(settings.TEMP_DIR, operation_id)
    os.makedirs(temp_dir, exist_ok=True)
    
    image_paths = []
    try:
        # Sauvegarder toutes les images
        for file in files:
            image_path = save_upload_file(file, temp_dir, "image")
            image_paths.append(str(image_path))
        
        # Définir le nom du fichier de sortie
        if not output_filename:
            if len(files) == 1:
                base_name = os.path.splitext(os.path.basename(files[0].filename))[0]
                output_filename = f"{base_name}.pdf"
            else:
                output_filename = "images_converties.pdf"
        elif not output_filename.lower().endswith(".pdf"):
            output_filename += ".pdf"
            
        output_path = os.path.join(temp_dir, output_filename)
        
        # Convertir les images en PDF
        images_to_pdf(image_paths, output_path)
        
        # Supprimer les fichiers intermédiaires en arrière-plan
        if settings.SECURE_MODE:
            for path in image_paths:
                background_tasks.add_task(secure_delete_file, path)
        
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
        for path in image_paths:
            secure_delete_file(path)
        
        raise HTTPException(status_code=500, detail=str(e)) 