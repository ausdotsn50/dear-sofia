# Dear Sofia — website prototype spec

Implementation spec for Claude Code. Read this whole file before writing code. It is the source of truth for scope, design and behaviour; `CLAUDE.md` holds the standing rules.

---

## 1. What we are building

A fast, static marketing site for **Dear Sofia**, a café serving espresso drinks, matcha and tea. People browse the menu, put drinks on an order note, and send that note to the café on Facebook Messenger for pickup, delivery or dine-in. There is no cart backend, no payments and no accounts.

This is the "marketing first, shop later" phase. A Shopify store for beans and merch comes later on a subdomain (see §14), so nothing here should assume checkout.

### Decisions already made

| Decision | Detail |
|---|---|
| Brand name | **Dear Sofia**. Several photos show another café name on cups, labels, a menu card and a chalkboard. Use the photos as-is for the prototype; never mention that other name in copy, alt text or metadata. |
| What people order | The café drinks menu (`src/data/menu.json`). Beans and merch appear only as a "coming soon" section. |
| How people order | Messenger deep links (`https://m.me/<page>?text=<prefilled message>`), the same pattern as the Alzar's Lechon Haus site, extended with a multi-drink order note. |
| Stack | Astro 7, static output, deployed on Vercel. Same setup as Alzar's. |
| Cost | Domain only. No paid services. |

### Out of scope for v1

Payments, online checkout, user accounts, a CMS, a backend or database, analytics beyond Vercel's free built-in option, a blog.

---

## 2. Stack and setup

- **Astro 7** (`npm create astro@latest`, empty template, TypeScript strict).
- **No UI framework.** Astro components plus one small vanilla TypeScript module for the order note.
- **Styling:** plain CSS with custom properties in `src/styles/tokens.css` and `src/styles/global.css`, plus component-scoped `<style>`. No Tailwind unless you are copying conventions from the Alzar's repo on purpose.
- **Images:** `astro:assets` (`<Picture>` with `formats={['avif','webp']}`). Source photos live in `src/assets/photos/`, never in `public/` (except the OG image).
- **Fonts, self-hosted via Fontsource:**
  - `@fontsource-variable/bricolage-grotesque` (display and body)
  - `@fontsource/patrick-hand` (handwritten accents)
- **Integrations:** `@astrojs/sitemap`.
- **Tests:** `vitest` for the pure order-note functions in §8.
- **Deploy:** Vercel, framework preset Astro, static output.

Scripts in `package.json`:

```json
{
  "dev": "astro dev",
  "build": "astro check && astro build",
  "preview": "astro preview",
  "test": "vitest run",
  "todos": "node scripts/report-todos.mjs"
}
```

---

## 3. File structure

Files marked ✅ already exist in this starter kit. Everything else Claude Code creates.

```
dear-sofia/
├── CLAUDE.md                          ✅ standing rules
├── SPEC.md                            ✅ this file
├── reference/                         ✅ source material only, never shipped
│   ├── menu-card-soft-opening.jpg     ✅ where menu.json came from
│   └── chalkboard-much-love.jpg       ✅ source of the "Much love," sign-off
├── public/
│   ├── og-default.jpg                 ✅ 1200×630 share image (door photo)
│   ├── favicon.svg                        seal monogram, see §5.6
│   └── robots.txt
├── scripts/
│   └── report-todos.mjs                   lists every null / TODO before launch
├── src/
│   ├── assets/photos/                 ✅ 8 site photos, see §9
│   ├── data/
│   │   ├── menu.json                  ✅ transcribed menu
│   │   └── site.ts                        business details, see §4
│   ├── lib/
│   │   ├── order-note.ts                  pure functions: message + URL builders
│   │   ├── order-note.test.ts
│   │   ├── order-note-ui.ts               DOM wiring for the note
│   │   └── format.ts                      peso formatting
│   ├── styles/
│   │   ├── tokens.css
│   │   └── global.css
│   ├── components/
│   │   ├── Header.astro
│   │   ├── Footer.astro
│   │   ├── Seal.astro                     inline SVG seal (logo placeholder)
│   │   ├── Hero.astro
│   │   ├── Favorites.astro
│   │   ├── MenuBoard.astro                slate menu section wrapper
│   │   ├── MenuList.astro                 one category
│   │   ├── MenuRow.astro
│   │   ├── OrderNote.astro                the cup-label note (signature element)
│   │   ├── OrderBar.astro                 mobile bottom bar + <dialog> sheet
│   │   ├── HowToOrder.astro
│   │   ├── Visit.astro
│   │   ├── ComingSoon.astro
│   │   ├── SignOff.astro
│   │   └── SeoHead.astro                  meta, OG, JSON-LD
│   ├── layouts/
│   │   └── BaseLayout.astro
│   └── pages/
│       ├── index.astro
│       ├── menu.astro                     menu + note only, shareable link for FB bio
│       └── 404.astro
└── astro.config.mjs
```

