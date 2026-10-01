// Site photos and their alt text (SPEC §9). menu.json refers to these by name,
// so moving a photo to another drink is a one-line change there.
import type { ImageMetadata } from 'astro';
import cappuccinoDrinkBlock from '../assets/photos/cappuccino-drink-block-kapestetik.jpg';
import doorPushSign from '../assets/photos/door-push-sign.jpg';
import espressoPourIcedLatte from '../assets/photos/espresso-pour-iced-latte.jpg';
import icedCaramelSwirl from '../assets/photos/iced-caramel-swirl-studio.jpg';
import icedDrinkToGo from '../assets/photos/iced-drink-to-go.jpg';
import icedMocha from '../assets/photos/iced-mocha-studio.jpg';
import kraftCupsChalkboard from '../assets/photos/kraft-cups-chalkboard.jpg';
import matchaLatteHeart from '../assets/photos/matcha-latte-heart.jpg';

export interface Photo {
  src: ImageMetadata;
  alt: string;
}

export const photos: Record<string, Photo> = {
  'door-push-sign': {
    src: doorPushSign,
    alt: 'A wood-grain PUSH sign on the café’s glass door, with the warm-lit counter and espresso machine blurred behind it.',
  },
  'espresso-pour-iced-latte': {
    src: espressoPourIcedLatte,
    alt: 'A shot of espresso poured from a small glass over an iced milk drink, streaking down through the ice.',
  },
  'iced-mocha-studio': {
    src: icedMocha,
    alt: 'An iced chocolate-brown coffee drink in a clear cup against a grey backdrop.',
  },
  'iced-caramel-swirl-studio': {
    src: icedCaramelSwirl,
    alt: 'An iced drink with caramel-colored espresso swirling through milk and ice in a clear cup.',
  },
  'matcha-latte-heart': {
    src: matchaLatteHeart,
    alt: 'A hot matcha latte with heart latte art in a black paper cup on a wooden table.',
  },
  'iced-drink-to-go': {
    src: icedDrinkToGo,
    alt: 'A hand holding an iced milky coffee to go, its label filled in with a customer’s name and a smiley.',
  },
  'kraft-cups-chalkboard': {
    src: kraftCupsChalkboard,
    alt: 'Stacked kraft paper cups in front of a handwritten chalkboard menu.',
  },
  'cappuccino-drink-block-kapestetik': {
    src: cappuccinoDrinkBlock,
    alt: 'A cappuccino in a kraft cup beside a red wooden block that reads DRINK, with another cup and a customer working in the background.',
  },
};

export function photo(name: string): Photo {
  const found = photos[name];
  if (!found) throw new Error(`Unknown photo "${name}". Add it to src/data/photos.ts.`);
  return found;
}
