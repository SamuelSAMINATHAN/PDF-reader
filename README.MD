## 🧩 Fonctionnalités de l'application & Librairies utilisées

### 🔗 Fusionner plusieurs PDFs
- Combine plusieurs fichiers PDF en un seul.
- **Librairies :** PyPDF2, PyMuPDF

### ✂️ Diviser un PDF (pages individuelles ou plages)
- Coupe un PDF en plusieurs morceaux.
- **Librairies :** PyPDF2, PyMuPDF

### 📄 Extraire certaines pages
- Sélectionne et extrait des pages spécifiques.
- **Librairies :** PyPDF2, PyMuPDF

### 🧹 Supprimer certaines pages
- Supprime des pages d’un PDF existant.
- **Librairies :** PyPDF2, PyMuPDF

### 🔀 Réorganiser les pages (drag & drop)
- Réordonne les pages dans un PDF.
- **Librairies :** PyPDF2, PyMuPDF

### 🗜️ Compresser un PDF
- Réduit la taille d’un fichier PDF.
- **Librairies :** PyMuPDF, Ghostscript (système)

### ✍️ Ajouter une signature (image ou dessin)
- Insère une signature dans un PDF.
- **Librairies :** PyMuPDF, Pillow

### 🖼️ Convertir des images (JPEG/PNG) en PDF
- Transforme une ou plusieurs images en fichier PDF.
- **Librairies :** Pillow, reportlab, PyMuPDF

### 🖍️ Annoter / surligner un PDF
- Ajoute du surlignage, des formes ou des commentaires.
- **Librairies :** PyMuPDF

### 🔒 Protéger un PDF par mot de passe
- Ajoute une protection par mot de passe.
- **Librairies :** PyPDF2, PyMuPDF, cryptography (optionnel)

### 🔓 Déverrouiller un PDF
- Supprime les restrictions (si le fichier n’est pas protégé par DRM fort).
- **Librairies :** PyPDF2

### 🔎 OCR (reconnaissance de texte dans un PDF scanné)
- Convertit des scans en texte sélectionnable.
- **Librairies :** pytesseract, pdf2image, PyMuPDF, Pillow, numpy, opencv-python
- **Dépendance système :** Tesseract OCR

### 💧 Ajouter un filigrane (texte ou image)
- Insère un watermark dans le PDF.
- **Librairies :** reportlab, PyMuPDF, Pillow

### 📝 Créer une page PDF vierge
- Génère un document PDF vide ou une page blanche.
- **Librairies :** reportlab, PyMuPDF

### 🧾 Remplir un formulaire PDF
- Remplit des champs interactifs dans un PDF.
- **Librairies :** PyMuPDF, pdfrw (optionnel)

### 📁 Traitement batch
- Applique une action (fusion, split, etc.) à plusieurs fichiers d’un dossier.
- **Librairies :** PyPDF2, tqdm, os, glob

### 🛡️ Mode ultra sécurisé
- Supprime automatiquement tous les fichiers après traitement. Ne nécessite pas internet.
- **Librairies :** tempfile, os, shutil

### 📖 Visualiseur PDF avec miniatures
- Affiche des miniatures et permet la prévisualisation comme Adobe Reader.
- **Librairies :** PyMuPDF, pdf2image, pypdfium2
- **Frontend :** react-pdf

### 🔄 Conversion Word/Excel/PPT → PDF
- Convertit des fichiers `.docx`, `.xlsx`, `.pptx` en PDF.
- **Librairies :** pandoc, python-docx, python-pptx, openpyxl
- **Dépendance système :** LibreOffice (ou Pandoc CLI)

### 🖼️ Export PDF vers image (JPG, PNG)
- Génère une image par page d’un PDF.
- **Librairies :** pdf2image, PyMuPDF, pypdfium2

### 🪚 Découper une grande page PDF
- Divise une page A3 en deux pages A4 par exemple.
- **Librairies :** PyMuPDF, Pillow, opencv-python

### 📊 Ajouter un QR code ou un code-barres
- Génère un code QR ou un code-barres dans le PDF.
- **Librairies :** python-barcode, qrcode, reportlab, Pillow

---

## ⚙️ Dépendances système requises (hors Python)

- **Tesseract OCR** : pour la reconnaissance de texte dans des scans
  - macOS : `brew install tesseract`
  - Ubuntu/Debian : `sudo apt install tesseract-ocr`

- **LibreOffice** : pour convertir les fichiers Office en PDF
  - macOS : `brew install libreoffice`
  - Ubuntu/Debian : `sudo apt install libreoffice`

- **Pandoc** : pour convertir `.docx`, `.md`, `.html` en PDF
  - macOS : `brew install pandoc`
  - Ubuntu/Debian : `sudo apt install pandoc`

- **Ghostscript** (optionnel) : pour compresser les fichiers PDF
  - macOS : `brew install ghostscript`
  - Ubuntu/Debian : `sudo apt install ghostscript`
# PDF-reader
