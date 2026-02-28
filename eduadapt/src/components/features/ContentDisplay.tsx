import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Brain, FileText, HelpCircle, Download } from 'lucide-react';
import { ProcessingMode, AdaptedContent } from '@/types';
import { downloadContent } from '@/utils/downloadUtils';

interface ContentDisplayProps {
  mode: ProcessingMode;
  content: AdaptedContent;
}

export function ContentDisplay({ mode, content }: ContentDisplayProps) {
  const hasContent = (
    (mode === 'ADHD' && content.adhd) ||
    (mode === 'DYSLEXIA' && content.dyslexiaText) ||
    (mode === 'QUIZ' && content.quiz)
  );

  return (
    <div className="bg-white rounded-3xl p-6 md:p-10 shadow-sm border border-dark/5 min-h-[400px] relative">
      {hasContent && (
        <button
          onClick={() => downloadContent(mode, content)}
          className="absolute top-6 right-6 md:top-10 md:right-10 p-2 rounded-full hover:bg-dark/5 text-dark/60 hover:text-dark transition-colors"
          title="Descargar contenido"
          aria-label="Descargar contenido"
        >
          <Download size={24} />
        </button>
      )}

      <AnimatePresence mode="wait">
        {mode === 'ADHD' && (
          <motion.div 
            key="adhd"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            <h3 className="text-2xl font-bold text-dark mb-4 flex items-center gap-2 pr-12">
              <Brain className="text-sky" />
              Resumen Visual
            </h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="bg-cream p-6 rounded-2xl border-l-4 border-sky">
                <h4 className="font-bold text-lg mb-2">Puntos Clave</h4>
                <ul className="list-disc list-inside space-y-2 text-dark/80">
                  {content.adhd?.keyPoints.map((point, i) => (
                    <li key={i}>{point}</li>
                  )) || (
                    <>
                      <li>Concepto principal simplificado.</li>
                      <li>Relación con ejemplos cotidianos.</li>
                      <li>Palabras clave resaltadas.</li>
                    </>
                  )}
                </ul>
              </div>
              <div className="bg-sky/10 p-6 rounded-2xl flex items-center justify-center min-h-[150px]">
                <span className="text-dark/50 italic">
                  {content.adhd?.visualCues?.[0] || "Gráfico o diagrama generado..."}
                </span>
              </div>
            </div>
            <p className="text-lg leading-relaxed text-dark/80">
              {content.adhd?.simplifiedText || "Aquí aparecerá el contenido estructurado en bloques pequeños y fáciles de digerir, eliminando el ruido visual innecesario."}
            </p>
          </motion.div>
        )}

        {mode === 'DYSLEXIA' && (
          <motion.div 
            key="dyslexia"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            <h3 className="text-2xl font-bold text-dark mb-4 flex items-center gap-2 font-dyslexic pr-12">
              <FileText className="text-mint" />
              Lectura Adaptada
            </h3>
            <div className="prose prose-lg max-w-none">
              <p className="font-dyslexic text-xl leading-loose tracking-wide text-dark whitespace-pre-line">
                {content.dyslexiaText || `Este es un ejemplo de cómo se vería el texto adaptado. La fuente OpenDyslexic, junto con un espaciado mayor entre líneas y letras, facilita la lectura y reduce la confusión visual.
                
                El fondo crema suave reduce el deslumbramiento y el contraste agresivo del blanco puro sobre negro.`}
              </p>
            </div>
          </motion.div>
        )}

        {mode === 'QUIZ' && (
          <motion.div 
            key="quiz"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            <h3 className="text-2xl font-bold text-dark mb-4 flex items-center gap-2 pr-12">
              <HelpCircle className="text-orange-400" />
              Repaso Interactivo
            </h3>
            <div className="space-y-4">
              {content.quiz?.map((q, i) => (
                <div key={q.id} className="p-6 rounded-2xl border-2 border-dark/5 hover:border-sky/50 cursor-pointer transition-colors bg-cream">
                  <p className="font-semibold text-lg mb-4">{i + 1}. {q.question}</p>
                  <div className="space-y-2">
                    {q.options.map((opt, j) => (
                      <div key={j} className="p-3 rounded-xl bg-white border border-dark/5 hover:bg-sky/10">
                        {opt}
                      </div>
                    ))}
                  </div>
                </div>
              )) || (
                <div className="p-6 rounded-2xl border-2 border-dark/5 hover:border-sky/50 cursor-pointer transition-colors bg-cream">
                  <p className="font-semibold text-lg mb-4">1. ¿Cuál es la idea principal del texto?</p>
                  <div className="space-y-2">
                    <div className="p-3 rounded-xl bg-white border border-dark/5 hover:bg-sky/10">Opción A: Resumen histórico</div>
                    <div className="p-3 rounded-xl bg-white border border-dark/5 hover:bg-sky/10">Opción B: Análisis científico</div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
