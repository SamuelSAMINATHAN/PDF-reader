from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class PDFPageInfo(BaseModel):
    """Informations sur une page PDF"""
    page_number: int
    width: float
    height: float
    rotation: int = 0
    has_text: bool = False


class PDFInfo(BaseModel):
    """Informations sur un document PDF"""
    filename: str
    total_pages: int
    file_size: int
    encrypted: bool = False
    metadata: Optional[Dict[str, Any]] = None
    pages: List[PDFPageInfo] = []


class MergePDFRequest(BaseModel):
    """Demande de fusion de PDF"""
    file_ids: List[str]
    output_filename: Optional[str] = None


class SplitPDFRequest(BaseModel):
    """Demande de division d'un PDF"""
    file_id: str
    # Liste des plages de pages (ex: 1-3,5,7-9)
    # Ou "all" pour diviser toutes les pages
    ranges: str = "all"
    output_filename_prefix: Optional[str] = None


class ExtractPagesRequest(BaseModel):
    """Demande d'extraction de pages d'un PDF"""
    file_id: str
    pages: List[int]  # Liste des numéros de pages à extraire (1-based)
    output_filename: Optional[str] = None


class RemovePagesRequest(BaseModel):
    """Demande de suppression de pages d'un PDF"""
    file_id: str
    pages: List[int]  # Liste des numéros de pages à supprimer (1-based)
    output_filename: Optional[str] = None


class ReorderPagesRequest(BaseModel):
    """Demande de réorganisation de pages d'un PDF"""
    file_id: str
    new_order: List[int]  # Nouvel ordre des pages (1-based)
    output_filename: Optional[str] = None


class SignaturePosition(BaseModel):
    """Position d'une signature dans un document"""
    page: int = 1
    x: float  # Position X en pourcentage de la largeur
    y: float  # Position Y en pourcentage de la hauteur
    width: float  # Largeur en pourcentage de la largeur de page
    height: float  # Hauteur en pourcentage de la hauteur de page


class AddSignatureRequest(BaseModel):
    """Demande d'ajout d'une signature"""
    file_id: str
    signature_file_id: Optional[str] = None  # ID du fichier signature uploadé
    signature_data: Optional[str] = None  # Données base64 de la signature dessinée
    position: SignaturePosition
    output_filename: Optional[str] = None


class CompressPDFRequest(BaseModel):
    """Demande de compression d'un PDF"""
    file_id: str
    quality: str = "medium"  # low, medium, high
    output_filename: Optional[str] = None
