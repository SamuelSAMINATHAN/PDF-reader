from fastapi import APIRouter, UploadFile, File, Form, HTTPException, BackgroundTasks, status, Query
from fastapi.responses import FileResponse, JSONResponse
from fastapi.encoders import jsonable_encoder
from PyPDF2 import PdfReader, PdfWriter
import os
import uuid
import tempfile
import shutil
from typing import List, Optional
import zipfile
from app.core.security import save_upload_file, secure_delete_file, is_valid_file_extension
from app.core.config import settings
from app.services.pdf_utils import split_pdf
import json
import re
import logging

router = APIRouter()

logger = logging.getLogger(__name__)

@router.post("/split", 
              summary="Diviser un PDF par plages de pages", 
              description="Extrait des pages spécifiques d'un PDF selon les plages définies")
async def split_pdf(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(..., description="Fichier PDF à diviser"),
    pages: str = Form(..., description="Plages de pages à extraire (ex: '1,3-5,7')"),
    output_filename: Optional[str] = Form(None, description="Nom du fichier de sortie"),
    clean_after: bool = Form(False, description="Nettoyer les fichiers temporaires après traitement"),
    metadata: Optional[bool] = Form(False, description="Renvoyer les métadonnées du fichier")
):
    """
    Divise un PDF en extrayant les pages spécifiées selon les plages indiquées.
    
    - **file**: Fichier PDF à diviser
    - **pages**: Format: "1,3-5,7" (page 1, pages 3 à 5, page 7)
    - **output_filename**: Nom personnalisé pour le fichier résultant (optionnel)
    - **clean_after**: Si True, les fichiers temporaires sont supprimés après traitement
    - **metadata**: Si True, renvoie des informations sur le fichier traité
    
    Retourne un fichier PDF contenant uniquement les pages spécifiées.
    """
    # Vérifier que le fichier est bien un PDF
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Le fichier doit être un PDF"
        )
    
    # Créer un dossier temporaire unique
    temp_dir = create_temp_dir()
    
    try:
        # Sauvegarder le fichier uploadé
        file_path = os.path.join(temp_dir, f"upload_{uuid.uuid4()}.pdf")
        file_content = await file.read()
        with open(file_path, "wb") as f:
            f.write(file_content)
        
        # Remettre le curseur au début pour réutilisation éventuelle
        file.file.seek(0)
        
        # Vérifier que le fichier est un PDF valide
        if not validate_pdf_file(file_path):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Le fichier {file.filename} n'est pas un PDF valide"
            )
        
        # Obtenir le nombre de pages
        with open(file_path, 'rb') as f:
            reader = PdfReader(f)
            total_pages = len(reader.pages)
        
        # Vérifier que la chaîne des plages de pages est valide
        try:
            pages_indices = parse_page_ranges(pages, total_pages)
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Format de plage de pages invalide: {str(e)}"
            )
        
        # Créer un nom de fichier unique pour le résultat
        if output_filename:
            # S'assurer que le nom du fichier se termine par .pdf
            if not output_filename.lower().endswith('.pdf'):
                output_filename += '.pdf'
        else:
            output_filename = f"split_{uuid.uuid4()}.pdf"
        
        # Chemin complet du fichier de sortie
        output_path = os.path.join(temp_dir, output_filename)
        
        # Créer un nouveau PDF pour le résultat
        writer = PdfWriter()
        
        # Ouvrir à nouveau le fichier PDF
        with open(file_path, 'rb') as f:
            reader = PdfReader(f)
            
            # Ajouter les pages demandées au nouveau PDF
            for page_idx in pages_indices:
                try:
                    writer.add_page(reader.pages[page_idx])
                except IndexError:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Page {page_idx + 1} introuvable. Le PDF a {total_pages} pages."
                    )
        
        # Sauvegarder le résultat
        with open(output_path, "wb") as output_file:
            writer.write(output_file)
        
        # Récupérer la taille du fichier résultant
        output_size = os.path.getsize(output_path)
        
        # Si l'utilisateur a demandé les métadonnées, les lui envoyer
        if metadata:
            result_info = {
                "success": True,
                "message": "Le PDF a été divisé avec succès",
                "input": {
                    "filename": file.filename,
                    "total_pages": total_pages,
                    "extracted_pages": len(pages_indices),
                },
                "output": {
                    "filename": output_filename,
                    "pages": len(pages_indices),
                    "size": output_size,
                }
            }
            
            # Planifier le nettoyage des fichiers temporaires
            if clean_after or settings.SECURE_MODE:
                background_tasks.add_task(clean_temp_files, temp_dir=temp_dir)
                
            return JSONResponse(content=jsonable_encoder(result_info))
        
        # Sinon, retourner le fichier
        else:
            # Planifier le nettoyage des fichiers temporaires
            if clean_after or settings.SECURE_MODE:
                background_tasks.add_task(clean_temp_files, temp_dir=temp_dir)
            
            return FileResponse(
                output_path,
                filename=output_filename,
                media_type="application/pdf",
                background=background_tasks
            )
    
    except HTTPException:
        # Nettoyer les fichiers temporaires en cas d'erreur HTTP
        background_tasks.add_task(clean_temp_files, temp_dir=temp_dir)
        raise
        
    except Exception as e:
        # Nettoyer les fichiers temporaires en cas d'erreur
        background_tasks.add_task(clean_temp_files, temp_dir=temp_dir)
        
        # Lever une exception HTTP avec le message d'erreur
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors de la division du PDF: {str(e)}"
        )


