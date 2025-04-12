import os
import re
import PyPDF2
import fitz  # PyMuPDF
from PIL import Image
import tempfile
import base64
import io
from typing import List, Tuple, Dict, Optional, Union, Any

from ..core.config import settings
from ..core.security import secure_delete_file


def get_pdf_info(pdf_path: str) -> Dict[str, Any]:
    """
    Récupère les informations de base d'un PDF
    """
    try:
        doc = fitz.open(pdf_path)
        
        # Infos générales
        info = {
            "filename": os.path.basename(pdf_path),
            "total_pages": len(doc),
            "file_size": os.path.getsize(pdf_path),
            "encrypted": doc.is_encrypted,
            "metadata": doc.metadata,
            "pages": []
        }
        
        # Infos de pages
        for i, page in enumerate(doc):
            rect = page.rect
            page_info = {
                "page_number": i + 1,
                "width": rect.width,
                "height": rect.height,
                "rotation": page.rotation,
                "has_text": len(page.get_text()) > 0
            }
            info["pages"].append(page_info)
            
        doc.close()
        return info
        
    except Exception as e:
        raise ValueError(f"Erreur lors de l'analyse du PDF: {str(e)}")


def merge_pdfs(pdf_paths: List[str], output_path: str) -> str:
    """
    Fusionne plusieurs PDF en un seul
    """
    merger = PyPDF2.PdfMerger()
    
    try:
        for pdf_path in pdf_paths:
            merger.append(pdf_path)
            
        merger.write(output_path)
        merger.close()
        
        return output_path
    except Exception as e:
        merger.close()
        if os.path.exists(output_path):
            secure_delete_file(output_path)
        raise ValueError(f"Erreur lors de la fusion: {str(e)}")


def split_pdf(pdf_path: str, output_dir: str, ranges: str = "all") -> List[str]:
    """
    Divise un PDF selon des plages de pages
    ranges peut être:
    - "all" pour extraire chaque page individuellement
    - une liste de plages comme "1-3,5,7-9"
    
    Retourne la liste des chemins des fichiers créés
    """
    created_files = []
    
    try:
        # Ouvrir le PDF source
        with open(pdf_path, "rb") as file:
            reader = PyPDF2.PdfReader(file)
            total_pages = len(reader.pages)
            
            # Si on doit diviser toutes les pages
            if ranges == "all":
                # Créer un PDF par page
                for i in range(total_pages):
                    output_path = os.path.join(
                        output_dir, 
                        f"{os.path.splitext(os.path.basename(pdf_path))[0]}_page_{i+1}.pdf"
                    )
                    
                    writer = PyPDF2.PdfWriter()
                    writer.add_page(reader.pages[i])
                    
                    with open(output_path, "wb") as out_file:
                        writer.write(out_file)
                    
                    created_files.append(output_path)
            else:
                # Traiter les plages spécifiées (ex: "1-3,5,7-9")
                page_ranges = parse_page_ranges(ranges, total_pages)
                
                for i, page_range in enumerate(page_ranges):
                    output_path = os.path.join(
                        output_dir, 
                        f"{os.path.splitext(os.path.basename(pdf_path))[0]}_range_{i+1}.pdf"
                    )
                    
                    writer = PyPDF2.PdfWriter()
                    for page_num in page_range:
                        # PyPDF2 est 0-indexed mais l'utilisateur entre des numéros 1-indexed
                        writer.add_page(reader.pages[page_num - 1])
                    
                    with open(output_path, "wb") as out_file:
                        writer.write(out_file)
                    
                    created_files.append(output_path)
                
        return created_files
        
    except Exception as e:
        # Supprimer les fichiers créés en cas d'erreur
        for file_path in created_files:
            secure_delete_file(file_path)
        raise ValueError(f"Erreur lors de la division du PDF: {str(e)}")


def extract_pages(pdf_path: str, output_path: str, pages: List[int]) -> str:
    """
    Extrait certaines pages d'un PDF
    Les numéros de pages sont 1-indexed
    """
    try:
        with open(pdf_path, "rb") as file:
            reader = PyPDF2.PdfReader(file)
            writer = PyPDF2.PdfWriter()
            
            total_pages = len(reader.pages)
            
            # Vérifier si les pages demandées existent
            for page_num in pages:
                if page_num < 1 or page_num > total_pages:
                    raise ValueError(f"Page {page_num} n'existe pas. Le document contient {total_pages} pages.")
                
                # PyPDF2 est 0-indexed
                writer.add_page(reader.pages[page_num - 1])
            
            with open(output_path, "wb") as out_file:
                writer.write(out_file)
            
            return output_path
            
    except Exception as e:
        if os.path.exists(output_path):
            secure_delete_file(output_path)
        raise ValueError(f"Erreur lors de l'extraction des pages: {str(e)}")


