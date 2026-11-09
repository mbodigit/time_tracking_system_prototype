const WEEKDAY_NAMES = ["V", "H", "K", "Sze", "Cs", "P", "Szo"];

const MONTH_NAMES = [
  "január", "február", "március", "április", "május", "június",
  "július", "augusztus", "szeptember", "október", "november", "december",
];

export const formatMinutes = (minutes: number): string => {
  if (!minutes) {
    return "-";
  }
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return `${hours}:${String(rest).padStart(2, "0")}`;
};

export const formatTime = (value: string | null): string => {
  return value ? value.slice(11, 16) : "-";
};

export const getDayNumber = (date: string): number => {
  return Number(date.slice(8, 10));
};

export const getWeekdayName = (date: string): string => {
  return WEEKDAY_NAMES[new Date(`${date}T00:00:00`).getDay()];
};

export const isWeekend = (date: string): boolean => {
  const weekday = new Date(`${date}T00:00:00`).getDay();
  return weekday === 0 || weekday === 6;
};

export const formatMonth = (year: number, month: number): string => {
  return `${year}. ${MONTH_NAMES[month - 1]}`;
};

export const getCurrentMonth = (): { year: number; month: number } => {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
};

export const shiftMonth = (
  year: number,
  month: number,
  offset: number,
): { year: number; month: number } => {
  const shifted = new Date(year, month - 1 + offset, 1);
  return { year: shifted.getFullYear(), month: shifted.getMonth() + 1 };
};

export const formatSignedMinutes = (minutes: number | null): string => {
  if (minutes === null || minutes === undefined) {
    return "-";
  }
  if (minutes === 0) {
    return "0:00";
  }
  const sign = minutes < 0 ? "-" : "+";
  const absolute = Math.abs(minutes);
  const hours = Math.floor(absolute / 60);
  const rest = absolute % 60;
  return `${sign}${hours}:${String(rest).padStart(2, "0")}`;
};
export const isToday = (date: string): boolean => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return date === `${year}-${month}-${day}`;
};

export const formatRange = (
  from: string | null,
  to: string | null,
): string => {
  if (!from || !to) {
    return "-";
  }

  return `${formatTime(from)}-${formatTime(to)}`;
};
