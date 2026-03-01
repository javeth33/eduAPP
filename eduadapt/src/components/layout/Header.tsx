import React from 'react';
import { Brain } from 'lucide-react';

export function Header() {
  return (
    <header className="w-full py-6 px-4 md:px-8 border-b border-dark/5 bg-white/50 backdrop-blur-sm sticky top-0 z-10">
      <div className="max-w-4xl mx-auto flex items-center gap-3">
       
        <div className="w-20 h-20 flex items-center justify-center">
        <img 
          src="/favicon.ico" 
          alt="Icono EduAdapt"
          className="w-36 h-36 object-contain" 
        />
      </div>
        <h1 className="text-2xl font-bold tracking-tight text-dark">EduAdapt</h1>
      </div>
    </header>
  );
}
