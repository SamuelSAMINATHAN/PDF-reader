import React, { useState, useRef, useEffect } from "react";
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
  const [totalPages, setTotalPages] = useState<number>(0);
  const [signaturePosition, setSignaturePosition] = useState<SignaturePosition | null>(null);
  const [isPositioning, setIsPositioning] = useState(false);
  const [resultURL, setResultURL] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pdfContainerRef = useRef<HTMLDivElement>(null);

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

  // Gestion des événements de signature
  const handleClearSignature = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
    setSignatureData(null);
  };

  const handleSaveSignature = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const signatureImage = canvas.toDataURL('image/png');
      setSignatureData(signatureImage);
    }
  };

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

  const handleDocumentLoadSuccess = (numPages: number) => {
    setTotalPages(numPages);
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
      label: signatureData ? 'Positionner la signature' : 'Créez d\'abord une signature',
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
                showControls={true}
                onPageSelect={(page) => setPageNumber(page)}
                initialPage={pageNumber}
              />
              
              {signaturePosition && signaturePosition.page === pageNumber && signatureData && (
                <div 
                  className="absolute border-2 border-blue-500 bg-white bg-opacity-70 flex items-center justify-center z-10"
                  style={{
                    left: `${signaturePosition.x}%`,
                    top: `${signaturePosition.y}%`,
                    width: `${signaturePosition.width}%`,
                    height: `${signaturePosition.height}%`,
                    transform: 'translate(-50%, -50%)'
                  }}
                >
                  <img 
                    src={signatureData} 
                    alt="Signature" 
                    className="w-full h-full object-contain"
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