// Site-wide settings. Edit values here; every page reads from this file.
// Empty string or null = "not supplied yet". The site hides whatever is missing.
// Every missing item is listed in CONTENT_TODO.md.

export const site = {
  name: 'Studio Marion',
  url: 'https://studio-marion.cz',
  ownerFirstName: 'Martina',

  hero: {
    // TODO(owner): reuse the headline from the live site once it has been copied verbatim.
    // Until then the studio name is used as the headline.
    headline: '',
    // Draft for owner approval.
    sub: 'Masáže, meditace a ženské kruhy v Hradci Králové.',
  },

  contact: {
    phoneDisplay: '604 480 495',
    phoneE164: '+420604480495',
    // TODO(owner): copy from the live site (could not be read during the build).
    email: '',
    street: 'Gočárova třída 1234', // TODO(owner): house number looks like a placeholder, confirm.
    postalCode: '500 02',
    city: 'Hradec Králové',
    country: 'CZ',
    floorAndDoorbell: '', // e.g. "2. patro, zvonek Marion"
    parking: '',
    openingNote: 'Na objednání po telefonu',
    // Optional: a link to Mapy.cz / Google Maps. If empty, a search link is built from the address.
    mapsUrl: '',
  },

  booking: {
    // Online booking system URL. When set, it becomes the primary booking action everywhere.
    bookingUrl: '',
    // Primary channel when there is no bookingUrl: 'whatsapp' | 'sms' | 'phone'.
    // TODO(owner): confirm that WhatsApp is used on the phone number above.
    channel: 'whatsapp' as 'whatsapp' | 'sms' | 'phone',
  },

  about: {
    // TODO(owner): the "O mně" text from the live site, verbatim. One string per paragraph.
    paragraphs: [] as string[],
    // Portrait of Martina. Put the file into /public/images/ and fill in src + alt.
    portrait: { src: '', alt: '' },
    // Short audio greeting in Martina's own voice. Put the file into /public/audio/.
    audioGreeting: { src: '', transcript: '' },
  },

  // Link to Google reviews. Shown only when the reviews list is empty.
  googleReviewsUrl: '',

  voucher: {
    // Optional facts about vouchers. Leave empty until Martina confirms them.
    validity: '', // e.g. "Poukaz platí 6 měsíců od vystavení."
    format: '', // e.g. "Poukaz vám pošlu jako PDF, nebo si ho můžete vyzvednout ve studiu."
  },

  legal: {
    // Required on a Czech business website. TODO(owner): supply all three.
    fullName: '',
    ico: '',
    registeredAddress: '',
  },
};

export function mapsLink(): string {
  const c = site.contact;
  if (c.mapsUrl) return c.mapsUrl;
  const q = encodeURIComponent(`${c.street}, ${c.postalCode} ${c.city}`);
  return `https://mapy.cz/zakladni?q=${q}`;
}
