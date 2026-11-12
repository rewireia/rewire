import type { Enrolment, Payment, UnitGroupSummary } from '@rewire/contracts';
import type { ColDef, GetQuickFilterTextParams, ValueFormatterParams } from 'ag-grid-community';
import { describe, expect, it } from 'vitest';

import type { Language } from '../src/app/preferences.ts';
import { gridText } from '../src/components/grid-locale.ts';
import { courseColumns } from '../src/features/dashboard/course-columns.tsx';
import { employerColumns, type EmployerRow } from '../src/features/dashboard/employer-columns.tsx';
import { paymentColumns, paymentRow } from '../src/features/dashboard/payment-columns.tsx';
import { compareMoney } from '../src/features/dashboard/payment-totals.ts';
import { columnsFor } from '../src/features/explorer/columns.tsx';
import { formatPoints, translate } from '../src/i18n/format.ts';
import type { Messages } from '../src/i18n/use-messages.ts';

function messages(language: Language): Messages {
  return {
    language,
    t: (key, values) => translate(language, key, values),
    points: (score) => formatPoints(score, language),
  };
}

const PAYMENT: Payment = {
  orderId: 'order-1',
  courseId: 'checking-ai-work',
  courseTitle: 'Checking AI work',
  method: 'paypal',
  amount: { currency: 'USD', minorUnits: 1999 },
  status: 'refunded',
  createdAt: '2026-11-11T10:00:00.000Z',
  paidAt: '2026-11-11T10:00:00.000Z',
  refundedAt: '2026-11-11T11:00:00.000Z',
  paypalReference: 'CAPTURE-1',
  refundable: false,
};

const SPONSORSHIP: EmployerRow = {
  id: 'sponsorship-1',
  courseId: 'ai-foundations',
  courseTitle: 'AI foundations',
  amount: { currency: 'EUR', minorUnits: 4900 },
  status: 'sent',
  invoiceNumber: '0001',
  payUrl: 'https://example.com/invoice',
  sentAt: '2026-11-10T09:00:00.000Z',
  paidAt: null,
  busy: false,
};

const ENROLMENT: Enrolment = {
  kind: 'hosted',
  courseId: 'checking-ai-work',
  title: 'Checking AI work',
  provider: null,
  url: null,
  stage: 'strengthen',
  status: 'active',
  lessonsCompleted: 1,
  lessons: 3,
  quizPassed: false,
  startedAt: '2026-11-11T10:00:00.000Z',
  completedAt: null,
  certificateId: null,
};

const UNIT_GROUP = {
  isco08: '4313',
  title: 'Payroll Clerks',
  majorGroup: { code: '4', title: 'Clerical support workers' },
  meanScore: 0.61,
  gradient: 'gradient-2',
  tasks: 6,
} as UnitGroupSummary;

/** What the quick filter reads and what the cell shows, for each column that writes words. */
function textsOf<T>(columns: ColDef<T>[], data: T) {
  return columns.flatMap((column) => {
    const { getQuickFilterText, valueFormatter } = column;
    if (getQuickFilterText === undefined) {
      return [];
    }
    const params = { data, value: undefined, colDef: column };
    const searched = getQuickFilterText(params as unknown as GetQuickFilterTextParams<T>);
    const shown =
      typeof valueFormatter === 'function'
        ? valueFormatter(params as unknown as ValueFormatterParams<T>)
        : undefined;
    return [{ column: column.colId ?? column.field, searched, shown }];
  });
}

describe('the quick filter of the tables', () => {
  it.each(['en', 'es'] as const)('searches what a formatted cell shows, in %s', (language) => {
    const texts = [
      ...textsOf(paymentColumns(messages(language), false), paymentRow(PAYMENT, false)),
      ...textsOf(employerColumns(messages(language), false), SPONSORSHIP),
      ...textsOf(courseColumns(messages(language).t, false), ENROLMENT),
      ...textsOf(columnsFor(messages(language), false), UNIT_GROUP),
    ];
    for (const { column, searched, shown } of texts) {
      if (shown !== undefined) {
        expect(searched, String(column)).toBe(shown);
      }
    }
  });

  it('finds the words of the interface, not the raw values', () => {
    const searched = (language: Language) =>
      [
        ...textsOf(paymentColumns(messages(language), false), paymentRow(PAYMENT, false)),
        ...textsOf(employerColumns(messages(language), false), SPONSORSHIP),
        ...textsOf(courseColumns(messages(language).t, false), ENROLMENT),
        ...textsOf(columnsFor(messages(language), false), UNIT_GROUP),
      ].map((text) => text.searched);
    expect(searched('en')).toEqual(
      expect.arrayContaining(['Refunded', '$19.99', 'Nov 11, 2026', 'Sent, not paid yet']),
    );
    expect(searched('en')).toEqual(expect.arrayContaining(['Review and decide', '1 of 3', '61']));
    expect(searched('es')).toEqual(expect.arrayContaining(['Reembolsado', 'Enviada, sin pagar']));
  });
});

describe('the order of amounts', () => {
  it('puts each currency together, then the amounts within it', () => {
    const amounts = [
      { currency: 'USD', minorUnits: 500 },
      { currency: 'EUR', minorUnits: 9000 },
      null,
      { currency: 'USD', minorUnits: 100 },
      { currency: 'EUR', minorUnits: 1000 },
    ] as const;
    expect([...amounts].sort(compareMoney)).toEqual([
      null,
      { currency: 'EUR', minorUnits: 1000 },
      { currency: 'EUR', minorUnits: 9000 },
      { currency: 'USD', minorUnits: 100 },
      { currency: 'USD', minorUnits: 500 },
    ]);
  });
});

describe('rows waiting on an action', () => {
  it('carry the wait in their data, so AG Grid redraws their actions', () => {
    const idle = paymentRow(PAYMENT, false);
    const busy = paymentRow(PAYMENT, true);
    expect(busy).not.toBe(idle);
    expect(busy).toMatchObject({ kind: 'payment', id: 'order-1', busy: true });
    expect(idle).toMatchObject({ busy: false });
  });
});

describe("AG Grid's own texts", () => {
  const text = gridText(messages('es').t, 'dashboard.filter.none');
  const ask = (key: string, variableValues?: string[]) =>
    text({
      key,
      defaultValue: `default ${key}`,
      ...(variableValues ? { variableValues } : {}),
    } as Parameters<typeof text>[0]);

  it('say an empty table in the language of the page, filtered or not', () => {
    expect(ask('noMatchingRows')).toBe('Ninguna línea de esta tabla coincide con el filtro.');
    expect(ask('noRowsToShow')).toBe('Ninguna línea de esta tabla coincide con el filtro.');
  });

  it('announce sorting with its values, and leave unused keys to AG Grid', () => {
    expect(ask('ariaSortableColumn')).toBe('Pulsa Intro para ordenar');
    expect(ask('ariaSortPriority', ['1', '2'])).toBe('Prioridad de orden 1 de 2');
    expect(ask('ariaPageSizeSelectorLabel')).toBe('Filas por página');
    expect(ask('ariaSearch')).toBe('default ariaSearch');
  });
});
