import os
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, BackgroundTasks, status
from fastapi.responses import FileResponse
from typing import List, Optional
import tempfile
import uuid
import logging
import shutil
import subprocess
from pathlib import Path

from ....core.config import settings
from ....core.security import save_upload_file, secure_delete_file, is_valid_file_extension
from ....services.pdf_utils import images_to_pdf

router = APIRouter()
logger = logging.getLogger(__name__)

# Extensions acceptées pour la conversion
CONVERTIBLE_EXTENSIONS = {
    # Documents bureautiques
    "doc": "application/msword",
    "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "xls": "application/vnd.ms-excel",
    "xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "ppt": "application/vnd.ms-powerpoint",
    "pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    "rtf": "application/rtf",
    "txt": "text/plain",
    "odt": "application/vnd.oasis.opendocument.text",
    "ods": "application/vnd.oasis.opendocument.spreadsheet",
    "odp": "application/vnd.oasis.opendocument.presentation",
    "vsd": "application/vnd.visio",
    "vsdx": "application/vnd.visio",
    
    # Images
    "jpg": "image/jpeg",
    "jpeg": "image/jpeg",
    "png": "image/png",
    "gif": "image/gif",
    "tif": "image/tiff",
    "tiff": "image/tiff",
    "bmp": "image/bmp",
    "svg": "image/svg+xml",
    
    # Livres électroniques et formats spécialisés
    "epub": "application/epub+zip",
    "mobi": "application/x-mobipocket-ebook",
    "djvu": "image/vnd.djvu",
    "html": "text/html",
    "htm": "text/html",
    "xml": "application/xml",
    
    # Autres formats
    "tex": "application/x-tex",
    "md": "text/markdown",
    "dwg": "application/acad",
    "dxf": "application/dxf"
}


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


