import menuJson from '../data/menu.json';

export type Temp = 'hot' | 'iced';

export interface MenuItem {
  id: string;
  name: string;
  price: number | null;
  favorite: boolean;
  photo?: string;
  photoConfirmed?: boolean;
}

export interface MenuCategory {
  id: string;
  name: string;
  note: string;
  temps: Temp[];
  items: MenuItem[];
}

export interface MenuExtra {
  id: string;
  name: string;
  price: number | null;
}

export interface Menu {
  categories: MenuCategory[];
  extras: MenuExtra[];
}

export interface MenuItemWithTemps extends MenuItem {
  temps: Temp[];
}

export const menu = menuJson as Menu;

/** Every item in menu order, each carrying its category's temperatures. */
export function allItems(source: Menu): MenuItemWithTemps[] {
  return source.categories.flatMap((category) =>
    category.items.map((item) => ({ ...item, temps: category.temps })),
  );
}

export function findItem(source: Menu, id: string): MenuItemWithTemps | undefined {
  return allItems(source).find((item) => item.id === id);
}

export function findExtra(source: Menu, id: string): MenuExtra | undefined {
  return source.extras.find((extra) => extra.id === id);
}
