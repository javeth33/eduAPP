import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Brain, FileText, HelpCircle, Download, CheckCircle2, 
  XCircle, Volume2, Square, GitBranch, X, AlertCircle, Maximize2, BookOpen
} from 'lucide-react';
import { ProcessingMode } from '@/types';
import { downloadContent } from '@/utils/downloadUtils';

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

// ─── Utilidades de Limpieza y Formato ──────────────────────────
const stripEmojis = (text: string) => {
  return text.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E6}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '');
};

const formatBoldText = (text?: string, removeEmojis: boolean = false) => {
  if (!text) return null;
  let processedText = removeEmojis ? stripEmojis(text) : text;
  const parts = processedText.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={index} className="font-bold text-gray-900">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <span key={index}>{part}</span>;
  });
};

// ─── Componente Mermaid ───────────────────────────────────────
function MermaidDiagram({ chart, id = 'diagram', containerRef }: { chart: string; id?: string; containerRef?: React.RefObject<HTMLDivElement>; }) {
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
      <AlertCircle size={16} /> {error}
    </div>
  );

  if (!svg) return <div className="flex items-center justify-center h-24 text-dark/30 text-sm animate-pulse">Renderizando diagrama…</div>;

  return <div ref={containerRef} className="w-full overflow-x-auto" dangerouslySetInnerHTML={{ __html: svg }} />;
}