@router.post("/convert-to-pdf", summary="Convertir divers formats de fichiers en PDF")
async def convert_to_pdf(
    background_tasks: BackgroundTasks,
    files: List[UploadFile] = File(...),
    output_filename: str = Form(None)
):
    """
    Convertit divers formats de fichiers en PDF (documents bureautiques, images, etc.).
    
    - **files**: Liste des fichiers à convertir
    - **output_filename**: Nom du fichier PDF de sortie (optionnel)
    
    Conversions supportées:
    - Documents: doc, docx, xls, xlsx, ppt, pptx, rtf, txt, odt, ods, odp
    - Images: jpg, jpeg, png, gif, tif, tiff, bmp, svg
    - Livres électroniques: epub, mobi, djvu
    - Web: html, htm, xml
    - Autres: tex, md
    
    La conversion est effectuée en utilisant LibreOffice (pour les documents bureautiques) ou 
    d'autres outils spécifiques selon le format. Pour les formats non supportés nativement,
    le service tentera d'utiliser des outils tiers installés sur le système.
    """
    
    if not files:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Aucun fichier fourni"
        )
    
    # Créer un identifiant unique pour cette opération
    operation_id = str(uuid.uuid4())
    
    # Préparer les chemins des fichiers
    temp_dir = os.path.join(settings.TEMP_DIR, operation_id)
    os.makedirs(temp_dir, exist_ok=True)
    
    file_paths = []
    output_paths = []
    
    try:
        # Vérifier la disponibilité de LibreOffice
        has_libreoffice = shutil.which("libreoffice") is not None or shutil.which("soffice") is not None
        if not has_libreoffice:
            logger.warning("LibreOffice n'est pas installé. Certaines conversions pourraient échouer.")
        
        # Sauvegarder tous les fichiers
        for file in files:
            file_path = save_upload_file(file, temp_dir, "upload")
            file_paths.append(str(file_path))
        
        # Cas spécial: un seul fichier - la conversion est plus directe
        if len(files) == 1 and not output_filename:
            base_name = os.path.splitext(os.path.basename(files[0].filename))[0]
            output_filename = f"{base_name}.pdf"
        elif not output_filename:
            output_filename = "document_converti.pdf"
        
        if not output_filename.lower().endswith(".pdf"):
            output_filename += ".pdf"
        
        # Chemin final du PDF
        final_output_path = os.path.join(temp_dir, output_filename)
        
        # Si nous avons plusieurs fichiers, nous devons convertir chacun individuellement
        # puis fusionner les résultats
        if len(files) > 1:
            for i, file_path in enumerate(file_paths):
                extension = os.path.splitext(file_path)[1].lower().lstrip('.')
                
                # Nom du fichier de sortie temporaire
                temp_output = os.path.join(temp_dir, f"temp_output_{i}.pdf")
                
                if extension in ["jpg", "jpeg", "png", "gif", "tif", "tiff", "bmp"]:
                    # Pour les images, utiliser notre fonction existante
                    images_to_pdf([file_path], temp_output)
                elif has_libreoffice and extension in ["doc", "docx", "xls", "xlsx", "ppt", "pptx", "odt", "ods", "odp", "rtf", "txt"]:
                    # Pour les documents bureautiques, utiliser LibreOffice
                    try:
                        libreoffice_cmd = shutil.which("libreoffice") or shutil.which("soffice")
                        cmd = [
                            libreoffice_cmd,
                            "--headless",
                            "--convert-to", "pdf",
                            "--outdir", temp_dir,
                            file_path
                        ]
                        result = subprocess.run(cmd, capture_output=True, text=True)
                        
                        if result.returncode != 0:
                            logger.error(f"LibreOffice conversion failed: {result.stderr}")
                            raise HTTPException(
                                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                                detail=f"Erreur lors de la conversion: {result.stderr}"
                            )
                        
                        # LibreOffice crée le PDF avec le même nom mais extension .pdf
                        converted_file = Path(file_path).with_suffix('.pdf')
                        
                        # Renommer en temp_output_{i}.pdf pour uniformiser
                        if os.path.exists(converted_file):
                            shutil.move(str(converted_file), temp_output)
                    except Exception as e:
                        logger.error(f"LibreOffice conversion error: {str(e)}")
                        raise HTTPException(
                            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail=f"Erreur lors de la conversion: {str(e)}"
                        )
                else:
                    # Pour les autres formats, nous devrons implémenter des convertisseurs spécifiques
                    # ou renvoyer une erreur
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Le format '{extension}' n'est pas pris en charge pour la conversion"
                    )
                
                # Ajouter à la liste des fichiers PDF à fusionner
                if os.path.exists(temp_output):
                    output_paths.append(temp_output)
            
            # Si nous avons des PDFs à fusionner, on les combine
            from ....services.pdf_utils import merge_pdfs
            
            if len(output_paths) > 0:
                merge_pdfs(output_paths, final_output_path)
            else:
                raise HTTPException(
                    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                    detail="Aucun fichier n'a pu être converti"
                )
        else:
            # Un seul fichier à convertir
            file_path = file_paths[0]
            extension = os.path.splitext(file_path)[1].lower().lstrip('.')
            
            if extension in ["jpg", "jpeg", "png", "gif", "tif", "tiff", "bmp"]:
                # Pour les images, utiliser notre fonction existante
                images_to_pdf([file_path], final_output_path)
            elif has_libreoffice and extension in ["doc", "docx", "xls", "xlsx", "ppt", "pptx", "odt", "ods", "odp", "rtf", "txt"]:
                # Pour les documents bureautiques, utiliser LibreOffice
                try:
                    libreoffice_cmd = shutil.which("libreoffice") or shutil.which("soffice")
                    cmd = [
                        libreoffice_cmd,
                        "--headless",
                        "--convert-to", "pdf",
                        "--outdir", temp_dir,
                        file_path
                    ]
                    result = subprocess.run(cmd, capture_output=True, text=True)
                    
                    if result.returncode != 0:
                        logger.error(f"LibreOffice conversion failed: {result.stderr}")
                        raise HTTPException(
                            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                            detail=f"Erreur lors de la conversion: {result.stderr}"
                        )
                    
                    # LibreOffice crée le PDF avec le même nom mais extension .pdf
                    converted_file = Path(file_path).with_suffix('.pdf')
                    
                    # Renommer avec le nom de sortie souhaité
                    if os.path.exists(converted_file):
                        shutil.move(str(converted_file), final_output_path)
                except Exception as e:
                    logger.error(f"LibreOffice conversion error: {str(e)}")
                    raise HTTPException(
                        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                        detail=f"Erreur lors de la conversion: {str(e)}"
                    )
            else:
                # Pour les autres formats, nous devrons implémenter des convertisseurs spécifiques
                # ou renvoyer une erreur
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Le format '{extension}' n'est pas pris en charge pour la conversion"
                )
        
        # Vérifier que le fichier final existe
        if not os.path.exists(final_output_path):
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="La conversion a échoué, le fichier final n'a pas été créé"
            )
        
        # Nettoyer les fichiers temporaires
        for path in file_paths + output_paths:
            background_tasks.add_task(secure_delete_file, path)
        
        # Supprimer le fichier final après envoi
        background_tasks.add_task(secure_delete_file, final_output_path)
        
        # Retourner le PDF résultant
        return FileResponse(
            path=final_output_path,
            filename=output_filename,
            media_type="application/pdf",
            background=background_tasks
        )
        
    except Exception as e:
        logger.error(f"Erreur lors de la conversion: {str(e)}")
        
        # Nettoyer en cas d'erreur
        for path in file_paths + output_paths:
            try:
                if os.path.exists(path):
                    secure_delete_file(path)
            except:
                pass
        
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors de la conversion: {str(e)}"
        ) 