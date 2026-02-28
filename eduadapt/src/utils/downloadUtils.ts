import { AdaptedContent, ProcessingMode } from '@/types';

export const downloadContent = (mode: ProcessingMode, content: AdaptedContent) => {
  let textContent = '';
  let filename = `eduadapt-${mode.toLowerCase()}-${Date.now()}.txt`;

  if (mode === 'ADHD' && content.adhd) {
    textContent += "RESUMEN VISUAL (MODO TDAH)\n\n";
    textContent += "=== PUNTOS CLAVE ===\n";
    content.adhd.keyPoints.forEach(p => textContent += `- ${p}\n`);
    textContent += "\n=== RESUMEN SIMPLIFICADO ===\n";
    textContent += content.adhd.simplifiedText + "\n";
    textContent += "\n=== SUGERENCIAS VISUALES ===\n";
    content.adhd.visualCues.forEach(c => textContent += `- ${c}\n`);
  } else if (mode === 'DYSLEXIA' && content.dyslexiaText) {
    textContent += "LECTURA ADAPTADA (MODO DISLEXIA)\n\n";
    textContent += content.dyslexiaText;
  } else if (mode === 'QUIZ' && content.quiz) {
    textContent += "REPASO INTERACTIVO (MODO QUIZ)\n\n";
    content.quiz.forEach((q, i) => {
      textContent += `${i + 1}. ${q.question}\n`;
      q.options.forEach((opt, j) => textContent += `   ${String.fromCharCode(97 + j)}) ${opt}\n`);
      textContent += `\n`;
    });
    
    textContent += "\n=== RESPUESTAS CORRECTAS ===\n";
    content.quiz.forEach((q, i) => {
      textContent += `${i + 1}. ${String.fromCharCode(97 + q.correctAnswerIndex)}\n`;
    });
  } else {
    console.warn("No content available to download for this mode.");
    return;
  }

  const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
