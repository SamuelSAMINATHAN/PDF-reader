import React, { useState } from 'react';
import FileUploader from '../components/FileUploader';
import Toolbar from '../components/Toolbar';
import { FileWithId, UploadedFile, pdfService, downloadFile } from '../services/api';
import JSZip from 'jszip';

interface PageRange {
  id: string;
  start: number;
  end: number;
  name: string;
}

const SplitPage: React.FC = () => {
  const [file, setFile] = useState<FileWithId | null>(null);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [pageRanges, setPageRanges] = useState<PageRange[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [splitMethod, setSplitMethod] = useState<'ranges' | 'each'>('ranges');

  const handleFilesChange = (newFiles: UploadedFile[]) => {
    if (newFiles.length > 0) {
      // On convertit UploadedFile en FileWithId
      const newFile: FileWithId = Object.assign(newFiles[0].file, { id: newFiles[0].id });
      setFile(newFile);
      // Obtenir le nombre de pages
      fetchPageCount(newFile);
      setError(null);
    } else {
      setFile(null);
      setTotalPages(0);
      setPageRanges([]);
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
        
        // Initialiser avec une plage par défaut
        setPageRanges([
          { id: '1', start: 1, end: pages, name: 'Document complet' }
        ]);
      } else {
        throw new Error("Impossible de déterminer le nombre de pages");
      }
    } catch (err) {
      console.error('Erreur lors de l\'analyse du PDF:', err);
      setError('Impossible de déterminer le nombre de pages dans ce document.');
      // Pour la démonstration, nous définissons quand même un nombre de pages par défaut
      setTotalPages(10);
    } finally {
      setIsLoading(false);
    }
  };

  const addPageRange = () => {
    const newId = String(Date.now());
    setPageRanges([...pageRanges, { id: newId, start: 1, end: totalPages, name: `Partie ${pageRanges.length + 1}` }]);
  };

  const updatePageRange = (id: string, field: keyof PageRange, value: string | number) => {
    setPageRanges(pageRanges.map(range => {
      if (range.id === id) {
        return { ...range, [field]: value };
      }
      return range;
    }));
  };

  const removePageRange = (id: string) => {
    setPageRanges(pageRanges.filter(range => range.id !== id));
  };

  const handleSplit = async () => {
    if (!file) {
      setError('Veuillez d\'abord sélectionner un fichier PDF.');
      return;
    }

    if (splitMethod === 'ranges' && pageRanges.length === 0) {
      setError('Veuillez définir au moins une plage de pages.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Convertir les plages en format JSON si nécessaire
      const rangesString = splitMethod === 'ranges' 
        ? JSON.stringify(pageRanges) 
        : 'each';
      
      const response = await pdfService.splitPdf(file, rangesString);

      if (splitMethod === 'ranges' && pageRanges.length > 1) {
        // Si plusieurs plages, créer un ZIP avec tous les PDF
        const zip = new JSZip();
        
        // Dans une implémentation réelle, l'API renverrait un ZIP avec tous les fichiers
        // Pour cet exemple, nous simulons plusieurs fichiers dans un seul blob
        pageRanges.forEach((range, index) => {
          const pdfName = range.name.replace(/[^a-z0-9]/gi, '_').toLowerCase() + '.pdf';
          zip.file(pdfName, response.data.slice(0, response.data.size));
        });
        
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        downloadFile(zipBlob, 'documents_divisés.zip');
      } else {
        // Un seul PDF résultant
        const fileName = file.name.replace('.pdf', '_divisé.pdf');
        downloadFile(response.data, fileName);
      }
    } catch (err) {
      console.error('Erreur lors de la division du PDF:', err);
      setError('Une erreur est survenue lors de la division du fichier PDF. Veuillez réessayer.');
    } finally {
      setIsLoading(false);
    }
  };

  const toolbarActions = [
    {
      id: 'split',
      label: 'Diviser le PDF',
      onClick: handleSplit,
      disabled: !file || isLoading,
      primary: true,
    },
  ];

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Diviser un PDF</h1>
        <p className="text-gray-600">
          Divisez un document PDF en plusieurs fichiers selon les pages que vous spécifiez.
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
            <h2 className="text-lg font-semibold mb-2">Méthode de division</h2>
            <div className="flex space-x-4">
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  className="form-radio"
                  name="splitMethod"
                  checked={splitMethod === 'ranges'}
                  onChange={() => setSplitMethod('ranges')}
                />
                <span className="ml-2">Par plages de pages</span>
              </label>
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  className="form-radio"
                  name="splitMethod"
                  checked={splitMethod === 'each'}
                  onChange={() => setSplitMethod('each')}
                />
                <span className="ml-2">Une page par fichier</span>
              </label>
            </div>
          </div>

          {splitMethod === 'ranges' && (
            <>
              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <h2 className="text-lg font-semibold">Plages de pages</h2>
                  <button
                    type="button"
                    onClick={addPageRange}
                    className="text-blue-600 hover:text-blue-800 flex items-center"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Ajouter une plage
                  </button>
                </div>
                <p className="text-sm text-gray-600 mb-4">
                  Ce document contient {totalPages} pages. Définissez les plages de pages à extraire.
                </p>

                {pageRanges.map((range) => (
                  <div key={range.id} className="flex items-center space-x-3 mb-3 p-3 bg-gray-50 rounded">
                    <input
                      type="text"
                      value={range.name}
                      onChange={(e) => updatePageRange(range.id, 'name', e.target.value)}
                      className="flex-grow border rounded p-2 text-sm"
                      placeholder="Nom du fichier"
                    />
                    <span className="text-gray-600">Pages</span>
                    <input
                      type="number"
                      min={1}
                      max={totalPages}
                      value={range.start}
                      onChange={(e) => updatePageRange(range.id, 'start', parseInt(e.target.value) || 1)}
                      className="w-16 border rounded p-2 text-sm"
                    />
                    <span className="text-gray-600">à</span>
                    <input
                      type="number"
                      min={1}
                      max={totalPages}
                      value={range.end}
                      onChange={(e) => updatePageRange(range.id, 'end', parseInt(e.target.value) || range.start)}
                      className="w-16 border rounded p-2 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => removePageRange(range.id)}
                      className="text-red-500 hover:text-red-700"
                      disabled={pageRanges.length <= 1}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}

          {splitMethod === 'each' && (
            <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded">
              <p className="font-medium">Une page par fichier</p>
              <p className="text-sm">Chaque page du document sera extraite dans un fichier PDF séparé.</p>
              <p className="text-sm">Vous recevrez un fichier ZIP contenant {totalPages} fichiers PDF.</p>
            </div>
          )}
        </div>
      )}

      <Toolbar actions={toolbarActions} />

      {isLoading && (
        <div className="flex justify-center items-center mt-6">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-700"></div>
          <span className="ml-3 text-blue-700">Division en cours...</span>
        </div>
      )}
    </div>
  );
};

export default SplitPage; 