---

## 4. Business details (`src/data/site.ts`)

Every unknown is `null`. Components must hide an element whose value is `null` rather than render a placeholder, so the prototype never shows fake details. `npm run todos` prints every `null` here and every `price: null` in `menu.json`.

```ts
export const site = {
  name: 'Dear Sofia',
  url: 'https://dear-sofia.vercel.app',        // TODO: swap for the real domain
  description:
    'Espresso drinks, matcha and tea, hot or iced. Order ahead on Messenger for pickup or delivery.',
  messenger: {
    page: null as string | null,               // TODO: FB page username or numeric ID for m.me
  },
  facebookUrl: null as string | null,          // TODO
  instagramHandle: null as string | null,      // TODO, without @
  phone: null as string | null,                // TODO, e.g. '+63 9xx xxx xxxx'
  address: {
    street: null as string | null,             // TODO
    city: null as string | null,               // TODO
    mapsUrl: null as string | null,            // TODO: Google Maps share link
  },
  hours: null as { days: string; open: string; close: string }[] | null, // TODO
  delivery: {
    area: null as string | null,               // TODO, e.g. 'within [city]'
    fee: null as string | null,                // TODO
  },
  waitlist: {
    enabled: false,                            // turn on once an endpoint exists (Formspree free tier or a Google Form)
    endpoint: null as string | null,
  },
} as const;
```

While `messenger.page` is `null`, every "send" action falls back to "Copy note" only (§7.6) and shows a small dev-only warning in `astro dev`.

---

## 5. Design direction

### 5.1 Concept: every cup is a note to a friend

The name is a salutation, and the café already writes letters: its cup labels read "this good cuppa is for our friend" with a blank for your name and boxes for *for here / to-go / delivery*, and its chalkboard signs off "Much love,". The site reads the same way: it opens with "Dear friend," in the hero and closes with "Much love, Dear Sofia" at the bottom, and in between the one bold element is the **order note**, built as a live version of that cup label.

Materials come straight from the photos: chalkboard slate, kraft paper cups, white sticker labels with marker handwriting, amber café light, and the brick-red wooden "DRINK" block.

Reference sites and what we take from each:

- **Dear Coco**: a brand story told like a love letter; big confident type; a warm, personal voice.
- **El Union**: products grouped into short, clearly named rows; plain, fast pages; ordering that stays out of the way.
- **Alzar's Lechon Haus**: Messenger ordering with prefilled messages, a four-step "how to order", a final call to action with a message preview.

### 5.2 Palette (`src/styles/tokens.css`)

Sampled from the photos, then adjusted for screens. The page base is the cool grey of the product-shot backdrop, not a cream.

