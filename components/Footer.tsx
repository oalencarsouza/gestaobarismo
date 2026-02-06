
import React from 'react';

interface FooterProps {
    text?: string;
    className?: string;
}

export const Footer: React.FC<FooterProps> = ({
    text = '© 2024 Gestão Barismo - Gestão Inteligente para Gastronomia e Entretenimento.',
    className = ''
}) => (
    <footer className={`border-t border-slate-200 dark:border-[#493222] py-8 px-10 flex flex-col items-center justify-center gap-4 bg-white dark:bg-background-dark mt-auto ${className}`}>
        <p className="text-slate-400 text-xs font-medium">{text}</p>
    </footer>
);
