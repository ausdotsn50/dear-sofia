// DOM wiring for the order note. Note logic lives in order-note.ts; this file
// reads the page, calls those functions and renders the result.
import { formatPeso, pluralize } from './format';
import { findExtra, findItem, menu, type Temp } from './menu';
import {
  addLine,
  buildMessengerUrl,
  buildOrderMessage,
  countDrinks,
  describeTotal,
  emptyNote,
  estimateTotal,
  extraNames,
  findLine,
  lineLabel,
  linePrice,
  MAX_QTY,
  MIN_QTY,
  parseNote,
  removeLine,
  setDetails,
  setQty,
  timeLabel,
  toggleExtra,
  toggleTemp,
  type NoteLine,
  type OrderNote,
  type OrderType,
  type Total,
} from './order-note';

const STORAGE_KEY = 'dear-sofia-note-v1';
const LONG_URL = 1900;
const DESKTOP = '(min-width: 1024px)';

function load(): OrderNote {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? parseNote(JSON.parse(raw), menu) : emptyNote();
  } catch {
    return emptyNote();
  }
}

function save(note: OrderNote) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(note));
  } catch {
    // Storage blocked or full: the note still works until the page closes.
  }
}

async function copyText(text: string, scope: HTMLElement): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Older browsers, or no clipboard permission: try the legacy path.
  }
  try {
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.cssText = 'position:fixed;top:0;left:0;opacity:0;';
    scope.append(area);
    area.select();
    const ok = document.execCommand('copy');
    area.remove();
    return ok;
  } catch {
    return false;
  }
}

function setDisabled(el: HTMLElement, disabled: boolean) {
  if (disabled) el.setAttribute('aria-disabled', 'true');
  else el.removeAttribute('aria-disabled');
}

const isDisabled = (el: Element) => el.getAttribute('aria-disabled') === 'true';