| Token | Hex | Role |
|---|---|---|
| `--backdrop` | `#E3E3DF` | Page background. |
| `--label` | `#FBFBF8` | Order note card, form fields, light panels. |
| `--ink` | `#1F1A16` | Body text and headings on light surfaces. |
| `--ink-soft` | `#57504A` | Secondary text on light surfaces. |
| `--slate` | `#2E3134` | Chalkboard surfaces: hero text panel, menu board, sign-off. |
| `--chalk` | `#ECEAE3` | Text on slate. |
| `--chalk-soft` | `#B4B2AB` | Secondary text on slate. |
| `--kraft` | `#B98D5C` | Fills only: the coming-soon band, the seal, rules. Never text. |
| `--brick` | `#8B2E1D` | Primary action on light surfaces. |
| `--amber` | `#E9B869` | On slate only: prices, favorite hearts, handwritten lines, primary buttons. |

Measured contrast (WCAG):

| Pair | Ratio |
|---|---|
| ink on backdrop | 13.4 |
| ink-soft on backdrop | 6.2 |
| ink on label | 16.6 |
| chalk on slate | 10.9 |
| chalk-soft on slate | 6.2 |
| amber on slate | 7.2 |
| label on brick (button text) | 8.1 |
| ink on kraft | 5.8 |

Rules that follow from the numbers:

- Kraft on backdrop is 2.3, so kraft is never text and never the only boundary of a control on a light surface.
- Brick on slate is 1.6, so **buttons on slate use amber fill with ink text**. Buttons on light surfaces use brick fill with label text.
- Focus ring: 3px solid `--brick` on light surfaces, 3px solid `--amber` on slate, with a 2px offset.

### 5.3 Type

Two families, clearly distinct roles.

- **Bricolage Grotesque** (variable) for everything readable. Display sizes use `font-variation-settings: 'opsz' 96`, weight 800, letter-spacing `-0.02em`. Body uses `opsz` 14, weight 400, line-height 1.6.
- **Patrick Hand** only where the café would write by hand: "Dear friend," in the hero, the cup-label line and the typed name in the order note, and "Much love," in the sign-off. Never for body copy or buttons. Minimum 22px.

Scale (px, desktop / mobile), from the classic typographic scale:

| Role | Desktop | Mobile |
|---|---|---|
| H1 | 72 | 44 |
| H2 | 48 | 36 |
| H3 | 24 | 21 |
| Body | 18 | 17 |
| Small | 14 | 14 |
| Handwritten salutation | 36 | 30 |

Use `clamp()` between the two columns. Line length stays under 70 characters (`max-width: 36rem` on prose). Prices use `font-variant-numeric: tabular-nums`.

Avoid: all-caps labels, small tracked-out labels above headings, a single highlighted word inside a headline, `→` on buttons, "A · B · C" meta strings.

### 5.4 Layout

Left-aligned throughout, like a letter. Max content width 1200px, 24px side gutter on mobile, 48px on desktop. Sections are separated by change of surface (backdrop, slate, kraft), not by rules or cards.

Radius is tied to what the object is: 8px for the order note (a sticker), 6px for buttons and fields, pill for the small hot/iced toggles, 2px for photos. No drop shadows except one on the order note: `0 1px 0 rgba(31,26,22,.08), 0 8px 24px -12px rgba(31,26,22,.25)`, so it reads as a sticker lifting off the board.

### 5.5 Motion

One moment only: when a drink is added, its line slides into the note (160ms, ease-out) and the mobile bar count ticks once. No scroll-triggered reveals, no hover animations on photos. Everything off under `prefers-reduced-motion: reduce`.

### 5.6 Seal (logo placeholder)

There is no Dear Sofia logo yet. Build `Seal.astro` as an inline SVG circle badge, echoing the stamp-style badge the café already uses: ring text `dear sofia ♥ much love ♥` around a blocky `DS` monogram, drawn in `--ink` on `--kraft`. Convert the monogram to paths (no web fonts inside the SVG) so `public/favicon.svg` can reuse it. Keep it clearly swappable: one component, one favicon file.

---

## 6. Pages and sections

### 6.1 `/` (home)

