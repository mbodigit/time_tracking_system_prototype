import { apiGet, apiPost, apiDelete } from "./client";

export interface CalendarDay {
  id: number;
  date: string;
  dayType: string;
  note: string | null;
}

export interface CalendarYear {
  year: number;
  dayTypes: string[];
  days: CalendarDay[];
}

export const listCalendar = (year: number) =>
  apiGet<CalendarYear>(`/calendar?year=${year}`);

export const saveCalendarDay = (payload: {
  date: string;
  dayType: string;
  note?: string;
}) => apiPost<{ message: string }>("/calendar", payload);

export const deleteCalendarDay = (date: string) =>
  apiDelete<{ message: string }>(`/calendar/${date}`);