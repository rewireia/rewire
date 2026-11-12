# assets

Files the page serves as they are, fingerprinted by the build.

```
cover.ts          the cover photograph as `src` and `srcset`, and the links of its credit
hero-1280.webp    the cover photograph, 1280 px wide
hero-1920.webp    the same, 1920 px wide
hero-2560.webp    the same, 2560 px wide
```

Changing the photograph is replacing the three files and, at most, the `object-position` of
`features/home/Cover.module.css`.

## Cover photograph

- **What it is:** the Milky Way over the telescopes of the Paranal Observatory, in Chile, at night.
- **Author:** ESO/H.H. Heyer. Original title "360-degree Panorama of the Southern Sky".
- **Licence:** Creative Commons Attribution 4.0 (CC BY 4.0),
  <https://creativecommons.org/licenses/by/4.0/>.
- **Source:** Wikimedia Commons,
  <https://commons.wikimedia.org/wiki/File:360-degree_Panorama_of_the_Southern_Sky.jpg>, from the
  European Southern Observatory.
- **Changes:** cropped to the 7392 × 4620 px that start 2928 px from the left, reduced to 2560,
  1920 and 1280 px wide and saved as WebP. On the page it is cropped with `object-fit` and fades
  into the background.
- **Credit on the page:** in "How it works", under the sources, in English and Spanish.