Sections in order. Copy below is a draft to build with; keep it short and plain.

**Header** (on backdrop)

```
Dear Sofia,              Menu   Ordering   Visit        [ Message us ]
```

- Wordmark "Dear Sofia," in Patrick Hand, 30px, ink, with the comma. Links to `/`.
- Nav anchors to `#menu`, `#ordering`, `#visit`. On mobile, the three links collapse into a disclosure button labelled "Menu" with an accessible name "Open navigation"; the "Message us" button stays visible.
- "Message us" opens `m.me/<page>` with text `Hi Dear Sofia! I have a question.`

**Hero** (`Hero.astro`)

```
Desktop ≥1024px                               Mobile
┌──────────────────────┬──────────────────────────┐   ┌─────────────────────┐
│ slate panel (5/12)   │ door-push-sign (7/12)    │   │ door photo 4:3      │
│                      │ full height, cover       │   │ object-position 30% │
│ Dear friend,         │ object-position 30% 50%  │   ├─────────────────────┤
│ H1                   │                          │   │ slate panel         │
│ body                 │                          │   │ Dear friend,        │
│ [Start an order]     │                          │   │ H1, body, buttons   │
│ Message us           │                          │   └─────────────────────┘
└──────────────────────┴──────────────────────────┘
min-height: min(88vh, 760px)
```

- Salutation (Patrick Hand, amber): **Dear friend,**
- H1 (chalk): **Come in. We'll make you a good cuppa.**
- Body (chalk-soft): Espresso drinks, matcha and tea, hot or iced. Order ahead on Messenger for pickup or delivery, or push the door and stay a while.
- Primary button (amber fill, ink text): **Start an order**, links to `#menu`.
- Secondary text link (chalk, underlined): **Message us**.
- Photo: `door-push-sign`, `loading="eager"`, `fetchpriority="high"`, widths `[640, 960, 1280, 1920]`.

**House favorites** (`Favorites.astro`, on backdrop)

- H2: **House favorites**
- Intro: The ones people come back for.
- Tiles: every item in `menu.json` with `favorite: true` **and** a `photo`, in menu order. Today that is Caffe Mocha, Spanish Latte, Caramel Macchiato, Matcha Latte.
- 4 columns ≥1024px, 2 columns below. Square photo, then name (H3), price, and the same Hot / Iced add buttons as the menu rows.
- No card chrome: photo, text and buttons sit directly on the backdrop.

**Menu board** (`MenuBoard.astro`, `id="menu"`, full-width slate)

```
Desktop ≥1024px
┌──────────────────────────────────────────────────────────────────┐
│ H2 The menu                                                      │
│ Everything comes hot or iced. Tap Hot or Iced to add a drink.    │
│                                                                  │
│ Coffee                          │ Not coffee        │ ┌─────────┐│
│ Cafe Americano ....... ₱100     │ ♥ Hot Chocolate   │ │ORDER    ││
│   [Hot] [Iced]                  │   ...... Ask us   │ │NOTE     ││
│ ♥ Caffe Mocha ........ ₱170     │   [Hot] [Iced]    │ │(sticky) ││
│   [Hot] [Iced]                  │ ...               │ │         ││
│ ...                             │                   │ └─────────┘│
│                                 │ Extras            │            │
│                                 │ Oat milk, espresso│            │
│                                 │ shot, extra syrup │            │
└──────────────────────────────────────────────────────────────────┘
Columns: Coffee 4/12, Not coffee 4/12, note 4/12 (position: sticky; top: 24px)
768–1023px: Coffee and Not coffee side by side, note moves to the bottom bar
<768px: one column, note in the bottom bar + sheet
```

