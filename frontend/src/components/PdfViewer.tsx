import React, { useState, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';

// Configuration du worker PDF.js
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

console.log('PDF.js version:', pdfjs.version);

interface PdfViewerProps {
  file: File | string;
  width?: number;
  showControls?: boolean;
  onPageSelect?: (pageNumber: number) => void;
  initialPage?: number;
  selectable?: boolean;
  selectedPages?: number[];
  onPagesSelect?: (pages: number[]) => void;
}

const PdfViewer: React.FC<PdfViewerProps> = ({
  file,
  width = 600,
  showControls = true,
  onPageSelect,
  initialPage = 1,
  selectable = false,
  selectedPages = [],
  onPagesSelect,
}) => {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(initialPage);
  const [selectedPageSet, setSelectedPageSet] = useState<Set<number>>(new Set(selectedPages));
  const [scale, setScale] = useState<number>(1.0);
  const [fileUrl, setFileUrl] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Convertir File en URL pour react-pdf
    if (typeof file === 'object' && file instanceof File) {
      const url = URL.createObjectURL(file);
      console.log('File object converted to URL:', url);
      setFileUrl(url);
      setLoading(true);
      setError(null);
      return () => {
        URL.revokeObjectURL(url);
      };
    } else if (typeof file === 'string') {
      console.log('Using string URL for PDF:', file);
      setFileUrl(file);
      setLoading(true);
      setError(null);
    }
  }, [file]);

  useEffect(() => {
    setSelectedPageSet(new Set(selectedPages));
  }, [selectedPages]);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    console.log('PDF document loaded successfully with', numPages, 'pages');
    setNumPages(numPages);
    setPageNumber(initialPage <= numPages ? initialPage : 1);
    setLoading(false);
  };

  const onDocumentLoadError = (error: Error) => {
    console.error('Error loading PDF:', error);
    setError(`Erreur de chargement: ${error.message}`);
    setLoading(false);
  };

  const changePage = (offset: number) => {
    const newPage = pageNumber + offset;
    if (newPage >= 1 && newPage <= (numPages || 1)) {
      setPageNumber(newPage);
      if (onPageSelect) {
        onPageSelect(newPage);
      }
    }
  };

  const goToPage = (page: number) => {
    if (page >= 1 && page <= (numPages || 1)) {
      setPageNumber(page);
      if (onPageSelect) {
        onPageSelect(page);
      }
    }
  };

  const handlePageClick = (pageNum: number) => {
    if (!selectable) return;
    
    const newSelectedPages = new Set(selectedPageSet);
    
    if (newSelectedPages.has(pageNum)) {
      newSelectedPages.delete(pageNum);
    } else {
      newSelectedPages.add(pageNum);
    }
    
    setSelectedPageSet(newSelectedPages);
    
    if (onPagesSelect) {
      onPagesSelect(Array.from(newSelectedPages).sort((a, b) => a - b));
    }
  };

  const renderPages = () => {
    if (!numPages) return null;

    if (!selectable) {
      return (
        <Page 
          key={pageNumber}
          pageNumber={pageNumber} 
          width={width} 
          scale={scale} 
          renderTextLayer={true} 
          renderAnnotationLayer={true}
          error={<div className="text-red-500 p-2">Erreur de chargement de la page {pageNumber}</div>}
        />
      );
    }

    // Mode sélection de pages (pour extraction, réarrangement, etc.)
    const pages = [];
    for (let i = 1; i <= numPages; i++) {
      const isSelected = selectedPageSet.has(i);
      pages.push(
        <div 
          key={i}
          className={`relative mb-4 cursor-pointer transition-transform transform ${
            isSelected ? 'ring-4 ring-blue-500 scale-[1.02]' : 'hover:scale-[1.01]'
          }`}
          onClick={() => handlePageClick(i)}
        >
          <Page 
            pageNumber={i} 
            width={width / 2} 
            scale={scale} 
            renderTextLayer={false} 
            renderAnnotationLayer={false}
            error={<div className="text-red-500 p-2">Erreur de chargement de la page {i}</div>}
          />
          {isSelected && (
            <div className="absolute top-2 right-2 bg-blue-500 text-white rounded-full w-8 h-8 flex items-center justify-center">
              <span className="text-sm">✓</span>
            </div>
          )}
          <div className="absolute bottom-0 left-0 right-0 text-center bg-black bg-opacity-50 text-white text-sm py-1">
            Page {i}
          </div>
        </div>
      );
    }
    
    return (
      <div className="grid grid-cols-2 gap-4">
        {pages}
      </div>
    );
  };

  if (!fileUrl) {
    return <div className="flex justify-center p-4">Préparation du PDF...</div>;
  }

  return (
    <div className="flex flex-col items-center">
      {showControls && !selectable && numPages && (
        <div className="flex justify-between w-full mb-4 px-4">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => changePage(-1)}
              disabled={pageNumber <= 1}
              className="px-3 py-1 bg-gray-200 disabled:opacity-50 rounded-md hover:bg-gray-300"
            >
              Précédent
            </button>
            <div className="text-sm">
              Page <input 
                type="number" 
                value={pageNumber}
                min={1}
                max={numPages || 1}
                onChange={(e) => goToPage(parseInt(e.target.value) || 1)}
                className="w-12 text-center border rounded-md"
              /> sur {numPages}
            </div>
            <button
              onClick={() => changePage(1)}
              disabled={numPages === null || pageNumber >= numPages}
              className="px-3 py-1 bg-gray-200 disabled:opacity-50 rounded-md hover:bg-gray-300"
            >
              Suivant
            </button>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setScale(scale => Math.max(0.5, scale - 0.1))}
              className="px-3 py-1 bg-gray-200 rounded-md hover:bg-gray-300"
            >
              -
            </button>
            <span className="text-sm">{Math.round(scale * 100)}%</span>
            <button
              onClick={() => setScale(scale => Math.min(2.0, scale + 0.1))}
              className="px-3 py-1 bg-gray-200 rounded-md hover:bg-gray-300"
            >
              +
            </button>
          </div>
        </div>
      )}

      <div className="border rounded-lg p-4 bg-gray-100 shadow-inner overflow-auto">
        <Document
          file={fileUrl}
          onLoadSuccess={onDocumentLoadSuccess}
          onLoadError={onDocumentLoadError}
          loading={<div className="text-center p-4">Chargement du PDF...</div>}
          error={
            <div className="text-center p-4 text-red-500">
              <p>Erreur de chargement du PDF</p>
              {error && <p className="text-xs mt-2">{error}</p>}
            </div>
          }
        >
          {loading ? (
            <div className="flex justify-center items-center h-40">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-700"></div>
            </div>
          ) : (
            renderPages()
          )}
        </Document>
      </div>
      
      {selectable && (
        <div className="mt-4 text-sm text-gray-600">
          <p>Cliquez sur les pages pour les sélectionner ou les désélectionner.</p>
          <p>
            {selectedPageSet.size === 0 
              ? 'Aucune page sélectionnée' 
              : `${selectedPageSet.size} page${selectedPageSet.size > 1 ? 's' : ''} sélectionnée${selectedPageSet.size > 1 ? 's' : ''}`
            }
          </p>
        </div>
      )}
    </div>
  );
};

export default PdfViewer;
