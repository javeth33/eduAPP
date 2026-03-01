import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Brain, FileText, HelpCircle, Download } from 'lucide-react';
import { ProcessingMode, AdaptedContent } from '@/types';
import { downloadContent } from '@/utils/downloadUtils';

interface ContentDisplayProps {
  mode: ProcessingMode;
  content: any;
}

// Convierte **texto** en <strong>
const formatBoldText = (text?: string) => {
  if (!text) return null;
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={index} className="font-bold text-gray-900">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return part;
  });
};

// Quita "(N palabras)" del final de un bloque
const quitarConteo = (text: string) => text.replace(/\s*\(\d+\s*palabras?\)\s*$/i, '').trim();

// Quita emojis de un texto
const quitarEmojis = (text: string) =>
  text.replace(/[\p{Emoji_Presentation}\p{Extended_Pictographic}]/gu, '').trim();

// Limpia un bloque: quita conteo y opcionalmente emojis
const limpiarBloque = (text: string, sinEmojis = false) => {
  let result = quitarConteo(text);
  if (sinEmojis) result = quitarEmojis(result);
  return result;
};

export function ContentDisplay({ mode, content }: ContentDisplayProps) {
  const hasContent = content && (content.resumen || content.bloques || content.quiz);

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

        {/* 🧠 MODO TDAH */}
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

            <div className="grid gap-6 md:grid-cols-2">
              {/* Columna Izquierda */}
              <div className="space-y-4">
                {content.resumen && (
                  <p className="text-lg font-semibold text-dark/90 pb-3 border-b border-dark/10">
                    {formatBoldText(quitarConteo(content.resumen))}
                  </p>
                )}
                <div className="space-y-3">
                  {content.bloques?.map((bloque: string, index: number) => (
                    <div key={index} className="bg-cream p-4 rounded-xl border-l-4 border-sky">
                      <p className="text-dark/80 leading-relaxed">
                        {formatBoldText(limpiarBloque(bloque))}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Columna Derecha: solo Glosario */}
              <div className="space-y-6">
                {content.glosario && content.glosario.length > 0 && (
                  <div className="bg-sky/10 p-5 rounded-2xl">
                    <h4 className="font-bold text-lg mb-3 flex items-center gap-2">📚 Glosario Rápido</h4>
                    <ul className="space-y-3">
                      {content.glosario.map((item: any, idx: number) => (
                        <li key={idx} className="bg-white p-3 rounded-xl shadow-sm">
                          <span className="font-bold text-sky block">{item.termino}</span>
                          <span className="text-dark/70 text-sm mt-1 block">
                            {formatBoldText(item.definicion)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {/* Mapa conceptual eliminado — se integrará con Mermaid en el merge */}
              </div>
            </div>
          </motion.div>
        )}

        {/* 📄 MODO DISLEXIA */}
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

            <div className="max-w-3xl space-y-6">
              {content.resumen && (
                <div className="bg-mint/10 p-5 rounded-2xl">
                  <p className="font-dyslexic text-xl leading-loose tracking-wide text-dark">
                    {formatBoldText(limpiarBloque(content.resumen, true))}
                  </p>
                </div>
              )}
              <div className="space-y-6 mt-6">
                {content.bloques?.map((bloque: string, index: number) => (
                  <p key={index} className="font-dyslexic text-xl leading-loose tracking-wide text-dark/90">
                    {formatBoldText(limpiarBloque(bloque, true))}
                  </p>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* ❓ MODO QUIZ */}
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
              {content.quiz?.map((q: any, i: number) => (
                <div key={i} className="p-6 rounded-2xl border-2 border-dark/5 hover:border-sky/50 cursor-pointer transition-colors bg-cream">
                  <p className="font-semibold text-lg mb-4">{i + 1}. {q.pregunta || q.question}</p>
                  <div className="space-y-2">
                    {(q.opciones || q.options)?.map((opt: string, j: number) => (
                      <div key={j} className="p-3 rounded-xl bg-white border border-dark/5 hover:bg-sky/10">
                        {opt}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}