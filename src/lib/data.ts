// Load katalog dari data/*.json (hasil generate model/export_data.py — jangan edit JSON langsung).
import ingredientsJson from '../../data/ingredients.json';
import menusJson from '../../data/menus.json';
import type { Ingredient, MenuTemplate } from './types';

export const INGREDIENTS = ingredientsJson as Ingredient[];
export const MENUS = menusJson as MenuTemplate[];

export const INGREDIENT_BY_ID: Record<string, Ingredient> = Object.fromEntries(
  INGREDIENTS.map((i) => [i.id, i]),
);

export const MENU_BY_ID: Record<string, MenuTemplate> = Object.fromEntries(
  MENUS.map((m) => [m.id, m]),
);

export function menuIngredientIds(menu: MenuTemplate): string[] {
  return [...menu.baseIds, ...menu.proteinIds, ...menu.toppingIds, menu.dressingId];
}
