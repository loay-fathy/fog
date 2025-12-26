export const getDaysInMonth = (year: number, month: number): number => {
  return new Date(year, month + 1, 0).getDate();
};

export const getFirstDayOfMonth = (year: number, month: number): number => {
  return new Date(year, month, 1).getDay();
};

export const formatDate = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

export const formatTime = (time: string): string => {
  return new Date(`1970-01-01T${time}`).toLocaleTimeString([], { 
    hour: '2-digit',
    minute: '2-digit',
    hour12: true 
  });
};