@router.post("/split-all", 
             summary="Diviser un PDF en plusieurs fichiers", 
             description="Divise un PDF en créant un fichier distinct pour chaque page")
async def split_pdf_to_multiple(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(..., description="Fichier PDF à diviser"),
    prefix: Optional[str] = Form(None, description="Préfixe pour les noms des fichiers"),
    include_page_numbers: bool = Form(True, description="Inclure les numéros de page dans les noms de fichiers"),
    clean_after: bool = Form(False, description="Nettoyer les fichiers temporaires après traitement")
):
    """
    Divise un PDF en créant un fichier PDF distinct pour chaque page.
    
    - **file**: Fichier PDF à diviser
    - **prefix**: Préfixe pour les noms des fichiers de sortie (par défaut: nom du fichier original)
    - **include_page_numbers**: Inclure les numéros de page dans les noms de fichiers
    - **clean_after**: Si True, les fichiers temporaires sont supprimés après traitement
    
    Retourne un fichier ZIP contenant tous les fichiers PDF générés.
    """
    # Vérifier que le fichier est bien un PDF
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Le fichier doit être un PDF"
        )
    
    # Créer un dossier temporaire unique
    temp_dir = create_temp_dir()
    output_dir = os.path.join(temp_dir, "output")
    os.makedirs(output_dir, exist_ok=True)
    
    try:
        # Sauvegarder le fichier uploadé
        file_path = os.path.join(temp_dir, f"upload_{uuid.uuid4()}.pdf")
        file_content = await file.read()
        with open(file_path, "wb") as f:
            f.write(file_content)
        
        # Remettre le curseur au début pour réutilisation éventuelle
        file.file.seek(0)
        
        # Vérifier que le fichier est un PDF valide
        if not validate_pdf_file(file_path):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Le fichier {file.filename} n'est pas un PDF valide"
            )
        
        # Définir le préfixe des fichiers de sortie
        if not prefix:
            # Utiliser le nom du fichier original sans extension
            prefix = os.path.splitext(file.filename)[0]
        
        # Ouvrir le PDF source
        with open(file_path, 'rb') as f:
            reader = PdfReader(f)
            total_pages = len(reader.pages)
            
            # Vérifier que le PDF a au moins une page
            if total_pages < 1:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Le PDF ne contient aucune page"
                )
            
            # Créer un fichier PDF séparé pour chaque page
            output_files = []
            
            for i in range(total_pages):
                # Créer un nom de fichier avec numéro de page
                if include_page_numbers:
                    output_filename = f"{prefix}_page_{i+1}.pdf"
                else:
                    output_filename = f"{prefix}_{i+1}.pdf"
                
                output_path = os.path.join(output_dir, output_filename)
                output_files.append(output_path)
                
                # Créer un nouveau PDF pour cette page
                writer = PdfWriter()
                writer.add_page(reader.pages[i])
                
                # Sauvegarder la page
                with open(output_path, "wb") as output_file:
                    writer.write(output_file)
        
        # Créer un fichier ZIP contenant tous les fichiers PDF
        zip_filename = f"{prefix}_all_pages.zip"
        zip_path = os.path.join(temp_dir, zip_filename)
        
        with zipfile.ZipFile(zip_path, 'w') as zipf:
            for output_file in output_files:
                # Ajouter chaque fichier PDF au ZIP en ne conservant que le nom du fichier
                zipf.write(output_file, os.path.basename(output_file))
        
        # Planifier le nettoyage des fichiers temporaires
        if clean_after or settings.SECURE_MODE:
            background_tasks.add_task(clean_temp_files, temp_dir=temp_dir)
        
        # Retourner le fichier ZIP
        return FileResponse(
            zip_path,
            filename=zip_filename,
            media_type="application/zip",
            background=background_tasks
        )
    
    except HTTPException:
        # Nettoyer les fichiers temporaires en cas d'erreur HTTP
        background_tasks.add_task(clean_temp_files, temp_dir=temp_dir)
        raise
        
    except Exception as e:
        # Nettoyer les fichiers temporaires en cas d'erreur
        background_tasks.add_task(clean_temp_files, temp_dir=temp_dir)
        
        # Lever une exception HTTP avec le message d'erreur
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors de la division du PDF: {str(e)}"
        )

