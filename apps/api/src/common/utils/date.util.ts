const DAY_IN_MS = 24 * 60 * 60 * 1000;

export function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * DAY_IN_MS);
}

export function diffInDays(from: Date, to: Date) {
  const fromDate = new Date(from);
  const toDate = new Date(to);

  fromDate.setHours(0, 0, 0, 0);
  toDate.setHours(0, 0, 0, 0);

  return Math.floor((toDate.getTime() - fromDate.getTime()) / DAY_IN_MS);
}

export function startOfToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

export function endOfWindow(days: number) {
  const date = startOfToday();
  return addDays(date, days);
}
