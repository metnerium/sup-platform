import { format, formatDistanceToNow, isToday, isYesterday, isThisWeek, isThisYear } from 'date-fns';

export const formatMessageTime = (date: Date | string): string => {
  const d = new Date(date);

  if (isToday(d)) {
    return format(d, 'HH:mm');
  } else if (isYesterday(d)) {
    return 'Yesterday';
  } else if (isThisWeek(d)) {
    return format(d, 'EEEE');
  } else if (isThisYear(d)) {
    return format(d, 'MMM d');
  } else {
    return format(d, 'MM/dd/yyyy');
  }
};

export const formatLastSeen = (date: Date | string | undefined): string => {
  if (!date) return 'offline';

  const d = new Date(date);
  const now = new Date();
  const diffInMinutes = Math.floor((now.getTime() - d.getTime()) / 1000 / 60);

  if (diffInMinutes < 1) {
    return 'just now';
  } else if (diffInMinutes < 60) {
    return `${diffInMinutes} min ago`;
  } else if (diffInMinutes < 1440) {
    const hours = Math.floor(diffInMinutes / 60);
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  } else {
    return formatDistanceToNow(d, { addSuffix: true });
  }
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
};

export const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

export const getInitials = (name: string): string => {
  const parts = name.trim().split(' ');
  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

export const getAvatarColor = (id: string): string => {
  const colors = [
    '#e53935', '#d81b60', '#8e24aa', '#5e35b1',
    '#3949ab', '#1e88e5', '#039be5', '#00acc1',
    '#00897b', '#43a047', '#7cb342', '#c0ca33',
    '#fdd835', '#ffb300', '#fb8c00', '#f4511e',
  ];

  const hash = id.split('').reduce((acc, char) => {
    return char.charCodeAt(0) + ((acc << 5) - acc);
  }, 0);

  return colors[Math.abs(hash) % colors.length];
};
