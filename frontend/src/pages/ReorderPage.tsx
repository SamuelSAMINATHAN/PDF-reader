import React, { useState } from 'react';
import FileUploader from '../components/FileUploader';
import PageDragDrop from '../components/PageDragDrop';
import Toolbar from '../components/Toolbar';
import { FileWithId, UploadedFile, pdfService, downloadFile } from '../services/api';

const ReorderPage: React.FC = () => {
  const [file, setFile] = useState<FileWithId | null>(null);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [pageOrder, setPageOrder] = useState<number[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  const handleFilesChange = (newFiles: UploadedFile[]) => {
    if (newFiles.length > 0) {
      // On convertit UploadedFile en FileWithId
      const newFile: FileWithId = Object.assign(newFiles[0].file, { id: newFiles[0].id });
      setFile(newFile);
      // Obtenir le nombre de pages
      fetchPageCount(newFile);
      setError(null);
      setIsDirty(false);
    } else {
      setFile(null);
      setTotalPages(0);
      setPageOrder([]);
      setIsDirty(false);
    }
  };

  const fetchPageCount = async (file: File) => {
    setIsLoading(true);
    try {
      // Appeler l'API pour obtenir le nombre de pages
      const response = await pdfService.getPdfInfo(file);
      
      // Mettre à jour le nombre de pages (vérifier les deux clés possibles)
      const pages = response.data.page_count || response.data.pageCount || 0;
      console.log("Nombre de pages détecté:", pages, response.data);
      
      if (pages > 0) {
        setTotalPages(pages);
        // Initialiser l'ordre des pages (1-indexed)
        const initialOrder = Array.from({ length: pages }, (_, i) => i + 1);
        setPageOrder(initialOrder);
      } else {
        throw new Error("Impossible de déterminer le nombre de pages");
      }
    } catch (err) {
      console.error('Erreur lors de l\'analyse du PDF:', err);
      setError('Impossible de déterminer le nombre de pages dans ce document.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOrderChange = (newOrder: number[]) => {
    setPageOrder(newOrder);
    setIsDirty(true);
  };

  const handleReorder = async () => {
    if (!file) {
      setError('Veuillez d\'abord sélectionner un fichier PDF.');
      return;
    }

    if (pageOrder.length === 0) {
      setError('Aucun ordre de pages défini.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await pdfService.reorderPages(file, pageOrder);

      // Télécharger le fichier résultant
      const fileName = file.name.replace('.pdf', '_réorganisé.pdf');
      downloadFile(response.data, fileName);
      setIsDirty(false);
    } catch (err) {
      console.error('Erreur lors de la réorganisation des pages:', err);
      setError('Une erreur est survenue lors de la réorganisation des pages. Veuillez réessayer.');
    } finally {
      setIsLoading(false);
    }
  };

  const toolbarActions = [
    {
      id: 'reorder',
      label: 'Appliquer la réorganisation',
      onClick: handleReorder,
      disabled: !file || isLoading || pageOrder.length === 0 || !isDirty,
      primary: true,
    },
  ];

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Réorganiser les pages d'un PDF</h1>
        <p className="text-gray-600">
          Faites glisser les pages pour les réordonner dans votre document PDF.
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

      {file && totalPages > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
          <div className="mb-4">
            <h2 className="text-lg font-semibold">Réorganisation des pages</h2>
            <p className="text-sm text-gray-600 mt-1">
              Ce document contient {totalPages} pages. Faites glisser les pages pour définir un nouvel ordre.
            </p>
          </div>

          <div className="border rounded-lg overflow-hidden p-4">
            <PageDragDrop
              file={file}
              onChange={handleOrderChange}
              thumbnailSize={150}
            />
          </div>

          {isDirty && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded">
              <p className="font-semibold text-blue-800">
                L'ordre des pages a été modifié
              </p>
              <p className="text-sm text-blue-700 mt-1">
                Cliquez sur "Appliquer la réorganisation" pour créer un nouveau PDF avec les pages réorganisées.
              </p>
            </div>
          )}
        </div>
      )}

      <Toolbar actions={toolbarActions} />

      {isLoading && (
        <div className="flex justify-center items-center mt-6">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-700"></div>
          <span className="ml-3 text-blue-700">Traitement en cours...</span>
        </div>
      )}
    </div>
  );
};

export default ReorderPage; 