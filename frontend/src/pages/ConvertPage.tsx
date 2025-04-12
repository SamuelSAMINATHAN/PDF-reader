import React, { useState } from 'react';
import FileUploader from '../components/FileUploader';
import Toolbar from '../components/Toolbar';
import { FileWithId, UploadedFile, pdfService, downloadFile } from '../services/api';

interface ImagePreview {
  id: string;
  file: File;
  preview: string;
}

const ConvertPage: React.FC = () => {
  const [files, setFiles] = useState<ImagePreview[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [outputFilename, setOutputFilename] = useState('');

  const handleFilesChange = (newFiles: UploadedFile[]) => {
    const imageFiles = newFiles.map(file => ({
      id: file.id,
      file: file.file,
      preview: file.preview || ''
    }));
    setFiles(imageFiles);
    setError(null);

    // Proposer un nom par défaut pour le PDF si c'est le premier fichier
    if (imageFiles.length > 0 && !outputFilename) {
      // Utiliser le nom du premier fichier sans extension + "converted"
      const baseName = imageFiles[0].file.name.split('.').slice(0, -1).join('.');
      setOutputFilename(baseName ? `${baseName}_converti.pdf` : 'images_converties.pdf');
    }
  };

  const handleConvert = async () => {
    if (files.length === 0) {
      setError('Veuillez sélectionner au moins une image à convertir.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Extraire juste les objets File des images
      const imageFiles = files.map(img => img.file);
      
      // Nom de fichier final
      const finalFilename = outputFilename || 'images_converties.pdf';
      
      const response = await pdfService.imagesToPdf(imageFiles, finalFilename);
      
      // Télécharger le PDF résultant
      downloadFile(response.data, finalFilename);
    } catch (err) {
      console.error('Erreur lors de la conversion en PDF:', err);
      setError('Une erreur est survenue lors de la conversion. Veuillez réessayer.');
    } finally {
      setIsLoading(false);
    }
  };

  const toolbarActions = [
    {
      id: 'convert',
      label: 'Convertir en PDF',
      onClick: handleConvert,
      disabled: files.length === 0 || isLoading,
      primary: true,
    },
  ];

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Convertir des images en PDF</h1>
        <p className="text-gray-600">
          Sélectionnez une ou plusieurs images pour les convertir en un document PDF.
        </p>
      </div>

      <div className="mb-6">
        <FileUploader
          accept={{ 'image/*': ['.jpg', '.jpeg', '.png', '.gif', '.webp'] }}
          maxFiles={20}
          maxSize={10 * 1024 * 1024} // 10 MB par image
          files={files.map(img => ({ id: img.id, file: img.file, preview: img.preview }))}
          onFilesChange={handleFilesChange}
          label="Glissez et déposez vos images ici"
          description="ou cliquez pour sélectionner des images (10 MB max par image, 20 images max)"
        />
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
          {error}
        </div>
      )}

      {files.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
          <div className="mb-4">
            <h2 className="text-lg font-semibold">Options de conversion</h2>
            <p className="text-sm text-gray-600 mt-1">
              {files.length} image{files.length > 1 ? 's' : ''} sélectionnée{files.length > 1 ? 's' : ''} pour conversion.
            </p>
          </div>

          <div className="mb-4">
            <label htmlFor="output-filename" className="block text-sm font-medium text-gray-700 mb-1">
              Nom du fichier PDF résultant
            </label>
            <input
              type="text"
              id="output-filename"
              value={outputFilename}
              onChange={(e) => setOutputFilename(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded"
              placeholder="nom_du_fichier.pdf"
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mt-4">
            {files.map((img, index) => (
              <div key={img.id} className="relative border rounded-lg overflow-hidden">
                <img 
                  src={img.preview} 
                  alt={`Image ${index + 1}`} 
                  className="w-full h-32 object-cover"
                />
                <div className="absolute top-0 left-0 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded-br">
                  {index + 1}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <Toolbar actions={toolbarActions} />

      {isLoading && (
        <div className="flex justify-center items-center mt-6">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-700"></div>
          <span className="ml-3 text-blue-700">Conversion en cours...</span>
        </div>
      )}
    </div>
  );
};

export default ConvertPage; 