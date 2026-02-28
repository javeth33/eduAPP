import { jsPDF } from 'jspdf';
import { AdaptedContent, ProcessingMode } from '@/types';

export const downloadContent = (mode: ProcessingMode, content: AdaptedContent) => {
  const doc = new jsPDF();
  const filename = `eduadapt-${mode.toLowerCase()}-${Date.now()}.pdf`;
  const margin = 20;
  let cursorY = 20;

  // Función para eliminar emojis y caracteres especiales que rompen jsPDF
  const cleanText = (text: string) => {
    return text
      .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '') // Quita emojis
      .replace(/[^\x00-\x7F\x80-\xFF]/g, '') // Quita caracteres fuera del rango estándar
      .trim();
  };

  const addWrappedText = (text: string, fontSize: number = 12, isBold: boolean = false) => {
    const cleanedText = cleanText(text);
    if (!cleanedText) return; // Evita líneas vacías si solo había un emoji

    doc.setFontSize(fontSize);
    doc.setFont('helvetica', isBold ? 'bold' : 'normal');
    
    // Ajuste de altura de línea (line height)
    const lineHeight = fontSize * 0.5;
    const lines = doc.splitTextToSize(cleanedText, 170);
    
    // Verificar si necesitamos una nueva página
    if (cursorY + (lines.length * lineHeight) > 280) {
      doc.addPage();
      cursorY = 20;
    }

    doc.text(lines, margin, cursorY);
    cursorY += (lines.length * lineHeight) + 4;
  };

  // Título Principal
  doc.setTextColor(33, 33, 33);
  addWrappedText(`EduAdapt - Reporte de Aprendizaje`, 18, true);
  doc.setDrawColor(200, 200, 200);
  doc.line(margin, cursorY, 190, cursorY);
  cursorY += 10;

  if (mode === 'ADHD' && content.adhd) {
    addWrappedText("MODO TDAH: Resumen Visual", 14, true);
    cursorY += 2;
    
    addWrappedText("PUNTOS CLAVE", 12, true);
    content.adhd.keyPoints.forEach(p => addWrappedText(`• ${p}`));
    
    cursorY += 5;
    addWrappedText("RESUMEN SIMPLIFICADO", 12, true);
    addWrappedText(content.adhd.simplifiedText);
    
    cursorY += 5;
    addWrappedText("GLOSARIO Y ANALOGÍAS", 12, true);
    content.adhd.visualCues.forEach(c => addWrappedText(`• ${c}`));

  } else if (mode === 'DYSLEXIA' && content.dyslexiaText) {
    addWrappedText("MODO DISLEXIA: Lectura Adaptada", 14, true);
    cursorY += 2;
    addWrappedText(content.dyslexiaText, 12);

  } else if (mode === 'QUIZ' && content.quiz) {
    addWrappedText("MODO QUIZ: Repaso Interactivo", 14, true);
    cursorY += 2;
    
    content.quiz.forEach((q, i) => {
      addWrappedText(`${i + 1}. ${q.question}`, 12, true);
      q.options.forEach((opt, j) => {
        const letter = String.fromCharCode(97 + j);
        addWrappedText(`   ${letter}) ${opt}`);
      });
      cursorY += 3;
    });

    // Hoja de respuestas al final
    doc.addPage();
    cursorY = 20;
    addWrappedText("HOJA DE RESPUESTAS", 14, true);
    content.quiz.forEach((q, i) => {
      const correctLetter = String.fromCharCode(97 + q.correctAnswerIndex);
      addWrappedText(`${i + 1}. Respuesta correcta: (${correctLetter})`);
    });
  }

  doc.save(filename);
};