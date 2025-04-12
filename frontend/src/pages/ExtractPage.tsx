import React, { useState } from 'react';
import FileUploader from '../components/FileUploader';
import Toolbar from '../components/Toolbar';
import { FileWithId, UploadedFile, pdfService, downloadFile } from '../services/api';

const ExtractPage: React.FC = () => {
  const [file, setFile] = useState<FileWithId | null>(null);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [selectedPages, setSelectedPages] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFilesChange = (newFiles: UploadedFile[]) => {
    if (newFiles.length > 0) {
      // On convertit UploadedFile en FileWithId
      const newFile: FileWithId = Object.assign(newFiles[0].file, { id: newFiles[0].id });
      setFile(newFile);
      // Simuler l'obtention du nombre de pages
      fetchPageCount(newFile);
      setError(null);
      setSelectedPages([]);
    } else {
      setFile(null);
      setTotalPages(0);
      setSelectedPages([]);
    }
  };

  const fetchPageCount = async (file: File) => {
    setIsLoading(true);
    try {
      // Appeler l'API pour obtenir le nombre de pages
      const response = await pdfService.getPdfInfo(file);
      
      // Mettre à jour le nombre de pages
      const pages = response.data.pageCount || 10;
      setTotalPages(pages);
    } catch (err) {
      console.error('Erreur lors de l\'analyse du PDF:', err);
      setError('Impossible de déterminer le nombre de pages dans ce document.');
      // Pour la démonstration, nous définissons quand même un nombre de pages par défaut
      setTotalPages(10);
    } finally {
      setIsLoading(false);
    }
  };

  const togglePageSelection = (pageNumber: number) => {
    setSelectedPages(prevSelectedPages => {
      if (prevSelectedPages.includes(pageNumber)) {
        return prevSelectedPages.filter(p => p !== pageNumber);
      } else {
        return [...prevSelectedPages, pageNumber].sort((a, b) => a - b);
      }
    });
  };

  const selectAllPages = () => {
    const allPages = Array.from({ length: totalPages }, (_, i) => i + 1);
    setSelectedPages(allPages);
  };

  const clearSelection = () => {
    setSelectedPages([]);
  };

  const handleExtract = async () => {
    if (!file) {
      setError('Veuillez d\'abord sélectionner un fichier PDF.');
      return;
    }

    if (selectedPages.length === 0) {
      setError('Veuillez sélectionner au moins une page à extraire.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Utiliser le service API pour extraire les pages
      const response = await pdfService.extractPages(file, selectedPages.join(','));

      // Générer un nom pour le fichier extrait
      const fileName = file.name.replace('.pdf', '_extrait.pdf');
      downloadFile(response.data, fileName);
    } catch (err) {
      console.error('Erreur lors de l\'extraction des pages:', err);
      setError('Une erreur est survenue lors de l\'extraction des pages. Veuillez réessayer.');
    } finally {
      setIsLoading(false);
    }
  };

  const toolbarActions = [
    {
      id: 'selectAll',
      label: 'Tout sélectionner',
      onClick: selectAllPages,
      disabled: !file || totalPages === 0,
    },
    {
      id: 'clearSelection',
      label: 'Effacer la sélection',
      onClick: clearSelection,
      disabled: selectedPages.length === 0,
    },
    {
      id: 'extract',
      label: 'Extraire les pages',
      onClick: handleExtract,
      disabled: !file || selectedPages.length === 0 || isLoading,
      primary: true,
    },
  ];

  // Générer la grille de pages
  const renderPageGrid = () => {
    if (!file || totalPages === 0) return null;

    return (
      <div className="mt-6">
        <h2 className="text-lg font-semibold mb-3">Sélectionnez les pages à extraire</h2>
        <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => (
            <button
              key={pageNum}
              onClick={() => togglePageSelection(pageNum)}
              className={`
                h-12 w-full flex items-center justify-center rounded-md transition-colors
                ${selectedPages.includes(pageNum) 
                  ? 'bg-blue-600 text-white' 
                  : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'}
              `}
            >
              {pageNum}
            </button>
          ))}
        </div>
        <p className="mt-2 text-sm text-gray-600">
          {selectedPages.length > 0 
            ? `${selectedPages.length} page${selectedPages.length > 1 ? 's' : ''} sélectionnée${selectedPages.length > 1 ? 's' : ''}: ${selectedPages.join(', ')}` 
            : 'Aucune page sélectionnée'}
        </p>
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Extraire des pages</h1>
        <p className="text-gray-600">
          Extrayez des pages spécifiques d'un document PDF pour créer un nouveau fichier PDF.
        </p>
      </div>

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

      {renderPageGrid()}

      <div className="mt-6">
        <Toolbar actions={toolbarActions} />
      </div>

      {isLoading && (
        <div className="flex justify-center items-center mt-6">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-700"></div>
          <span className="ml-3 text-blue-700">Extraction en cours...</span>
        </div>
      )}
    </div>
  );
};

export default ExtractPage; 