import { events, type StudioEvent } from '../data/events';

/** Today's date in Prague as YYYY-MM-DD (build time). */
function today(): string {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Prague' }).format(new Date());
}

/** Upcoming events, soonest first. Past dates drop off at build time. */
export function upcomingEvents(limit?: number): StudioEvent[] {
  const t = today();
  const list = events
    .filter((e) => e.date >= t)
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  return limit ? list.slice(0, limit) : list;
}
