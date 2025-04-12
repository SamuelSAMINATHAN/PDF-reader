import React, { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
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
  // Générer des previews pour les fichiers
  useEffect(() => {
    // Uniquement pour les PDFs et les images
    files.forEach(fileObj => {
      if (!fileObj.preview && fileObj.file.type.includes('image')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          if (e.target?.result) {
            const updatedFiles = files.map(f => {
              if (f.id === fileObj.id) {
                return { ...f, preview: e.target!.result as string };
              }
              return f;
            });
            onFilesChange(updatedFiles);
          }
        };
        reader.readAsDataURL(fileObj.file);
      }
    });
  }, [files, onFilesChange]);

  // Supprimer les previews quand le composant est démonté
  useEffect(() => {
    return () => {
      files.forEach(file => {
        if (file.preview) {
          URL.revokeObjectURL(file.preview);
        }
      });
    };
  }, [files]);

  // Callback pour l'upload de fichiers
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const newFiles = acceptedFiles.map(file => ({
        id: Math.random().toString(36).substring(2, 11),
        file,
      }));
      
      onFilesChange([...files, ...newFiles]);
    },
    [files, onFilesChange]
  );

  // Supprimer un fichier
  const removeFile = (id: string) => {
    const updatedFiles = files.filter(fileObj => fileObj.id !== id);
    onFilesChange(updatedFiles);
  };

  // Configuration de react-dropzone
  const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
    onDrop,
    accept,
    maxFiles: maxFiles - files.length,
    maxSize,
    multiple: maxFiles > 1,
    disabled: files.length >= maxFiles,
  });

  return (
    <div className="w-full">
      <div 
        {...getRootProps()} 
        className={`border-2 border-dashed p-8 rounded-lg text-center cursor-pointer transition-colors
          ${isDragActive 
            ? 'border-blue-500 bg-blue-50' 
            : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
          }
          ${files.length >= maxFiles ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <input {...getInputProps()} data-testid="file-input" />
        <div className="text-center">
          <svg 
            className="mx-auto h-12 w-12 text-gray-400" 
            stroke="currentColor" 
            fill="none" 
            viewBox="0 0 48 48" 
            aria-hidden="true"
          >
            <path 
              d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round" 
            />
          </svg>
          <p className="mt-2 text-sm font-medium text-gray-900">{label}</p>
          <p className="mt-1 text-xs text-gray-500">{description}</p>
          {files.length > 0 && (
            <p className="mt-1 text-xs text-blue-500">
              {files.length} fichier{files.length > 1 ? 's' : ''} sélectionné{files.length > 1 ? 's' : ''}
            </p>
          )}
          {files.length >= maxFiles && (
            <p className="mt-1 text-xs text-yellow-500">
              Nombre maximum de fichiers atteint ({maxFiles})
            </p>
          )}
        </div>
      </div>

      {fileRejections.length > 0 && (
        <div className="mt-2 text-sm text-red-500">
          {fileRejections.map(({ file, errors }) => (
            <div key={file.name} className="mt-1">
              <span className="font-medium">{file.name}:</span>
              <ul className="list-disc list-inside">
                {errors.map(e => (
                  <li key={e.code}>{e.message}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {/* Liste des fichiers */}
      {files.length > 0 && (
        <ul className="mt-4 space-y-2">
          {files.map((fileObj) => (
            <li 
              key={fileObj.id} 
              className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
            >
              <div className="flex items-center">
                {fileObj.preview && fileObj.file.type.includes('image') ? (
                  <img 
                    src={fileObj.preview} 
                    alt={fileObj.file.name}
                    className="h-10 w-10 object-cover rounded mr-3"
                  />
                ) : (
                  <svg 
                    className="h-10 w-10 text-gray-400 mr-3" 
                    fill="currentColor" 
                    viewBox="0 0 20 20" 
                  >
                    <path 
                      fillRule="evenodd" 
                      d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" 
                      clipRule="evenodd" 
                    />
                  </svg>
                )}
                <div className="truncate">
                  <p className="text-sm font-medium text-gray-900 truncate">{fileObj.file.name}</p>
                  <p className="text-xs text-gray-500">
                    {(fileObj.file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>
              <button
                onClick={() => removeFile(fileObj.id)}
                className="ml-2 text-red-500 hover:text-red-700 focus:outline-none"
                title="Supprimer"
              >
                <svg 
                  className="h-5 w-5" 
                  fill="currentColor" 
                  viewBox="0 0 20 20" 
                >
                  <path 
                    fillRule="evenodd" 
                    d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" 
                    clipRule="evenodd" 
                  />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default FileUploader;
