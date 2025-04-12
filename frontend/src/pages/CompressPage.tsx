import React, { useState } from 'react';
import FileUploader from '../components/FileUploader';
import Toolbar from '../components/Toolbar';
import { FileWithId, UploadedFile, pdfService, downloadFile } from '../services/api';

type CompressionQuality = 'low' | 'medium' | 'high';

const CompressPage: React.FC = () => {
  const [file, setFile] = useState<FileWithId | null>(null);
  const [quality, setQuality] = useState<CompressionQuality>('medium');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState<number | null>(null);

  const handleFilesChange = (newFiles: UploadedFile[]) => {
    if (newFiles.length > 0) {
      // On convertit UploadedFile en FileWithId
      const newFile: FileWithId = Object.assign(newFiles[0].file, { id: newFiles[0].id });
      setFile(newFile);
      setFileSize(newFile.size);
      setError(null);
    } else {
      setFile(null);
      setFileSize(null);
    }
  };

  const handleQualityChange = (newQuality: CompressionQuality) => {
    setQuality(newQuality);
  };

  const handleCompress = async () => {
    if (!file) {
      setError('Veuillez d\'abord sélectionner un fichier PDF.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await pdfService.compressPdf(file, quality);

      // Télécharger le fichier résultant
      const fileName = file.name.replace('.pdf', `_compressé_${quality}.pdf`);
      downloadFile(response.data, fileName);

      // Afficher la taille du fichier compressé
      const compressedSize = response.data.size;
      const compressionRatio = fileSize && compressedSize ? (1 - compressedSize / fileSize) * 100 : null;
      console.log(`Taille originale: ${fileSize} octets, Taille compressée: ${compressedSize} octets, Ratio: ${compressionRatio?.toFixed(2)}%`);
    } catch (err) {
      console.error('Erreur lors de la compression du PDF:', err);
      setError('Une erreur est survenue lors de la compression du fichier. Veuillez réessayer.');
    } finally {
      setIsLoading(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' octets';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' Ko';
    return (bytes / (1024 * 1024)).toFixed(2) + ' Mo';
  };

  const toolbarActions = [
    {
      id: 'compress',
      label: 'Compresser le PDF',
      onClick: handleCompress,
      disabled: !file || isLoading,
      primary: true,
    },
  ];

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Compresser un PDF</h1>
        <p className="text-gray-600">
          Réduisez la taille de votre document PDF tout en préservant sa qualité.
        </p>
      </div>

      <div className="mb-6">
        <FileUploader
          accept={{ 'application/pdf': ['.pdf'] }}
          maxFiles={1}
          maxSize={50 * 1024 * 1024} // 50 MB
          files={file ? [{ id: file.id, file: file }] : []}
          onFilesChange={handleFilesChange}
          label="Glissez et déposez votre fichier PDF ici"
          description="ou cliquez pour sélectionner un fichier (50 MB max.)"
        />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      {file && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
          <div className="mb-4">
            <h2 className="text-lg font-semibold mb-2">Options de compression</h2>
            {fileSize && (
              <p className="text-sm text-gray-600 mb-4">
                Taille actuelle du fichier: <span className="font-medium">{formatFileSize(fileSize)}</span>
              </p>
            )}
            
            <div className="space-y-4">
              <p className="text-sm font-medium text-gray-700">Niveau de compression:</p>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    quality === 'high' 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => handleQualityChange('high')}
                >
                  <div className="font-semibold mb-1">Légère</div>
                  <p className="text-xs text-gray-600">
                    Compression minimale avec qualité optimale. Idéal pour les documents avec beaucoup d'images.
                  </p>
                </div>
                
                <div
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    quality === 'medium' 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => handleQualityChange('medium')}
                >
                  <div className="font-semibold mb-1">Moyenne</div>
                  <p className="text-xs text-gray-600">
                    Bon équilibre entre taille et qualité. Recommandé pour la plupart des documents.
                  </p>
                </div>
                
                <div
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    quality === 'low' 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => handleQualityChange('low')}
                >
                  <div className="font-semibold mb-1">Forte</div>
                  <p className="text-xs text-gray-600">
                    Compression maximale pour réduire significativement la taille. Peut affecter la qualité.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <Toolbar actions={toolbarActions} />

      {isLoading && (
        <div className="flex justify-center items-center mt-6">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-700"></div>
          <span className="ml-3 text-blue-700">Compression en cours...</span>
        </div>
      )}
    </div>
  );
};

export default CompressPage; 