// Upcoming group dates. Past dates disappear automatically on the next build.
//
// How to add a date — copy this block into the list below and change the values:
//
//   {
//     date: '2026-11-14',            // YYYY-MM-DD
//     time: '18:00',                 // start time
//     endTime: '19:00',              // optional
//     title: 'OM Chanting',
//     service: 'om-chanting',        // optional: slug from services.ts, links to the service page
//     price: 300,                    // Kč, optional
//     spotsLeft: 6,                  // optional; 0 shows "Obsazeno"
//     note: '',                      // optional short note
//   },

export interface StudioEvent {
  date: string;
  time: string;
  endTime?: string;
  title: string;
  service?: string;
  price?: number;
  spotsLeft?: number;
  note?: string;
}

export const events: StudioEvent[] = [];
