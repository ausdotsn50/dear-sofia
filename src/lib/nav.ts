export type PageKind = 'home' | 'menu' | 'other';

const SECTIONS = [
  { id: 'menu', label: 'Menu' },
  { id: 'ordering', label: 'Ordering' },
  { id: 'visit', label: 'Visit' },
] as const;

const ON_PAGE: Record<PageKind, readonly string[]> = {
  home: ['menu', 'ordering', 'visit'],
  menu: ['menu', 'ordering'],
  other: [],
};

/** Nav links that jump within the page when the section is on it, or to the home page otherwise. */
export function navLinks(page: PageKind) {
  return SECTIONS.map(({ id, label }) => ({
    label,
    href: ON_PAGE[page].includes(id) ? `#${id}` : `/#${id}`,
  }));
}
