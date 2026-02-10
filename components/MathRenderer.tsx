import React, { useEffect, useRef } from 'react';

declare global {
  interface Window {
    MathJax?: {
      typesetPromise: (elements: (HTMLElement | null)[]) => Promise<void>;
    };
  }
}

interface MathRendererProps {
  content: string;
  className?: string;
}

const MathRenderer: React.FC<MathRendererProps> = ({ content, className = '' }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.MathJax && containerRef.current) {
      // Clear previous content to avoid duplication issues during re-renders if necessary
      // containerRef.current.innerHTML = content; 
      // Actually, React handles the innerHTML via props, we just need to tell MathJax to typeset it.
      
      window.MathJax.typesetPromise([containerRef.current]).catch((err: any) => {
        console.warn('MathJax typeset failed: ', err);
      });
    }
  }, [content]);

  // Convert newlines to <br/> for basic text formatting preservation
  const formattedContent = content.split('\n').map((str, index) => (
    <React.Fragment key={index}>
      {str}
      <br />
    </React.Fragment>
  ));

  return (
    <div 
      ref={containerRef} 
      className={`prose prose-blue max-w-none text-slate-700 leading-relaxed ${className}`}
    >
      {/* We render the raw string but let MathJax find the delimiters */}
      {formattedContent}
    </div>
  );
};

export default MathRenderer;