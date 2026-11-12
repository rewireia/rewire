import { describe, expect, it } from 'vitest';

import { fold, singular, tokensOf } from '../src/index.ts';

describe('fold', () => {
  it('lower-cases a text and removes its accents', () => {
    const cases = {
      Enfermería: 'enfermeria',
      'Développeur de logiciels': 'developpeur de logiciels',
      ÉCOLE: 'ecole',
      Ärztin: 'arztin',
      'Técnico en Prevención': 'tecnico en prevencion',
    };
    for (const [text, folded] of Object.entries(cases)) {
      expect(fold(text)).toBe(folded);
    }
  });

  it('writes the German sharp s as "ss", in either case', () => {
    expect(fold('Straßenbahnfahrer')).toBe('strassenbahnfahrer');
    expect(fold('STRAẞE')).toBe('strasse');
  });
});

describe('singular', () => {
  it('brings plurals to the form of their singular', () => {
    const cases = {
      nurses: 'nurse',
      clerks: 'clerk',
      secretaries: 'secretary',
      boss: 'boss',
      business: 'business',
      bus: 'bus',
      nurse: 'nurse',
    };
    for (const [word, form] of Object.entries(cases)) {
      expect(singular(word), word).toBe(form);
    }
  });

  it('leaves a word it has already treated as it is', () => {
    const words = ['secretaries', 'addresses', 'glasses', 'analysts', 'cities', 'process'];
    for (const word of words) {
      expect(singular(singular(word)), word).toBe(singular(word));
    }
  });
});

describe('tokensOf', () => {
  it('keeps the meaningful words and drops the stop words of every language', () => {
    const cases = {
      'Head of the Nursing Unit': ['head', 'nursing', 'unit'],
      'Profesor de la universidad': ['profesor', 'universidad'],
      'Leiter für Vertrieb und Marketing': ['leiter', 'vertrieb', 'marketing'],
      "Chef d'équipe des ventes": ['chef', 'equipe', 'vente'],
      'Tecnico della produzione': ['tecnico', 'produzione'],
    };
    for (const [text, tokens] of Object.entries(cases)) {
      expect(tokensOf(text), text).toEqual(tokens);
    }
  });

  it('splits words at any character that is not a letter or a digit', () => {
    expect(tokensOf('HGV-driver (Class 1)/C+E')).toEqual(['hgv', 'driver', 'class', '1', 'c']);
  });

  it('returns each word once, in order of first appearance', () => {
    expect(tokensOf('Nurse, registered nurses and NURSE')).toEqual(['nurse', 'registered']);
  });

  it('gives a singular and its plural, with or without accents, the same words', () => {
    const pairs = [
      ['Payroll clerk', 'payroll clerks'],
      ['Secretary', 'Secretaries'],
      ['Enfermero', 'enfermeros'],
      ['Ingénieur', 'ingenieurs'],
      ['Straßenbahnfahrer', 'strassenbahnfahrer'],
    ];
    for (const [one, other] of pairs) {
      expect(tokensOf(one ?? ''), one).toEqual(tokensOf(other ?? ''));
    }
  });

  it('returns no words for a text made only of stop words or punctuation', () => {
    for (const text of ['', '   ', 'of the', '—/—', 'de la y']) {
      expect(tokensOf(text), text).toEqual([]);
    }
  });
});
