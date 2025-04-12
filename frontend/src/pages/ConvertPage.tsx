import React, { useState } from 'react';
import FileUploader from '../components/FileUploader';
import Toolbar from '../components/Toolbar';
import { UploadedFile, pdfService, downloadFile } from '../services/api';

interface FilePreview {
  id: string;
  file: File;
  preview: string;
}

// Définition des groupes de formats de fichiers acceptés pour la conversion
const ACCEPTED_FILE_TYPES = {
  // Documents bureautiques
  'application/msword': ['.doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/vnd.ms-excel': ['.xls'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'application/vnd.ms-powerpoint': ['.ppt'],
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': ['.pptx'],
  'application/rtf': ['.rtf'],
  'text/plain': ['.txt'],
  'application/vnd.oasis.opendocument.text': ['.odt'],
  'application/vnd.oasis.opendocument.spreadsheet': ['.ods'],
  'application/vnd.oasis.opendocument.presentation': ['.odp'],
  'application/vnd.visio': ['.vsd', '.vsdx'],
  
  // Images
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/gif': ['.gif'],
  'image/tiff': ['.tif', '.tiff'],
  'image/bmp': ['.bmp'],
  'image/svg+xml': ['.svg'],
  
  // Livres électroniques et formats spécialisés
  'application/epub+zip': ['.epub'],
  'application/x-mobipocket-ebook': ['.mobi'],
  'image/vnd.djvu': ['.djvu'],
  'text/html': ['.html', '.htm'],
  'application/xml': ['.xml'],
  
  // Autres formats
  'application/x-tex': ['.tex'],
  'text/markdown': ['.md'],
  'application/octet-stream': ['.dwg', '.dxf'] // Formats CAO
};

// Classification des formats pour l'affichage dans l'interface
const FILE_CATEGORIES = [
  {
    name: "Documents bureautiques",
    types: ['.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.rtf', '.txt', '.odt', '.ods', '.odp', '.vsd', '.vsdx']
  },
  {
    name: "Images",
    types: ['.jpg', '.jpeg', '.png', '.gif', '.tif', '.tiff', '.bmp', '.svg']
  },
  {
    name: "Livres électroniques et formats spécialisés",
    types: ['.epub', '.mobi', '.djvu', '.html', '.htm', '.xml']
  },
  {
    name: "Autres formats",
    types: ['.tex', '.md', '.dwg', '.dxf']
  }
];

const ConvertPage: React.FC = () => {
  const [files, setFiles] = useState<FilePreview[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [outputFilename, setOutputFilename] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const handleFilesChange = (newFiles: UploadedFile[]) => {
    const uploadedFiles = newFiles.map(file => ({
      id: file.id,
      file: file.file,
      preview: file.preview || ''
    }));
    setFiles(uploadedFiles);
    setError(null);

    // Proposer un nom par défaut pour le PDF si c'est le premier fichier
    if (uploadedFiles.length > 0 && !outputFilename) {
      // Utiliser le nom du premier fichier sans extension + "converti"
      const baseName = uploadedFiles[0].file.name.split('.').slice(0, -1).join('.');
      setOutputFilename(baseName ? `${baseName}_converti.pdf` : 'document_converti.pdf');
    }
  };

  const handleConvert = async () => {
    if (files.length === 0) {
      setError('Veuillez sélectionner au moins un fichier à convertir.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Extraire juste les objets File
      const uploadedFiles = files.map(fileItem => fileItem.file);
      
      // Nom de fichier final
      const finalFilename = outputFilename || 'document_converti.pdf';
      
      const response = await pdfService.convertToPdf(uploadedFiles, finalFilename);
      
      // Télécharger le PDF résultant
      downloadFile(response.data, finalFilename);
    } catch (err) {
      console.error('Erreur lors de la conversion en PDF:', err);
      setError('Une erreur est survenue lors de la conversion. Veuillez réessayer.');
    } finally {
      setIsLoading(false);
    }
  };

  const selectCategory = (category: string) => {
    setSelectedCategory(category === selectedCategory ? null : category);
  };

  // Fonction pour obtenir l'icône appropriée selon le type de fichier
  const getFileIcon = (filename: string) => {
    const extension = filename.split('.').pop()?.toLowerCase() || '';
    
    // Documents
    if (['.doc', '.docx', '.odt', '.rtf', '.txt'].includes('.' + extension)) {
      return (
        <svg className="h-8 w-8 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
          <path d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" />
        </svg>
      );
    }
    
    // Tableurs
    if (['.xls', '.xlsx', '.ods'].includes('.' + extension)) {
      return (
        <svg className="h-8 w-8 text-green-500" fill="currentColor" viewBox="0 0 20 20">
          <path d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" />
        </svg>
      );
    }
    
    // Présentations
    if (['.ppt', '.pptx', '.odp'].includes('.' + extension)) {
      return (
        <svg className="h-8 w-8 text-red-500" fill="currentColor" viewBox="0 0 20 20">
          <path d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" />
        </svg>
      );
    }
    
    // Images - utiliser la prévisualisation si disponible
    if (['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.svg', '.tif', '.tiff'].includes('.' + extension)) {
      return null; // La prévisualisation sera utilisée
    }
    
    // Livres électroniques
    if (['.epub', '.mobi'].includes('.' + extension)) {
      return (
        <svg className="h-8 w-8 text-purple-500" fill="currentColor" viewBox="0 0 20 20">
          <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
        </svg>
      );
    }
    
    // Par défaut
    return (
      <svg className="h-8 w-8 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
        <path d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" />
      </svg>
    );
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
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Convertir des fichiers en PDF</h1>
        <p className="text-gray-600">
          Convertissez facilement vos documents bureautiques, images, livres électroniques et autres formats spécialisés en PDF.
        </p>
      </div>

      <div className="mb-6">
        <FileUploader
          accept={ACCEPTED_FILE_TYPES}
          maxFiles={20}
          maxSize={50 * 1024 * 1024} // 50 MB par fichier
          files={files.map(file => ({ id: file.id, file: file.file, preview: file.preview }))}
          onFilesChange={handleFilesChange}
          label="Glissez et déposez vos fichiers ici"
          description="ou cliquez pour sélectionner des fichiers (50 MB max par fichier, 20 fichiers max)"
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
              {files.length} fichier{files.length > 1 ? 's' : ''} sélectionné{files.length > 1 ? 's' : ''} pour conversion.
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

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mt-4">
            {files.map((file, index) => {
              const extension = file.file.name.split('.').pop()?.toLowerCase() || '';
              const isImage = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.svg', '.tif', '.tiff'].includes('.' + extension);
              
              return (
                <div key={file.id} className="relative border rounded-lg overflow-hidden">
                  <div className="p-3 flex items-center">
                    {isImage && file.preview ? (
                      <img
                        src={file.preview}
                        alt={`Aperçu de ${file.file.name}`}
                        className="h-16 w-16 object-cover rounded mr-3"
                      />
                    ) : (
                      <div className="h-16 w-16 flex items-center justify-center mr-3">
                        {getFileIcon(file.file.name)}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{file.file.name}</p>
                      <p className="text-xs text-gray-500">
                        {(file.file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  </div>
                  <div className="absolute top-0 left-0 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded-br">
                    {index + 1}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="mb-6">
        <Toolbar actions={toolbarActions} />
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <h2 className="text-lg font-semibold mb-3">Types de fichiers supportés</h2>
        <div className="space-y-3">
          {FILE_CATEGORIES.map(category => (
            <div key={category.name} className="border rounded-lg overflow-hidden">
              <button
                onClick={() => selectCategory(category.name)}
                className="flex items-center justify-between w-full p-3 text-left bg-gray-50 hover:bg-gray-100"
              >
                <span className="font-medium">{category.name}</span>
                <svg
                  className={`h-5 w-5 transform transition-transform ${selectedCategory === category.name ? 'rotate-180' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {selectedCategory === category.name && (
                <div className="p-3 bg-white">
                  <div className="flex flex-wrap gap-2">
                    {category.types.map(type => (
                      <span key={type} className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-md">
                        {type}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

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