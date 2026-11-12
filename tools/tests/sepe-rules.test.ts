import { catalogueSnapshotSchema } from '@rewire/content';
import { describe, expect, it } from 'vitest';

import {
  isKept,
  sentenceCase,
  sepeIdOf,
  sepeSnapshotOf,
  sepeSummaries,
  sepeTopicsOf,
} from '../sepe-rules.ts';

const ONLINE = {
  nombre: 'FUNDAMENTOS DE PROGRAMACIÓN CON HTML, CSS Y JAVASCRIPT',
  nivel: '2',
  horas: '220',
  familia: 'INFORMÁTICA Y COMUNICACIONES',
  modalidad: 'Presencial y teleformación',
  ficha: 'https://sede.sepe.gob.es/es/portaltrabaja/resources/pdf/especialidades/IFCD0025.pdf',
};

/** A fixed sample of the export, in its own shape: one specialty kept and four left out. */
const SAMPLE = {
  especialidades: {
    IFCD0025: ONLINE,
    ADGD093PO: { ...ONLINE, nivel: 'Sin especificar' },
    COMM0087: { ...ONLINE, modalidad: 'Solo Presencial' },
    IFCT0001: { ...ONLINE, horas: '' },
    AGAX0001: { ...ONLINE, familia: 'AGRARIA' },
  },
};

describe('sentenceCase', () => {
  it('writes an official name in sentence case and keeps abbreviations and products', () => {
    expect(sentenceCase(ONLINE.nombre)).toBe(
      'Fundamentos de programación con HTML, CSS y JavaScript',
    );
    expect(sentenceCase('NORMA ISO 27001')).toBe('Norma ISO 27001');
    expect(sentenceCase('FUNDAMENTOS DE MICROSOFT AZURE -AI-901')).toBe(
      'Fundamentos de Microsoft Azure -AI-901',
    );
    expect(sentenceCase('GESTIÓN DEL IVA EN LA PYME')).toBe('Gestión del IVA en la PYME');
  });

  it('starts every sentence with a capital, and keeps Roman numerals', () => {
    expect(sentenceCase('SEGURIDAD Y DEFENSA. ORGANIZACIÓN II')).toBe(
      'Seguridad y defensa. Organización II',
    );
  });
});

describe('the specialties kept', () => {
  it('are online, with an official level, stated hours and a kept family', () => {
    const kept = Object.entries(SAMPLE.especialidades).filter(([, entry]) => isKept(entry));
    expect(kept.map(([code]) => code)).toEqual(['IFCD0025']);
  });
});

describe('a kept specialty', () => {
  it('is described only with what its record says, in English and Spanish', () => {
    expect(sepeSummaries(ONLINE)).toEqual({
      en: 'Official Spanish training specialty in Computing and communications, taken in person or online, at official level 2.',
      es: 'Especialidad formativa oficial de la familia Informática y comunicaciones, presencial o en teleformación, de nivel oficial 2.',
    });
  });

  it('takes subjects from the words of its name, then from its family', () => {
    expect(sepeTopicsOf(ONLINE.nombre, ONLINE.familia)).toEqual(['software-development']);
    expect(
      sepeTopicsOf('INTELIGENCIA ARTIFICIAL Y SECTOR FINANCIERO', 'ADMINISTRACIÓN Y GESTIÓN'),
    ).toEqual(['ai-foundations', 'business-management']);
    expect(
      sepeTopicsOf('DESARROLLO SEGURO Y PROTECCIÓN DE DATOS', 'INFORMÁTICA Y COMUNICACIONES'),
    ).toEqual(['cybersecurity', 'software-development']);
  });

  it('keeps its code in the id', () => {
    expect(sepeIdOf('IFCD0025')).toBe('sepe-ifcd0025');
    expect(sepeIdOf('CTRD0018 (FCOI0018)')).toBe('sepe-ctrd0018-fcoi0018');
  });
});

describe('the snapshot of the export', () => {
  it('cites the source with the day of the export and is sold in the EU only', () => {
    const snapshot = sepeSnapshotOf(SAMPLE, '2026-09-27');
    expect(catalogueSnapshotSchema.safeParse(snapshot).error).toBeUndefined();
    expect(snapshot).toMatchObject({
      citation:
        'Origen de los datos: SEPE, Catálogo de Especialidades Formativas (exportado el 27/09/2026).',
      capturedOn: '2026-09-27',
      providerAccess: 'unknown',
      regions: ['eu'],
      source: null,
    });
    expect(snapshot.courses).toEqual([
      {
        id: 'sepe-ifcd0025',
        title: 'Fundamentos de programación con HTML, CSS y JavaScript',
        url: ONLINE.ficha,
        summary: sepeSummaries(ONLINE).en,
        summaryEs: sepeSummaries(ONLINE).es,
        topics: ['software-development'],
        level: 'intermediate',
        hours: 220,
        languages: ['es'],
      },
    ]);
  });

  it('maps the official levels onto three', () => {
    const levelOf = (nivel: string) =>
      sepeSnapshotOf({ especialidades: { X1: { ...ONLINE, nivel } } }, '2026-09-27').courses[0]
        ?.level;
    expect(['1', '2', '3', '4', '5'].map(levelOf)).toEqual([
      'introductory',
      'intermediate',
      'intermediate',
      'advanced',
      'advanced',
    ]);
  });
});