export function initOrderNote() {
  const root = document.querySelector<HTMLElement>('[data-note]');
  if (!root) return;

  const one = <T extends Element>(selector: string, scope: ParentNode = root) =>
    scope.querySelector<T>(selector) as T;

  const page = root.dataset.page || null;
  const linesEl = one<HTMLUListElement>('[data-lines]');
  const template = one<HTMLTemplateElement>('[data-line-template]');
  const emptyEl = one<HTMLElement>('[data-empty]');
  const totalEl = one<HTMLElement>('[data-total]');
  const sendEl = root.querySelector<HTMLAnchorElement>('[data-send]');
  const copyEl = one<HTMLButtonElement>('[data-copy]');
  const reasonEl = one<HTMLElement>('[data-reason]');
  const longEl = one<HTMLElement>('[data-long]');
  const statusEl = one<HTMLElement>('[data-copy-status]');
  const fallbackEl = one<HTMLTextAreaElement>('[data-fallback]');
  const addressField = one<HTMLElement>('[data-address-field]');
  const timeLabelEl = one<HTMLElement>('[data-time-label]');

  const home = document.querySelector<HTMLElement>('[data-note-home]');
  const bar = document.querySelector<HTMLElement>('[data-order-bar]');
  const barSummary = document.querySelector<HTMLElement>('[data-bar-summary]');
  const reviewEl = document.querySelector<HTMLButtonElement>('[data-review]');
  const sheet = document.querySelector<HTMLDialogElement>('[data-sheet]');
  const sheetSlot = document.querySelector<HTMLElement>('[data-sheet-slot]');
  const announcer = document.querySelector<HTMLElement>('[data-announce]');

  let note = load();
  let lastCount = countDrinks(note);

  if (import.meta.env.DEV && !page) {
    console.warn('Dear Sofia: site.messenger.page is not set, so the note can be copied but not sent.');
  }

  // --- Announcements --------------------------------------------------------

  let announceTimer: number | undefined;
  function announce(message: string) {
    if (!announcer) return;
    announcer.textContent = '';
    window.clearTimeout(announceTimer);
    announceTimer = window.setTimeout(() => (announcer.textContent = message), 60);
  }

  const drinksInNote = () =>
    note.lines.length ? `${pluralize(countDrinks(note), 'drink')} in your note.` : 'Your note is empty.';

  // --- Rendering ------------------------------------------------------------

  function lineEl(index: number) {
    return linesEl.children[index] as HTMLLIElement | undefined;
  }

  function fillLine(li: HTMLLIElement, line: NoteLine, index: number) {
    const name = findItem(menu, line.itemId)?.name ?? line.itemId;
    const label = lineLabel(line, menu);
    const other: Temp = line.temp === 'hot' ? 'iced' : 'hot';
    const price = linePrice(line, menu);
    const extras = extraNames(line, menu);
    const set = (selector: string, text: string) => {
      const el = li.querySelector(selector);
      if (el && el.textContent !== text) el.textContent = text;
    };
    const button = (action: string) => li.querySelector<HTMLButtonElement>(`[data-action="${action}"]`)!;

    li.dataset.index = String(index);
    set('[data-qty]', String(line.qty));
    set('[data-name]', name);
    set('[data-temp]', line.temp);
    set('[data-price]', price === null ? 'Ask us' : formatPeso(price));
    set('[data-extras-summary]', extras.length ? `Extras: ${extras.join(', ')}` : '');
    set('[data-extras-for]', ` for ${label}`);

    button('temp').setAttribute('aria-label', `${name} is ${line.temp}. Switch to ${other}`);
    button('dec').setAttribute('aria-label', `One fewer ${label}`);
    button('inc').setAttribute('aria-label', `One more ${label}`);
    button('remove').setAttribute('aria-label', `Remove ${label}`);
    setDisabled(button('dec'), line.qty <= MIN_QTY);
    setDisabled(button('inc'), line.qty >= MAX_QTY);

    const panel = li.querySelector<HTMLElement>('[data-extras-panel]')!;
    panel.id = `note-extras-${index}`;
    button('extras').setAttribute('aria-controls', panel.id);
    for (const box of li.querySelectorAll<HTMLInputElement>('[data-action="extra"]')) {
      box.checked = line.extras.includes(box.value);
    }
  }

  function renderLines(added?: number, bumped?: number) {
    while (linesEl.children.length > note.lines.length) linesEl.lastElementChild!.remove();
    note.lines.forEach((line, index) => {
      let li = lineEl(index);
      if (!li) {
        li = template.content.firstElementChild!.cloneNode(true) as HTMLLIElement;
        linesEl.append(li);
      }
      fillLine(li, line, index);
      if (index === added) replay(li, 'line--enter');
      if (index === bumped) replay(li.querySelector('[data-qty]'), 'tick');
    });
  }

  function replay(el: Element | null, className: string) {
    if (!el) return;
    el.classList.remove(className);
    void (el as HTMLElement).offsetWidth;
    el.classList.add(className);
  }

  function renderTotal(total: Total) {
    totalEl.hidden = note.lines.length === 0;
    totalEl.textContent =
      total.unknownLines > 0 && total.amount === 0 ? 'Total to confirm' : `Estimated ${describeTotal(total)}`;
  }

  function renderActions() {
    const empty = note.lines.length === 0;
    const url = page ? buildMessengerUrl(page, buildOrderMessage(note, menu)) : null;
    const long = !empty && !!url && url.length > LONG_URL;

    for (const el of [sendEl, copyEl]) {
      if (!el) continue;
      setDisabled(el, empty);
      if (empty) el.setAttribute('aria-describedby', reasonEl.id);
      else el.removeAttribute('aria-describedby');
    }
    if (sendEl) {
      if (empty || !url) {
        sendEl.removeAttribute('href');
        sendEl.setAttribute('role', 'link');
      } else {
        sendEl.href = url;
        sendEl.removeAttribute('role');
      }
      copyEl.classList.toggle('note__copy--full', long);
    }
    reasonEl.hidden = !empty;
    longEl.hidden = !long;
  }

  function renderBar(total: Total) {
    if (!bar || !barSummary) return;
    const count = countDrinks(note);
    bar.hidden = count === 0;
    document.body.classList.toggle('has-order-bar', count > 0);
    if (count === 0) return;

    let amount = '';
    if (total.unknownLines === 0 && !total.unknownExtras) amount = `, ${formatPeso(total.amount)}`;
    else if (total.amount > 0) amount = `, ${formatPeso(total.amount)} so far`;

    const countEl = document.createElement('span');
    countEl.textContent = pluralize(count, 'drink');
    if (count !== lastCount) countEl.className = 'tick';
    const detail = document.createElement('span');
    detail.className = 'order-bar__detail';
    detail.append(countEl, amount);
    barSummary.replaceChildren('Your note: ', detail);
    lastCount = count;
  }

  function render(opts: { added?: number; bumped?: number } = {}) {
    const total = estimateTotal(note, menu);
    emptyEl.hidden = note.lines.length > 0;
    renderLines(opts.added, opts.bumped);
    renderTotal(total);
    addressField.hidden = note.orderType !== 'delivery';
    timeLabelEl.textContent = timeLabel(note.orderType);
    renderActions();
    renderBar(total);
  }

  /** Puts stored details back into the form fields (only on load, never while typing). */
  function hydrate() {
    for (const el of root!.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('[data-field]')) {
      const field = el.dataset.field as keyof OrderNote;
      if (el instanceof HTMLInputElement && el.type === 'radio') el.checked = note.orderType === el.value;
      else el.value = String(note[field] ?? '');
    }
  }

  function commit(next: OrderNote, opts?: { added?: number; bumped?: number }) {
    if (next === note) return false;
    note = next;
    save(note);
    statusEl.textContent = '';
    fallbackEl.hidden = true;
    render(opts);
    return true;
  }

  // --- Focus helpers --------------------------------------------------------

  function focusControl(index: number, action: string) {
    lineEl(index)?.querySelector<HTMLElement>(`[data-action="${action}"]`)?.focus();
  }

  function setPanel(index: number, open: boolean) {
    const li = lineEl(index);
    if (!li) return;
    li.querySelector('[data-action="extras"]')!.setAttribute('aria-expanded', String(open));
    li.querySelector<HTMLElement>('[data-extras-panel]')!.hidden = !open;
  }

  /** Lines are reused by position, so close panels from a removed line onward. */
  function closePanelsFrom(index: number) {
    for (let i = index; i < linesEl.children.length; i += 1) setPanel(i, false);
  }

  // --- Adding from the menu and favorites -----------------------------------

  document.addEventListener('click', (event) => {
    const button = (event.target as Element).closest<HTMLButtonElement>('[data-add]');
    if (!button) return;
    const itemId = button.dataset.add!;
    const temp = button.dataset.temp as Temp;
    const label = `${findItem(menu, itemId)?.name ?? itemId}, ${temp}`;
    const existing = findLine(note, itemId, temp);

    if (!commit(addLine(note, itemId, temp), existing === -1 ? { added: note.lines.length } : { bumped: existing })) {
      announce(
        existing === -1
          ? 'Your note is full. Send it, then start another.'
          : `You can have up to ${MAX_QTY} of one drink. ${label} is at ${MAX_QTY}.`,
      );
      return;
    }
    announce(`${label}, added. ${drinksInNote()}`);
    button.classList.add('is-added');
    window.setTimeout(() => button.classList.remove('is-added'), 1200);
  });

  // --- Line controls ----------------------------------------------------------

  linesEl.addEventListener('click', (event) => {
    const button = (event.target as Element).closest<HTMLButtonElement>('button[data-action]');
    const li = button?.closest<HTMLLIElement>('li');
    if (!button || !li) return;
    const index = Number(li.dataset.index);
    const line = note.lines[index];
    if (!line || isDisabled(button)) return;
    const label = lineLabel(line, menu);

    switch (button.dataset.action) {
      case 'inc':
      case 'dec': {
        const qty = line.qty + (button.dataset.action === 'inc' ? 1 : -1);
        if (commit(setQty(note, index, qty))) announce(`${label}: ${note.lines[index]!.qty}.`);
        break;
      }
      case 'remove': {
        closePanelsFrom(index);
        commit(removeLine(note, index));
        announce(`${label}, removed. ${drinksInNote()}`);
        if (note.lines.length === 0) emptyEl.focus();
        else focusControl(Math.min(index, note.lines.length - 1), 'temp');
        break;
      }
      case 'temp': {
        const temp: Temp = line.temp === 'hot' ? 'iced' : 'hot';
        closePanelsFrom(index);
        commit(toggleTemp(note, index));
        const target = findLine(note, line.itemId, temp, line.extras);
        if (target !== index) focusControl(target, 'temp');
        announce(`${findItem(menu, line.itemId)?.name ?? line.itemId} is now ${temp}.`);
        break;
      }
      case 'extras': {
        setPanel(index, button.getAttribute('aria-expanded') !== 'true');
        break;
      }
    }
  });

  linesEl.addEventListener('change', (event) => {
    const box = event.target as HTMLInputElement;
    if (box.dataset.action !== 'extra') return;
    const index = Number(box.closest<HTMLLIElement>('li')?.dataset.index);
    const line = note.lines[index];
    if (!line) return;
    const had = line.extras.includes(box.value);
    const extras = had ? line.extras.filter((id) => id !== box.value) : [...line.extras, box.value];

    commit(toggleExtra(note, index, box.value));
    const target = findLine(note, line.itemId, line.temp, extras);
    if (target !== index) {
      closePanelsFrom(Math.min(index, target));
      setPanel(target, true);
      lineEl(target)?.querySelector<HTMLInputElement>(`[data-action="extra"][value="${box.value}"]`)?.focus();
    }
    const extraName = (findExtra(menu, box.value)?.name ?? box.value).toLowerCase();
    announce(`${extraName} ${had ? 'removed from' : 'added to'} ${lineLabel(line, menu)}.`);
  });

  // --- Name, order type, time, address, notes --------------------------------

  root.addEventListener('input', (event) => {
    const el = event.target as HTMLInputElement | HTMLTextAreaElement;
    const field = el.dataset.field;
    if (!field) return;
    if (field === 'orderType') {
      if ((el as HTMLInputElement).checked) commit(setDetails(note, { orderType: el.value as OrderType }));
      return;
    }
    commit(setDetails(note, { [field]: el.value }));
  });

  // --- Send and copy ----------------------------------------------------------

  copyEl.addEventListener('click', async () => {
    if (isDisabled(copyEl)) return;
    const text = buildOrderMessage(note, menu);
    fallbackEl.hidden = true;
    statusEl.textContent = '';
    if (await copyText(text, root)) {
      statusEl.textContent = 'Copied. Paste it into Messenger.';
    } else {
      fallbackEl.value = text;
      fallbackEl.hidden = false;
      fallbackEl.select();
      statusEl.textContent = 'Copying didn’t work here. Select the note below and copy it.';
    }
  });

  // --- Where the note lives: menu board on desktop, bottom sheet below --------

  const desktop = window.matchMedia(DESKTOP);
  function place() {
    if (desktop.matches) {
      if (sheet?.open) sheet.close();
      if (home && root!.parentElement !== home) home.append(root!);
    } else if (sheetSlot && root!.parentElement !== sheetSlot) {
      sheetSlot.append(root!);
    }
  }
  desktop.addEventListener('change', place);

  reviewEl?.addEventListener('click', () => sheet?.showModal());
  sheet?.querySelector('[data-close]')?.addEventListener('click', () => sheet.close());
  sheet?.addEventListener('click', (event) => {
    // Clicks on the backdrop land on the dialog itself, outside its box.
    const box = sheet.getBoundingClientRect();
    const outside =
      event.target === sheet &&
      (event.clientY < box.top || event.clientY > box.bottom || event.clientX < box.left || event.clientX > box.right);
    if (outside) sheet.close();
  });
  sheet?.addEventListener('close', () => {
    if (bar && !bar.hidden) reviewEl?.focus();
    else document.getElementById('menu')?.focus();
  });

  // Coming back with the browser's back button can restore a stale page.
  window.addEventListener('pageshow', (event) => {
    if (!event.persisted) return;
    note = load();
    hydrate();
    render();
  });

  place();
  hydrate();
  render();
}
