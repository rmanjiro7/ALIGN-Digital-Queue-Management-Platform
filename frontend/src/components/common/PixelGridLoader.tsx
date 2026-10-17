import React, { useEffect, useRef } from 'react';
import { animate } from 'animejs';

interface PixelGridLoaderProps {
  gridSize?: number;
  pixelSize?: number;
  gap?: number;
  color?: string;
  className?: string;
}

export const PixelGridLoader: React.FC<PixelGridLoaderProps> = ({
  gridSize = 3,
  pixelSize = 12,
  gap = 2,
  color = '#f54e00',
  className = ''
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const pixels = Array.from({ length: gridSize * gridSize }, (_, i) => i);

  useEffect(() => {
    if (!containerRef.current) return;
    const pixelElements = containerRef.current.querySelectorAll<HTMLDivElement>('.pixel-node');

    pixelElements.forEach((el) => {
      const row = Number(el.getAttribute('data-row') || '0');
      const col = Number(el.getAttribute('data-col') || '0');
      const delay = (row + col) * 130;

      try {
        animate(el, {
          opacity: [0.15, 1, 0.15],
          scale: [0.75, 1.05, 0.75],
          boxShadow: [
            `0 0 0px ${color}00`,
            `0 0 16px ${color}99`,
            `0 0 0px ${color}00`
          ],
          duration: 900,
          delay,
          loop: true,
          ease: 'inOutQuad'
        });
      } catch (err) {
        // Fallback CSS pulse if canvas context or animation engine busy
        el.style.opacity = '1';
      }
    });

    return () => {
      pixelElements.forEach((el) => {
        try {
          // clean inline styling on unmount
          el.style.transform = '';
        } catch {
          // ignore
        }
      });
    };
  }, [gridSize, color]);

  return (
    <div
      ref={containerRef}
      className={`inline-grid select-none ${className}`}
      style={{
        gridTemplateColumns: `repeat(${gridSize}, ${pixelSize}px)`,
        gap: `${gap}px`
      }}
    >
      {pixels.map((i) => {
        const row = Math.floor(i / gridSize);
        const col = i % gridSize;

        return (
          <div
            key={i}
            className="pixel-node rounded-[2px]"
            data-row={row}
            data-col={col}
            style={{
              width: pixelSize,
              height: pixelSize,
              backgroundColor: color,
              opacity: 0.2
            }}
          />
        );
      })}
    </div>
  );
};
