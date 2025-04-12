#!/usr/bin/env python3
import sys
import os
import shutil
import subprocess
import platform

# Codes couleur pour le terminal
GREEN = "\033[32m"
YELLOW = "\033[33m"
RED = "\033[31m"
RESET = "\033[0m"

# Dépendances système requises
DEPENDENCIES = {
    "tesseract": {
        "name": "Tesseract OCR",
        "description": "Pour la reconnaissance de texte dans les documents scannés",
        "check_cmd": "tesseract --version",
        "installation": {
            "macos": "brew install tesseract",
            "linux": "sudo apt install tesseract-ocr",
            "windows": "Télécharger depuis https://github.com/UB-Mannheim/tesseract/wiki"
        }
    },
    "libreoffice": {
        "name": "LibreOffice",
        "description": "Pour la conversion de documents Office en PDF",
        "check_cmd": "libreoffice --version",
        "installation": {
            "macos": "brew install libreoffice",
            "linux": "sudo apt install libreoffice",
            "windows": "Télécharger depuis https://www.libreoffice.org/download/download/"
        }
    },
    "pandoc": {
        "name": "Pandoc",
        "description": "Pour la conversion de formats texte (DOCX, MD, HTML) en PDF",
        "check_cmd": "pandoc --version",
        "installation": {
            "macos": "brew install pandoc",
            "linux": "sudo apt install pandoc",
            "windows": "Télécharger depuis https://pandoc.org/installing.html"
        }
    },
    "ghostscript": {
        "name": "Ghostscript",
        "description": "Pour la compression avancée de PDF",
        "check_cmd": "gs --version",
        "installation": {
            "macos": "brew install ghostscript",
            "linux": "sudo apt install ghostscript",
            "windows": "Télécharger depuis https://www.ghostscript.com/download.html"
        }
    }
}


def is_tool_installed(command):
    """Vérifie si une commande est installée et disponible dans le PATH"""
    return shutil.which(command.split()[0]) is not None


def get_os_type():
    """Détermine le type d'OS"""
    system = platform.system().lower()
    if system == "darwin":
        return "macos"
    elif system == "linux":
        return "linux"
    elif system == "windows":
        return "windows"
    else:
        return "unknown"


def check_system_dependencies():
    """Vérifie toutes les dépendances système"""
    os_type = get_os_type()
    print(f"Système d'exploitation détecté: {os_type.upper()}")
    print("Vérification des dépendances système requises...\n")
    
    all_installed = True
    
    for tool, info in DEPENDENCIES.items():
        command = info["check_cmd"]
        print(f"Vérification de {info['name']}...")
        
        if is_tool_installed(command):
            try:
                result = subprocess.run(
                    command.split(), 
                    stdout=subprocess.PIPE, 
                    stderr=subprocess.PIPE, 
                    text=True
                )
                if result.returncode == 0:
                    version = result.stdout.split("\n")[0]
                    print(f"{GREEN}✓ {info['name']} est installé: {version}{RESET}")
                else:
                    print(f"{YELLOW}⚠ {info['name']} semble installé mais renvoie une erreur{RESET}")
                    all_installed = False
            except Exception as e:
                print(f"{RED}✗ Erreur lors de la vérification de {info['name']}: {str(e)}{RESET}")
                all_installed = False
        else:
            print(f"{RED}✗ {info['name']} n'est pas installé{RESET}")
            if os_type in info["installation"]:
                print(f"   → Installation: {info['installation'][os_type]}")
            all_installed = False
        
        print(f"   {info['description']}")
        print("")
    
    return all_installed


def check_python_dependencies():
    """Vérifie les dépendances Python requises"""
    print("Vérification des dépendances Python...\n")
    
    try:
        import PyPDF2
        import fitz  # PyMuPDF
        import PIL
        from PIL import Image
        import pytesseract
        
        print(f"{GREEN}✓ Toutes les dépendances Python principales sont installées{RESET}")
        return True
    
    except ImportError as e:
        print(f"{RED}✗ Certaines dépendances Python ne sont pas installées: {str(e)}{RESET}")
        print("   → Installation: pip install -r requirements.txt")
        return False


def main():
    """Fonction principale"""
    print("=== Vérification des dépendances pour l'application PDF-Reader ===\n")
    
    system_ok = check_system_dependencies()
    python_ok = check_python_dependencies()
    
    print("\n=== Résumé ===")
    if system_ok and python_ok:
        print(f"{GREEN}✓ Toutes les dépendances sont installées et configurées correctement.{RESET}")
        print(f"{GREEN}✓ Vous pouvez démarrer l'application avec 'uvicorn app.main:app --reload'.{RESET}")
        return 0
    else:
        if not system_ok:
            print(f"{RED}✗ Certaines dépendances système sont manquantes.{RESET}")
        if not python_ok:
            print(f"{RED}✗ Certaines dépendances Python sont manquantes.{RESET}")
        print(f"{YELLOW}⚠ Veuillez installer les dépendances manquantes avant de démarrer l'application.{RESET}")
        return 1


if __name__ == "__main__":
    sys.exit(main()) 