def remove_pages(pdf_path: str, output_path: str, pages_to_remove: List[int]) -> str:
    """
    Supprime certaines pages d'un PDF
    Les numéros de pages sont 1-indexed
    """
    try:
        with open(pdf_path, "rb") as file:
            reader = PyPDF2.PdfReader(file)
            writer = PyPDF2.PdfWriter()
            
            total_pages = len(reader.pages)
            
            # Vérifier si les pages demandées existent
            for page_num in pages_to_remove:
                if page_num < 1 or page_num > total_pages:
                    raise ValueError(f"Page {page_num} n'existe pas. Le document contient {total_pages} pages.")
            
            # Ajouter toutes les pages SAUF celles à supprimer
            for i in range(total_pages):
                page_num = i + 1  # 1-indexed pour la comparaison
                if page_num not in pages_to_remove:
                    writer.add_page(reader.pages[i])
            
            with open(output_path, "wb") as out_file:
                writer.write(out_file)
            
            return output_path
            
    except Exception as e:
        if os.path.exists(output_path):
            secure_delete_file(output_path)
        raise ValueError(f"Erreur lors de la suppression des pages: {str(e)}")


def reorder_pages(pdf_path: str, output_path: str, new_order: List[int]) -> str:
    """
    Réorganise les pages d'un PDF selon un nouvel ordre
    new_order est une liste 1-indexed des numéros de pages dans le nouvel ordre
    """
    try:
        with open(pdf_path, "rb") as file:
            reader = PyPDF2.PdfReader(file)
            writer = PyPDF2.PdfWriter()
            
            total_pages = len(reader.pages)
            
            # Vérifier si l'ordre est valide (toutes les pages existent et sont présentes)
            if len(new_order) != total_pages:
                raise ValueError(f"L'ordre des pages doit contenir {total_pages} éléments.")
                
            for page_num in new_order:
                if page_num < 1 or page_num > total_pages:
                    raise ValueError(f"Page {page_num} n'existe pas. Le document contient {total_pages} pages.")
            
            # Ajouter les pages dans le nouvel ordre
            for page_num in new_order:
                # PyPDF2 est 0-indexed
                writer.add_page(reader.pages[page_num - 1])
            
            with open(output_path, "wb") as out_file:
                writer.write(out_file)
            
            return output_path
            
    except Exception as e:
        if os.path.exists(output_path):
            secure_delete_file(output_path)
        raise ValueError(f"Erreur lors de la réorganisation des pages: {str(e)}")


def add_signature(
    pdf_path: str, 
    output_path: str, 
    signature_path: Optional[str] = None,
    signature_data: Optional[str] = None, 
    position: Dict[str, float] = None
) -> str:
    """
    Ajoute une signature à un PDF
    Soit à partir d'un fichier image (signature_path)
    Soit à partir de données base64 (signature_data)
    """
    try:
        if not signature_path and not signature_data:
            raise ValueError("Vous devez fournir soit un fichier signature, soit des données base64")
            
        if not position:
            raise ValueError("La position de la signature est requise")
            
        # Ouvrir le document PDF
        doc = fitz.open(pdf_path)
        
        # Préparer l'image de signature
        if signature_path:
            img = Image.open(signature_path)
        else:
            # Décoder les données base64
            binary_data = base64.b64decode(signature_data.split(',')[1] if ',' in signature_data else signature_data)
            img = Image.open(io.BytesIO(binary_data))
        
        # Convertir en PNG pour PyMuPDF
        img_bytes = io.BytesIO()
        img.save(img_bytes, format="PNG")
        img_bytes.seek(0)
        
        # Page où insérer la signature (1-indexed)
        page_num = position.get("page", 1) - 1  # Convertir en 0-indexed
        if page_num < 0 or page_num >= len(doc):
            raise ValueError(f"Page {page_num+1} n'existe pas. Le document contient {len(doc)} pages.")
            
        page = doc[page_num]
        
        # Calculer les dimensions et position réelles
        page_width = page.rect.width
        page_height = page.rect.height
        
        x = position["x"] * page_width / 100  # Convertir pourcentage en points
        y = position["y"] * page_height / 100
        width = position["width"] * page_width / 100
        height = position["height"] * page_height / 100
        
        # Créer un rectangle pour la position de la signature
        rect = fitz.Rect(x, y, x + width, y + height)
        
        # Insérer l'image
        page.insert_image(rect, stream=img_bytes.getvalue())
        
        # Sauvegarder
        doc.save(output_path)
        doc.close()
        
        return output_path
        
    except Exception as e:
        if os.path.exists(output_path):
            secure_delete_file(output_path)
        raise ValueError(f"Erreur lors de l'ajout de la signature: {str(e)}")


