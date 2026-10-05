import type { PriceOption, Service } from '../data/services';

const NBSP = ' ';

export function kc(amount: number): string {
  // 1080 -> "1 080 Kč" with non-breaking spaces
  return amount.toLocaleString('cs-CZ').replace(/\s/g, NBSP) + NBSP + 'Kč';
}

export function optionPrice(o: PriceOption): string {
  return (o.from ? 'od' + NBSP : '') + kc(o.price);
}

/** Lowest price of a service, e.g. "od 980 Kč" or the price note. */
export function fromPrice(s: Service): string {
  if (!s.options.length) return s.priceNote ?? '';
  const min = Math.min(...s.options.map((o) => o.price));
  if (s.options.length === 1 && !s.options[0].from) return kc(min);
  return 'od' + NBSP + kc(min);
}

/** Length shown in lists: "60 / 90 / 120 min", "75 min", "1 hodina" … */
export function lengthSummary(s: Service): string {
  const labels = s.options.map((o) => o.label);
  if (labels.length && labels.every((l) => /^\d+ min$/.test(l))) {
    return labels.map((l) => l.replace(' min', '')).join(' / ') + ' min';
  }
  if (labels.length === 1) return labels[0];
  return '';
}

const weekdays = ['neděle', 'pondělí', 'úterý', 'středa', 'čtvrtek', 'pátek', 'sobota'];
const months = ['ledna', 'února', 'března', 'dubna', 'května', 'června', 'července', 'srpna', 'září', 'října', 'listopadu', 'prosince'];

export function czDate(iso: string): { weekday: string; day: number; month: string; full: string } {
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  const weekday = weekdays[date.getUTCDay()];
  const month = months[m - 1];
  return { weekday, day: d, month, full: `${weekday} ${d}. ${month} ${y}` };
}
