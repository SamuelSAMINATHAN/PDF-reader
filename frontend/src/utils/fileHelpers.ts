/**
 * Utilitaires pour la manipulation de fichiers côté client
 */

/**
 * Génère un nom de fichier unique avec un timestamp
 * @param originalName Nom original du fichier
 * @param suffix Suffixe à ajouter (ex: "_signed", "_compressed")
 * @returns Nom de fichier unique
 */
export const generateUniqueFileName = (originalName: string, suffix = ''): string => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const extension = originalName.split('.').pop() || '';
  const baseName = originalName.replace(`.${extension}`, '');
  
  return `${baseName}${suffix}_${timestamp}.${extension}`;
};

/**
 * Convertit la taille d'un fichier en format lisible (KB, MB, etc.)
 * @param bytes Taille en octets
 * @returns Taille formatée
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

/**
 * Vérifie si un fichier est d'un type accepté
 * @param file Fichier à vérifier
 * @param acceptedTypes Types acceptés (ex: ['application/pdf', 'image/jpeg'])
 * @returns Booléen indiquant si le fichier est accepté
 */
export const isFileTypeAccepted = (file: File, acceptedTypes: string[]): boolean => {
  return acceptedTypes.includes(file.type);
};

/**
 * Exporte un objet blob sous forme de fichier téléchargeable
 * @param blob Blob à télécharger
 * @param fileName Nom du fichier
 */
export const downloadBlob = (blob: Blob, fileName: string): void => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  
  document.body.appendChild(link);
  link.click();
  
  // Nettoyage
  setTimeout(() => {
    URL.revokeObjectURL(url);
    document.body.removeChild(link);
  }, 100);
};

// Export un objet vide pour que le fichier soit considéré comme un module
export {};
