import os
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, BackgroundTasks, status
from fastapi.responses import FileResponse
from PyPDF2 import PdfReader, PdfWriter
import uuid
import tempfile
import logging
from typing import List, Optional

from ....core.config import settings
from ....core.security import is_valid_file_extension, secure_delete_file

router = APIRouter()
logger = logging.getLogger(__name__)

@router.post("/extract", summary="Extraire des pages d'un PDF")
async def extract_pages_from_pdf(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(..., description="Fichier PDF à traiter"),
    pages: str = Form(..., description="Pages à extraire (ex: '1,3-5,7')"),
    output_filename: Optional[str] = Form(None, description="Nom du fichier de sortie"),
):
    """
    Extrait des pages spécifiques d'un PDF dans un nouveau fichier.
    
    - **file**: Fichier PDF à traiter
    - **pages**: Format: "1,3-5,7" (page 1, pages 3 à 5, page 7)
    - **output_filename**: Nom personnalisé pour le fichier résultant (optionnel)
    
    Retourne un fichier PDF contenant uniquement les pages sélectionnées.
    """
    # Vérifier que le fichier est bien un PDF
    if not is_valid_file_extension(file.filename, settings.ALLOWED_EXTENSIONS["pdf"]):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, 
            detail="Le fichier doit être un PDF"
        )
    
    # Créer un dossier temporaire
    temp_dir = tempfile.mkdtemp(dir=settings.TEMP_DIR)
    
    try:
        # Sauvegarder le fichier uploadé
        file_path = os.path.join(temp_dir, f"upload_{uuid.uuid4()}.pdf")
        file_content = await file.read()
        with open(file_path, "wb") as f:
            f.write(file_content)
        
        # Remettre le curseur au début pour réutilisation éventuelle
        file.file.seek(0)
        
        # Ouvrir le PDF source
        with open(file_path, 'rb') as f:
            reader = PdfReader(f)
            total_pages = len(reader.pages)
            
            # Analyser les pages à extraire
            page_indices = parse_page_ranges(pages, total_pages)
            
            if not page_indices:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Aucune page valide spécifiée"
                )
            
            # Créer un nouveau PDF
            writer = PdfWriter()
            
            # Ajouter les pages spécifiées
            for page_idx in page_indices:
                try:
                    writer.add_page(reader.pages[page_idx])
                except IndexError:
                    raise HTTPException(
                        status_code=status.HTTP_400_BAD_REQUEST,
                        detail=f"Page {page_idx + 1} introuvable. Le PDF a {total_pages} pages."
                    )
            
            # Définir le nom du fichier de sortie
            if output_filename:
                if not output_filename.lower().endswith('.pdf'):
                    output_filename += '.pdf'
            else:
                output_filename = f"extracted_{uuid.uuid4()}.pdf"
            
            output_path = os.path.join(temp_dir, output_filename)
            
            # Sauvegarder le nouveau PDF
            with open(output_path, "wb") as output_file:
                writer.write(output_file)
            
            # Planifier la suppression des fichiers temporaires
            background_tasks.add_task(secure_delete_file, file_path)
            background_tasks.add_task(secure_delete_file, output_path)
            
            # Retourner le fichier
            return FileResponse(
                path=output_path,
                filename=output_filename,
                media_type="application/pdf",
                background=background_tasks
            )
    
    except Exception as e:
        logger.error(f"Erreur lors de l'extraction des pages: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors de l'extraction des pages: {str(e)}"
        )

def parse_page_ranges(range_str: str, total_pages: int) -> List[int]:
    """
    Parse une chaîne de plages de pages (ex: "1,3-5,7") en une liste d'indices de pages.
    Les numéros de pages commencent à 1, mais retourne des indices 0-based pour PyPDF2.
    """
    page_indices = []
    
    # Diviser la chaîne en plages séparées par des virgules
    parts = range_str.split(",")
    
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
    
    return page_indices 