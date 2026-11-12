import type { MessageKey } from '../../i18n/en.ts';

/** A section of the guide: its anchor, its title and its paragraphs, in reading order. */
export interface PrimerSection {
  readonly id: string;
  readonly title: MessageKey;
  readonly paragraphs: readonly MessageKey[];
}

export const PRIMER_SECTIONS: readonly PrimerSection[] = [
  {
    id: 'what',
    title: 'primer.what.title',
    paragraphs: ['primer.what.1', 'primer.what.2', 'primer.what.3', 'primer.what.4'],
  },
  {
    id: 'how',
    title: 'primer.how.title',
    paragraphs: ['primer.how.1', 'primer.how.2', 'primer.how.3', 'primer.how.4'],
  },
  {
    id: 'good',
    title: 'primer.good.title',
    paragraphs: ['primer.good.1', 'primer.good.2', 'primer.good.3', 'primer.good.4'],
  },
  {
    id: 'fails',
    title: 'primer.fails.title',
    paragraphs: [
      'primer.fails.1',
      'primer.fails.2',
      'primer.fails.3',
      'primer.fails.4',
      'primer.fails.5',
      'primer.fails.6',
    ],
  },
  {
    id: 'exposure',
    title: 'primer.exposure.title',
    paragraphs: [
      'primer.exposure.1',
      'primer.exposure.2',
      'primer.exposure.3',
      'primer.exposure.4',
    ],
  },
  {
    id: 'work',
    title: 'primer.work.title',
    paragraphs: ['primer.work.1', 'primer.work.2', 'primer.work.3', 'primer.work.4'],
  },
  { id: 'next', title: 'primer.next.title', paragraphs: ['primer.next.1'] },
];

/** The section after which the diagram of how a model writes is drawn. */
export const DIAGRAM_AFTER = 'how';
