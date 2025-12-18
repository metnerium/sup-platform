import React from 'react';
import clsx from 'clsx';
import { getInitials, getAvatarColor } from '@/utils/format';

interface AvatarProps {
  src?: string;
  name: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  isOnline?: boolean;
  className?: string;
  onClick?: () => void;
}

export const Avatar: React.FC<AvatarProps> = ({
  src,
  name,
  size = 'md',
  isOnline,
  className,
  onClick,
}) => {
  const sizeClasses = {
    xs: 'w-6 h-6 text-xs',
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-base',
    lg: 'w-12 h-12 text-lg',
    xl: 'w-16 h-16 text-xl',
  };

  const onlineIndicatorSize = {
    xs: 'w-1.5 h-1.5',
    sm: 'w-2 h-2',
    md: 'w-2.5 h-2.5',
    lg: 'w-3 h-3',
    xl: 'w-4 h-4',
  };

  const initials = getInitials(name);
  const bgColor = getAvatarColor(name);

  return (
    <div
      className={clsx('relative flex-shrink-0', className)}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
    >
      <div
        className={clsx(
          'rounded-full flex items-center justify-center font-semibold text-white overflow-hidden',
          sizeClasses[size],
          onClick && 'cursor-pointer'
        )}
        style={{ backgroundColor: src ? undefined : bgColor }}
      >
        {src ? (
          <img src={src} alt={name} className="w-full h-full object-cover" />
        ) : (
          <span>{initials}</span>
        )}
      </div>
      {isOnline !== undefined && (
        <span
          className={clsx(
            'absolute bottom-0 right-0 rounded-full border-2 border-white dark:border-dark-bg',
            onlineIndicatorSize[size],
            isOnline ? 'bg-green-500' : 'bg-gray-400'
          )}
        />
      )}
    </div>
  );
};
