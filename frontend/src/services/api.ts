import axios from 'axios';

// L'URL de base de l'API
const API_URL = 'http://localhost:8000/api/v1';

// Client axios pour appeler l'API
const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'multipart/form-data',
  },
});

// Intercepteur pour journaliser les requêtes
apiClient.interceptors.request.use(request => {
  console.log('Requête API:', request.method?.toUpperCase(), request.url);
  return request;
});

// Intercepteur pour journaliser les réponses et les erreurs
apiClient.interceptors.response.use(
  response => {
    console.log('Réponse API:', response.status, response.config.url);
    return response;
  },
  error => {
    console.error('Erreur API:', 
      error.response?.status || 'Pas de réponse', 
      error.config?.url, 
      error.message,
      error.response?.data
    );
    return Promise.reject(error);
  }
);

// Interface pour les fichiers avec ID temporaire côté client
export interface FileWithId extends File {
  id: string;
}

// Interface pour les fichiers uploadés avec ID temporaire côté client
export interface UploadedFile {
  id: string;
  file: File;
  preview?: string;
}

// Interface pour la position de signature
export interface SignaturePosition {
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

// Services PDF
export const pdfService = {
  /**
   * Fusionne plusieurs fichiers PDF en un seul
   */
  mergePdfs: async (files: File[] | FileWithId[], outputFilename?: string) => {
    const formData = new FormData();
    
    // Filtrer les fichiers invalides et s'assurer qu'il y a au moins 2 fichiers valides
    const validFiles = files.filter(file => 
      file && 
      (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf'))
    );
    
    if (validFiles.length < 2) {
      throw new Error('Au moins deux fichiers PDF valides sont nécessaires');
    }
    
    validFiles.forEach((file, index) => {
      formData.append(`file${index}`, file);
    });
    
    if (outputFilename) {
      formData.append('output_filename', outputFilename);
    }
    
    return apiClient.post('/merge', formData, {
      responseType: 'blob',
    });
  },
  
  /**
   * Divise un PDF en plusieurs fichiers
   */
  splitPdf: async (file: File, ranges: string, outputFilenamePrefix?: string) => {
    const formData = new FormData();
    
    formData.append('file', file);
    formData.append('ranges', ranges);
    
    if (outputFilenamePrefix) {
      formData.append('output_filename_prefix', outputFilenamePrefix);
    }
    
    return apiClient.post('/split-file', formData, {
      responseType: 'blob',
    });
  },
  
  /**
   * Extrait des pages spécifiques d'un PDF
   */
  extractPages: async (file: File, pages: string, outputFilename?: string) => {
    const formData = new FormData();
    
    formData.append('file', file);
    formData.append('pages', pages);
    
    if (outputFilename) {
      formData.append('output_filename', outputFilename);
    }
    
    return apiClient.post('/extract', formData, {
      responseType: 'blob',
    });
  },
  
  /**
   * Supprime des pages d'un PDF
   */
  removePages: async (file: File, pages: string, outputFilename?: string) => {
    const formData = new FormData();
    
    formData.append('file', file);
    formData.append('pages', pages);
    
    if (outputFilename) {
      formData.append('output_filename', outputFilename);
    }
    
    return apiClient.post('/remove-pages', formData, {
      responseType: 'blob',
    });
  },
  
  /**
   * Réorganise les pages d'un PDF
   */
  reorderPages: async (file: File, newOrder: number[], outputFilename?: string) => {
    const formData = new FormData();
    
    formData.append('file', file);
    formData.append('new_order', JSON.stringify(newOrder));
    
    if (outputFilename) {
      formData.append('output_filename', outputFilename);
    }
    
    return apiClient.post('/reorder', formData, {
      responseType: 'blob',
    });
  },
  
  /**
   * Ajoute une signature à un PDF
   */
  signPdf: async (
    file: File, 
    position: SignaturePosition,
    signatureImage?: File,
    signatureData?: string,
    outputFilename?: string
  ) => {
    const formData = new FormData();
    
    formData.append('file', file);
    formData.append('position', JSON.stringify(position));
    
    if (signatureImage) {
      formData.append('signature_image', signatureImage);
    }
    
    if (signatureData) {
      formData.append('signature_data', signatureData);
    }
    
    if (outputFilename) {
      formData.append('output_filename', outputFilename);
    }
    
    return apiClient.post('/sign', formData, {
      responseType: 'blob',
    });
  },
  
  /**
   * Compresse un PDF
   */
  compressPdf: async (file: File, quality: 'low' | 'medium' | 'high' = 'medium', outputFilename?: string) => {
    const formData = new FormData();
    
    formData.append('file', file);
    formData.append('quality', quality);
    
    if (outputFilename) {
      formData.append('output_filename', outputFilename);
    }
    
    return apiClient.post('/compress', formData, {
      responseType: 'blob',
    });
  },
  
  /**
   * Convertit des images en PDF
   */
  imagesToPdf: async (files: File[], outputFilename?: string) => {
    const formData = new FormData();
    
    files.forEach((file) => {
      formData.append('files', file);
    });
    
    if (outputFilename) {
      formData.append('output_filename', outputFilename);
    }
    
    return apiClient.post('/images-to-pdf', formData, {
      responseType: 'blob',
    });
  },
  
  /**
   * Récupère les informations d'un PDF
   */
  getPdfInfo: async (file: File) => {
    console.log('Appel getPdfInfo avec fichier:', file.name, file.size, 'bytes');
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const response = await apiClient.post('/pagecount', formData);
      console.log('Réponse getPdfInfo:', response.data);
      return response;
    } catch (error) {
      console.error('Erreur dans getPdfInfo:', error);
      throw error;
    }
  }
};

/**
 * Télécharge un fichier à partir d'un Blob de réponse
 */
export const downloadFile = (blob: Blob, filename: string) => {
  // Créer une URL pour le blob
  const url = window.URL.createObjectURL(blob);
  
  // Créer un lien temporaire
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  
  // Simuler un clic sur le lien
  document.body.appendChild(link);
  link.click();
  
  // Nettoyer
  link.parentNode?.removeChild(link);
  window.URL.revokeObjectURL(url);
};
  