def compress_pdf(pdf_path: str, output_path: str, quality: str = "medium") -> str:
    """
    Compresse un PDF
    quality: low, medium, high
    """
    try:
        # Paramètres de compression selon la qualité
        if quality == "low":
            # Compression maximale
            zoom_factor = 0.5
            compression_quality = 50
        elif quality == "medium":
            # Compression modérée
            zoom_factor = 0.75
            compression_quality = 75
        else:  # high
            # Compression légère
            zoom_factor = 0.9
            compression_quality = 90
            
        # Ouvrir le document avec PyMuPDF
        doc = fitz.open(pdf_path)
        
        # Créer un nouveau document vide
        compressed_doc = fitz.open()
        
        for page in doc:
            # Créer une image de la page
            pix = page.get_pixmap(matrix=fitz.Matrix(zoom_factor, zoom_factor))
            
            # Convertir en PIL Image
            img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
            
            # Compresser l'image
            img_bytes = io.BytesIO()
            img.save(img_bytes, format="JPEG", quality=compression_quality, optimize=True)
            img_bytes.seek(0)
            
            # Insérer l'image dans le nouveau document
            new_page = compressed_doc.new_page(width=page.rect.width, height=page.rect.height)
            new_page.insert_image(new_page.rect, stream=img_bytes.getvalue())
        
        # Sauvegarder
        compressed_doc.save(output_path)
        compressed_doc.close()
        doc.close()
        
        return output_path
        
    except Exception as e:
        if os.path.exists(output_path):
            secure_delete_file(output_path)
        raise ValueError(f"Erreur lors de la compression: {str(e)}")


def images_to_pdf(image_paths: List[str], output_path: str) -> str:
    """
    Convertit une liste d'images en un seul PDF
    """
    try:
        # Créer un nouveau document PDF
        pdf = fitz.open()
        
        for img_path in image_paths:
            # Ouvrir l'image avec PIL
            img = Image.open(img_path)
            
            # Convertir au format RGB si nécessaire (pour CMYK, etc.)
            if img.mode != "RGB":
                img = img.convert("RGB")
                
            # Obtenir les dimensions
            width, height = img.size
            
            # Ajouter une nouvelle page au PDF
            page = pdf.new_page(width=width, height=height)
            
            # Convertir l'image en bytes
            img_bytes = io.BytesIO()
            img.save(img_bytes, format="PNG")
            img_bytes.seek(0)
            
            # Insérer l'image dans la page
            page.insert_image(page.rect, stream=img_bytes.getvalue())
        
        # Sauvegarder
        pdf.save(output_path)
        pdf.close()
        
        return output_path
        
    except Exception as e:
        if os.path.exists(output_path):
            secure_delete_file(output_path)
        raise ValueError(f"Erreur lors de la conversion d'images en PDF: {str(e)}")


def parse_page_ranges(ranges_str: str, max_pages: int) -> List[List[int]]:
    """
    Convertit une chaîne de plages de pages en listes de numéros de pages
    Ex: "1-3,5,7-9" -> [[1,2,3], [5], [7,8,9]]
    """
    result = []
    
    # Diviser par les virgules
    for part in ranges_str.split(','):
        part = part.strip()
        
        if '-' in part:
            # C'est une plage (ex: 1-3)
            start, end = map(int, part.split('-'))
            
            if start < 1:
                start = 1
            if end > max_pages:
                end = max_pages
                
            if start <= end:
                result.append(list(range(start, end + 1)))
        else:
            # C'est un numéro unique
            page = int(part)
            if 1 <= page <= max_pages:
                result.append([page])
    
    return result