// ─── Modal Mapa ───────────────────────────────────────────────
function MapModal({ chart, onClose }: { chart: string; onClose: () => void }) {
  const svgContainerRef = useRef<HTMLDivElement>(null);

  const handleDownload = () => {
    const svgEl = svgContainerRef.current?.querySelector('svg');
    if (!svgEl) return;
    const bbox = svgEl.getBoundingClientRect();
    const scale = 2;
    const W = bbox.width || 800;
    const H = bbox.height || 600;
    const clone = svgEl.cloneNode(true) as SVGElement;
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    clone.setAttribute('width', String(W));
    clone.setAttribute('height', String(H));
    const svgStr = new XMLSerializer().serializeToString(clone);
    const b64 = btoa(unescape(encodeURIComponent(svgStr)));
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = W * scale;
      canvas.height = H * scale;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.scale(scale, scale);
      ctx.drawImage(img, 0, 0);
      const pngUrl = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = pngUrl;
      a.download = `mapa-conceptual-${Date.now()}.png`;
      a.click();
    };
    img.src = `data:image/svg+xml;base64,${b64}`;
  };

  return (
    <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-10" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="absolute inset-0 bg-dark/50 backdrop-blur-sm" onClick={onClose} />
      <motion.div className="relative z-10 bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden" initial={{ scale: 0.92, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.92, opacity: 0, y: 20 }}>
        <div className="flex items-center justify-between px-8 py-5 border-b border-dark/5">
          <span className="flex items-center gap-2 font-bold text-lg text-dark"><GitBranch size={20} className="text-purple-500" /> Mapa Conceptual</span>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-dark/5 text-dark/50"><X size={20} /></button>
        </div>
        <div className="flex-1 overflow-auto p-8 bg-gradient-to-br from-purple-50/60 to-sky-50/60">
          <MermaidDiagram chart={chart} id="modal" containerRef={svgContainerRef} />
        </div>
        <div className="px-8 py-4 border-t border-dark/5 flex justify-end">
          <button onClick={handleDownload} className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold text-purple-600 border-2 border-purple-200 hover:bg-purple-50">
            <Download size={15} /> Descargar PNG
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── ContentDisplay principal ─────────────────────────────────
interface ContentDisplayProps { mode: ProcessingMode; content: any; }

export function ContentDisplay({ mode, content }: ContentDisplayProps) {
  const [selectedOptions, setSelectedOptions] = useState<Record<string, number>>({});
  const [mapOpen, setMapOpen] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const synthRef = useRef<SpeechSynthesis | null>(null);

  useEffect(() => {
    synthRef.current = window.speechSynthesis;
    return () => synthRef.current?.cancel();
  }, []);

  const handleDownloadAction = async () => {
    try {
      if (content) {
        await downloadContent(mode, content);
      }
    } catch (error) {
      console.error("Error al descargar:", error);
    }
  };

  const toggleSpeech = (text: string) => {
    if (!synthRef.current) return;
    if (isSpeaking) {
      synthRef.current.cancel();
      setIsSpeaking(false);
    } else {
      const cleanText = stripEmojis(text).replace(/\*\*/g, '');
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.lang = 'es-MX';
      utterance.onend = () => setIsSpeaking(false);
      synthRef.current.speak(utterance);
      setIsSpeaking(true);
    }
  };

  if (content?.isProcessing) {
    return (
      <div className="bg-white rounded-3xl p-6 md:p-10 shadow-sm border border-dark/5 min-h-[400px] flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-sky/20 border-t-sky rounded-full animate-spin mb-4"></div>
        <p className="text-dark/60 font-medium animate-pulse">Gemini está adaptando tu material...</p>
      </div>
    );
  }

  const hasContent = content && (content.resumen || content.bloques || content.quiz);
  const resumenInicial = content?.resumen_oral || content?.resumen || '';
  const bloquesTexto = content?.bloques?.join(' ') || '';
  const textoCompletoParaLeer = `${resumenInicial} ${bloquesTexto}`.trim();

  return (
    <>
      <div className="bg-white rounded-3xl p-6 md:p-10 shadow-sm border border-dark/5 min-h-[400px] relative">
        {hasContent && (
          <button
            onClick={handleDownloadAction}
            className="absolute top-6 right-6 md:top-10 md:right-10 p-2 rounded-full hover:bg-dark/5 text-dark/60 hover:text-dark transition-colors z-20"
            title="Descargar contenido"
          >
            <Download size={24} />
          </button>
        )}

        <AnimatePresence mode="wait">
          {/* ── TDAH (ADHD) ───────────────────────────── */}
          {mode === 'ADHD' && (
            <motion.div key="adhd" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
              <h3 className="text-2xl font-bold text-dark flex items-center gap-2"><Brain className="text-sky" /> Resumen Visual</h3>
              
              <div className="grid gap-6 md:grid-cols-2 md:items-start">
                <div className="space-y-4">
                  {content.resumen && (
                    <div className="text-lg font-semibold text-dark/90 pb-3 border-b border-dark/10">
                      {formatBoldText(content.resumen)}
                    </div>
                  )}
                  {content.bloques?.map((bloque: string, i: number) => (
                    <div key={i} className="bg-cream p-4 rounded-xl border-l-4 border-sky">
                      <p className="text-dark/80 leading-relaxed">{formatBoldText(bloque)}</p>
                    </div>
                  ))}
                </div>

                {content.mapa_mermaid ? (
                  <button onClick={() => setMapOpen(true)} className="w-full group bg-gradient-to-br from-purple-50 to-sky-50 border-2 border-purple-100 hover:border-purple-300 rounded-2xl p-5 text-left transition-all duration-200 hover:shadow-md flex flex-col">
                    <div className="flex items-center justify-between mb-3 shrink-0">
                      <span className="flex items-center gap-2 text-sm font-semibold text-purple-600">
                        <GitBranch size={16} /> Mapa Conceptual
                      </span>
                      <span className="flex items-center gap-1 text-xs text-dark/30 group-hover:text-purple-400 transition-colors">
                        <Maximize2 size={13} /> Ampliar
                      </span>
                    </div>
                    <div className="pointer-events-none select-none rounded-xl flex-1 flex items-center justify-center overflow-hidden">
                      <MermaidDiagram chart={content.mapa_mermaid} id="preview" />
                    </div>
                  </button>
                ) : (
                  <div className="bg-gray-50 rounded-2xl border border-dark/5 flex items-center justify-center min-h-[160px]">
                    <span className="text-dark/40 italic text-sm">El mapa conceptual aparecerá aquí</span>
                  </div>
                )}
              </div>

              {/* GLOSARIO REINTEGRADO */}
              {content.glosario?.length > 0 && (
                <div className="bg-sky/10 p-5 rounded-2xl">
                  <h4 className="font-bold text-lg mb-3 flex items-center gap-2">
                    <BookOpen size={18} className="text-sky" /> Glosario Rápido
                  </h4>
                  <ul className="space-y-3">
                    {content.glosario.map((item: any, idx: number) => (
                      <li key={idx} className="bg-white p-3 rounded-xl shadow-sm">
                        <span className="font-bold text-sky block">{item.termino}</span>
                        <span className="text-dark/70 text-sm mt-1 block">{item.definicion}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </motion.div>
          )}

                    {/* ── DISLEXIA (DYSLEXIA) ────────────────────── */}
          {mode === 'DYSLEXIA' && (
            <motion.div key="dyslexia" /* ... props ... */>
              <div className="flex items-center justify-between pr-12">
                <h3 className="text-2xl font-bold text-dark flex items-center gap-2 font-dyslexic">
                  <FileText className="text-mint" /> Lectura Adaptada
                </h3>
                
                {/* CAMBIO AQUÍ: Usar textoCompletoParaLeer */}
                {textoCompletoParaLeer && (
                  <button 
                    onClick={() => toggleSpeech(textoCompletoParaLeer)} 
                    className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all shrink-0 ${isSpeaking ? 'bg-red-100 text-red-600' : 'bg-mint/10 text-mint hover:bg-mint/20'}`}
                  >
                    {isSpeaking ? <Square size={18} fill="currentColor" /> : <Volume2 size={18} />}
                    <span className="font-medium text-sm">{isSpeaking ? 'Detener' : 'Escuchar'}</span>
                  </button>
                )}
              </div>
              
              {/* El resto de tu renderizado se mantiene igual para mantener el diseño visual separado */}
              <div className="max-w-3xl space-y-6">
                <div className="bg-mint/10 p-5 rounded-2xl">
                  <p className="font-dyslexic text-xl leading-loose tracking-wide text-dark">
                    {formatBoldText(resumenInicial, true)}
                  </p>
                </div>
                {content.bloques?.map((bloque: string, i: number) => (
                  <p key={i} className="font-dyslexic text-xl leading-loose tracking-wide text-dark/90">
                    {formatBoldText(bloque, true)}
                  </p>
                ))}
              </div>
            </motion.div>
          )}

          {/* ── QUIZ ──────────────────────────────────── */}
          {mode === 'QUIZ' && (
            <motion.div key="quiz" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
              <h3 className="text-2xl font-bold text-dark mb-4 flex items-center gap-2 pr-12">
                <HelpCircle className="text-orange-400" /> Repaso Interactivo
              </h3>
              <div className="space-y-6">
                {(content.quiz || []).map((q: any, i: number) => (
                  <div key={i} className="p-6 rounded-2xl border-2 border-dark/5 bg-cream">
                    <p className="font-semibold text-lg mb-4">{i + 1}. {q.pregunta || q.question}</p>
                    <div className="space-y-3">
                      {(q.opciones || q.options || []).map((opt: string, j: number) => {
                        const qKey = `q-${i}`;
                        const isCorrectIdx = j === (q.respuesta ?? q.correctAnswerIndex);
                        const isSelected = selectedOptions[qKey] === j;
                        const hasAnswered = selectedOptions[qKey] !== undefined;

                        let btnClass = "border-dark/5 bg-white hover:border-sky/50";
                        if (isSelected) {
                          btnClass = isCorrectIdx ? "border-green-500 bg-green-50" : "border-red-500 bg-red-50";
                        } else if (hasAnswered && isCorrectIdx) {
                          btnClass = "border-green-300 bg-green-50/50";
                        }

                        return (
                          <button key={j} disabled={hasAnswered} onClick={() => setSelectedOptions(p => ({...p, [qKey]: j}))} className={`w-full text-left p-4 rounded-xl border-2 transition-all flex items-center justify-between ${btnClass}`}>
                            <span>{opt}</span>
                            {isSelected && (isCorrectIdx ? <CheckCircle2 className="text-green-500" size={20} /> : <XCircle className="text-red-500" size={20} />)}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {mapOpen && content.mapa_mermaid && (
          <MapModal chart={content.mapa_mermaid} onClose={() => setMapOpen(false)} />
        )}
      </AnimatePresence>
    </>
  );
}