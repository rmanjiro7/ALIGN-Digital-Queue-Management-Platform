import React from 'react';
import { Icon as IconifyIcon, IconProps as IconifyProps } from '@iconify/react';

export interface IconProps extends Omit<IconifyProps, 'icon'> {
  icon: string;
  className?: string;
  size?: number | string;
}

/**
 * Universal Icon component using Iconify.
 * Strictly avoids emojis and supports professional icon sets (Lucide, Carbon, Solar, Material, etc.).
 */
export const Icon: React.FC<IconProps> = ({ icon, className = 'w-4 h-4', size, ...props }) => {
  // Ensure default prefix if none provided
  const resolvedIcon = icon.includes(':') ? icon : `lucide:${icon}`;
  
  return (
    <IconifyIcon
      icon={resolvedIcon}
      className={className}
      width={size}
      height={size}
      {...props}
    />
  );
};
