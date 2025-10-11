import { ReactNode, useState, useRef, useEffect } from "react";

interface AccordionProps {
  title: string;
  children: ReactNode;
  defaultExpanded?: boolean;
  storageKey?: string;
}

export function Accordion({ title, children, defaultExpanded = false, storageKey }: AccordionProps) {
  const [isExpanded, setIsExpanded] = useState(() => {
    if (storageKey) {
      const stored = localStorage.getItem(storageKey);
      if (stored !== null) return stored === 'true';
    }
    return defaultExpanded;
  });

  const contentRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | undefined>(undefined);

  useEffect(() => {
    if (contentRef.current) {
      setHeight(isExpanded ? contentRef.current.scrollHeight : 0);
    }
  }, [isExpanded, children]);

  const toggle = () => {
    const newState = !isExpanded;
    setIsExpanded(newState);
    if (storageKey) {
      localStorage.setItem(storageKey, String(newState));
    }
  };

  return (
    <div className={`accordion ${isExpanded ? 'expanded' : 'collapsed'}`}>
      <div className="accordion-header" onClick={toggle}>
        <h4>{title}</h4>
        <svg
          className="accordion-icon"
          width="12"
          height="12"
          viewBox="0 0 12 12"
          fill="currentColor"
        >
          <path d="M6 8L2 4h8z" />
        </svg>
      </div>
      <div
        ref={contentRef}
        className="accordion-content"
        style={{ maxHeight: height }}
      >
        <div className="accordion-body">{children}</div>
      </div>
    </div>
  );
}
