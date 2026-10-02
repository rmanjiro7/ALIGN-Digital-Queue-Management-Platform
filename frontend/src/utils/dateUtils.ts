import { DateRangePreset } from '../components/analytics/DateRangeFilter';

export const getDateRange = (preset: DateRangePreset): { start: string, end: string } => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  
  const end = new Date();
  end.setHours(0, 0, 0, 0);
  
  switch (preset) {
    case 'TODAY':
      end.setDate(end.getDate() + 1);
      break;
    case 'YESTERDAY':
      start.setDate(start.getDate() - 1);
      end.setDate(end.getDate()); // because end is initially today 00:00
      break;
    case 'LAST_7_DAYS':
      start.setDate(start.getDate() - 6);
      end.setDate(end.getDate() + 1);
      break;
    case 'LAST_30_DAYS':
      start.setDate(start.getDate() - 29);
      end.setDate(end.getDate() + 1);
      break;
  }
  
  return { start: start.toISOString(), end: end.toISOString() };
};

export const formatDuration = (seconds: number | null): string => {
  if (seconds === null || seconds === undefined) return '0m';
  const mins = Math.floor(seconds / 60);
  return `${mins}m`;
};
