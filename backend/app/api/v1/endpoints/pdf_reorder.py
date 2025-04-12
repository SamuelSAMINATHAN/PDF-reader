import os
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse
from typing import List
import tempfile
import uuid
import json

from ....core.config import settings
from ....core.security import save_upload_file, secure_delete_file, is_valid_file_extension
from ....services.pdf_utils import reorder_pages, get_pdf_info

router = APIRouter()


@router.post("/reorder", summary="Réorganiser les pages d'un PDF")
async def reorder_pdf_pages(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    new_order: str = Form(...),  # Format JSON: [3,1,2,4]
    output_filename: str = Form(None)
):
    """
    Réorganise les pages d'un fichier PDF selon un nouvel ordre.
    
    - **file**: Fichier PDF source
    - **new_order**: Nouvel ordre des pages au format JSON (ex: [3,1,2,4])
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
            output_filename = f"{base_name}_reorganise.pdf"
        elif not output_filename.lower().endswith(".pdf"):
            output_filename += ".pdf"
            
        output_path = os.path.join(temp_dir, output_filename)
        
        # Convertir la chaîne JSON en liste d'entiers
        try:
            pages_order = json.loads(new_order)
            # Vérifier que c'est bien une liste d'entiers
            if not isinstance(pages_order, list) or not all(isinstance(x, int) for x in pages_order):
                raise ValueError("Le nouvel ordre doit être une liste d'entiers")
        except json.JSONDecodeError:
            raise HTTPException(status_code=400, detail="Format JSON invalide pour le nouvel ordre")
        
        # Obtenir les informations sur le PDF pour vérifier que l'ordre est valide
        pdf_info = get_pdf_info(str(pdf_path))
        total_pages = pdf_info["total_pages"]
        
        # Vérifier que le nouvel ordre contient le bon nombre de pages
        if len(pages_order) != total_pages:
            raise HTTPException(
                status_code=400, 
                detail=f"Le nouvel ordre doit contenir exactement {total_pages} pages"
            )
        
        # Vérifier que toutes les pages existent
        for page_num in pages_order:
            if page_num < 1 or page_num > total_pages:
                raise HTTPException(
                    status_code=400,
                    detail=f"Page {page_num} n'existe pas. Le document contient {total_pages} pages."
                )
        
        # Réorganiser les pages
        reorder_pages(str(pdf_path), output_path, pages_order)
        
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


@router.post("/get-pdf-info", summary="Obtenir les informations d'un PDF")
async def get_pdf_metadata(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...)
):
    """
    Récupère les métadonnées et informations sur un PDF.
    Utile pour l'UI de réorganisation des pages.
    
    - **file**: Fichier PDF source
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
        
        # Obtenir les informations sur le PDF
        pdf_info = get_pdf_info(str(pdf_path))
        
        # Supprimer le fichier intermédiaire en arrière-plan
        if settings.SECURE_MODE:
            background_tasks.add_task(secure_delete_file, str(pdf_path))
        
        return pdf_info
        
    except Exception as e:
        # Nettoyer en cas d'erreur
        if 'pdf_path' in locals():
            secure_delete_file(str(pdf_path))
        
        raise HTTPException(status_code=500, detail=str(e)) 