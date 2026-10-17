import React from 'react';
import { cn } from '../../utils/cn';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'ink' | 'danger' | 'default';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading = false, children, disabled, ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center font-medium transition-colors cursor-pointer disabled:opacity-50 disabled:pointer-events-none select-none';

    const variantStyles: Record<string, string> = {
      default: 'bg-[#f54e00] text-white hover:bg-[#d04200] active:bg-[#d04200]',
      primary: 'bg-[#f54e00] text-white hover:bg-[#d04200] active:bg-[#d04200]',
      secondary: 'bg-white text-[#26251e] border border-[#e6e5e0] hover:bg-[#fafaf7] hover:border-[#cfcdc4]',
      outline: 'bg-transparent text-[#26251e] border border-[#e6e5e0] hover:bg-white hover:border-[#cfcdc4]',
      ghost: 'bg-transparent text-[#5a5852] hover:text-[#26251e] hover:bg-[#fafaf7]',
      ink: 'bg-[#26251e] text-[#f7f7f4] hover:bg-[#151412]',
      danger: 'bg-[#cf2d56] text-white hover:bg-[#b02246]'
    };

    const sizeStyles = {
      sm: 'h-8 px-3 text-xs rounded-md gap-1.5',
      md: 'h-10 px-4 text-sm rounded-md gap-2',
      lg: 'h-11 px-5 text-base rounded-md gap-2.5',
      icon: 'h-9 w-9 p-0 rounded-md'
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(baseStyles, variantStyles[variant], sizeStyles[size], className)}
        {...props}
      >
        {isLoading ? (
          <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-1.5" />
        ) : null}
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button';
