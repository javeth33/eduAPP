export type ProcessingMode = 'ADHD' | 'DYSLEXIA' | 'QUIZ';

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswerIndex: number;
}

export interface AdhdSummary {
  keyPoints: string[];
  simplifiedText: string;
  visualCues: string[]; // Descriptions for potential images/icons
}

export interface AdaptedContent {
  originalText: string;
  adhd: AdhdSummary | null;
  dyslexiaText: string | null;
  quiz: QuizQuestion[] | null;
  isProcessing: boolean;
  error: string | null;
}
