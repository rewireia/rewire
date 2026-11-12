import { describe, expect, it } from 'vitest';

import { inlinesOf, readingMinutes } from '../src/features/ai-primer/primer-text.ts';
import { PRIMER_SECTIONS } from '../src/features/ai-primer/sections.ts';
import { en } from '../src/i18n/en.ts';
import { es } from '../src/i18n/es.ts';

const paragraphsIn = (catalogue: typeof en | typeof es) =>
  PRIMER_SECTIONS.flatMap((section) => section.paragraphs.map((key) => catalogue[key]));

const linksOf = (paragraphs: readonly string[]) =>
  paragraphs.flatMap((paragraph) =>
    inlinesOf(paragraph).flatMap((part) => ('href' in part ? [part.href] : [])),
  );

describe('the links of a paragraph', () => {
  it('split the paragraph into plain and linked stretches, in order', () => {
    expect(inlinesOf('See [the paper](https://doi.org/10.1/x), then read on.')).toEqual([
      { text: 'See ' },
      { text: 'the paper', href: 'https://doi.org/10.1/x' },
      { text: ', then read on.' },
    ]);
  });

  it('leave a paragraph without links whole, and never link an address that is not https', () => {
    expect(inlinesOf('Plain words.')).toEqual([{ text: 'Plain words.' }]);
    expect(inlinesOf('[old](http://example.org)')).toEqual([{ text: '[old](http://example.org)' }]);
  });
});

describe('the guide to generative AI', () => {
  it('takes about eight minutes to read, in English and in Spanish', () => {
    for (const catalogue of [en, es]) {
      const minutes = readingMinutes(paragraphsIn(catalogue));
      expect(minutes).toBeGreaterThanOrEqual(6);
      expect(minutes).toBeLessThanOrEqual(10);
    }
  });

  it('cites the same sources in both languages, each by an https link', () => {
    const links = linksOf(paragraphsIn(en));
    expect(links.length).toBeGreaterThan(0);
    expect(linksOf(paragraphsIn(es))).toEqual(links);
    expect(links.every((link) => link.startsWith('https://'))).toBe(true);
  });

  it('writes every figure inside a sentence that cites its source', () => {
    const exposure = PRIMER_SECTIONS.find((section) => section.id === 'exposure');
    for (const catalogue of [en, es]) {
      const [first = ''] = exposure?.paragraphs.map((key) => catalogue[key]) ?? [];
      expect(first).toMatch(/427/);
      expect(linksOf([first])).toEqual(['https://doi.org/10.54394/HETP0387']);
    }
  });
});
