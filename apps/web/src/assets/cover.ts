import cover1280 from './hero-1280.webp';
import cover1920 from './hero-1920.webp';
import cover2560 from './hero-2560.webp';

/** The cover photograph in three widths, for `srcset`, and the page and licence it credits. */
export const COVER = {
  src: cover1920,
  srcSet: `${cover1280} 1280w, ${cover1920} 1920w, ${cover2560} 2560w`,
  page: 'https://commons.wikimedia.org/wiki/File:360-degree_Panorama_of_the_Southern_Sky.jpg',
  licence: 'https://creativecommons.org/licenses/by/4.0/',
} as const;
