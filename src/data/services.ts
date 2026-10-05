// All services and prices. To change a price, edit the number. To add a service, copy a block.
//
// Text fields that are empty ('' or []) are simply not shown on the site.
//   summary      one line shown in the category list (verbatim from the live site)
//   description  text on the service page (verbatim from the live site)
//   benefits     three short bullets (verbatim from the live site)
//   forWhom / howItGoes / whatToBring / notSuitableFor   new blocks, written by Martina
//
// Prices are in Kč. `from: true` shows "od 350 Kč".

export type CategoryId = 'masaze' | 'meditace' | 'ritualy';

export interface PriceOption {
  label: string;
  price: number;
  from?: boolean;
}

export interface Service {
  slug: string;
  name: string;
  summary: string;
  description: string;
  benefits: string[];
  options: PriceOption[];
  /** Shown instead of prices when there are no options. */
  priceNote?: string;
  forWhom: string;
  howItGoes: string;
  whatToBring: string;
  notSuitableFor: string;
}

export interface Category {
  id: CategoryId;
  name: string;
  /** Short intro on the category page. Optional. */
  intro: string;
  metaDescription: string;
  services: Service[];
}

const empty = {
  summary: '',
  description: '',
  benefits: [] as string[],
  forWhom: '',
  howItGoes: '',
  whatToBring: '',
  notSuitableFor: '',
};

const massage = (a: number, b: number, c: number): PriceOption[] => [
  { label: '60 min', price: a },
  { label: '90 min', price: b },
  { label: '120 min', price: c },
];

const meditation = (length: string, price: number): PriceOption[] => [{ label: length, price, from: true }];

export const categories: Category[] = [
  {
    id: 'masaze',
    name: 'Masáže',
    intro: '',
    metaDescription:
      'Masáže v Hradci Králové: relaxační, čokoládová, medová, sportovní, lávové kameny a masáž zad, šíje a hlavy. Délka 60, 90 nebo 120 minut.',
    services: [
      // TODO(owner): Relaxační prices rise by only 100 Kč per half hour. Likely a typo on the live site.
      { ...empty, slug: 'relaxacni-masaz', name: 'Relaxační celotělová masáž', options: massage(1080, 1180, 1280) },
      { ...empty, slug: 'cokoladova-masaz', name: 'Čokoládová masáž', options: massage(1150, 1550, 1950) },
      { ...empty, slug: 'masaz-zad-sije-a-hlavy', name: 'Masáž zad, šíje a hlavy', options: massage(980, 1280, 1580) },
      { ...empty, slug: 'medova-masaz', name: 'Medová masáž', options: massage(1000, 1400, 1800) },
      { ...empty, slug: 'sportovni-masaz', name: 'Sportovní masáž', options: massage(980, 1280, 1580) },
      { ...empty, slug: 'lavove-kameny', name: 'Lávové kameny', options: massage(980, 1280, 1580) },
    ],
  },
  {
    id: 'meditace',
    name: 'Meditace',
    intro: '',
    metaDescription:
      'Meditace v Hradci Králové: Osho meditace, meditace se zvukem a mantrami, OM Chanting, meditace s dechem, pohybová meditace a meditace pro ženy.',
    services: [
      { ...empty, slug: 'osho-meditace', name: 'Osho Dynamic Meditation', options: meditation('60 min', 350) },
      { ...empty, slug: 'osho-ranni-klidova-meditace', name: 'Osho ranní klidová meditace', options: meditation('60 min', 350) },
      { ...empty, slug: 'meditace-se-zvukem-a-mantrami', name: 'Meditace se zvukem a mantrami', options: meditation('60 min', 350) },
      { ...empty, slug: 'om-chanting', name: 'OM Chanting', options: meditation('60 min', 300) },
      { ...empty, slug: 'meditace-pro-zeny', name: 'Meditace pro ženy', options: meditation('75 min', 450) },
      { ...empty, slug: 'meditace-s-dechem', name: 'Meditace s dechem', options: meditation('60 min', 350) },
      { ...empty, slug: 'pohybova-meditace', name: 'Pohybová meditace', options: meditation('60 min', 350) },
    ],
  },
  {
    id: 'ritualy',
    name: 'Rituály',
    intro: '',
    metaDescription:
      'Ženské kruhy a rituály, rodinné konstelace, intuitivní tanec, sananga a individuální konzultace v Hradci Králové.',
    services: [
      {
        ...empty,
        slug: 'facilitace-zenskych-ritualu',
        name: 'Ženské rituály a kruhy',
        options: [
          { label: 'Kruh 4 hodiny', price: 750 },
          { label: 'Sobotní kruh', price: 1500 },
        ],
      },
      {
        ...empty,
        slug: 'rodinne-konstelace',
        name: 'Rodinné konstelace',
        options: [
          { label: 'Vlastní konstelace', price: 1200 },
          { label: 'Účastník', price: 450 },
        ],
      },
      { ...empty, slug: 'kombinovane-ritualy', name: 'Kombinované rituály', options: [], priceNote: 'Termín a cena dle dohody' },
      { ...empty, slug: 'intuitivni-tanec', name: 'Intuitivní tanec', options: [{ label: '1 hodina', price: 450 }] },
      // TODO(owner): Sananga needs a plain explanation and who it is not suitable for.
      { ...empty, slug: 'sananga', name: 'Sananga', options: [{ label: '1 hodina', price: 1200 }] },
      { ...empty, slug: 'individualni-konzultace', name: 'Individuální konzultace', options: [{ label: '1 hodina', price: 980 }] },
    ],
  },
];

export function getCategory(id: string): Category | undefined {
  return categories.find((c) => c.id === id);
}

export function findService(slug: string): { service: Service; category: Category } | undefined {
  for (const category of categories) {
    const service = category.services.find((s) => s.slug === slug);
    if (service) return { service, category };
  }
  return undefined;
}

export function serviceUrl(categoryId: string, slug: string): string {
  return `/sluzba/${categoryId}/${slug}`;
}
