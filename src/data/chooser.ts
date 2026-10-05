// "Jak se dnes cítíte?" — maps a feeling to one or two services (by slug from services.ts).
// Draft mapping, to be confirmed by Martina. Reorder, rename or add states freely.

export interface ChooserState {
  id: string;
  label: string;
  services: string[];
}

export const chooser: ChooserState[] = [
  { id: 'zada', label: 'Bolí mě záda a šíje', services: ['masaz-zad-sije-a-hlavy', 'sportovni-masaz'] },
  { id: 'energie', label: 'Jsem bez energie', services: ['relaxacni-masaz', 'lavove-kameny'] },
  { id: 'ticho', label: 'Potřebuji ticho', services: ['osho-ranni-klidova-meditace', 'meditace-s-dechem'] },
  { id: 'zeny', label: 'Chci být mezi ženami', services: ['facilitace-zenskych-ritualu', 'meditace-pro-zeny'] },
  { id: 'zmena', label: 'Procházím změnou', services: ['individualni-konzultace', 'rodinne-konstelace'] },
];
