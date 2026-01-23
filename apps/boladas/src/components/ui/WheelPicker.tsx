import React, { useRef, useEffect, useState } from "react";

interface WheelPickerProps {
  options: string[] | number[];
  value: string | number;
  onChange: (value: string | number) => void;
  height?: number;
  itemHeight?: number;
}

export function WheelPicker({
  options,
  value,
  onChange,
  height = 200,
  itemHeight = 40,
}: WheelPickerProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isScrolling, setIsScrolling] = useState(false);

  // Initial scroll position
  useEffect(() => {
    if (scrollRef.current) {
      const index = (options as any[]).indexOf(value);
      if (index !== -1) {
        scrollRef.current.scrollTop = index * itemHeight;
      }
    }
  }, []);

  const handleScroll = () => {
    if (!scrollRef.current) return;
    setIsScrolling(true);

    // Use a timeout to detect scroll end
    const container = scrollRef.current;
    clearTimeout((container as any).scrollTimeout);

    (container as any).scrollTimeout = setTimeout(() => {
      setIsScrolling(false);
      const index = Math.round(container.scrollTop / itemHeight);
      const newValue = options[index];
      if (newValue !== undefined && newValue !== value) {
        onChange(newValue);
      }
    }, 150);
  };

  return (
    <div
      className="relative overflow-hidden bg-transparent"
      style={{ height: `${height}px`, width: "100%" }}
    >
      {/* Selection Highlight */}
      <div
        className="absolute left-0 right-0 top-1/2 -translate-y-1/2 border-y border-primary-500/30 bg-primary-500/5 pointer-events-none"
        style={{ height: `${itemHeight}px` }}
      />

      {/* Scrollable Area */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="h-full overflow-y-auto scrollbar-hide snap-y snap-mandatory py-[80px]" // Static padding to center first/last
        style={{
          paddingTop: `${(height - itemHeight) / 2}px`,
          paddingBottom: `${(height - itemHeight) / 2}px`,
        }}
      >
        {options.map((option, i) => {
          const isSelected = option === value;
          return (
            <div
              key={i}
              className={`flex items-center justify-center transition-all duration-200 snap-center ${
                isSelected
                  ? "text-primary-500 font-bold text-lg"
                  : "text-[var(--text-secondary)] text-base opacity-40"
              }`}
              style={{ height: `${itemHeight}px` }}
            >
              {option}
            </div>
          );
        })}
      </div>

      {/* Masking Gradient */}
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-[var(--bg-surface)] via-transparent to-[var(--bg-surface)] opacity-90" />
    </div>
  );
}
