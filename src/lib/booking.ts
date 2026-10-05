import { site } from '../data/site';

export function bookingMessage(service?: string, option?: string): string {
  if (!service) return 'Dobrý den, mám zájem o termín.';
  const what = option ? `${service} (${option})` : service;
  return `Dobrý den, mám zájem o termín: ${what}.`;
}

export interface BookingAction {
  href: string;
  label: string;
  external: boolean;
}

/** Primary action: online booking if configured, otherwise WhatsApp / SMS / phone. */
export function primaryAction(service?: string, option?: string): BookingAction {
  const { bookingUrl, channel } = site.booking;
  if (bookingUrl) return { href: bookingUrl, label: 'Rezervovat termín', external: true };
  const text = encodeURIComponent(bookingMessage(service, option));
  const digits = site.contact.phoneE164.replace(/\D/g, '');
  if (channel === 'whatsapp') return { href: `https://wa.me/${digits}?text=${text}`, label: 'Napsat na WhatsApp', external: true };
  if (channel === 'sms') return { href: `sms:${site.contact.phoneE164}?body=${text}`, label: 'Napsat SMS', external: false };
  return { href: `tel:${site.contact.phoneE164}`, label: 'Zavolat', external: false };
}

/** Whether the phone call is already the primary action (then no separate call button). */
export function phoneIsPrimary(): boolean {
  return !site.booking.bookingUrl && site.booking.channel === 'phone';
}

export const telHref = () => `tel:${site.contact.phoneE164}`;
