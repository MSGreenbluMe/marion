// Real reviews only. Every review needs a named source (e.g. "Google", "e-mail se souhlasem").
// Copy a review word for word and only with the author's permission.
//
//   { text: '…', author: 'Jana K.', source: 'Google', date: '2026-09-01', service: 'medova-masaz' },

export interface Review {
  text: string;
  author: string;
  source: string;
  date?: string;
  service?: string;
}

export const reviews: Review[] = [];