- Category headings (H3) in Bricolage, chalk. Category note "Served hot or iced" in chalk-soft.
- `MenuRow`: name in chalk, a dotted leader, price in amber (`₱160`) or "Ask us" in chalk-soft when `price` is `null`. Favorites get a small amber heart SVG before the name with visually hidden text "House favorite".
- Row actions: two pill buttons **Hot** and **Iced**, each with an accessible name like "Add Spanish Latte, iced, to your note". Minimum touch target 44×44px.
- Extras block lists the three extras from `menu.json` with "Ask us" for null prices, and one line: Add extras to any drink from your note.
- **Without JavaScript**, each row instead shows one text link **Order**, going to an m.me link prefilled with that single drink (template in §7.5). The Hot/Iced buttons and the note are hidden until the `js` class is on `<html>`.

**Ordering** (`HowToOrder.astro`, `id="ordering"`, on backdrop)

This is a real sequence, so numbered steps are correct here.

- H2: **Ordering ahead**
- 1 **Pick your drinks.** Add them to your note, hot or iced.
- 2 **Send the note.** It opens Messenger with your order already written. Just hit send.
- 3 **We confirm and brew.** We'll reply with your total, payment details and when it'll be ready.
- Photo beside the steps on desktop, above on mobile: `iced-drink-to-go`.
- If `site.delivery.area` is set, one line: Delivery available {area}. If `site.delivery.fee` is set, append the fee.

**Visit** (`Visit.astro`, `id="visit"`, on backdrop)

```
┌──────────────────────┬──────────────┬──────────────────┐
│ H2 Come by           │ kraft cups + │ cappuccino /     │
│ body                 │ chalkboard   │ DRINK block      │
│ Address (if set)     │ (square)     │ (tall, 9:16)     │
│ Hours (if set)       │              │ Photo by         │
│ [Get directions]     │              │ @kapestetik      │
└──────────────────────┴──────────────┴──────────────────┘
Mobile: text, then the two photos side by side.
```

- H2: **Come by**
- Body: Push the door, pick a seat and stay as long as you like.
- Address, hours and "Get directions" (to `site.address.mapsUrl`) render only when set.
- The tall photo keeps its creator's watermark and gets a visible caption: Photo by @kapestetik. Do not crop or edit the watermark out.

**Coming soon** (`ComingSoon.astro`, kraft band)

- H2 (ink): **Take some home, soon**
- Body: We're working on beans and a few things to take home. Follow us to hear first.
- Links to Facebook and Instagram when set.
- If `site.waitlist.enabled`, an email field and a **Notify me** button that POSTs to `site.waitlist.endpoint`; success message: You're on the list. We'll email you when it's ready. Error message: That didn't go through. Check the email address and try again.

**Sign-off** (`SignOff.astro`, slate)

```
Much love,                    (Patrick Hand, amber, 48px)
Dear Sofia                    (Bricolage 800, chalk, H2 size)

Message preview card (label surface, like Alzar's final CTA):
  "Hi Dear Sofia! I'd like to order:
   • [drink, hot or iced]
   Name: [your name]
   Pickup, delivery or for here: [choose one]
   Time: [time]"

[ Start an order ]   Or call {phone}
```

- "Start an order" links to `#menu`. The phone line renders only when set, as a `tel:` link.

**Footer** (backdrop)

Wordmark, the three nav links, Facebook and Instagram links when set, hours when set, and `© 2026 Dear Sofia`.

### 6.2 `/menu`

A shareable menu page for the Facebook bio: Header, the Menu board (with note), Ordering steps and Footer. Same components as home. Title: `Menu — Dear Sofia`.

### 6.3 `404`

Slate page. Salutation "Dear friend," then H1 **This page isn't on the menu.** and a button **Back to the menu** to `/menu`.

---

## 7. The order note (signature element)

### 7.1 What it looks like

A white sticker card that mirrors the café's cup label.

