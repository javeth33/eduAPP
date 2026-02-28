import React from 'react';
import { Brain, FileText, HelpCircle } from 'lucide-react';
import { ProcessingMode } from '@/types';

interface ModeSelectorProps {
  activeMode: ProcessingMode;
  onModeChange: (mode: ProcessingMode) => void;
}

export function ModeSelector({ activeMode, onModeChange }: ModeSelectorProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <TabButton 
        isActive={activeMode === 'ADHD'} 
        onClick={() => onModeChange('ADHD')}
        icon={<Brain size={24} />}
        label="MODO TDAH"
        description="Resúmenes visuales"
        color="bg-sky"
      />
      <TabButton 
        isActive={activeMode === 'DYSLEXIA'} 
        onClick={() => onModeChange('DYSLEXIA')}
        icon={<FileText size={24} />}
        label="MODO DISLEXIA"
        description="Texto adaptado"
        color="bg-mint"
      />
      <TabButton 
        isActive={activeMode === 'QUIZ'} 
        onClick={() => onModeChange('QUIZ')}
        icon={<HelpCircle size={24} />}
        label="MODO QUIZ"
        description="Preguntas de repaso"
        color="bg-cream border-2 border-dark/10"
        activeColor="bg-yellow-100"
      />
    </div>
  );
}

interface TabButtonProps {
  isActive: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  description: string;
  color: string;
  activeColor?: string;
}

function TabButton({ isActive, onClick, icon, label, description, color, activeColor }: TabButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`
        relative p-6 rounded-2xl text-left transition-all duration-200 ease-out
        flex flex-col gap-3
        ${isActive 
          ? `shadow-md scale-[1.02] ring-2 ring-dark/5 ${activeColor || color}` 
          : 'bg-white hover:bg-white/80 border border-dark/5 hover:border-dark/10'
        }
      `}
    >
      <div className={`
        w-12 h-12 rounded-xl flex items-center justify-center
        ${isActive ? 'bg-white/90 text-dark' : 'bg-dark/5 text-dark/60'}
      `}>
        {icon}
      </div>
      <div>
        <span className="block font-bold text-lg">{label}</span>
        <span className="text-sm opacity-70">{description}</span>
      </div>
    </button>
  );
}
