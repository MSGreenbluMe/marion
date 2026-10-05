// Site-wide settings. Edit values here; every page reads from this file.
// Empty string or null = "not supplied yet". The site hides whatever is missing.
// Every missing item is listed in CONTENT_TODO.md.

export const site = {
  name: 'Studio Marion',
  url: 'https://studio-marion.cz',
  ownerFirstName: 'Martina',

  hero: {
    // From the live site.
    headline: 'Péče o tělo, klid pro mysl',
    // Draft for owner approval.
    sub: 'Masáže, meditace a ženské kruhy v Hradci Králové.',
  },

  contact: {
    phoneDisplay: '604 480 495',
    phoneE164: '+420604480495',
    email: 'Kubankova.ma@gmail.com',
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
    // "O mně" text from the live site, verbatim. One string per paragraph.
    paragraphs: [
      'Jmenuji se Martina a provázím ženy na cestě zpět k sobě, k jejich tělu, intuici, ženskosti a vnitřní síle.',
      'Vytvářím bezpečný prostor bez hodnocení, kde mohou ženy na chvíli odložit své role, nemusí nic dokazovat ani předstírat a mohou být samy sebou. Ve své praxi propojuji dotek, vědomou pozornost, ženskou energii, masáže, meditace, ženské rituály, OM Chanting a intuitivní tanec.',
      'Věřím, že skutečná proměna začíná v tichu a návrat k sobě samé mění i svět kolem nás.',
      'Budu ráda, když se naše cesty potkají.',
    ],
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
