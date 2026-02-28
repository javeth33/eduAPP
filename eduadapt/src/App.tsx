import React, { useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { FileUpload } from '@/components/features/FileUpload';
import { ModeSelector } from '@/components/features/ModeSelector';
import { ContentDisplay } from '@/components/features/ContentDisplay';
import { ProcessingMode, AdaptedContent } from '@/types';
import { aiService } from '@/services/aiService';

export default function App() {
  const [activeMode, setActiveMode] = useState<ProcessingMode>('ADHD');
  const [content, setContent] = useState<AdaptedContent>({
    originalText: '',
    adhd: null,
    dyslexiaText: null,
    quiz: null,
    mermaidMap: null,
    isProcessing: false,
    error: null
  });

  const handleFileSelect = async (file: File) => {
  // 1. Activar carga y limpiar contenido previo para que no se vea lo viejo
  setContent(prev => ({ 
    ...prev, 
    isProcessing: true, 
    adhd: null, 
    dyslexiaText: null, 
    quiz: null,
    error: null 
  }));

  try {
    const result = await aiService.adaptarMaterial(file, 'tdah');
    
    // 2. Al recibir el resultado, quitamos la carga y pasamos los datos
    setContent({
      originalText: result.resumen,
      adhd: {
        keyPoints: result.bloques,
        simplifiedText: result.resumen,
        visualCues: result.glosario.map((g: any) => `${g.termino}: ${g.definicion}`)
      },
      dyslexiaText: result.resumen_oral || result.resumen,
      quiz: result.quiz.map((q: any, index: number) => ({
        id: String(index),
        question: q.pregunta,
        options: q.opciones,
        correctAnswerIndex: q.respuesta
      })),
      mermaidMap: result.mapa_mermaid || null, //mapeo directo del back
      isProcessing: false, // ¡IMPORTANTE! Aquí se quita el spinner
      error: null
    });
  } catch (error) {
    setContent(prev => ({ ...prev, isProcessing: false, error: "Error de conexión" }));
  }
};
  return (
    <div className="min-h-screen flex flex-col bg-cream text-dark font-sans selection:bg-sky/30">
      <Header />
      <main className="flex-grow w-full max-w-4xl mx-auto px-4 py-8 md:py-12 flex flex-col gap-12">
        <FileUpload onFileSelect={handleFileSelect} />
        <section aria-label="Panel de adaptación" className="flex flex-col gap-6">
          <ModeSelector activeMode={activeMode} onModeChange={setActiveMode} />
          <ContentDisplay mode={activeMode} content={content} />
        </section>
      </main>
      <Footer />
    </div>
  );
}