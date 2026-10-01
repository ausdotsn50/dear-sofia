import { describe, expect, it } from 'vitest';
import { menu, type Menu } from './menu';
import {
  addLine,
  buildMessengerUrl,
  buildOrderMessage,
  buildSingleItemMessage,
  countDrinks,
  describeTotal,
  emptyNote,
  estimateTotal,
  MAX_LINES,
  parseNote,
  removeLine,
  setDetails,
  setQty,
  toggleExtra,
  toggleTemp,
  type OrderNote,
} from './order-note';

// A small menu with known prices so totals don't depend on menu.json changes.
const testMenu: Menu = {
  categories: [
    {
      id: 'coffee',
      name: 'Coffee',
      note: 'Served hot or iced',
      temps: ['hot', 'iced'],
      items: [
        { id: 'spanish-latte', name: 'Spanish Latte', price: 160, favorite: true },
        { id: 'cafe-americano', name: 'Cafe Americano', price: 100, favorite: false },
      ],
    },
    {
      id: 'not-coffee',
      name: 'Not coffee',
      note: 'Served hot or iced',
      temps: ['hot', 'iced'],
      items: [
        { id: 'matcha-latte', name: 'Matcha Latte', price: null, favorite: true },
        { id: 'green-tea-mint', name: 'Green Tea & Mint', price: null, favorite: false },
      ],
    },
  ],
  extras: [
    { id: 'oat-milk', name: 'Oat milk', price: null },
    { id: 'espresso-shot', name: 'Espresso shot', price: 40 },
  ],
};

const add = (note: OrderNote, ...drinks: [string, 'hot' | 'iced'][]) =>
  drinks.reduce((n, [id, temp]) => addLine(n, id, temp), note);

describe('addLine', () => {
  it('adding the same drink and temperature twice gives one line with qty 2', () => {
    const note = add(emptyNote(), ['spanish-latte', 'iced'], ['spanish-latte', 'iced']);
    expect(note.lines).toEqual([{ itemId: 'spanish-latte', temp: 'iced', qty: 2, extras: [] }]);
  });

  it('keeps hot and iced of the same drink as separate lines', () => {
    const note = add(emptyNote(), ['spanish-latte', 'hot'], ['spanish-latte', 'iced']);
    expect(note.lines.map((l) => [l.itemId, l.temp, l.qty])).toEqual([
      ['spanish-latte', 'hot', 1],
      ['spanish-latte', 'iced', 1],
    ]);
  });

  it('adds a new line when the matching drink already has extras', () => {
    let note = add(emptyNote(), ['spanish-latte', 'iced']);
    note = toggleExtra(note, 0, 'oat-milk');
    note = addLine(note, 'spanish-latte', 'iced');
    expect(note.lines).toHaveLength(2);
    expect(note.lines[1]).toEqual({ itemId: 'spanish-latte', temp: 'iced', qty: 1, extras: [] });
  });

  it('holds the 20-line cap', () => {
    let note = emptyNote();
    for (let i = 0; i < MAX_LINES; i += 1) {
      note = { ...note, lines: [...note.lines, { itemId: `drink-${i}`, temp: 'hot', qty: 1, extras: [] }] };
    }
    const after = addLine(note, 'spanish-latte', 'hot');
    expect(after).toBe(note);
    expect(after.lines).toHaveLength(20);
  });

  it('still increments an existing line when the note is full', () => {
    let note = add(emptyNote(), ['spanish-latte', 'hot']);
    for (let i = 1; i < MAX_LINES; i += 1) {
      note = { ...note, lines: [...note.lines, { itemId: `drink-${i}`, temp: 'hot', qty: 1, extras: [] }] };
    }
    expect(addLine(note, 'spanish-latte', 'hot').lines[0]!.qty).toBe(2);
  });
});

describe('quantities', () => {
  it('keeps qty within 1–10', () => {
    const note = add(emptyNote(), ['cafe-americano', 'hot']);
    expect(setQty(note, 0, 0).lines[0]!.qty).toBe(1);
    expect(setQty(note, 0, -3).lines[0]!.qty).toBe(1);
    expect(setQty(note, 0, 11).lines[0]!.qty).toBe(10);
    expect(setQty(note, 0, 7).lines[0]!.qty).toBe(7);

    let many = emptyNote();
    for (let i = 0; i < 14; i += 1) many = addLine(many, 'cafe-americano', 'hot');
    expect(many.lines[0]!.qty).toBe(10);
  });

  it('ignores out-of-range line indexes', () => {
    const note = add(emptyNote(), ['cafe-americano', 'hot']);
    expect(setQty(note, 3, 2)).toBe(note);
    expect(removeLine(note, 3)).toBe(note);
    expect(toggleTemp(note, 3)).toBe(note);
  });

  it('counts drinks by quantity', () => {
    const note = setQty(add(emptyNote(), ['cafe-americano', 'hot'], ['matcha-latte', 'iced']), 0, 3);
    expect(countDrinks(note)).toBe(4);
  });
});

