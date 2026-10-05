// All services and prices. To change a price, edit the number. To add a service, copy a block.
//
// Text fields that are empty ('' or []) are simply not shown on the site.
//   summary      short text in the category list and at the top of the service page
//                (verbatim from the live site, 5 Oct 2026)
//   description  optional longer text on the service page
//   benefits     three short bullets (verbatim from the live site)
//   forWhom / howItGoes / whatToBring / notSuitableFor   new blocks, written by Martina
//
// Prices are in Kč. `from: true` shows "od 350 Kč".

export type CategoryId = 'masaze' | 'meditace' | 'ritualy';

export interface PriceOption {
  label: string;
  /** Optional small line under the label, e.g. "od 10:00 do 18:00". */
  note?: string;
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
    intro: 'Vyberte si dotek, který právě teď potřebujete — od jemné relaxace po hlubokou regeneraci.',
    metaDescription:
      'Masáže v Hradci Králové: relaxační, čokoládová, medová, sportovní, lávové kameny a masáž zad, šíje a hlavy. Délka 60, 90 nebo 120 minut.',
    services: [
      // TODO(owner): Relaxační prices rise by only 100 Kč per half hour. Likely a typo on the live site.
      { ...empty, slug: 'relaxacni-masaz',
        summary: 'Jemná celotělová masáž zaměřená na hluboký odpočinek, prokrvení tkání a uvolnění svalového napětí.',
        benefits: ['Úleva od napětí a stresu', 'Zklidnění mysli', 'Hluboká regenerace těla'], name: 'Relaxační celotělová masáž', options: massage(1080, 1180, 1280) },
      { ...empty, slug: 'cokoladova-masaz',
        summary: 'Voňavý relaxační rituál pro tělo i duši, který propojuje hřejivý dotek, vyživující péči o pokožku a podmanivou vůni čokolády.',
        benefits: ['Vyživená provoněná pokožka', 'Psychické uvolnění', 'Prostor pro hýčkání'], name: 'Čokoládová masáž', options: massage(1150, 1550, 1950) },
      // TODO(owner): health claims to review: "bolesti hlavy", "Úleva od bolesti hlavy".
      { ...empty, slug: 'masaz-zad-sije-a-hlavy',
        summary: 'Cílená úleva pro ty, kdo tráví dny u počítače. Rozpouští ztuhlá místa a bolesti hlavy.',
        benefits: ['Rozpouští ztuhlá místa', 'Úleva od bolesti hlavy', 'Uvolnění šíje a čelistí'], name: 'Masáž zad, šíje a hlavy', options: massage(980, 1280, 1580) },
      // TODO(owner): health claims to review: "Detoxikační", "Rozproudí lymfu", "Detoxikace", "Rozproudění lymfy".
      { ...empty, slug: 'medova-masaz',
        summary: 'Detoxikační technika s poctivým medem. Rozproudí lymfu a dodá tělu novou energii.',
        benefits: ['Detoxikace a prokrvení', 'Rozproudění lymfy', 'Pocit lehkosti a energie'], name: 'Medová masáž', options: massage(1000, 1400, 1800) },
      { ...empty, slug: 'sportovni-masaz',
        summary: 'Hlubší, pevnější práce se svaly pro rychlejší regeneraci po zátěži.',
        benefits: ['Rychlejší regenerace svalů', 'Hlubší práce se svaly', 'Řešení konkrétních partií'], name: 'Sportovní masáž', options: massage(980, 1280, 1580) },
      { ...empty, slug: 'lavove-kameny',
        summary: 'Prohřáté vulkanické kameny, které rozpouštějí napětí do hloubky a hluboce zklidňují.',
        benefits: ['Teplo pracuje do hloubky', 'Nejhlubší relaxace', 'Ideální v chladném období'], name: 'Lávové kameny', options: massage(980, 1280, 1580) },
    ],
  },
  {
    id: 'meditace',
    name: 'Meditace',
    intro: 'Najděte cestu k vnitřnímu klidu skrze dech, zvuk, pohyb nebo sdílený kruh.',
    metaDescription:
      'Meditace v Hradci Králové: Osho meditace, meditace se zvukem a mantrami, OM Chanting, meditace s dechem, pohybová meditace a meditace pro ženy.',
    services: [
      { ...empty, slug: 'osho-meditace',
        summary: 'Aktivní meditační technika, která kombinuje pohyb, dýchání a uvolnění emocí s hlubokým tichem. Pomáhá bezpečně odbourat nahromaděný stres a napětí v těle.',
        benefits: ['Uvolnění napětí', 'Návrat k tělu', 'Bezpečný prostor pro emoce'], name: 'Osho Dynamic Meditation', options: meditation('60 min', 350) },
      { ...empty, slug: 'osho-ranni-klidova-meditace',
        summary: 'Jemná ranní praxe zaměřená na zpomalení a ztišení mysli ještě předtím, než začne denní shon.',
        benefits: ['Klidný vstup do dne', 'Lepší soustředění', 'Vnitřní lehkost'], name: 'Osho ranní klidová meditace', options: meditation('60 min', 350) },
      // TODO(owner): health claim to review: "léčivých manter".
      { ...empty, slug: 'meditace-se-zvukem-a-mantrami',
        summary: 'Hluboké zklidnění prostřednictvím hlasu, vibrací a opakování léčivých manter.',
        benefits: ['Zklidnění skrze zvuk', 'Vibrace a mantry', 'Žádný tlak na výkon'], name: 'Meditace se zvukem a mantrami', options: meditation('60 min', 350) },
      { ...empty, slug: 'om-chanting',
        summary: 'Skupinová meditační praxe v kruhu, kde se společně opakuje posvátná slabika OM. Propojují se při ní hlas, dech a vibrace, které pomáhají ztišit mysl, zpomalit a obrátit pozornost dovnitř.',
        benefits: ['Skupinová vibrace kruhu', 'Sjednocení dechu a hlasu', 'Hluboké uvolnění a klid'], name: 'OM Chanting', options: meditation('60 min', 300) },
      { ...empty, slug: 'meditace-pro-zeny',
        summary: 'Bezpečný ženský prostor pro odpočinek, sdílení a hlubší spojení se sebou.',
        benefits: ['Bezpečný ženský kruh', 'Odpočinek a sdílení', 'Návrat k vlastnímu rytmu'], name: 'Meditace pro ženy', options: meditation('75 min', 450) },
      { ...empty, slug: 'meditace-s-dechem',
        summary: 'Vědomá práce s dechem, která přináší uvolnění, lehkost a více vnitřního prostoru.',
        benefits: ['Vědomá práce s dechem', 'Rychlé uvolnění', 'Respekt k vašemu tempu'], name: 'Meditace s dechem', options: meditation('60 min', 350) },
      { ...empty, slug: 'pohybova-meditace',
        summary: 'Jemné propojení pohybu, dechu a pozornosti pro přirozené uvolnění těla.',
        benefits: ['Propojení pohybu a dechu', 'Přirozené uvolnění', 'Bez choreografie a hodnocení'], name: 'Pohybová meditace', options: meditation('60 min', 350) },
    ],
  },
  {
    id: 'ritualy',
    name: 'Rituály',
    intro: 'Citlivě vedená setkání a rituály pro důležité životní okamžiky a vnitřní proměnu.',
    metaDescription:
      'Ženské kruhy a rituály, rodinné konstelace, intuitivní tanec, sananga a individuální konzultace v Hradci Králové.',
    services: [
      {
        ...empty,
        slug: 'facilitace-zenskych-ritualu',
        summary: 'Bezpečný a podporující prostor pro ženy procházející životními změnami, mezníky nebo novými etapami.',
        benefits: ['Vědomé zastavení', 'Prostor bez rolí a povinností', 'Zvědomění vnitřních procesů'],
        name: 'Ženské rituály a kruhy',
        options: [
          { label: 'Kruh 4 hodiny', price: 750 },
          { label: 'Sobotní kruh', note: 'od 10:00 do 18:00', price: 1500 },
        ],
      },
      {
        ...empty,
        slug: 'rodinne-konstelace',
        summary: 'Zážitková metoda pro nahlédnutí do vztahových systémů, rodinných vazeb a opakujících se životních vzorců z nové perspektivy.',
        benefits: ['Odstup od příběhu', 'Pochopení skrytých souvislostí', 'Odvaha ke změně'],
        name: 'Rodinné konstelace',
        options: [
          { label: 'Vlastní konstelace', note: '4 hodiny', price: 1200 },
          { label: 'Účastník', note: '4 hodiny', price: 450 },
        ],
      },
      { ...empty, slug: 'kombinovane-ritualy',
        summary: 'Osobně sestavené propojení rituálních prvků podle vašeho příběhu a aktuálních potřeb.',
        benefits: ['Rituál na míru příběhu', 'Kombinace pohybu, zvuku, dechu', 'Hluboký osobní zážitek'], name: 'Kombinované rituály', options: [], priceNote: 'Termín a cena dle dohody' },
      { ...empty, slug: 'intuitivni-tanec',
        summary: 'Svobodný vědomý pohyb, který pomáhá uvolnit tělo, emoce a znovu vnímat vlastní rytmus.',
        benefits: ['Svobodný pohyb bez kroků', 'Uvolnění těla i emocí', 'Vhodné i pro netanečníky'], name: 'Intuitivní tanec', options: [{ label: '1 hodina', price: 450 }] },
      // TODO(owner): Sananga needs a plain explanation and who it is not suitable for.
      { ...empty, slug: 'sananga',
        summary: 'Tradiční očistný rituál vedený s respektem, pozorností a důrazem na bezpečný průběh.',
        benefits: ['Respekt k tradici', 'Bezpečné vedení rituálu', 'Osobní příprava a prostor'], name: 'Sananga', options: [{ label: '1 hodina', price: 1200 }] },
      { ...empty, slug: 'individualni-konzultace',
        summary: 'Osobní setkání a bezpečný prostor pro vaše otázky, aktuální téma a hledání další cesty.',
        benefits: ['Osobní bezpečný prostor', 'Prostor pro vaše otázky', 'Nalezení další cesty'], name: 'Individuální konzultace', options: [{ label: '1 hodina', price: 980 }] },
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