@router.post("/split-file", 
            summary="Diviser un PDF par plages de pages (format JSON)", 
            description="Divise un PDF selon les plages au format JSON")
async def split_pdf_file(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(..., description="Fichier PDF à diviser"),
    ranges: str = Form(..., description="Plages de pages au format JSON ou 'each'"),
    output_filename_prefix: Optional[str] = Form(None, description="Préfixe pour les noms des fichiers")
):
    """
    Divise un PDF selon des plages de pages définies au format JSON.
    
    - **file**: Fichier PDF à diviser
    - **ranges**: Format JSON: '[{"id":"1","start":1,"end":5,"name":"Partie 1"},...]' ou 'each' pour une page par fichier
    - **output_filename_prefix**: Préfixe pour les noms des fichiers de sortie (optionnel)
    
    Retourne un fichier PDF ou un ZIP avec les PDF extraits.
    """
    # Vérifier que le fichier est bien un PDF
    if not is_valid_file_extension(file.filename, settings.ALLOWED_EXTENSIONS["pdf"]):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Le fichier doit être un PDF"
        )
    
    # Créer un dossier temporaire unique
    temp_dir = tempfile.mkdtemp(dir=settings.TEMP_DIR)
    output_dir = os.path.join(temp_dir, "output")
    os.makedirs(output_dir, exist_ok=True)
    
    try:
        # Sauvegarder le fichier uploadé
        file_path = os.path.join(temp_dir, f"upload_{uuid.uuid4()}.pdf")
        file_content = await file.read()
        with open(file_path, "wb") as f:
            f.write(file_content)
        
        # Remettre le curseur au début pour réutilisation éventuelle
        file.file.seek(0)
        
        # Déterminer le nombre total de pages du PDF
        with open(file_path, 'rb') as f:
            reader = PdfReader(f)
            total_pages = len(reader.pages)
        
        # Définir le préfixe des fichiers de sortie
        if not output_filename_prefix:
            # Utiliser le nom du fichier original sans extension
            output_filename_prefix = os.path.splitext(file.filename)[0]
        
        # Traiter selon si ranges est au format JSON ou 'each'
        if ranges == 'each':
            # Une page par fichier
            output_files = []
            
            with open(file_path, 'rb') as f:
                reader = PdfReader(f)
                
                for i in range(total_pages):
                    output_filename = f"{output_filename_prefix}_page_{i+1}.pdf"
                    output_path = os.path.join(output_dir, output_filename)
                    output_files.append(output_path)
                    
                    writer = PdfWriter()
                    writer.add_page(reader.pages[i])
                    
                    with open(output_path, "wb") as output_file:
                        writer.write(output_file)
            
            # Créer un fichier ZIP avec tous les PDF
            zip_filename = f"{output_filename_prefix}_all_pages.zip"
            zip_path = os.path.join(temp_dir, zip_filename)
            
            with zipfile.ZipFile(zip_path, 'w') as zipf:
                for output_file in output_files:
                    # Ajouter chaque fichier au ZIP en ne conservant que le nom du fichier
                    zipf.write(output_file, os.path.basename(output_file))
            
            # Planifier le nettoyage des fichiers temporaires
            background_tasks.add_task(clean_temp_files, temp_dir=temp_dir)
            
            return FileResponse(
                zip_path,
                filename=zip_filename,
                media_type="application/zip",
                background=background_tasks
            )
            
        else:
            # Essayer de parser les plages comme JSON
            try:
                ranges_data = json.loads(ranges)
                output_files = []
                
                # Pour chaque plage définie
                for range_item in ranges_data:
                    start = int(range_item.get('start', 1))
                    end = int(range_item.get('end', total_pages))
                    name = range_item.get('name', f"range_{start}_{end}")
                    
                    # Valider les numéros de pages
                    if start < 1 or start > total_pages:
                        start = 1
                    if end < start or end > total_pages:
                        end = total_pages
                    
                    # Convertir en nom de fichier valide
                    safe_name = re.sub(r'[^a-zA-Z0-9]', '_', name)
                    output_filename = f"{safe_name}.pdf"
                    output_path = os.path.join(output_dir, output_filename)
                    output_files.append(output_path)
                    
                    # Extraire les pages
                    with open(file_path, 'rb') as f:
                        reader = PdfReader(f)
                        writer = PdfWriter()
                        
                        for page_num in range(start, end + 1):
                            # PyPDF2 est 0-indexed
                            writer.add_page(reader.pages[page_num - 1])
                        
                        with open(output_path, "wb") as output_file:
                            writer.write(output_file)
                
                # Si on a une seule plage, retourner le PDF directement
                if len(output_files) == 1:
                    # Planifier le nettoyage des fichiers temporaires
                    background_tasks.add_task(clean_temp_files, temp_dir=temp_dir)
                    
                    return FileResponse(
                        output_files[0],
                        filename=os.path.basename(output_files[0]),
                        media_type="application/pdf",
                        background=background_tasks
                    )
                
                # Sinon, créer un fichier ZIP avec tous les PDF
                zip_filename = f"{output_filename_prefix}_splits.zip"
                zip_path = os.path.join(temp_dir, zip_filename)
                
                with zipfile.ZipFile(zip_path, 'w') as zipf:
                    for output_file in output_files:
                        # Ajouter chaque fichier au ZIP en ne conservant que le nom du fichier
                        zipf.write(output_file, os.path.basename(output_file))
                
                # Planifier le nettoyage des fichiers temporaires
                background_tasks.add_task(clean_temp_files, temp_dir=temp_dir)
                
                return FileResponse(
                    zip_path,
                    filename=zip_filename,
                    media_type="application/zip",
                    background=background_tasks
                )
                
            except json.JSONDecodeError:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Format JSON des plages invalide"
                )
            
    except HTTPException:
        # Nettoyer les fichiers temporaires en cas d'erreur HTTP
        background_tasks.add_task(clean_temp_files, temp_dir=temp_dir)
        raise
        
    except Exception as e:
        # Nettoyer les fichiers temporaires en cas d'erreur
        background_tasks.add_task(clean_temp_files, temp_dir=temp_dir)
        
        # Lever une exception HTTP avec le message d'erreur
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors de la division du PDF: {str(e)}"
        )