describe('toggleTemp and toggleExtra', () => {
  it('switches a line between hot and iced', () => {
    const note = toggleTemp(add(emptyNote(), ['spanish-latte', 'hot']), 0);
    expect(note.lines[0]!.temp).toBe('iced');
  });

  it('merges into a matching line instead of duplicating it', () => {
    let note = add(emptyNote(), ['spanish-latte', 'iced'], ['cafe-americano', 'hot'], ['spanish-latte', 'hot']);
    note = setQty(note, 0, 2);
    note = toggleTemp(note, 2);
    expect(note.lines).toEqual([
      { itemId: 'spanish-latte', temp: 'iced', qty: 3, extras: [] },
      { itemId: 'cafe-americano', temp: 'hot', qty: 1, extras: [] },
    ]);
  });

  it('toggles extras on and off, and merges lines whose extras now match', () => {
    let note = add(emptyNote(), ['spanish-latte', 'iced']);
    note = toggleExtra(note, 0, 'oat-milk');
    expect(note.lines[0]!.extras).toEqual(['oat-milk']);
    note = addLine(note, 'spanish-latte', 'iced');
    note = toggleExtra(note, 1, 'oat-milk');
    expect(note.lines).toEqual([{ itemId: 'spanish-latte', temp: 'iced', qty: 2, extras: ['oat-milk'] }]);
    note = toggleExtra(note, 0, 'oat-milk');
    expect(note.lines[0]!.extras).toEqual([]);
  });
});

describe('estimateTotal', () => {
  it('skips price: null items and counts them as unknown', () => {
    let note = add(emptyNote(), ['spanish-latte', 'iced'], ['spanish-latte', 'iced'], ['matcha-latte', 'hot']);
    note = add(note, ['green-tea-mint', 'iced'], ['green-tea-mint', 'iced']);
    expect(estimateTotal(note, testMenu)).toEqual({ amount: 320, unknownLines: 2, unknownExtras: false });
    expect(describeTotal(estimateTotal(note, testMenu))).toBe('₱320, plus 2 drinks to confirm');
  });

  it('adds known extras per drink and flags unknown extras', () => {
    let note = setQty(add(emptyNote(), ['cafe-americano', 'hot']), 0, 2);
    note = toggleExtra(note, 0, 'espresso-shot');
    expect(estimateTotal(note, testMenu)).toEqual({ amount: 280, unknownLines: 0, unknownExtras: false });
    note = toggleExtra(note, 0, 'oat-milk');
    expect(estimateTotal(note, testMenu)).toEqual({ amount: 280, unknownLines: 0, unknownExtras: true });
    expect(describeTotal(estimateTotal(note, testMenu))).toBe('₱280, plus extras to confirm');
  });

  it('describes a fully known total and an all-unknown one', () => {
    expect(describeTotal({ amount: 470, unknownLines: 0, unknownExtras: false })).toBe('₱470');
    expect(describeTotal({ amount: 0, unknownLines: 1, unknownExtras: false })).toBe('to confirm');
    expect(describeTotal({ amount: 160, unknownLines: 1, unknownExtras: true })).toBe(
      '₱160, plus 1 drink to confirm',
    );
  });
});

