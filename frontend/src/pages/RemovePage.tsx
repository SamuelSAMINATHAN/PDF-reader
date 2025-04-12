import React, { useState } from 'react';
import FileUploader from '../components/FileUploader';
import PdfViewer from '../components/PdfViewer';
import Toolbar from '../components/Toolbar';
import { FileWithId, UploadedFile, pdfService, downloadFile } from '../services/api';

const RemovePage: React.FC = () => {
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
      // Obtenir le nombre de pages
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
      
      // Mettre à jour le nombre de pages (vérifier les deux clés possibles)
      const pages = response.data.page_count || response.data.pageCount || 0;
      console.log("Nombre de pages détecté:", pages, response.data);
      
      if (pages > 0) {
        setTotalPages(pages);
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

  const handlePagesSelect = (pages: number[]) => {
    setSelectedPages(pages);
  };

  const handleRemovePages = async () => {
    if (!file) {
      setError('Veuillez d\'abord sélectionner un fichier PDF.');
      return;
    }

    if (selectedPages.length === 0) {
      setError('Veuillez sélectionner au moins une page à supprimer.');
      return;
    }

    if (selectedPages.length === totalPages) {
      setError('Vous ne pouvez pas supprimer toutes les pages du document.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Convertir les pages sélectionnées en chaîne
      const pagesToRemove = selectedPages.join(',');
      
      const response = await pdfService.removePages(file, pagesToRemove);

      // Télécharger le fichier résultant
      const fileName = file.name.replace('.pdf', '_pages_supprimées.pdf');
      downloadFile(response.data, fileName);
    } catch (err) {
      console.error('Erreur lors de la suppression des pages:', err);
      setError('Une erreur est survenue lors de la suppression des pages. Veuillez réessayer.');
    } finally {
      setIsLoading(false);
    }
  };

  const toolbarActions = [
    {
      id: 'remove',
      label: 'Supprimer les pages sélectionnées',
      onClick: handleRemovePages,
      disabled: !file || isLoading || selectedPages.length === 0 || selectedPages.length === totalPages,
      primary: true,
    },
  ];

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Supprimer des pages d'un PDF</h1>
        <p className="text-gray-600">
          Sélectionnez les pages que vous souhaitez supprimer de votre document PDF.
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
            <h2 className="text-lg font-semibold">Sélection des pages à supprimer</h2>
            <p className="text-sm text-gray-600 mt-1">
              Ce document contient {totalPages} pages. Cliquez sur les pages que vous souhaitez supprimer.
            </p>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <PdfViewer
              file={file}
              selectable={true}
              selectedPages={selectedPages}
              onPagesSelect={handlePagesSelect}
            />
          </div>

          {selectedPages.length > 0 && (
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded">
              <p className="font-semibold text-yellow-800">
                {selectedPages.length} page{selectedPages.length > 1 ? 's' : ''} sélectionnée{selectedPages.length > 1 ? 's' : ''} pour suppression
              </p>
              <p className="text-sm text-yellow-700 mt-1">
                Pages: {selectedPages.sort((a, b) => a - b).join(', ')}
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

export default RemovePage; 