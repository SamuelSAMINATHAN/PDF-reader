import React, { useRef, useState, useEffect } from 'react';

interface SignaturePadProps {
  width?: number;
  height?: number;
  onSave: (signature: string) => void;
  className?: string;
}

const SignaturePad: React.FC<SignaturePadProps> = ({
  width = 400,
  height = 200,
  onSave,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [context, setContext] = useState<CanvasRenderingContext2D | null>(null);
  const [importedSignature, setImportedSignature] = useState<string | null>(null);

  // Initialiser le contexte du canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#000000';
    setContext(ctx);

    // Effacer le canvas
    clearCanvas();
  }, []);

  // Effacer le canvas
  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = context;
    
    if (!canvas || !ctx) return;
    
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Ajouter la ligne d'aide
    ctx.strokeStyle = '#d1d5db';
    ctx.beginPath();
    ctx.moveTo(0, canvas.height * 0.8);
    ctx.lineTo(canvas.width, canvas.height * 0.8);
    ctx.stroke();
    
    // Réinitialiser le style
    ctx.strokeStyle = '#000000';
    
    setHasSignature(false);
    setImportedSignature(null);
  };

  // Débuter le dessin
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    
    const canvas = canvasRef.current;
    const ctx = context;
    
    if (!canvas || !ctx) return;
    
    // Si une signature a été importée, l'effacer quand on commence à dessiner
    if (importedSignature) {
      clearCanvas();
      setImportedSignature(null);
    }
    
    let clientX, clientY;
    
    if ('touches' in e) {
      e.preventDefault();
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    
    const rect = canvas.getBoundingClientRect();
    
    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
  };

  // Dessiner
  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    
    const canvas = canvasRef.current;
    const ctx = context;
    
    if (!canvas || !ctx) return;
    
    let clientX, clientY;
    
    if ('touches' in e) {
      e.preventDefault();
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    
    const rect = canvas.getBoundingClientRect();
    
    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
    
    setHasSignature(true);
  };

  // Terminer le dessin
  const endDrawing = () => {
    if (isDrawing) {
      const ctx = context;
      if (ctx) {
        ctx.closePath();
      }
      setIsDrawing(false);
    }
  };

  // Sauvegarder la signature
  const saveSignature = () => {
    if (importedSignature) {
      // Si on a une signature importée, l'utiliser directement
      onSave(importedSignature);
      return;
    }
    
    const canvas = canvasRef.current;
    if (!canvas || !hasSignature) return;
    
    // Convertir le canvas en données base64
    const signatureData = canvas.toDataURL('image/png');
    onSave(signatureData);
  };

  // Importer une image de signature
  const handleImportSignature = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Gérer le changement de fichier
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Vérifier si le fichier est une image
    if (!file.type.startsWith('image/')) {
      alert('Veuillez sélectionner une image');
      return;
    }
    
    const reader = new FileReader();
    reader.onload = (event) => {
      if (typeof event.target?.result === 'string') {
        const img = new Image();
        img.onload = () => {
          const canvas = canvasRef.current;
          const ctx = context;
          
          if (!canvas || !ctx) return;
          
          // Effacer le canvas
          clearCanvas();
          
          // Calculer les dimensions pour adapter l'image au canvas
          const ratio = Math.min(
            canvas.width / img.width,
            canvas.height / img.height
          ) * 0.9; // 90% de la taille pour avoir une marge
          
          const newWidth = img.width * ratio;
          const newHeight = img.height * ratio;
          
          // Dessiner l'image au centre du canvas
          ctx.drawImage(
            img,
            (canvas.width - newWidth) / 2,
            (canvas.height - newHeight) / 2,
            newWidth,
            newHeight
          );
          
          // Enregistrer l'image importée
          setImportedSignature(canvas.toDataURL('image/png'));
          setHasSignature(true);
        };
        img.src = event.target.result;
      }
    };
    
    reader.readAsDataURL(file);
    
    // Réinitialiser l'input file pour permettre de sélectionner à nouveau le même fichier
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Empêcher le scroll sur appareil tactile lors du dessin
  useEffect(() => {
    const preventScroll = (e: TouchEvent) => {
      if (isDrawing) {
        e.preventDefault();
      }
    };

    document.addEventListener('touchmove', preventScroll, { passive: false });

    return () => {
      document.removeEventListener('touchmove', preventScroll);
    };
  }, [isDrawing]);

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <div className="border border-gray-300 rounded-lg bg-white overflow-hidden shadow-sm mb-3">
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          className="touch-none"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={endDrawing}
          onMouseLeave={endDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={endDrawing}
        />
      </div>
      
      <div className="flex flex-wrap gap-2 w-full justify-center mb-3">
        <button
          onClick={clearCanvas}
          className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-md"
        >
          Effacer
        </button>
        <button
          onClick={handleImportSignature}
          className="px-4 py-2 text-sm bg-green-100 hover:bg-green-200 text-green-800 rounded-md"
        >
          Importer une signature
        </button>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/*"
          className="hidden"
        />
        <button
          onClick={saveSignature}
          disabled={!hasSignature}
          className={`px-4 py-2 text-sm text-white rounded-md ${
            hasSignature
              ? 'bg-blue-600 hover:bg-blue-700'
              : 'bg-blue-300 cursor-not-allowed'
          }`}
        >
          Valider
        </button>
      </div>
      
      <div className="w-full text-center text-xs text-gray-500">
        Dessinez votre signature ou importez une image de signature
      </div>
    </div>
  );
};

export default SignaturePad;
