import React, { useState, useRef } from "react";
import { toast } from "react-hot-toast";
import FileUploader from "../components/FileUploader";
import PdfViewer from "../components/PdfViewer";
import SignaturePad from "../components/SignaturePad";
import Toolbar from "../components/Toolbar";
import { FileWithId, UploadedFile, pdfService, downloadFile, SignaturePosition } from '../services/api';

const SignPage: React.FC = () => {
  const [file, setFile] = useState<FileWithId | null>(null);
  const [signatureData, setSignatureData] = useState<string | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [signaturePosition, setSignaturePosition] = useState<SignaturePosition | null>(null);
  const [isPositioning, setIsPositioning] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pdfContainerRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<{ x: number, y: number } | null>(null);

  // Fonction pour gérer le changement de fichiers
  const handleFilesChange = (newFiles: UploadedFile[]) => {
    if (newFiles.length > 0) {
      const newFile: FileWithId = Object.assign(newFiles[0].file, { id: newFiles[0].id });
      setFile(newFile);
      setSignaturePosition(null);
      setError(null);
    } else {
      setFile(null);
      setSignaturePosition(null);
    }
  };

  // Positionner initialement la signature
  const handlePositionSignature = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!isPositioning || !pdfContainerRef.current) return;

    const rect = pdfContainerRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    // Position relative (pourcentage de la taille du conteneur)
    const relativeX = (x / rect.width) * 100;
    const relativeY = (y / rect.height) * 100;
    
    setSignaturePosition({
      page: pageNumber,
      x: relativeX,
      y: relativeY,
      width: 20, // Largeur par défaut (en pourcentage)
      height: 10, // Hauteur par défaut (en pourcentage)
    });
    
    setIsPositioning(false);
    toast.success(`Signature positionnée sur la page ${pageNumber}`);
  };

  // Commencer à déplacer la signature
  const handleStartDrag = (event: React.MouseEvent<HTMLDivElement>) => {
    event.stopPropagation();
    setIsDragging(true);
    
    // Enregistrer la position initiale du curseur
    dragStartRef.current = {
      x: event.clientX,
      y: event.clientY
    };
  };

  // Déplacer la signature
  const handleDrag = (event: React.MouseEvent<HTMLDivElement>) => {
    event.stopPropagation();
    
    if (!isDragging || !signaturePosition || !pdfContainerRef.current || !dragStartRef.current) return;
    
    const rect = pdfContainerRef.current.getBoundingClientRect();
    
    // Calculer le déplacement en pourcentage de la taille du conteneur
    const deltaX = ((event.clientX - dragStartRef.current.x) / rect.width) * 100;
    const deltaY = ((event.clientY - dragStartRef.current.y) / rect.height) * 100;
    
    // Mettre à jour la position en ajoutant le déplacement
    setSignaturePosition({
      ...signaturePosition,
      x: signaturePosition.x + deltaX,
      y: signaturePosition.y + deltaY
    });
    
    // Mettre à jour la position de départ pour le prochain mouvement
    dragStartRef.current = {
      x: event.clientX,
      y: event.clientY
    };
  };

  // Terminer le déplacement
  const handleEndDrag = (event: React.MouseEvent<HTMLDivElement>) => {
    event.stopPropagation();
    setIsDragging(false);
    dragStartRef.current = null;
  };

  // Ajouter la possibilité de redimensionner la signature
  const handleResizeStart = (event: React.MouseEvent<HTMLDivElement>) => {
    event.stopPropagation();
    setIsResizing(true);

    // Enregistrer la position initiale du curseur
    dragStartRef.current = {
      x: event.clientX,
      y: event.clientY
    };
  };

  const handleResize = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!isResizing || !signaturePosition || !pdfContainerRef.current || !dragStartRef.current) return;

    const rect = pdfContainerRef.current.getBoundingClientRect();

    // Calculer le changement de taille en pourcentage de la taille du conteneur
    const deltaX = ((event.clientX - dragStartRef.current.x) / rect.width) * 100;
    const deltaY = ((event.clientY - dragStartRef.current.y) / rect.height) * 100;

    // Mettre à jour la taille de la signature
    setSignaturePosition({
      ...signaturePosition,
      width: Math.max(5, signaturePosition.width + deltaX), // Largeur minimale de 5%
      height: Math.max(5, signaturePosition.height + deltaY) // Hauteur minimale de 5%
    });

    // Mettre à jour la position de départ pour le prochain mouvement
    dragStartRef.current = {
      x: event.clientX,
      y: event.clientY
    };
  };

  const handleResizeEnd = (event: React.MouseEvent<HTMLDivElement>) => {
    event.stopPropagation();
    setIsResizing(false);
    dragStartRef.current = null;
  };

  const handleSign = async () => {
    if (!file) {
      setError('Veuillez d\'abord sélectionner un fichier PDF.');
      return;
    }

    if (!signatureData) {
      setError('Veuillez d\'abord créer une signature.');
      return;
    }

    if (!signaturePosition) {
      setError('Veuillez positionner votre signature sur le document.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await pdfService.signPdf(
        file,
        signaturePosition,
        undefined,
        signatureData
      );

      // Générer un nom pour le fichier signé
      const fileName = file.name.replace('.pdf', '_signé.pdf');
      downloadFile(response.data, fileName);
    } catch (err) {
      console.error('Erreur lors de la signature du PDF:', err);
      setError('Une erreur est survenue lors de la signature du document. Veuillez réessayer.');
    } finally {
      setIsLoading(false);
    }
  };

  // Objets pour les actions de la barre d'outils
  const toolbarActions = [
    {
      id: 'position',
      label: signaturePosition ? 'Repositionner la signature' : signatureData ? 'Positionner la signature' : 'Créez d\'abord une signature',
      onClick: () => setIsPositioning(!isPositioning),
      disabled: !signatureData || !file,
    },
    {
      id: 'sign',
      label: 'Signer le document',
      onClick: handleSign,
      disabled: !file || !signatureData || !signaturePosition || isLoading,
      primary: true,
    },
  ];

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Signer un PDF</h1>
        <p className="text-gray-600">
          Créez votre signature et positionnez-la sur un document PDF.
        </p>
        
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <h2 className="text-xl font-semibold mb-4">Document</h2>
          <div className="mb-6">
            <FileUploader
              accept={{ 'application/pdf': ['.pdf'] }}
              maxFiles={1}
              maxSize={20 * 1024 * 1024} // 20 MB
              files={file ? [{ id: file.id, file: file }] : []}
              onFilesChange={handleFilesChange}
              label="Glissez et déposez votre fichier PDF ici"
              description="ou cliquez pour sélectionner un fichier (20 MB max.)"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
              {error}
            </div>
          )}

          {file && (
            <div 
              className={`relative border rounded-lg ${isPositioning ? 'cursor-crosshair border-blue-500' : 'border-gray-200'}`}
              ref={pdfContainerRef}
              onClick={handlePositionSignature}
              onMouseMove={handleDrag}
              onMouseUp={handleEndDrag}
            >
              {isPositioning && (
                <div className="absolute inset-0 bg-blue-50 bg-opacity-30 flex items-center justify-center z-10">
                  <div className="bg-white px-4 py-2 rounded-full shadow text-blue-700 font-medium">
                    Cliquez à l'endroit où vous souhaitez placer votre signature
                  </div>
                </div>
              )}
              
              <PdfViewer 
                file={file}
                showControls={false} // Désactiver les contrôles
                onPageSelect={(page) => setPageNumber(page)}
                initialPage={pageNumber}
              />
              
              {signaturePosition && signaturePosition.page === pageNumber && signatureData && (
                <div 
                  className={`absolute border-2 ${isDragging ? 'border-blue-600 cursor-grabbing' : 'border-blue-500 cursor-grab'} bg-white bg-opacity-70 flex items-center justify-center z-10`}
                  style={{
                    left: `${signaturePosition.x}%`,
                    top: `${signaturePosition.y}%`,
                    width: `${signaturePosition.width}%`,
                    height: `${signaturePosition.height}%`,
                    transform: 'translate(-50%, -50%)'
                  }}
                  onMouseDown={handleStartDrag}
                  onClick={(e) => e.stopPropagation()}
                >
                  <img 
                    src={signatureData} 
                    alt="Signature" 
                    className="w-full h-full object-contain pointer-events-none"
                    draggable={false}
                  />
                  <div 
                    className="absolute bottom-0 right-0 w-4 h-4 bg-blue-500 cursor-se-resize z-20"
                    onMouseDown={handleResizeStart}
                    onMouseMove={handleResize}
                    onMouseUp={handleResizeEnd}
                    onClick={(e) => e.stopPropagation()}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4">Signature</h2>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <SignaturePad
              width={300}
              height={200}
              onSave={setSignatureData}
            />
          </div>

          {signatureData && (
            <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <h3 className="text-lg font-medium mb-2">Votre signature</h3>
              <img 
                src={signatureData} 
                alt="Signature" 
                className="max-w-full border border-gray-300 bg-white"
                style={{maxHeight: '100px'}}
              />
            </div>
          )}

          <div className="mt-4 p-4 bg-blue-50 border border-blue-100 rounded-lg text-sm text-blue-700">
            <p>
              <strong>Astuce :</strong> Pour de meilleurs résultats, vous pouvez :
            </p>
            <ul className="list-disc ml-5 mt-2 space-y-1">
              <li>Dessiner avec votre souris ou écran tactile</li>
              <li>Importer une image de votre signature</li>
              <li>Prendre en photo votre signature sur papier</li>
            </ul>
          </div>

          <div className="mt-6">
            <Toolbar actions={toolbarActions} />
          </div>

          {isLoading && (
            <div className="flex justify-center items-center mt-6">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-700"></div>
              <span className="ml-3 text-blue-700">Signature en cours...</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SignPage;