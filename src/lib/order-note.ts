// Pure order-note functions: state updates, totals, message and URL builders.
// No DOM in this file; order-note-ui.ts does the wiring.
import { formatPeso, formatTime, pluralize } from './format';
import { findExtra, findItem, type Menu, type Temp } from './menu';

export type OrderType = 'for-here' | 'to-go' | 'delivery';

export interface NoteLine {
  itemId: string; // menu.json id
  temp: Temp;
  qty: number; // 1–10
  extras: string[]; // menu.json extras ids
}

export interface OrderNote {
  lines: NoteLine[]; // max 20 lines
  name: string;
  orderType: OrderType | null;
  time: string; // HH:MM or ''
  address: string;
  notes: string;
}

export interface Total {
  amount: number;
  unknownLines: number;
  unknownExtras: boolean;
}

export const MAX_LINES = 20;
export const MIN_QTY = 1;
export const MAX_QTY = 10;

export const ORDER_TYPES: readonly OrderType[] = ['for-here', 'to-go', 'delivery'];

const ORDER_TYPE_LABELS: Record<OrderType, string> = {
  'for-here': 'For here',
  'to-go': 'To-go',
  delivery: 'Delivery',
};

export const QUESTION_MESSAGE = 'Hi Dear Sofia! I have a question.';

export function emptyNote(): OrderNote {
  return { lines: [], name: '', orderType: null, time: '', address: '', notes: '' };
}

// ---------------------------------------------------------------------------
// Lines

const clampQty = (qty: number) => Math.min(MAX_QTY, Math.max(MIN_QTY, Math.round(qty) || MIN_QTY));

const sameExtras = (a: readonly string[], b: readonly string[]) =>
  a.length === b.length && [...a].sort().join('|') === [...b].sort().join('|');

const sameCombo = (a: NoteLine, b: Pick<NoteLine, 'itemId' | 'temp' | 'extras'>) =>
  a.itemId === b.itemId && a.temp === b.temp && sameExtras(a.extras, b.extras);

/** Index of the line for this drink, temperature and extras, or -1. */
export function findLine(note: OrderNote, itemId: string, temp: Temp, extras: readonly string[] = []): number {
  return note.lines.findIndex((line) => sameCombo(line, { itemId, temp, extras: [...extras] }));
}

/**
 * Adds one drink. The same drink, temperature and extras increments that line
 * instead. Returns the same note when nothing can change (qty or line cap).
 */
export function addLine(note: OrderNote, itemId: string, temp: Temp): OrderNote {
  const index = findLine(note, itemId, temp);
  if (index !== -1) {
    const line = note.lines[index]!;
    return line.qty >= MAX_QTY ? note : replaceLine(note, index, { ...line, qty: line.qty + 1 });
  }
  if (note.lines.length >= MAX_LINES) return note;
  return { ...note, lines: [...note.lines, { itemId, temp, qty: 1, extras: [] }] };
}

export function setQty(note: OrderNote, index: number, qty: number): OrderNote {
  const line = note.lines[index];
  if (!line) return note;
  const next = clampQty(qty);
  return next === line.qty ? note : replaceLine(note, index, { ...line, qty: next });
}

export function removeLine(note: OrderNote, index: number): OrderNote {
  if (!note.lines[index]) return note;
  return { ...note, lines: note.lines.filter((_, i) => i !== index) };
}

export function toggleTemp(note: OrderNote, index: number): OrderNote {
  const line = note.lines[index];
  if (!line) return note;
  return changeLine(note, index, { ...line, temp: line.temp === 'hot' ? 'iced' : 'hot' });
}

export function toggleExtra(note: OrderNote, index: number, extraId: string): OrderNote {
  const line = note.lines[index];
  if (!line) return note;
  const extras = line.extras.includes(extraId)
    ? line.extras.filter((id) => id !== extraId)
    : [...line.extras, extraId];
  return changeLine(note, index, { ...line, extras });
}

export function setDetails(
  note: OrderNote,
  details: Partial<Pick<OrderNote, 'name' | 'orderType' | 'time' | 'address' | 'notes'>>,
): OrderNote {
  return { ...note, ...details };
}

export function countDrinks(note: OrderNote): number {
  return note.lines.reduce((sum, line) => sum + line.qty, 0);
}

function replaceLine(note: OrderNote, index: number, line: NoteLine): OrderNote {
  return { ...note, lines: note.lines.map((current, i) => (i === index ? line : current)) };
}

/** Replaces a line; if it now matches another line, the two merge (qty capped at 10). */
function changeLine(note: OrderNote, index: number, changed: NoteLine): OrderNote {
  const twin = note.lines.findIndex((line, i) => i !== index && sameCombo(line, changed));
  if (twin === -1) return replaceLine(note, index, changed);
  const merged = { ...note.lines[twin]!, qty: Math.min(MAX_QTY, note.lines[twin]!.qty + changed.qty) };
  return removeLine(replaceLine(note, twin, merged), index);
}

// ---------------------------------------------------------------------------
// Totals

/** Price of one line, or null when the drink's price is unknown. Unknown extras add nothing. */
export function linePrice(line: NoteLine, menu: Menu): number | null {
  const item = findItem(menu, line.itemId);
  if (!item || item.price === null) return null;
  const extras = line.extras.reduce((sum, id) => sum + (findExtra(menu, id)?.price ?? 0), 0);
  return (item.price + extras) * line.qty;
}

export function estimateTotal(note: OrderNote, menu: Menu): Total {
  let amount = 0;
  let unknownLines = 0;
  let unknownExtras = false;
  for (const line of note.lines) {
    const price = linePrice(line, menu);
    if (price === null) unknownLines += 1;
    else amount += price;
    if (line.extras.some((id) => (findExtra(menu, id)?.price ?? null) === null)) unknownExtras = true;
  }
  return { amount, unknownLines, unknownExtras };
}