def clean_temp_files(temp_dir: str):
    """
    Supprime récursivement un répertoire temporaire et son contenu.
    """
    try:
        shutil.rmtree(temp_dir, ignore_errors=True)
    except Exception as e:
        logger.error(f"Erreur lors du nettoyage des fichiers temporaires: {str(e)}")

def create_temp_dir() -> str:
    """
    Crée un répertoire temporaire unique et retourne son chemin.
    """
    temp_dir = tempfile.mkdtemp(dir=settings.TEMP_DIR)
    return temp_dir

def validate_pdf_file(file_path: str) -> bool:
    """
    Vérifie si un fichier est un PDF valide.
    """
    try:
        with open(file_path, 'rb') as f:
            reader = PdfReader(f)
            # Vérifier qu'il y a au moins une page
            if len(reader.pages) > 0:
                return True
            return False
    except Exception:
        return False

def parse_page_ranges(ranges_str: str, total_pages: int) -> List[int]:
    """
    Parse une chaîne de plages de pages (ex: "1,3-5,7") en une liste d'indices de pages.
    Les numéros de pages commencent à 1, mais retourne des indices 0-based pour PyPDF2.
    """
    if not ranges_str or ranges_str.lower() == "all":
        return list(range(total_pages))
    
    page_indices = []
    
    # Diviser la chaîne en plages séparées par des virgules
    parts = ranges_str.split(",")
    
    for part in parts:
        part = part.strip()
        
        # Cas d'une plage (ex: "3-7")
        if "-" in part:
            try:
                start, end = part.split("-")
                start = int(start.strip())
                end = int(end.strip())
                
                # Vérifier que les pages sont dans les limites
                if start < 1:
                    start = 1
                if end > total_pages:
                    end = total_pages
                
                # Ajouter toutes les pages de la plage
                for i in range(start - 1, end):  # 0-indexed pour PyPDF2
                    if i not in page_indices:
                        page_indices.append(i)
                        
            except ValueError:
                raise ValueError(f"Format de plage invalide: {part}")
                
        # Cas d'une page unique
        else:
            try:
                page = int(part)
                
                # Vérifier que la page est dans les limites
                if 1 <= page <= total_pages:
                    page_idx = page - 1  # 0-indexed pour PyPDF2
                    if page_idx not in page_indices:
                        page_indices.append(page_idx)
                        
            except ValueError:
                raise ValueError(f"Numéro de page invalide: {part}")
    
    # Trier les indices de pages
    page_indices.sort()
    
    if not page_indices:
        raise ValueError("Aucune page valide spécifiée")
        
    return page_indices
