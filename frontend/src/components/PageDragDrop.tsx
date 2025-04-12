import React, { useState, useEffect } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';

// Configuration du worker PDF.js
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

interface PDFPage {
  id: number;  // 1-indexed pour correspondre aux numéros de page PDF
  preview?: string;
}

interface PageDragDropProps {
  file: File | string;
  onChange: (newOrder: number[]) => void;
  thumbnailSize?: number;
}

const PageDragDrop: React.FC<PageDragDropProps> = ({
  file,
  onChange,
  thumbnailSize = 150,
}) => {
  const [numPages, setNumPages] = useState<number>(0);
  const [pdfPages, setPdfPages] = useState<PDFPage[]>([]);
  const [draggedItem, setDraggedItem] = useState<number | null>(null);
  const [fileUrl, setFileUrl] = useState<string | undefined>(undefined);

  // Convertir File en URL pour react-pdf
  useEffect(() => {
    if (typeof file === 'object' && file instanceof File) {
      const url = URL.createObjectURL(file);
      setFileUrl(url);
      return () => {
        URL.revokeObjectURL(url);
      };
    } else if (typeof file === 'string') {
      setFileUrl(file);
    }
  }, [file]);

  // Initialiser les pages lors du chargement du document
  const handleDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    
    // Créer un tableau avec l'ordre initial des pages
    const pages: PDFPage[] = Array.from({ length: numPages }, (_, i) => ({
      id: i + 1,  // 1-indexed
    }));
    
    setPdfPages(pages);
  };

  // Gérer le début du drag
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, pageId: number) => {
    setDraggedItem(pageId);
    // Rendre l'élément semi-transparent pendant le drag
    if (e.currentTarget.style) {
      e.currentTarget.style.opacity = '0.4';
    }
    
    // Nécessaire pour Firefox
    e.dataTransfer.effectAllowed = 'move';
    try {
      e.dataTransfer.setData('text/plain', pageId.toString());
    } catch (err) {
      // Certains navigateurs peuvent avoir des problèmes avec setData
      console.error('Error in setData:', err);
    }
  };

  // Gérer la fin du drag
  const handleDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
    if (e.currentTarget.style) {
      e.currentTarget.style.opacity = '1';
    }
    setDraggedItem(null);
  };

  // Permettre le drop
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  // Gérer le drop d'une page
  const handleDrop = (e: React.DragEvent<HTMLDivElement>, targetPageId: number) => {
    e.preventDefault();
    
    if (draggedItem === null) return;
    if (draggedItem === targetPageId) return;
    
    // Réorganiser les pages
    const updatedPages = [...pdfPages];
    const draggedItemIndex = updatedPages.findIndex(page => page.id === draggedItem);
    const targetItemIndex = updatedPages.findIndex(page => page.id === targetPageId);
    
    // Déplacer l'élément
    const [removed] = updatedPages.splice(draggedItemIndex, 1);
    updatedPages.splice(targetItemIndex, 0, removed);
    
    setPdfPages(updatedPages);
    
    // Notifier le parent du changement
    // Convertir l'ordre des pages (qui contient les IDs originaux) en ordre d'indices 1-indexed
    const newOrder = updatedPages.map(page => page.id);
    onChange(newOrder);
  };

  if (!fileUrl) {
    return <div className="flex justify-center p-4">Chargement...</div>;
  }

  return (
    <div className="w-full">
      <div className="hidden">
        <Document 
          file={fileUrl}
          onLoadSuccess={handleDocumentLoadSuccess}
          loading={<div>Chargement du PDF...</div>}
          error={<div>Erreur de chargement du PDF</div>}
        >
          {Array.from(new Array(numPages), (_, index) => (
            <Page 
              key={`page_${index + 1}`}
              pageNumber={index + 1}
              width={thumbnailSize}
              renderTextLayer={false}
              renderAnnotationLayer={false}
            />
          ))}
        </Document>
      </div>

      <div className="mb-4 p-2 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
        Faites glisser les pages pour les réorganiser
      </div>

      <div className="flex flex-wrap gap-4 border p-4 rounded-lg bg-gray-50 min-h-[300px]">
        {pdfPages.map((page, index) => (
          <div
            key={page.id}
            draggable
            onDragStart={(e) => handleDragStart(e, page.id)}
            onDragEnd={handleDragEnd}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, page.id)}
            className={`relative flex-shrink-0 border-2 rounded-lg overflow-hidden cursor-move 
              ${draggedItem === page.id ? 'opacity-50' : 'opacity-100'} 
              ${draggedItem !== null && draggedItem !== page.id ? 'border-dashed border-blue-400' : 'border-gray-200'} 
              transition-transform hover:scale-105 hover:shadow-md`}
          >
            <Document 
              file={fileUrl}
              loading={<div className="w-[150px] h-[200px] flex items-center justify-center bg-gray-100">Chargement...</div>}
              error={<div className="w-[150px] h-[200px] flex items-center justify-center bg-red-50 text-red-500">Erreur</div>}
            >
              <Page 
                pageNumber={page.id}
                width={thumbnailSize}
                renderTextLayer={false}
                renderAnnotationLayer={false}
              />
            </Document>
            <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-70 text-white py-1 px-2 text-center text-sm">
              Page {page.id} → Position {index + 1}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PageDragDrop;
