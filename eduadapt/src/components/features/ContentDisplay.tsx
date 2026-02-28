import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Brain, FileText, HelpCircle, Download, CheckCircle2, XCircle, Volume2, Square, GitBranch, X, AlertCircle, Maximize2 } from 'lucide-react';
import { ProcessingMode, AdaptedContent } from '@/types';
import { downloadContent } from '@/utils/downloadUtils';
import { Typewriter } from './Typewriter';

// ─── Mermaid loader ───────────────────────────────────────────
let mermaidInstance: any = null;
async function getMermaid() {
  if (!mermaidInstance) {
    const m = await import('mermaid');
    mermaidInstance = m.default;
    mermaidInstance.initialize({
      startOnLoad: false,
      theme: 'base',
      themeVariables: {
        primaryColor: '#e0f2fe',
        primaryTextColor: '#1e293b',
        primaryBorderColor: '#38bdf8',
        lineColor: '#94a3b8',
        secondaryColor: '#f0fdf4',
        tertiaryColor: '#fef9c3',
        fontFamily: 'inherit',
        fontSize: '14px',
      },
      flowchart: { curve: 'basis', padding: 16 },
    });
  }
  return mermaidInstance;
}

// ─── Componente Mermaid (acepta ref opcional para el contenedor) ──
function MermaidDiagram({
  chart,
  id = 'diagram',
  containerRef,
}: {
  chart: string;
  id?: string;
  containerRef?: React.RefObject<HTMLDivElement>;
}) {
  const [svg, setSvg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!chart) return;
    setSvg(null);
    setError(null);
    (async () => {
      try {
        const mermaid = await getMermaid();
        const uid = `mermaid-${id}-${Date.now()}`;
        const { svg: rendered } = await mermaid.render(uid, chart);
        setSvg(rendered);
      } catch {
        setError('No se pudo renderizar el diagrama.');
      }
    })();
  }, [chart, id]);

  if (error) return (
    <div className="flex items-center gap-2 p-3 bg-red-50 rounded-xl text-red-500 text-sm">
      <AlertCircle size={16} />
      {error}
    </div>
  );

  if (!svg) return (
    <div className="flex items-center justify-center h-24 text-dark/30 text-sm animate-pulse">
      Renderizando diagrama…
    </div>
  );

  return (
    <div
      ref={containerRef}
      className="w-full overflow-x-auto"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

// ─── Modal expandido ──────────────────────────────────────────
function MapModal({ chart, onClose }: { chart: string; onClose: () => void }) {
  // ref apunta al div que contiene el SVG de Mermaid en el modal
  const svgContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleDownload = () => {
    const svgEl = svgContainerRef.current?.querySelector('svg');
    if (!svgEl) {
      console.warn('SVG no encontrado');
      return;
    }

    const bbox = svgEl.getBoundingClientRect();
    const scale = 2;
    const W = bbox.width  || 800;
    const H = bbox.height || 600;

    // Clonar y limpiar referencias externas que contaminan el canvas (tainted)
    const clone = svgEl.cloneNode(true) as SVGElement;
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    clone.setAttribute('width',  String(W));
    clone.setAttribute('height', String(H));
    // Eliminar <image> con href externos (causa del SecurityError)
    clone.querySelectorAll('image').forEach(el => el.remove());

    // Usar data URL base64 en lugar de objectURL — nunca contamina el canvas
    const svgStr  = new XMLSerializer().serializeToString(clone);
    const b64     = btoa(unescape(encodeURIComponent(svgStr)));
    const dataUrl = `data:image/svg+xml;base64,${b64}`;

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width  = W * scale;
      canvas.height = H * scale;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.scale(scale, scale);
      ctx.drawImage(img, 0, 0);

      canvas.toBlob((blob) => {
        if (!blob) return;
        const pngUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = pngUrl;
        a.download = `mapa-mental-${Date.now()}.png`;
        a.click();
        URL.revokeObjectURL(pngUrl);
      }, 'image/png');
    };
    img.onerror = (e) => console.error('Error renderizando SVG:', e);
    img.src = dataUrl;
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-10"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Backdrop */}
      <motion.div
        className="absolute inset-0 bg-dark/50 backdrop-blur-sm"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        onClick={onClose}
      />

      {/* Panel */}
      <motion.div
        className="relative z-10 bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden"
        initial={{ scale: 0.92, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.92, opacity: 0, y: 20 }}
        transition={{ type: 'spring', damping: 22, stiffness: 300 }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-5 border-b border-dark/5">
          <span className="flex items-center gap-2 font-bold text-lg text-dark">
            <GitBranch size={20} className="text-purple-500" />
            Mapa Mental
          </span>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-dark/5 text-dark/50 hover:text-dark transition-colors"
            aria-label="Cerrar"
          >
            <X size={20} />
          </button>
        </div>

        {/* Diagrama — le pasamos el ref al contenedor del SVG */}
        <div className="flex-1 overflow-auto p-8 bg-gradient-to-br from-purple-50/60 to-sky-50/60">
          <MermaidDiagram chart={chart} id="modal" containerRef={svgContainerRef} />
        </div>

        {/* Footer */}
        <div className="px-8 py-4 border-t border-dark/5 flex justify-end">
          <button
            onClick={handleDownload}
            className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold text-purple-600 border-2 border-purple-200 hover:bg-purple-50 transition-colors"
          >
            <Download size={15} />
            Descargar PNG
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── ContentDisplay principal ─────────────────────────────────
interface ContentDisplayProps {
  mode: ProcessingMode;
  content: AdaptedContent;
}

export function ContentDisplay({ mode, content }: ContentDisplayProps) {
  const [selectedOptions, setSelectedOptions] = useState<Record<string, number>>({});
  const [mapOpen, setMapOpen] = useState(false);
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
              {/* Columna izquierda: puntos clave */}
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

                {/* Columna derecha: mapa mental o placeholder */}
                {content.mermaidMap ? (
                  <button
                    onClick={() => setMapOpen(true)}
                    className="group relative bg-gradient-to-br from-purple-50 to-sky-50 border-2 border-purple-100 hover:border-purple-300 rounded-2xl p-4 text-left transition-all duration-200 hover:shadow-md cursor-pointer min-h-[150px] flex flex-col"
                    aria-label="Expandir mapa mental"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="flex items-center gap-2 text-xs font-semibold text-purple-600">
                        <GitBranch size={14} />
                        Mapa Mental
                      </span>
                      <span className="flex items-center gap-1 text-xs text-dark/30 group-hover:text-purple-400 transition-colors">
                        <Maximize2 size={12} />
                        Ampliar
                      </span>
                    </div>
                    <div className="pointer-events-none select-none overflow-hidden rounded-xl flex-1">
                      <MermaidDiagram chart={content.mermaidMap} id="preview" />
                    </div>
                  </button>
                ) : (
                  <div className="bg-sky/10 p-6 rounded-2xl flex items-center justify-center min-h-[150px]">
                    <span className="text-dark/50 italic text-sm text-center">
                      El mapa mental aparecerá aquí al procesar un archivo
                    </span>
                  </div>
                )}
                {/*}
              <div className="bg-sky/10 p-6 rounded-2xl flex items-center justify-center min-h-[150px]">
                <span className="text-dark/50 italic">
                  {content.adhd?.visualCues?.[0] || "Gráfico o diagrama generado..."}
                </span>
              </div>
              */}
            </div>
            <p className="text-lg leading-relaxed text-dark/80">
               {content.adhd?.simplifiedText && <Typewriter text={content.adhd.simplifiedText} />}
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
            <div className="flex items-center justify-between pr-12">
            <h3 className="text-2xl font-bold text-dark mb-4 flex items-center gap-2 font-dyslexic pr-12">
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