import React, { useState } from 'react';
import FileUploader from '../components/FileUploader';
import Toolbar from '../components/Toolbar';
import { pdfService, downloadFile, UploadedFile } from '../services/api';

const MergePage: React.FC = () => {
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFilesChange = (newFiles: UploadedFile[]) => {
    setFiles(newFiles);
    setError(null);
  };

  const handleMerge = async () => {
    if (files.length < 2) {
      setError('Veuillez sélectionner au moins deux fichiers PDF à fusionner.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Extraire les objets File natifs
      const fileObjects = files.map(uploadedFile => uploadedFile.file);
      
      // Utiliser le service API pour fusionner les PDF
      const response = await pdfService.mergePdfs(fileObjects);
      
      // Générer un nom pour le fichier fusionné
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `merged_${timestamp}.pdf`;
      
      // Télécharger le fichier
      downloadFile(response.data, fileName);
      
    } catch (err) {
      console.error('Erreur lors de la fusion des PDF:', err);
      setError('Une erreur est survenue lors de la fusion des fichiers PDF. Veuillez réessayer.');
    } finally {
      setIsLoading(false);
    }
  };

  const toolbarActions = [
    {
      id: 'merge',
      label: 'Fusionner les PDF',
      onClick: handleMerge,
      disabled: files.length < 2 || isLoading,
      primary: true,
    },
  ];

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Fusionner des PDF</h1>
        <p className="text-gray-600">
          Combinez plusieurs documents PDF en un seul fichier. Glissez et déposez vos fichiers PDF 
          ci-dessous et ajustez leur ordre si nécessaire.
        </p>
      </div>

      <div className="mb-6">
        <FileUploader
          accept={{ 'application/pdf': ['.pdf'] }}
          maxFiles={10}
          maxSize={10 * 1024 * 1024} // 10 MB
          files={files}
          onFilesChange={handleFilesChange}
          label="Glissez et déposez vos fichiers PDF ici"
          description="ou cliquez pour sélectionner des fichiers (10 MB max. par fichier)"
        />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      {files.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded mb-6">
          <p className="font-medium">Ordre de fusion</p>
          <p className="text-sm">Les fichiers seront fusionnés dans l'ordre où ils apparaissent ci-dessus.</p>
          <p className="text-sm">Pour changer l'ordre, supprimez les fichiers et ajoutez-les à nouveau dans l'ordre souhaité.</p>
        </div>
      )}

      <Toolbar actions={toolbarActions} />

      {isLoading && (
        <div className="flex justify-center items-center mt-6">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-700"></div>
          <span className="ml-3 text-blue-700">Fusion en cours...</span>
        </div>
      )}
    </div>
  );
};

export default MergePage;
