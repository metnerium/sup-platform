import {
  format,
  formatDistance,
  formatDistanceToNow,
  isToday,
  isYesterday,
  isThisWeek,
  isThisYear,
  differenceInMinutes,
  differenceInHours,
  differenceInDays,
} from 'date-fns';

export const formatMessageTime = (date: Date | string): string => {
  const messageDate = typeof date === 'string' ? new Date(date) : date;

  if (isToday(messageDate)) {
    return format(messageDate, 'HH:mm');
  } else if (isYesterday(messageDate)) {
    return 'Yesterday';
  } else if (isThisWeek(messageDate)) {
    return format(messageDate, 'EEEE');
  } else if (isThisYear(messageDate)) {
    return format(messageDate, 'MMM d');
  } else {
    return format(messageDate, 'MMM d, yyyy');
  }
};

export const formatConversationTime = (date: Date | string): string => {
  const messageDate = typeof date === 'string' ? new Date(date) : date;

  if (isToday(messageDate)) {
    return format(messageDate, 'HH:mm');
  } else if (isYesterday(messageDate)) {
    return 'Yesterday';
  } else if (isThisWeek(messageDate)) {
    return format(messageDate, 'EEE');
  } else if (isThisYear(messageDate)) {
    return format(messageDate, 'MMM d');
  } else {
    return format(messageDate, 'MM/dd/yy');
  }
};

export const formatLastSeen = (date: Date | string): string => {
  const lastSeenDate = typeof date === 'string' ? new Date(date) : date;
  const minutes = differenceInMinutes(new Date(), lastSeenDate);

  if (minutes < 1) {
    return 'just now';
  } else if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = differenceInHours(new Date(), lastSeenDate);
  if (hours < 24) {
    return `${hours}h ago`;
  }

  const days = differenceInDays(new Date(), lastSeenDate);
  if (days < 7) {
    return `${days}d ago`;
  }

  return formatDistance(lastSeenDate, new Date(), {addSuffix: true});
};

export const formatCallDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs
      .toString()
      .padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
};

export const formatStoryTime = (date: Date | string): string => {
  const storyDate = typeof date === 'string' ? new Date(date) : date;
  return formatDistanceToNow(storyDate, {addSuffix: true});
};

export const formatFullDate = (date: Date | string): string => {
  const fullDate = typeof date === 'string' ? new Date(date) : date;
  return format(fullDate, 'MMMM d, yyyy');
};

export const formatTime = (date: Date | string): string => {
  const time = typeof date === 'string' ? new Date(date) : date;
  return format(time, 'HH:mm');
};

export const formatDateTime = (date: Date | string): string => {
  const dateTime = typeof date === 'string' ? new Date(date) : date;
  return format(dateTime, 'MMM d, yyyy HH:mm');
};

export const isSameDay = (date1: Date | string, date2: Date | string): boolean => {
  const d1 = typeof date1 === 'string' ? new Date(date1) : date1;
  const d2 = typeof date2 === 'string' ? new Date(date2) : date2;
  return format(d1, 'yyyy-MM-dd') === format(d2, 'yyyy-MM-dd');
};

export const groupMessagesByDate = (
  messages: Array<{createdAt: Date | string}>,
): Map<string, Array<any>> => {
  const grouped = new Map<string, Array<any>>();

  messages.forEach(message => {
    const date = typeof message.createdAt === 'string'
      ? new Date(message.createdAt)
      : message.createdAt;
    const dateKey = format(date, 'yyyy-MM-dd');

    if (!grouped.has(dateKey)) {
      grouped.set(dateKey, []);
    }
    grouped.get(dateKey)!.push(message);
  });

  return grouped;
};