```
┌──────────────────────────────────────────────────────────┐
│ ┌──────┐ │ this good cuppa is for our friend               │
│ │ SEAL │ │ Mabel_____________________________  ← name input │
│ └──────┘ │                                                  │
│          │ 2 × Spanish Latte, iced        ₱320   [–] [+] ✕ │
│          │     Extras: oat milk                             │
│          │ 1 × Matcha Latte, hot          Ask us [–] [+] ✕ │
│          │ ──────────────────────────────────────────────── │
│          │ ☐ for here    ☑ to-go    ☐ delivery              │
│          │ Pickup time   [ 3:30 PM        ]                 │
│          │ Notes         [ less sweet     ]                 │
│          │                                                  │
│          │ Estimated ₱320, plus 1 drink to confirm           │
│          │ [ Send note on Messenger ]                       │
│          │ Copy note instead                                │
└──────────────────────────────────────────────────────────┘
```

- Left column holds the seal; a 1px ink vertical rule separates it from the content, like the real label.
- "this good cuppa is for our friend" is the visible `<label>` for the name input. The input has only a bottom border and types in Patrick Hand at 26px, so the name looks written on.
- *for here / to-go / delivery* are a radio group in a `<fieldset>` whose `<legend>` is visually hidden text "Order type". Style each radio as a square box with a hand-drawn check (SVG path) when selected. Lowercase text, as on the label.
- The field under the radios changes with the choice:
  - to-go: **Pickup time** (`<input type="time">`)
  - delivery: **Delivery address** (textarea, 2 rows) and **Delivery time**
  - for here: **Arriving around** (`<input type="time">`)
- **Notes**: optional text input.
- Each line: quantity, name, temperature (tap to toggle hot/iced), line price, − / + (1–10), remove. An "Extras" disclosure per line with checkboxes for the three extras.
- Empty state: Your note is empty. Add a drink from the menu to start.

### 7.2 Where it lives

- ≥1024px: inside the menu board, right column, `position: sticky`.
- <1024px: hidden in the page flow. After the first add, `OrderBar` shows a fixed bottom bar: `Your note: 3 drinks, ₱470` and a **Review note** button that opens the note in a native `<dialog>` bottom sheet. Bar height 64px plus safe-area inset; add matching bottom padding to `<body>` when it is visible.
- The home page and `/menu` share one note state.

### 7.3 State

```ts
type Temp = 'hot' | 'iced';
type OrderType = 'for-here' | 'to-go' | 'delivery';

interface NoteLine {
  itemId: string;      // menu.json id
  temp: Temp;
  qty: number;         // 1–10
  extras: string[];    // menu.json extras ids
}

interface OrderNote {
  lines: NoteLine[];   // max 20 lines
  name: string;
  orderType: OrderType | null;
  time: string;        // HH:MM or ''
  address: string;
  notes: string;
}
```

- Adding the same `itemId` + `temp` + extras combination increments `qty` instead of adding a line.
- Persist to `sessionStorage` under `dear-sofia-note-v1`, wrapped in `try/catch`; the note must work if storage throws or is empty.
- Announce changes in a visually hidden `aria-live="polite"` region, e.g. "Spanish Latte, iced, added. 3 drinks in your note."

### 7.4 Totals

- Estimated total = sum of `price × qty` for lines with a known price. Extras with `price: null` add nothing.
- If any line or extra has an unknown price, append ", plus N drink(s) to confirm" (count lines, not extras; if only extras are unknown, say "plus extras to confirm").
- Format pesos with `Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 })`.

### 7.5 Message templates

Multi-drink note (`buildOrderMessage`):

```
Hi Dear Sofia! Here's my order:

• 2 × Spanish Latte (iced) – ₱320
   + oat milk
• 1 × Matcha Latte (hot) – price to confirm

Name: Mabel
Order type: To-go
Pickup time: 3:30 PM
Notes: less sweet

Estimated total: ₱320, plus 1 drink to confirm
```

- Empty fields become bracket placeholders the customer can fill in inside Messenger, as on the Alzar's site: `Name: [your name]`, `Order type: [for here, to-go or delivery]`, `Pickup time: [time]`.
- For delivery, `Delivery address: …` and `Delivery time: …`. For for here, `Arriving around: …`.
- Omit the `Notes:` line when empty.
- Format times as 12-hour with AM/PM.

