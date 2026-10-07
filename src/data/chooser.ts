// "Jak se dnes cítíte?" — maps a feeling to one or two services (by slug from services.ts).
// Draft mapping, to be confirmed by Martina. Reorder, rename or add states freely.

export interface ChooserState {
  id: string;
  label: string;
  /** Watercolour shown on the button (file name in /public/art). */
  art: string;
  services: string[];
}

export const chooser: ChooserState[] = [
  { id: 'zada', art: 'stones', label: 'Bolí mě záda a šíje', services: ['masaz-zad-sije-a-hlavy', 'sportovni-masaz'] },
  { id: 'energie', art: 'sun', label: 'Jsem bez energie', services: ['relaxacni-masaz', 'lavove-kameny'] },
  { id: 'ticho', art: 'moon', label: 'Potřebuji ticho', services: ['osho-ranni-klidova-meditace', 'meditace-s-dechem'] },
  { id: 'zeny', art: 'lotus', label: 'Chci být mezi ženami', services: ['facilitace-zenskych-ritualu', 'meditace-pro-zeny'] },
  { id: 'zmena', art: 'sprig', label: 'Procházím změnou', services: ['individualni-konzultace', 'rodinne-konstelace'] },
];
