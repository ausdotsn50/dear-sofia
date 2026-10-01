// Business details. Every unknown is null: components hide an element whose
// value is null instead of showing a placeholder. `npm run todos` lists them.

export const site = {
  name: 'Dear Sofia',
  url: 'https://dear-sofia.vercel.app',        // TODO: swap for the real domain
  description:
    'Espresso drinks, matcha and tea, hot or iced. Order ahead on Messenger for pickup or delivery.',
  messenger: {
    page: null as string | null,               // TODO: FB page username or numeric ID for m.me
  },
  facebookUrl: null as string | null,          // TODO
  instagramHandle: null as string | null,      // TODO, without @
  phone: null as string | null,                // TODO, e.g. '+63 9xx xxx xxxx'
  address: {
    street: null as string | null,             // TODO
    city: null as string | null,               // TODO
    mapsUrl: null as string | null,            // TODO: Google Maps share link
  },
  // TODO, e.g. [{ days: 'Tuesday to Sunday', open: '08:00', close: '20:00' }]
  // open and close are 24-hour HH:MM.
  hours: null as { days: string; open: string; close: string }[] | null,
  delivery: {
    area: null as string | null,               // TODO, e.g. 'within [city]'
    fee: null as string | null,                // TODO
  },
  waitlist: {
    enabled: false,                            // turn on once an endpoint exists (Formspree free tier or a Google Form)
    endpoint: null as string | null,
  },
} as const;
