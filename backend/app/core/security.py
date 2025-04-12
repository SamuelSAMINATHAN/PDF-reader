import os
import shutil
import time
from datetime import datetime
from pathlib import Path

from .config import settings


def is_valid_file_extension(filename, allowed_extensions):
    """
    Vérifie si l'extension du fichier est autorisée.
    
    Args:
        filename (str): Nom du fichier à vérifier
        allowed_extensions (list): Liste des extensions autorisées
        
    Returns:
        bool: True si l'extension est autorisée, False sinon
    """
    if not filename:
        return False
    
    # Normaliser les extensions (ajouter le point si nécessaire)
    normalized_extensions = []
    for ext in allowed_extensions:
        if not ext.startswith('.'):
            normalized_extensions.append('.' + ext.lower())
        else:
            normalized_extensions.append(ext.lower())
    
    # Obtenir l'extension du fichier (avec le point)
    ext = os.path.splitext(filename)[1].lower()
    
    return ext in normalized_extensions


def generate_unique_filename(original_filename: str, prefix: str = "") -> str:
    """Génère un nom de fichier unique basé sur le timestamp et le nom original"""
    timestamp = int(time.time() * 1000)
    ext = original_filename.split('.')[-1].lower()
    base_name = os.path.splitext(original_filename)[0]
    
    # Limiter la longueur du nom de base à 30 caractères pour éviter les chemins trop longs
    if len(base_name) > 30:
        base_name = base_name[:30]
    
    # Nettoyer le nom (retirer caractères spéciaux, espaces, etc.)
    base_name = ''.join(c for c in base_name if c.isalnum() or c in '-_')
    
    return f"{prefix}_{timestamp}_{base_name}.{ext}"


def save_upload_file(upload_file, destination_folder: str, prefix: str = "") -> Path:
    """
    Sauvegarde un fichier uploadé et renvoie le chemin complet
    """
    filename = generate_unique_filename(upload_file.filename, prefix)
    file_path = os.path.join(destination_folder, filename)
    
    # Écrire le fichier
    with open(file_path, "wb") as f:
        f.write(upload_file.file.read())
    
    return Path(file_path)


def cleanup_old_files(directory: str, max_age_seconds: int = settings.FILE_RETENTION_SECONDS):
    """
    Nettoie les fichiers plus anciens que max_age_seconds
    """
    now = time.time()
    
    if not os.path.exists(directory):
        return
    
    for filename in os.listdir(directory):
        file_path = os.path.join(directory, filename)
        
        # Ignorer les dossiers
        if not os.path.isfile(file_path):
            continue
            
        # Supprimer si trop ancien
        file_age = now - os.path.getmtime(file_path)
        if file_age > max_age_seconds:
            try:
                os.remove(file_path)
            except Exception:
                pass  # Ignorer les erreurs


def secure_delete_file(file_path: str):
    """
    Supprime le fichier de manière sécurisée (utilisation immédiate en mode sécurisé)
    """
    if not os.path.exists(file_path):
        return
    
    try:
        os.remove(file_path)
    except Exception:
        pass  # Ignorer les erreurs
