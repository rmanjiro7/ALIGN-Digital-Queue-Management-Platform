import React from 'react';
import { cn } from '../../utils/cn';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 
    | 'default' 
    | 'primary' 
    | 'thinking' 
    | 'grep' 
    | 'read' 
    | 'edit' 
    | 'done' 
    | 'outline' 
    | 'success' 
    | 'error';
  size?: 'sm' | 'md';
}

export const Badge: React.FC<BadgeProps> = ({
  className,
  variant = 'default',
  size = 'md',
  children,
  ...props
}) => {
  const variantStyles = {
    default: 'bg-[#e6e5e0] text-[#26251e]',
    primary: 'bg-[#f54e00] text-white',
    thinking: 'bg-[#dfa88f] text-[#26251e]', // Peach
    grep: 'bg-[#9fc9a2] text-[#26251e]',     // Mint
    read: 'bg-[#9fbbe0] text-[#26251e]',     // Pastel blue
    edit: 'bg-[#c0a8dd] text-[#26251e]',     // Lavender
    done: 'bg-[#c08532] text-white',         // Warm Gold
    outline: 'bg-white text-[#5a5852] border border-[#e6e5e0]',
    success: 'bg-[#1f8a65]/10 text-[#1f8a65] border border-[#1f8a65]/30',
    error: 'bg-[#cf2d56]/10 text-[#cf2d56] border border-[#cf2d56]/30'
  };

  const sizeStyles = {
    sm: 'px-2 py-0.5 text-[10px] tracking-wider uppercase font-semibold font-mono',
    md: 'px-2.5 py-1 text-xs tracking-wide font-medium font-mono'
  };

  return (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full select-none',
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};
