import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Brain, FileText, HelpCircle, Download, CheckCircle2, XCircle } from 'lucide-react';
import { ProcessingMode, AdaptedContent } from '@/types';
import { downloadContent } from '@/utils/downloadUtils';
import { Typewriter } from './Typewriter';

interface ContentDisplayProps {
  mode: ProcessingMode;
  content: AdaptedContent;
}

export function ContentDisplay({ mode, content }: ContentDisplayProps) {
  // Estado para rastrear las respuestas seleccionadas por pregunta
  const [selectedOptions, setSelectedOptions] = useState<Record<string, number>>({});

  const handleOptionClick = (questionId: string, optionIndex: number) => {
    setSelectedOptions(prev => ({
      ...prev,
      [questionId]: optionIndex
    }));
  };

  if (content.isProcessing) {
    return (
      <div className="bg-white rounded-3xl p-6 md:p-10 shadow-sm border border-dark/5 min-h-[400px] flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-sky/20 border-t-sky rounded-full animate-spin mb-4"></div>
        <p className="text-dark/60 font-medium animate-pulse">Gemini está adaptando tu material...</p>
      </div>
    );
  }

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
                  {content.adhd?.keyPoints ? (
                    content.adhd.keyPoints.map((point, i) => (
                      <li key={i}>{point}</li>
                    ))
                  ) : (
                    <>
                      <li>Concepto principal simplificado.</li>
                      <li>Relación con ejemplos cotidianos.</li>
                      <li>Palabras clave resaltadas.</li>
                    </>
                  )}
                </ul>
              </div>
              <div className="bg-sky/10 p-6 rounded-2xl flex items-center justify-center min-h-[150px]">
                <span className="text-dark/50 italic text-center px-4">
                  {content.adhd?.visualCues?.[0] || "Gráfico o diagrama generado..."}
                </span>
              </div>
            </div>
            <p className="text-lg leading-relaxed text-dark/80">
              {content.adhd?.simplifiedText ? (
                <Typewriter text={content.adhd.simplifiedText} />
              ) : (
                "Aquí aparecerá el contenido estructurado en bloques pequeños..."
              )}
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
                {content.dyslexiaText ? (
                  <Typewriter text={content.dyslexiaText} speed={25} />
                ) : (
                  "El texto adaptado con fuente OpenDyslexic aparecerá aquí..."
                )}
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
            <div className="space-y-6">
              {content.quiz?.map((q, i) => {
                const selectedIdx = selectedOptions[q.id];
                const isCorrect = selectedIdx === q.correctAnswerIndex;

                return (
                  <div key={q.id} className="p-6 rounded-2xl border-2 border-dark/5 bg-cream">
                    <p className="font-semibold text-lg mb-4">{i + 1}. {q.question}</p>
                    <div className="space-y-3">
                      {q.options.map((opt, j) => {
                        const isSelected = selectedIdx === j;
                        const isOptionCorrect = j === q.correctAnswerIndex;
                        
                        // Determinar colores de borde y fondo según selección
                        let buttonClass = "border-dark/5 bg-white";
                        if (isSelected) {
                          buttonClass = isOptionCorrect 
                            ? "border-green-500 bg-green-50" 
                            : "border-red-500 bg-red-50";
                        }

                        return (
                          <button
                            key={j}
                            onClick={() => handleOptionClick(q.id, j)}
                            disabled={isCorrect} // Bloquear una vez que se acierta
                            className={`w-full text-left p-4 rounded-xl border-2 transition-all flex items-center justify-between group ${buttonClass} ${!isCorrect ? 'hover:border-sky/50' : ''}`}
                          >
                            <span>{opt}</span>
                            {isSelected && isOptionCorrect && <CheckCircle2 className="text-green-500" size={20} />}
                            {isSelected && !isOptionCorrect && <XCircle className="text-red-500" size={20} />}
                          </button>
                        );
                      })}
                    </div>
                    {selectedIdx !== undefined && (
                      <p className={`mt-3 font-medium text-sm ${isCorrect ? 'text-green-600' : 'text-red-500'}`}>
                        {isCorrect ? '¡Correcto!' : 'Respuesta incorrecta. Inténtalo de nuevo.'}
                      </p>
                    )}
                  </div>
                );
              }) || (
                <div className="p-6 rounded-2xl border-2 border-dark/5 bg-cream">
                  <p className="font-semibold text-lg">Cargando preguntas de repaso...</p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}