/** "₱320", "₱320, plus 1 drink to confirm", "₱320, plus extras to confirm", or "to confirm". */
export function describeTotal(total: Total): string {
  if (total.unknownLines > 0) {
    if (total.amount === 0) return 'to confirm';
    return `${formatPeso(total.amount)}, plus ${pluralize(total.unknownLines, 'drink')} to confirm`;
  }
  if (total.unknownExtras) return `${formatPeso(total.amount)}, plus extras to confirm`;
  return formatPeso(total.amount);
}

// ---------------------------------------------------------------------------
// Messages

/** "Spanish Latte, iced" */
export function lineLabel(line: Pick<NoteLine, 'itemId' | 'temp'>, menu: Menu): string {
  return `${findItem(menu, line.itemId)?.name ?? line.itemId}, ${line.temp}`;
}

/** Extras on a line in menu order, lowercased: ["oat milk"] */
export function extraNames(line: NoteLine, menu: Menu): string[] {
  return menu.extras.filter((extra) => line.extras.includes(extra.id)).map((extra) => extra.name.toLowerCase());
}

export function timeLabel(orderType: OrderType | null): string {
  if (orderType === 'delivery') return 'Delivery time';
  if (orderType === 'for-here') return 'Arriving around';
  return 'Pickup time';
}

const orFill = (value: string, placeholder: string) => value.trim() || placeholder;

export function buildOrderMessage(note: OrderNote, menu: Menu): string {
  const out = ["Hi Dear Sofia! Here's my order:", ''];

  for (const line of note.lines) {
    const item = findItem(menu, line.itemId);
    const price = linePrice(line, menu);
    out.push(
      `• ${line.qty} × ${item?.name ?? line.itemId} (${line.temp}) – ${price === null ? 'price to confirm' : formatPeso(price)}`,
    );
    for (const extra of extraNames(line, menu)) out.push(`   + ${extra}`);
  }

  out.push('');
  out.push(`Name: ${orFill(note.name, '[your name]')}`);
  out.push(`Order type: ${note.orderType ? ORDER_TYPE_LABELS[note.orderType] : '[for here, to-go or delivery]'}`);
  if (note.orderType === 'delivery') {
    out.push(`Delivery address: ${orFill(note.address.replace(/\s*\n\s*/g, ', '), '[address]')}`);
  }
  out.push(`${timeLabel(note.orderType)}: ${note.time ? formatTime(note.time) : '[time]'}`);
  if (note.notes.trim()) out.push(`Notes: ${note.notes.trim()}`);

  const total = estimateTotal(note, menu);
  out.push('', `Estimated total: ${describeTotal(total)}`);
  return out.join('\n');
}

/** The no-JS fallback: one drink, temperature left for the customer to fill in. */
export function buildSingleItemMessage(
  item: { name: string; price: number | null },
  temps: readonly Temp[] = ['hot', 'iced'],
): string {
  const price = item.price === null ? 'price to confirm' : formatPeso(item.price);
  const temp =
    temps.length > 1 ? ` (${temps.join(' or ')}: [choose])` : temps.length === 1 ? ` (${temps[0]})` : '';
  return [
    "Hi Dear Sofia! I'd like to order:",
    '',
    `• 1 × ${item.name} – ${price}${temp}`,
    '',
    'Name: [your name]',
    'Pickup, delivery or for here: [choose one]',
    'Time: [time]',
  ].join('\n');
}

export function buildMessengerUrl(page: string, text: string): string {
  return `https://m.me/${page}?text=${encodeURIComponent(text)}`;
}

// ---------------------------------------------------------------------------
// Storage

const str = (value: unknown, max: number) => (typeof value === 'string' ? value.slice(0, max) : '');

/**
 * Rebuilds a note from untrusted stored data: drops unknown drinks, temperatures
 * and extras, clamps quantities, merges duplicates and keeps the 20-line cap.
 */
export function parseNote(raw: unknown, menu: Menu): OrderNote {
  const note = emptyNote();
  if (!raw || typeof raw !== 'object') return note;
  const data = raw as Record<string, unknown>;

  let result: OrderNote = {
    ...note,
    name: str(data.name, 80),
    orderType: ORDER_TYPES.includes(data.orderType as OrderType) ? (data.orderType as OrderType) : null,
    time: /^\d{2}:\d{2}$/.test(str(data.time, 5)) ? str(data.time, 5) : '',
    address: str(data.address, 300),
    notes: str(data.notes, 300),
  };

  const lines = Array.isArray(data.lines) ? data.lines : [];
  for (const entry of lines) {
    if (!entry || typeof entry !== 'object') continue;
    const line = entry as Record<string, unknown>;
    const item = typeof line.itemId === 'string' ? findItem(menu, line.itemId) : undefined;
    if (!item || !item.temps.includes(line.temp as Temp)) continue;
    const extras = Array.isArray(line.extras)
      ? [...new Set(line.extras.filter((id): id is string => typeof id === 'string' && !!findExtra(menu, id)))]
      : [];
    const qty = clampQty(Number(line.qty));
    const existing = result.lines.findIndex((l) => sameCombo(l, { itemId: item.id, temp: line.temp as Temp, extras }));
    if (existing !== -1) {
      result = setQty(result, existing, result.lines[existing]!.qty + qty);
    } else if (result.lines.length < MAX_LINES) {
      result = { ...result, lines: [...result.lines, { itemId: item.id, temp: line.temp as Temp, qty, extras }] };
    }
  }
  return result;
}
