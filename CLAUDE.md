# Dear Sofia

Static marketing site for Dear Sofia, a café. People build an order note from the menu and send it on Facebook Messenger. Astro 7, static output, Vercel.

**`SPEC.md` is the source of truth.** Read it fully before the first change, and re-read the relevant section before each milestone in §12.

## Commands

- `npm run dev` — local dev server
- `npm run build` — type-check and build
- `npm test` — vitest for `src/lib/order-note.ts`
- `npm run todos` — list every missing business detail and unconfirmed price

## Rules

- **Never invent business facts.** Prices, hours, address, phone, delivery area and links come only from `src/data/menu.json` and `src/data/site.ts`. A `null` value means unknown: hide that element, don't fill it with a placeholder.
- **Brand is Dear Sofia only.** Some photos show another café's name on cups and labels. Use the photos unedited, but never write that name in copy, alt text, metadata or comments.
- **Colors and type come from tokens** in `src/styles/tokens.css`. No hard-coded hex values in components. Follow the contrast rules in SPEC §5.2 (amber buttons on slate, brick buttons on light).
- **Patrick Hand only in the four places SPEC §5.3 names.** Everything else is Bricolage Grotesque.
- **Keep the order note logic pure** in `src/lib/order-note.ts` and covered by tests; DOM code goes in `order-note-ui.ts`.
- **Progressive enhancement.** Every drink must be orderable with JavaScript off (single-item m.me links).
- **Images** go through `astro:assets` from `src/assets/photos/`. Never ship anything from `reference/`. Keep the @kapestetik watermark and caption.
- **Don't add dependencies** beyond those in SPEC §2 without asking.
- Avoid the generic-template tells listed in SPEC §5.3: all-caps labels, eyebrow labels over headings, one highlighted word in a headline, `→` on buttons, dot-separated meta strings, scroll-reveal animations.

## Definition of done for each milestone

`npm run build` and `npm test` pass, screenshots at 390px and 1440px match the spec, keyboard focus is visible, and the work is committed.
