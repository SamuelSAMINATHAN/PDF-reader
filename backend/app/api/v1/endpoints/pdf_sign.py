import os
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse
from typing import List, Optional
import tempfile
import uuid
import json

from ....core.config import settings
from ....core.security import save_upload_file, secure_delete_file, is_valid_file_extension
from ....services.pdf_utils import add_signature

router = APIRouter()


@router.post("/sign", summary="Ajouter une signature à un PDF")
async def sign_pdf(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    signature_image: Optional[UploadFile] = File(None),
    signature_data: Optional[str] = Form(None),
    position: str = Form(...),  # JSON: {"page": 1, "x": 10, "y": 20, "width": 100, "height": 50}
    output_filename: str = Form(None)
):
    """
    Ajoute une signature à un fichier PDF.
    
    - **file**: Fichier PDF à signer
    - **signature_image**: Image de signature uploadée (optionnel si signature_data fourni)
    - **signature_data**: Données base64 de la signature dessinée (optionnel si signature_image fourni)
    - **position**: Position de la signature au format JSON
      {"page": numéro de page, "x": % largeur, "y": % hauteur, "width": % largeur, "height": % hauteur}
    - **output_filename**: Nom du fichier de sortie (optionnel)
    """
    
    # Vérifier que le fichier est un PDF
    if not is_valid_file_extension(file.filename, settings.ALLOWED_EXTENSIONS["pdf"]):
        raise HTTPException(status_code=400, detail="Le fichier n'est pas un PDF valide")
    
    # Vérifier qu'une signature est fournie (image ou données)
    if not signature_image and not signature_data:
        raise HTTPException(
            status_code=400,
            detail="Vous devez fournir soit une image de signature, soit des données de signature dessinée"
        )
    
    # Vérifier le format de l'image si fournie
    if signature_image and not is_valid_file_extension(
        signature_image.filename, 
        settings.ALLOWED_EXTENSIONS["image"]
    ):
        raise HTTPException(
            status_code=400,
            detail="L'image de signature doit être au format JPEG, PNG, GIF ou BMP"
        )
    
    # Créer un identifiant unique pour cette opération
    operation_id = str(uuid.uuid4())
    
    # Préparer les chemins des fichiers
    temp_dir = os.path.join(settings.TEMP_DIR, operation_id)
    os.makedirs(temp_dir, exist_ok=True)
    
    try:
        # Sauvegarder le fichier PDF
        pdf_path = save_upload_file(file, temp_dir, "upload")
        
        # Sauvegarder l'image de signature si fournie
        signature_path = None
        if signature_image:
            signature_path = save_upload_file(signature_image, temp_dir, "signature")
        
        # Définir le nom du fichier de sortie
        if not output_filename:
            base_name = os.path.splitext(os.path.basename(file.filename))[0]
            output_filename = f"{base_name}_signe.pdf"
        elif not output_filename.lower().endswith(".pdf"):
            output_filename += ".pdf"
            
        output_path = os.path.join(temp_dir, output_filename)
        
        # Convertir la position JSON en dictionnaire
        try:
            position_dict = json.loads(position)
            # Vérifier les clés requises
            required_keys = ["page", "x", "y", "width", "height"]
            if not all(key in position_dict for key in required_keys):
                raise ValueError(f"La position doit contenir les clés: {', '.join(required_keys)}")
        except json.JSONDecodeError:
            raise HTTPException(status_code=400, detail="Format JSON invalide pour la position")
        
        # Ajouter la signature
        add_signature(
            str(pdf_path),
            output_path,
            str(signature_path) if signature_path else None,
            signature_data,
            position_dict
        )
        
        # Supprimer les fichiers intermédiaires en arrière-plan
        if settings.SECURE_MODE:
            background_tasks.add_task(secure_delete_file, str(pdf_path))
            if signature_path:
                background_tasks.add_task(secure_delete_file, str(signature_path))
        
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
        if 'signature_path' in locals() and signature_path:
            secure_delete_file(str(signature_path))
        
        raise HTTPException(status_code=500, detail=str(e)) 