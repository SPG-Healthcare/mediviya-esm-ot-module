import dayjs from "dayjs";

import { omrsDateFormat, PeriodEnum } from "./constants";

export function evaluateCalendarDates(forDate: string, period: PeriodEnum): { startDate: string; endDate: string } {
  if (period === PeriodEnum.DAILY) {
    return {
      startDate: dayjs(forDate).startOf('day').format(omrsDateFormat),
      endDate: dayjs(forDate).endOf('day').format(omrsDateFormat),
    };
  }

  if (period === PeriodEnum.WEEKLY) {
    return {
      startDate: dayjs(forDate).startOf('week').format(omrsDateFormat),
      endDate: dayjs(forDate).endOf('week').format(omrsDateFormat),
    };
  }
}

export const formatDate = (iso?: string) => {
  if (!iso) return '-';
  try {
    const d = new Date(iso);
    return d.toLocaleDateString();
  } catch (e) {
    return iso;
  }
};

export const formatTime = (iso?: string) => {
  if (!iso) return '-';
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch (e) {
    return iso;
  }
};

export const formatDuration = (startIso?: string, endIso?: string) => {
  if (!startIso || !endIso) return '-';
  try {
    const s = new Date(startIso).getTime();
    const e = new Date(endIso).getTime();
    if (isNaN(s) || isNaN(e) || e <= s) return '-';
    const diff = e - s;
    const mins = Math.floor(diff / 60000);
    const hrs = Math.floor(mins / 60);
    const remMins = mins % 60;
    return `${hrs} hr(s):${remMins.toString().padStart(2, '0')} min(s)`;
  } catch (e) {
    return '-';
  }
};

export const formatMinutes = (minsInput?: string | number) => {
  if (minsInput === undefined || minsInput === null || minsInput === '') return null;
  const mins = typeof minsInput === 'number' ? minsInput : parseInt(String(minsInput), 10);
  if (isNaN(mins) || mins <= 0) return null;
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  return `${hrs} hr(s):${rem.toString().padStart(2, '0')} min(s)`;
};

export const handleFreeze = (date: string, freezePeriod: number) => {
  const targetDate = new Date(date);

  if (Number.isNaN(targetDate.getTime())) {
    return false;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const oneWeekFromToday = new Date(today);
  oneWeekFromToday.setDate(oneWeekFromToday.getDate() + freezePeriod);
  oneWeekFromToday.setHours(23, 59, 59, 999);

  const isInPast = targetDate < today;
  const isWithinNextWeek = targetDate >= today && targetDate <= oneWeekFromToday;

  return isInPast || isWithinNextWeek;
};