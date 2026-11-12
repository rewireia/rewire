import { interpretResultSchema } from '@rewire/contracts';
import { afterEach, describe, expect, it } from 'vitest';

import { withoutGreeting } from '../src/modules/guide/description-search.ts';

import { bodyOf } from './support/client.ts';
import { createTestApi, type TestApi } from './support/test-api.ts';

let api: TestApi;
afterEach(async () => {
  await api.close();
});

describe('bilingual occupation descriptions without a model', () => {
  it.each(['us', 'eu', 'uk'] as const)(
    'offers official bar and table-service candidates for bilingual descriptions in %s',
    async (region) => {
      api = await createTestApi();
      const client = api.client();
      for (const [text, lang] of [
        ['trabajo en un bar', 'es'],
        ['soy camarero', 'es'],
        ['I work in a bar', 'en'],
        ['I serve drinks', 'en'],
      ]) {
        const result = await bodyOf(
          await client.post(`/api/regions/${region}/occupations/interpret`, { text, lang }),
          200,
          interpretResultSchema,
        );
        expect(result.source).toBe('search');
        expect(result.matches.map((match) => match.unitGroup?.isco08)).toEqual(['5132', '5131']);
        expect(result.note).toContain(lang === 'es' ? 'barra' : 'bar');
        for (const match of result.matches) {
          expect(
            api.bundle.classifications[region].occupations.some(
              (occupation) => occupation.code === match.occupation.code,
            ),
          ).toBe(true);
        }
      }
    },
  );

  it.each(['us', 'eu', 'uk'] as const)(
    'keeps candidates when duties follow the job title in %s',
    async (region) => {
      api = await createTestApi();
      const client = api.client();
      for (const [text, lang, group] of [
        ['trabajo en un bar\nsirvo bebidas', 'es', '5132'],
        ['I work in a bar\nI serve drinks', 'en', '5132'],
        ['payroll clerk\nI calculate payroll and maintain employee records', 'en', '4313'],
        ['enfermera\ncuido pacientes', 'es', '2221'],
      ] as const) {
        const result = await bodyOf(
          await client.post(`/api/regions/${region}/occupations/interpret`, { text, lang }),
          200,
          interpretResultSchema,
        );
        expect(result.matches.some((match) => match.unitGroup?.isco08 === group)).toBe(true);
        expect(result.source).toBe('search');
        expect(result.note).not.toBeNull();
      }
    },
  );

  it.each(['us', 'eu', 'uk'] as const)(
    'offers the same official workplace candidates regardless of input and display language in %s',
    async (region) => {
      api = await createTestApi();
      const client = api.client();
      for (const [spanish, english, expected] of [
        ['trabajo en una panadería', 'I work in a bakery', ['7512', '5223']],
        ['trabajo en una pizzería', 'I work in a pizzeria', ['9411', '5131']],
      ] as const) {
        const results: string[][] = [];
        for (const text of [spanish, english]) {
          for (const lang of ['es', 'en'] as const) {
            const result = await bodyOf(
              await client.post(`/api/regions/${region}/occupations/interpret`, { text, lang }),
              200,
              interpretResultSchema,
            );
            expect(result.source).toBe('search');
            expect(result.note).toContain(lang === 'es' ? '¿' : '?');
            if (spanish.includes('pizzería')) {
              const groups = result.matches.map((match) => match.unitGroup?.isco08);
              expect(groups).not.toContain('8332');
              expect(groups).toContain('8322');
              expect(
                result.matches.find((match) => match.unitGroup?.isco08 === '8322')?.occupation
                  .title,
              ).toMatch(/driver/i);
            }
            for (const group of expected) {
              expect(result.matches.some((match) => match.unitGroup?.isco08 === group)).toBe(true);
            }
            results.push(result.matches.map((match) => match.occupation.code));
          }
        }
        expect(results.every((codes) => JSON.stringify(codes) === JSON.stringify(results[0]))).toBe(
          true,
        );
      }
      for (const lang of ['en', 'es'] as const) {
        const result = await bodyOf(
          await client.post(`/api/regions/${region}/occupations/interpret`, {
            text: 'panadera',
            lang,
          }),
          200,
          interpretResultSchema,
        );
        expect(result.matches[0]?.unitGroup?.isco08).toBe('7512');
        expect(result.source).toBe('search');
      }
    },
  );

  it.each(['us', 'eu', 'uk'] as const)(
    'keeps workplace candidates when duties are supplied without a model in %s',
    async (region) => {
      api = await createTestApi();
      for (const [text, groups] of [
        ['trabajo en una panadería\nhago pan', ['7512', '5223']],
        ['trabajo en una pizzería\nreparto pedidos', ['9411', '5131']],
      ] as const) {
        const result = await bodyOf(
          await api
            .client()
            .post(`/api/regions/${region}/occupations/interpret`, { text, lang: 'es' }),
          200,
          interpretResultSchema,
        );
        expect(result.source).toBe('search');
        expect(result.note).toContain('¿');
        for (const group of groups) {
          expect(result.matches.some((match) => match.unitGroup?.isco08 === group)).toBe(true);
        }
      }
    },
  );

  it('removes complete greetings without changing words that begin the same way', () => {
    expect(withoutGreeting('Hola, soy panadera')).toBe('soy panadera');
    expect(withoutGreeting('Buenos días, soy panadera')).toBe('soy panadera');
    expect(withoutGreeting('Hi, I work in a bakery')).toBe('I work in a bakery');
    expect(withoutGreeting('high voltage electrician')).toBe('high voltage electrician');
  });

  it.each(['us', 'eu', 'uk'] as const)(
    'recognises a greeting followed by a Spanish job title in %s',
    async (region) => {
      api = await createTestApi();
      const result = await bodyOf(
        await api.client().post(`/api/regions/${region}/occupations/interpret`, {
          text: 'Hola, soy panadera',
          lang: 'en',
        }),
        200,
        interpretResultSchema,
      );
      expect(result.source).toBe('search');
      expect(result.matches[0]?.unitGroup?.isco08).toBe('7512');
    },
  );

  it.each(['us', 'uk'] as const)(
    'bridges Spanish official titles to the same regional groups in %s',
    async (region) => {
      api = await createTestApi();
      const client = api.client();
      for (const [spanish, english, group] of [
        ['electricista', 'electrician', '7411'],
        ['empleado de nóminas', 'payroll clerk', '4313'],
      ] as const) {
        const find = async (text: string) =>
          bodyOf(
            await client.post(`/api/regions/${region}/occupations/interpret`, { text, lang: 'es' }),
            200,
            interpretResultSchema,
          );
        const [es, en] = await Promise.all([find(spanish), find(english)]);
        expect(es.matches.some((match) => match.unitGroup?.isco08 === group)).toBe(true);
        expect(en.matches.some((match) => match.unitGroup?.isco08 === group)).toBe(true);
        expect(es.note).toContain('posibles');
      }
      const nurse = await bodyOf(
        await client.post(`/api/regions/${region}/occupations/interpret`, {
          text: 'enfermera',
          lang: 'es',
        }),
        200,
        interpretResultSchema,
      );
      expect(nurse.matches.some((match) => match.unitGroup?.isco08 === '2221')).toBe(true);
      expect(nurse.note).toContain('¿');
    },
  );
});
