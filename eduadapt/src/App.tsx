import React, { useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { FileUpload } from '@/components/features/FileUpload';
import { ModeSelector } from '@/components/features/ModeSelector';
import { ContentDisplay } from '@/components/features/ContentDisplay';
import { ProcessingMode } from '@/types';
import { aiService } from '@/services/aiService';

export default function App() {
  const [activeMode, setActiveMode] = useState<ProcessingMode>('ADHD');
  
  // Usamos 'any' para aceptar libremente el nuevo JSON del backend sin pelear con TypeScript hoy
  const [content, setContent] = useState<any>({
    isProcessing: false,
    error: null
  });

  const handleFileSelect = async (file: File) => {
    // 1. Iniciamos estado de carga
    setContent({ 
      isProcessing: true, 
      error: null 
    });

    try {
      // 2. Mandamos el activeMode actual (ADHD o DYSLEXIA)
      // Nuestro aiService se encargará de traducirlo a 'tdah' o 'dislexia'
      const result = await aiService.adaptarMaterial(file, activeMode);
      console.log("¡Datos recibidos puritos!", result);

      // 3. Guardamos el JSON directo como viene de FastAPI
      setContent({
        resumen: result.resumen,
        bloques: result.bloques,
        glosario: result.glosario,
        mapa_mermaid: result.mapa_mermaid,
        quiz: result.quiz,
        isProcessing: false,
        error: null
      });
      
    } catch (error) {
      console.error("Error:", error);
      setContent({ 
        isProcessing: false, 
        error: "Error al conectar. ¿Está encendido el servidor y tienes el bucket 'uploads' en Supabase?" 
      });
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-cream text-dark font-sans selection:bg-sky/30">
      <Header />
      <main className="flex-grow w-full max-w-4xl mx-auto px-4 py-8 md:py-12 flex flex-col gap-12">
        <FileUpload onFileSelect={handleFileSelect} />
        
        <section aria-label="Panel de adaptación" className="flex flex-col gap-6">
          <ModeSelector activeMode={activeMode} onModeChange={setActiveMode} />
          
          {/* Si está procesando, puedes mostrar un mensajito aquí. 
              Si ya terminó, ContentDisplay hace su magia */}
          {content.isProcessing ? (
            <div className="text-center p-10 bg-white rounded-3xl shadow-sm border border-sky/20">
              <p className="text-xl font-bold text-sky animate-pulse">🧠 Analizando y adaptando material...</p>
            </div>
          ) : (
            <ContentDisplay mode={activeMode} content={content} />
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
}