describe('buildOrderMessage', () => {
  const specNote = (): OrderNote => {
    let note = add(emptyNote(), ['spanish-latte', 'iced'], ['spanish-latte', 'iced'], ['matcha-latte', 'hot']);
    note = toggleExtra(note, 0, 'oat-milk');
    return setDetails(note, { name: 'Mabel', orderType: 'to-go', time: '15:30', notes: 'less sweet' });
  };

  it('matches the template in SPEC §7.5', () => {
    expect(buildOrderMessage(specNote(), testMenu)).toBe(
      [
        "Hi Dear Sofia! Here's my order:",
        '',
        '• 2 × Spanish Latte (iced) – ₱320',
        '   + oat milk',
        '• 1 × Matcha Latte (hot) – price to confirm',
        '',
        'Name: Mabel',
        'Order type: To-go',
        'Pickup time: 3:30 PM',
        'Notes: less sweet',
        '',
        'Estimated total: ₱320, plus 1 drink to confirm',
      ].join('\n'),
    );
  });

  it('uses bracket placeholders for empty name, type and time', () => {
    const message = buildOrderMessage(add(emptyNote(), ['cafe-americano', 'hot']), testMenu);
    expect(message).toContain('Name: [your name]');
    expect(message).toContain('Order type: [for here, to-go or delivery]');
    expect(message).toContain('Pickup time: [time]');
    expect(message).not.toContain('Notes:');
  });

  it('includes the address line for delivery but not for to-go', () => {
    const base = add(emptyNote(), ['cafe-americano', 'iced']);
    const delivery = buildOrderMessage(
      setDetails(base, { orderType: 'delivery', address: '12 Mabini St\nBrgy. 3', time: '09:00' }),
      testMenu,
    );
    expect(delivery).toContain('Order type: Delivery');
    expect(delivery).toContain('Delivery address: 12 Mabini St, Brgy. 3');
    expect(delivery).toContain('Delivery time: 9:00 AM');

    const emptyAddress = buildOrderMessage(setDetails(base, { orderType: 'delivery' }), testMenu);
    expect(emptyAddress).toContain('Delivery address: [address]');

    const toGo = buildOrderMessage(setDetails(base, { orderType: 'to-go', address: '12 Mabini St' }), testMenu);
    expect(toGo).not.toContain('Delivery address');
    expect(toGo).toContain('Pickup time: [time]');
  });

  it('labels the time "Arriving around" for here', () => {
    const message = buildOrderMessage(
      setDetails(add(emptyNote(), ['cafe-americano', 'hot']), { orderType: 'for-here', time: '12:15' }),
      testMenu,
    );
    expect(message).toContain('Order type: For here');
    expect(message).toContain('Arriving around: 12:15 PM');
  });
});

describe('buildSingleItemMessage', () => {
  it('matches the no-JS template in SPEC §7.5', () => {
    expect(buildSingleItemMessage({ name: 'Spanish Latte', price: 160 })).toBe(
      [
        "Hi Dear Sofia! I'd like to order:",
        '',
        '• 1 × Spanish Latte – ₱160 (hot or iced: [choose])',
        '',
        'Name: [your name]',
        'Pickup, delivery or for here: [choose one]',
        'Time: [time]',
      ].join('\n'),
    );
  });

  it('says "price to confirm" when the price is unknown', () => {
    expect(buildSingleItemMessage({ name: 'Matcha Latte', price: null })).toContain(
      '• 1 × Matcha Latte – price to confirm (hot or iced: [choose])',
    );
  });
});

describe('buildMessengerUrl', () => {
  it('encodes newlines, the peso sign and ampersands', () => {
    const url = buildMessengerUrl('dearsofia', 'Hi!\n• 1 × Green Tea & Mint – ₱100');
    expect(url.startsWith('https://m.me/dearsofia?text=')).toBe(true);
    expect(url).toContain('Hi!%0A');
    expect(url).toContain('Green%20Tea%20%26%20Mint');
    expect(url).toContain('%E2%82%B1100');
    expect(url.split('?text=')[1]).not.toMatch(/[\n&₱ ]/);
    expect(decodeURIComponent(url.split('?text=')[1]!)).toBe('Hi!\n• 1 × Green Tea & Mint – ₱100');
  });
});

describe('parseNote', () => {
  it('returns an empty note for missing or broken data', () => {
    expect(parseNote(null, menu)).toEqual(emptyNote());
    expect(parseNote('nope', menu)).toEqual(emptyNote());
    expect(parseNote({ lines: 'x' }, menu).lines).toEqual([]);
  });

  it('drops unknown drinks, temperatures and extras, and clamps quantities', () => {
    const note = parseNote(
      {
        lines: [
          { itemId: 'spanish-latte', temp: 'iced', qty: 99, extras: ['oat-milk', 'gold-flakes'] },
          { itemId: 'unicorn-latte', temp: 'hot', qty: 1, extras: [] },
          { itemId: 'cafe-americano', temp: 'lukewarm', qty: 1, extras: [] },
          { itemId: 'spanish-latte', temp: 'iced', qty: 2, extras: ['oat-milk'] },
        ],
        name: 'Mabel',
        orderType: 'drone',
        time: 'later',
      },
      menu,
    );
    expect(note.lines).toEqual([{ itemId: 'spanish-latte', temp: 'iced', qty: 10, extras: ['oat-milk'] }]);
    expect(note.name).toBe('Mabel');
    expect(note.orderType).toBeNull();
    expect(note.time).toBe('');
  });

  it('round-trips a valid note', () => {
    const note = setDetails(add(emptyNote(), ['caffe-mocha', 'hot']), { orderType: 'delivery', time: '10:30' });
    expect(parseNote(JSON.parse(JSON.stringify(note)), menu)).toEqual(note);
  });
});
