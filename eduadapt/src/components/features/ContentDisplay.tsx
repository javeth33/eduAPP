import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Brain, FileText, HelpCircle, Download, CheckCircle2, XCircle, Volume2, Square } from 'lucide-react';
import { ProcessingMode, AdaptedContent } from '@/types';
import { downloadContent } from '@/utils/downloadUtils';
import { Typewriter } from './Typewriter';

interface ContentDisplayProps {
  mode: ProcessingMode;
  content: AdaptedContent;
}

export function ContentDisplay({ mode, content }: ContentDisplayProps) {
  const [selectedOptions, setSelectedOptions] = useState<Record<string, number>>({});
  
  // --- Estados para el Audio (TTS) ---
  const [isSpeaking, setIsSpeaking] = useState(false);
  const synthRef = useRef<SpeechSynthesis | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    synthRef.current = window.speechSynthesis;
    // Limpiar audio si se desmonta el componente
    return () => synthRef.current?.cancel();
  }, []);

  const toggleSpeech = (text: string) => {
    if (!synthRef.current) return;

    if (isSpeaking) {
      synthRef.current.cancel();
      setIsSpeaking(false);
    } else {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'es-MX'; // Configurado para español
      utterance.rate = 0.9;     // Un poco más lento para mejor comprensión
      
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      
      utteranceRef.current = utterance;
      synthRef.current.speak(utterance);
      setIsSpeaking(true);
    }
  };
  // -----------------------------------

  if (content.isProcessing) {
    return (
      <div className="bg-white rounded-3xl p-6 md:p-10 shadow-sm border border-dark/5 min-h-[400px] flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-sky/20 border-t-sky rounded-full animate-spin mb-4"></div>
        <p className="text-dark/60 font-medium animate-pulse">Gemini está adaptando tu material...</p>
      </div>
    );
  }

  const handleOptionClick = (questionId: string, optionIndex: number) => {
    setSelectedOptions(prev => ({ ...prev, [questionId]: optionIndex }));
  };

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
        >
          <Download size={24} />
        </button>
      )}

      <AnimatePresence mode="wait">
        {mode === 'ADHD' && (
          <motion.div key="adhd" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
            <h3 className="text-2xl font-bold text-dark mb-4 flex items-center gap-2 pr-12">
              <Brain className="text-sky" />
              Resumen Visual
            </h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="bg-cream p-6 rounded-2xl border-l-4 border-sky">
                <h4 className="font-bold text-lg mb-2">Puntos Clave</h4>
                <ul className="list-disc list-inside space-y-2 text-dark/80">
                  {content.adhd?.keyPoints?.map((point, i) => <li key={i}>{point}</li>)}
                </ul>
              </div>
              <div className="bg-sky/10 p-6 rounded-2xl flex items-center justify-center min-h-[150px]">
                <span className="text-dark/50 italic text-center px-4">{content.adhd?.visualCues?.[0] || "Gráfico o diagrama generado..."}</span>
              </div>
            </div>
            <p className="text-lg leading-relaxed text-dark/80">
              {content.adhd?.simplifiedText && <Typewriter text={content.adhd.simplifiedText} />}
            </p>
          </motion.div>
        )}

        {mode === 'DYSLEXIA' && (
          <motion.div key="dyslexia" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
            <div className="flex items-center justify-between pr-12">
              <h3 className="text-2xl font-bold text-dark flex items-center gap-2 font-dyslexic">
                <FileText className="text-mint" />
                Lectura Adaptada
              </h3>
              
              {/* Botón de Escuchar */}
              {content.dyslexiaText && (
                <button
                  onClick={() => toggleSpeech(content.dyslexiaText!)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all ${
                    isSpeaking ? 'bg-red-100 text-red-600' : 'bg-mint/10 text-mint hover:bg-mint/20'
                  }`}
                >
                  {isSpeaking ? <Square size={18} fill="currentColor" /> : <Volume2 size={18} />}
                  <span className="font-medium text-sm">{isSpeaking ? 'Detener' : 'Escuchar'}</span>
                </button>
              )}
            </div>

            <div className="prose prose-lg max-w-none">
              <p className="font-dyslexic text-xl leading-loose tracking-wide text-dark whitespace-pre-line">
                {content.dyslexiaText && <Typewriter text={content.dyslexiaText} speed={25} />}
              </p>
            </div>
          </motion.div>
        )}

        {mode === 'QUIZ' && (
          <motion.div key="quiz" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
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
                        let buttonClass = isSelected 
                          ? (isOptionCorrect ? "border-green-500 bg-green-50" : "border-red-500 bg-red-50") 
                          : "border-dark/5 bg-white hover:border-sky/50";
                        return (
                          <button key={j} onClick={() => handleOptionClick(q.id, j)} disabled={isCorrect} className={`w-full text-left p-4 rounded-xl border-2 transition-all flex items-center justify-between group ${buttonClass}`}>
                            <span>{opt}</span>
                            {isSelected && (isOptionCorrect ? <CheckCircle2 className="text-green-500" size={20} /> : <XCircle className="text-red-500" size={20} />)}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}