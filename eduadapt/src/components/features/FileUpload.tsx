import React, { useState } from 'react';
import { Upload, CheckCircle2 } from 'lucide-react';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
}

export function FileUpload({ onFileSelect }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = (file: File) => {
    setSelectedFile(file);
    onFileSelect(file);
  };

  return (
    <section aria-label="Zona de carga de archivos">
      <div 
        className={`
          relative group cursor-pointer
          border-3 border-dashed rounded-3xl p-10 md:p-16
          flex flex-col items-center justify-center text-center
          transition-all duration-300 ease-out
          ${isDragging ? 'border-sky bg-sky/10 scale-[1.01]' : 'border-dark/20 hover:border-sky/50 hover:bg-white/40'}
          ${selectedFile ? 'bg-mint/10 border-mint' : ''}
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => document.getElementById('file-upload')?.click()}
      >
        <input 
          type="file" 
          id="file-upload" 
          className="hidden" 
          accept="image/*,.pdf,.txt"
          onChange={handleFileSelect}
        />
        
        <div className={`
          w-20 h-20 mb-6 rounded-full flex items-center justify-center
          transition-colors duration-300
          ${selectedFile ? 'bg-mint text-dark' : 'bg-white shadow-sm text-sky'}
        `}>
          {selectedFile ? <CheckCircle2 size={40} /> : <Upload size={40} />}
        </div>

        <h2 className="text-xl md:text-2xl font-semibold mb-2">
          {selectedFile ? '¡Archivo subido con éxito!' : 'Sube tu material educativo'}
        </h2>
        <p className="text-dark/60 max-w-md text-lg">
          {selectedFile 
            ? `${selectedFile.name}` 
            : 'Arrastra y suelta tu foto o PDF aquí, o haz clic para buscar en tu dispositivo.'}
        </p>
      </div>
    </section>
  );
}
