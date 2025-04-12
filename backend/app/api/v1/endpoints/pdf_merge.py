# Importation de FastAPI pour créer une sous-route (APIRouter = route modulaire)
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, BackgroundTasks, Request
# Pour renvoyer un fichier en réponse (le PDF fusionné)
from fastapi.responses import FileResponse
# Pour les types comme List
from typing import List, Dict, Any
# Librairie pour manipuler des PDF (ici pour les fusionner)
from PyPDF2 import PdfMerger
# Pour créer un dossier temporaire où stocker les fichiers PDF à traiter
import tempfile
# Pour gérer les fichiers/dossiers localement
import os
# Pour générer un nom unique au fichier de sortie
import uuid
import re
import logging

from ....core.config import settings
from ....core.security import save_upload_file, secure_delete_file, is_valid_file_extension
from ....services.pdf_utils import merge_pdfs

# Configurer le logger
logger = logging.getLogger(__name__)

# On crée une "sous-route" (modulaire, plugable dans l'app principale)
router = APIRouter()

@router.post("/merge", summary="Fusionner plusieurs fichiers PDF en un seul")
async def merge_pdf_files(
    request: Request,
    background_tasks: BackgroundTasks,
    output_filename: str = Form(None)
):
    """
    Fusionne plusieurs fichiers PDF en un seul.
    
    - Les fichiers doivent être envoyés avec des noms de champs file0, file1, file2, etc.
    - **output_filename**: Nom du fichier de sortie (optionnel)
    """
    form = await request.form()
    
    # Extraire les fichiers du formulaire (file0, file1, file2, etc.)
    files = []
    for key in form.keys():
        if re.match(r"file\d+", key):
            field = form[key]
            
            # Vérifie si c'est un UploadFile et pas une autre valeur
            # Un UploadFile a les attributs filename, file, etc.
            if hasattr(field, "filename") and hasattr(field, "file"):
                files.append(field)
    
    # Vérifier qu'on a au moins 2 fichiers valides
    if len(files) < 2:
        logger.warning(f"Pas assez de fichiers valides: {len(files)} fichiers trouvés")
        raise HTTPException(status_code=400, detail="Au moins deux fichiers PDF sont nécessaires")
    
    # Vérifier les extensions des fichiers
    for file in files:
        try:
            if not is_valid_file_extension(file.filename, settings.ALLOWED_EXTENSIONS["pdf"]):
                raise HTTPException(
                    status_code=400,
                    detail=f"Le fichier {file.filename} n'est pas un PDF valide"
                )
        except Exception as e:
            logger.error(f"Erreur lors de la validation du fichier: {str(e)}")
            raise HTTPException(
                status_code=400,
                detail=f"Erreur lors de la validation du fichier: {str(e)}"
            )
    
    # Créer un identifiant unique pour cette opération
    operation_id = str(uuid.uuid4())
    
    # Préparer les chemins des fichiers
    temp_dir = os.path.join(settings.TEMP_DIR, operation_id)
    os.makedirs(temp_dir, exist_ok=True)
    
    pdf_paths = []
    try:
        # Sauvegarder tous les fichiers PDF
        for i, file in enumerate(files):
            try:
                file_path = save_upload_file(file, temp_dir, f"upload_{i}")
                pdf_paths.append(str(file_path))
            except Exception as e:
                logger.error(f"Erreur lors de la sauvegarde du fichier {i}: {str(e)}")
                # Nettoyer en cas d'erreur et continuer
                continue
        
        # Vérifier qu'on a toujours assez de fichiers valides
        if len(pdf_paths) < 2:
            raise HTTPException(
                status_code=400, 
                detail=f"Pas assez de fichiers PDF valides après sauvegarde: {len(pdf_paths)}"
            )
        
        # Définir le nom du fichier de sortie
        if not output_filename:
            output_filename = "merged.pdf"
        elif not output_filename.lower().endswith(".pdf"):
            output_filename += ".pdf"
        
        output_path = os.path.join(temp_dir, output_filename)
        
        # Fusionner les PDF
        merge_pdfs(pdf_paths, output_path)
        
        # Supprimer les fichiers intermédiaires en arrière-plan
        if settings.SECURE_MODE:
            for path in pdf_paths:
                background_tasks.add_task(secure_delete_file, path)
        
        # Renvoyer le fichier fusionné
        background_tasks.add_task(secure_delete_file, output_path)
        
        return FileResponse(
            path=output_path,
            filename=output_filename,
            media_type="application/pdf",
            background=background_tasks
        )
        
    except Exception as e:
        # Nettoyer en cas d'erreur
        for path in pdf_paths:
            try:
                secure_delete_file(path)
            except:
                pass
        
        logger.error(f"Erreur lors de la fusion des PDF: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