Single drink, no-JS fallback (`buildSingleItemMessage`):

```
Hi Dear Sofia! I'd like to order:

• 1 × Spanish Latte – ₱160 (hot or iced: [choose])

Name: [your name]
Pickup, delivery or for here: [choose one]
Time: [time]
```

### 7.6 Sending

- `buildMessengerUrl(page, text)` returns `https://m.me/${page}?text=${encodeURIComponent(text)}`.
- **Send note on Messenger** is disabled (with the reason shown under it: Add at least one drink first.) while the note is empty. It opens the URL in a new tab.
- Messenger doesn't always prefill the text, especially on desktop. So **Copy note instead** copies the plain message with `navigator.clipboard.writeText` and confirms with: Copied. Paste it into Messenger.
- If `site.messenger.page` is `null`, hide the send button and show only the copy action.
- If the encoded URL is longer than 1,900 characters, keep the send button but show the copy action as a full button and the line: Long note. If Messenger cuts it off, paste the copied note instead.

---

## 8. Pure functions and tests

`src/lib/order-note.ts` holds pure functions only, no DOM:

- `addLine(note, itemId, temp)`, `setQty`, `removeLine`, `toggleTemp`, `toggleExtra`
- `estimateTotal(note, menu)` returning `{ amount: number; unknownLines: number; unknownExtras: boolean }`
- `buildOrderMessage(note, menu)`
- `buildSingleItemMessage(item)`
- `buildMessengerUrl(page, text)`

`order-note.test.ts` covers at least:

1. Adding the same drink and temperature twice gives one line with qty 2.
2. Hot and iced of the same drink are separate lines.
3. qty stays within 1–10.
4. Total skips `price: null` items and counts them as unknown.
5. Message uses bracket placeholders for empty name, type and time.
6. Delivery message includes the address line; to-go does not.
7. `buildMessengerUrl` encodes newlines as `%0A`, `₱` correctly, and `&` in "Green Tea & Mint".
8. The 20-line cap holds.

---

## 9. Photos

All in `src/assets/photos/`. Several show another café name on cups and labels; use them as they are for now (see §1).

| File | Used in | Alt text | Crop / focus |
|---|---|---|---|
| `door-push-sign.jpg` (2048×1364) | Hero; also `public/og-default.jpg` | A wood-grain PUSH sign on the café's glass door, with the warm-lit counter and espresso machine blurred behind it. | `object-position: 30% 50%` so the sign stays in narrow crops. |
| `espresso-pour-iced-latte.jpg` (1364²) | Favorites: Spanish Latte | A shot of espresso poured from a small glass over an iced milk drink, streaking down through the ice. | Square. |
| `iced-mocha-studio.jpg` (1440²) | Favorites: Caffe Mocha | An iced chocolate-brown coffee drink in a clear cup against a grey backdrop. | Square. |
| `iced-caramel-swirl-studio.jpg` (1440²) | Favorites: Caramel Macchiato | An iced drink with caramel-colored espresso swirling through milk and ice in a clear cup. | Square. |
| `matcha-latte-heart.jpg` (1440²) | Favorites: Matcha Latte | A hot matcha latte with heart latte art in a black paper cup on a wooden table. | Square. |
| `iced-drink-to-go.jpg` (1440×961) | Ordering | A hand holding an iced milky coffee to go, its label filled in with a customer's name and a smiley. | 3:2, `object-position: 60% 50%`. |
| `kraft-cups-chalkboard.jpg` (1364²) | Visit | Stacked kraft paper cups in front of a handwritten chalkboard menu. | Square. |
| `cappuccino-drink-block-kapestetik.jpg` (1141×2048) | Visit, with caption "Photo by @kapestetik" | A cappuccino in a kraft cup beside a red wooden block that reads DRINK, with another cup and a customer working in the background. | 9:16, `object-position: 50% 60%`. |

