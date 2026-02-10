import React from 'react';

interface ThemeToggleProps {
    isDark: boolean;
    onToggle: () => void;
}

const ThemeToggle: React.FC<ThemeToggleProps> = ({ isDark, onToggle }) => {
    return (
        <button
            onClick={onToggle}
            className="relative w-14 h-7 rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
            style={{
                backgroundColor: isDark ? '#1e293b' : '#e2e8f0'
            }}
            aria-label="Toggle dark mode"
        >
            <div
                className="absolute top-0.5 left-0.5 w-6 h-6 rounded-full transition-all duration-300 flex items-center justify-center shadow-md"
                style={{
                    transform: isDark ? 'translateX(28px)' : 'translateX(0)',
                    backgroundColor: isDark ? '#fbbf24' : '#f59e0b'
                }}
            >
                {isDark ? (
                    <i className="fa-solid fa-moon text-slate-800 text-xs"></i>
                ) : (
                    <i className="fa-solid fa-sun text-white text-xs"></i>
                )}
            </div>
        </button>
    );
};

export default ThemeToggle;
