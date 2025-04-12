import React, { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { v4 as uuidv4 } from 'uuid';
import { UploadedFile } from '../services/api';

interface FileUploaderProps {
  accept?: Record<string, string[]>;
  maxFiles?: number;
  maxSize?: number;
  onFilesChange: (files: UploadedFile[]) => void;
  files: UploadedFile[];
  label?: string;
  description?: string;
}

export interface FileWithPreview extends UploadedFile {
  preview?: string;
}

const FileUploader: React.FC<FileUploaderProps> = ({
  accept = {
    'application/pdf': ['.pdf'],
  },
  maxFiles = 10,
  maxSize = 50 * 1024 * 1024, // 50MB par défaut
  onFilesChange,
  files,
  label = "Glissez-déposez vos fichiers ici",
  description = "ou cliquez pour sélectionner des fichiers",
}) => {
  const [filesWithPreview, setFilesWithPreview] = useState<FileWithPreview[]>([]);
  const [showDropzone, setShowDropzone] = useState<boolean>(true);
  
  useEffect(() => {
    // Convertir les fichiers en fichiers avec aperçu
    const newFilesWithPreview = files.map(fileObj => {
      // Vérifier si nous avons déjà ce fichier dans notre état
      const existingFile = filesWithPreview.find(f => 
        f.file.name === fileObj.file.name && 
        f.file.size === fileObj.file.size && 
        f.file.lastModified === fileObj.file.lastModified
      );
      
      // Si le fichier existe déjà, réutiliser son ID et aperçu
      if (existingFile) {
        return existingFile;
      }

      // Sinon, créer un nouvel objet avec ID et générer un aperçu si c'est une image
      const fileWithId = { ...fileObj, id: uuidv4() } as FileWithPreview;
      
      // Générer un aperçu uniquement pour les images
      if (fileObj.file.type.startsWith('image/')) {
        fileWithId.preview = URL.createObjectURL(fileObj.file);
      }
      
      return fileWithId;
    });

    setFilesWithPreview(newFilesWithPreview);
    
    // Masquer la zone de dépôt si des fichiers sont présents
    setShowDropzone(newFilesWithPreview.length === 0);
    
    // Nettoyer les URL d'aperçu lors du démontage
    return () => {
      filesWithPreview.forEach(file => {
        if (file.preview) {
          URL.revokeObjectURL(file.preview);
        }
      });
    };
  }, [files, filesWithPreview]);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      if (acceptedFiles?.length) {
        // Prendre uniquement les nouveaux fichiers jusqu'à la limite de maxFiles
        const newFiles = [...files];
        const remainingSlots = Math.max(0, maxFiles - newFiles.length);
        
        if (remainingSlots > 0) {
          const filesToAdd = acceptedFiles.slice(0, remainingSlots);
          newFiles.push(...filesToAdd.map(file => ({
            id: Math.random().toString(36).substring(2, 11),
            file,
          })));
          onFilesChange(newFiles);
        }
      }
    },
    [files, maxFiles, onFilesChange]
  );

  const removeFile = (fileId: string) => {
    const updatedFiles = files.filter((_, index) => {
      return filesWithPreview[index]?.id !== fileId;
    });
    onFilesChange(updatedFiles);
    
    // Afficher à nouveau la zone de dépôt après suppression
    if (updatedFiles.length === 0) {
      setShowDropzone(true);
    }
  };

  const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
    onDrop,
    accept,
    maxSize,
    maxFiles,
    disabled: files.length >= maxFiles,
  });

  const fileRejectionItems = fileRejections.map(({ file, errors }) => (
    <li key={file.name} className="text-sm text-red-500">
      {file.name} - {errors.map(e => e.message).join(', ')}
    </li>
  ));

  return (
    <div className="w-full">
      {showDropzone && (
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all
            ${
              isDragActive
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-300 hover:border-gray-400'
            }
            ${files.length >= maxFiles ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          <input {...getInputProps()} />
          <div className="space-y-2">
            <svg 
              className="mx-auto h-12 w-12 text-gray-400" 
              fill="none" 
              viewBox="0 0 24 24" 
              stroke="currentColor" 
              strokeWidth={1}
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" 
              />
            </svg>
            <p className="text-sm font-medium text-gray-900">{label}</p>
            <p className="text-xs text-gray-500">{description}</p>
            {maxSize && (
              <p className="text-xs text-gray-400">
                Taille maximum: {(maxSize / 1024 / 1024).toFixed(0)} MB
              </p>
            )}
          </div>
        </div>
      )}

      {/* Afficher les erreurs de validation */}
      {fileRejectionItems.length > 0 && (
        <ul className="mt-2">{fileRejectionItems}</ul>
      )}

      {/* Afficher les fichiers sélectionnés */}
      {filesWithPreview.length > 0 && (
        <div className="mt-4">
          <p className="text-sm text-gray-500 mb-2">
            {filesWithPreview.length} {filesWithPreview.length === 1 ? 'fichier' : 'fichiers'} sélectionné{filesWithPreview.length > 1 ? 's' : ''}
          </p>
          <ul className="space-y-2">
            {filesWithPreview.map((file) => (
              <li key={file.id} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                <div className="flex items-center">
                  {file.preview ? (
                    <img
                      src={file.preview}
                      alt={file.file.name}
                      className="h-10 w-10 object-cover rounded mr-2"
                    />
                  ) : (
                    <svg
                      className="h-10 w-10 text-gray-400 mr-2"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                  )}
                  <div className="truncate max-w-xs">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {file.file.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {(file.file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  className="text-gray-400 hover:text-red-500 focus:outline-none"
                  onClick={() => removeFile(file.id)}
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default FileUploader;
