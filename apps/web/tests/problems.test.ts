import { describe, expect, it } from 'vitest';

import { ApiError, CLIENT_PROBLEM } from '../src/api/request.ts';
import { en } from '../src/i18n/en.ts';
import { es } from '../src/i18n/es.ts';
import { translate } from '../src/i18n/format.ts';
import {
  KNOWN_PROBLEMS,
  problemKey,
  problemMessage,
  solvedOnDashboard,
} from '../src/i18n/problems.ts';

const problem = (code: string, detail?: string) =>
  new ApiError({ status: 409, code, title: 'Title', ...(detail === undefined ? {} : { detail }) });

describe('problems', () => {
  it('has its own text in English and Spanish for every known code', () => {
    for (const code of KNOWN_PROBLEMS) {
      const key = problemKey(code);
      expect(en[key].trim(), code).not.toBe('');
      expect(es[key].trim(), code).not.toBe('');
      expect(es[key], code).not.toBe(en[key]);
    }
  });

  it('knows the problems of paying, cancelling a request, certificates and unreadable bodies', () => {
    expect(KNOWN_PROBLEMS).toEqual(
      expect.arrayContaining([
        'invoice_pending',
        'invoice_not_open',
        'payment_pending',
        'certificate_unavailable',
        'invalid_json',
      ]),
    );
  });

  it('sends the person to the dashboard when that is where the problem is solved', () => {
    expect(solvedOnDashboard(problem('invoice_pending'))).toBe(true);
    expect(solvedOnDashboard(problem('invoice_not_open'))).toBe(false);
    expect(solvedOnDashboard(new Error('boom'))).toBe(false);
  });

  it('says a known problem by its code, not by the server detail', () => {
    const t = (key: Parameters<typeof translate>[1]) => translate('es', key);
    expect(problemMessage(problem('lessons_incomplete', 'Finish the lessons.'), t)).toBe(
      es['problem.lessons_incomplete'],
    );
  });

  it('falls back to the server detail for a code it does not know', () => {
    const t = (key: Parameters<typeof translate>[1]) => translate('en', key);
    expect(problemMessage(problem('something_new', 'Plain detail.'), t)).toBe('Plain detail.');
    expect(problemMessage(problem('something_new'), t)).toBe('Title');
  });

  it('tells network and unreadable answers apart', () => {
    const t = (key: Parameters<typeof translate>[1]) => translate('en', key);
    expect(problemMessage(problem(CLIENT_PROBLEM.network), t)).toBe(
      translate('en', 'error.network'),
    );
    expect(problemMessage(problem(CLIENT_PROBLEM.invalidAnswer), t)).toBe(
      translate('en', 'error.invalidAnswer'),
    );
    expect(problemMessage(new Error('boom'), t)).toBe(translate('en', 'error.network'));
  });
});