The photo-to-drink mapping in `menu.json` is a best guess (`photoConfirmed: false`). Keep it data-driven so moving a photo is a one-line change.

`reference/` photos are never imported by the site.

Image rules: every `<Picture>` gets explicit `widths` and `sizes`; only the hero is eager; all others `loading="lazy"` and `decoding="async"`.

---

## 10. SEO and metadata

- Titles: `Dear Sofia — Coffee, matcha and tea` (home), `Menu — Dear Sofia`, `Page not found — Dear Sofia`. Add the city to the home title once `site.address.city` is set.
- Meta description from `site.description`.
- Open Graph and Twitter card with `public/og-default.jpg` (1200×630), `og:locale` `en_PH`.
- JSON-LD `CafeOrCoffeeShop` in `SeoHead.astro`: `name`, `url`, `image`, `servesCuisine: "Coffee"`, `hasMenu` (`/menu`), `priceRange: "₱100–₱210"`, and `address`, `telephone`, `openingHoursSpecification`, `sameAs` **only** when those values are set. Never emit placeholder values.
- `@astrojs/sitemap` with `site` from `site.url`; `robots.txt` pointing at the sitemap.
- `<html lang="en">`; one H1 per page.

---

## 11. Quality bar (acceptance criteria)

- Lighthouse mobile: Performance ≥ 95, Accessibility 100, Best Practices ≥ 95, SEO 100 on `/` and `/menu`.
- Total JS shipped under 15 KB gzipped.
- Works at 360px, 768px, 1024px and 1440px with no horizontal scroll.
- Full keyboard path: add a drink, change temperature and quantity, pick order type, send or copy, all with a visible focus ring. The `<dialog>` traps focus, closes on Esc, and returns focus to **Review note**.
- With JavaScript off, every drink still has a working **Order** link.
- `prefers-reduced-motion` removes the note animation.
- No text or UI boundary below the contrast rules in §5.2.
- `npm run build` and `npm test` pass.
- No occurrence of the other café name anywhere in `src/` text, alt text or metadata.

---

## 12. Build order

Work in milestones; commit after each and take a screenshot at 390px and 1440px to review against this spec before moving on.

1. **Scaffold.** Astro project, fonts, `tokens.css`, `global.css`, `BaseLayout`, `site.ts`, `report-todos.mjs`.
2. **Frame.** Header, Footer, Seal and favicon, Hero.
3. **Menu.** `MenuBoard`, `MenuList`, `MenuRow` from `menu.json`, including the no-JS Order links.
4. **Order note logic.** `order-note.ts` and its tests, all passing.
5. **Order note UI.** `OrderNote`, `OrderBar`, `<dialog>` sheet, send and copy.
6. **Remaining sections.** Favorites, Ordering, Visit, Coming soon, Sign-off, `/menu`, `404`.
7. **SEO.** `SeoHead`, JSON-LD, sitemap, robots.
8. **QA.** Everything in §11, then fix what fails.

---

## 13. Open items for Dina and the owner

`npm run todos` lists these from the data. Before launch, confirm:

- [ ] Facebook page username or ID for m.me links
- [ ] Facebook URL and Instagram handle
- [ ] Address, Google Maps link, opening hours, phone
- [ ] Prices for all six non-coffee drinks and the three extras
- [ ] Coffee prices still match the soft-opening menu card
- [ ] Which drink each favorites photo actually shows
- [ ] Delivery area and fee, and accepted payment methods (the site only says "payment details" for now)
- [ ] Permission from @kapestetik to use their photo
- [ ] Domain name
- [ ] A real Dear Sofia logo to replace the seal placeholder

---

## 14. Later: the shop

When manual Messenger orders outgrow the note, add Shopify on `shop.<domain>` (the Dear Coco setup) and link it from the header and the Coming soon section. Keep `menu.json` ids stable; they become product handles if drinks or beans move into Shopify.
