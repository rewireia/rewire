import { useId } from 'react';

import { useMessages } from '../../i18n/use-messages.ts';

import styles from './AiPrimer.module.css';

/** Illustrative lengths of the three likelihood bars, in units of the drawing: not measured. */
const BARS = [
  { key: 'primer.diagram.word1', width: 150 },
  { key: 'primer.diagram.word2', width: 92 },
  { key: 'primer.diagram.word3', width: 44 },
] as const;

/** The likely next words, each with an illustrative bar; the first is the one added. */
function Candidates() {
  const { t } = useMessages();
  return (
    <>
      {BARS.map((bar, index) => {
        const y = 282 + index * 30;
        const first = index === 0;
        return (
          <g key={bar.key}>
            <text x="28" y={y + 12} className={first ? styles.chosenText : styles.word}>
              {t(bar.key)}
            </text>
            <rect
              x="132"
              y={y}
              width={bar.width}
              height="16"
              rx="8"
              className={first ? styles.barChosen : styles.bar}
            />
          </g>
        );
      })}
    </>
  );
}

/**
 * How a language model writes, drawn once and still: the request, the model, the likely next
 * words with the chosen one added to the text, and the loop that repeats the step. Its colours
 * are the page's tokens, so it reads in the light and the dark theme alike.
 */
export function TokenDiagram() {
  const { t } = useMessages();
  const titleId = useId();
  const chosen = t('primer.diagram.word1');
  return (
    <figure className={styles.figure}>
      <svg className={styles.diagram} viewBox="0 0 360 440" role="img" aria-labelledby={titleId}>
        <title id={titleId}>{t('primer.diagram.title')}</title>
        <defs>
          <marker
            id="primer-arrow"
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="7"
            markerHeight="7"
            orient="auto-start-reverse"
          >
            <path d="M1 1l8 4-8 4" className={styles.arrowHead} />
          </marker>
        </defs>

        <rect x="12" y="12" width="300" height="72" rx="10" className={styles.box} />
        <text x="28" y="38" className={styles.label}>
          {t('primer.diagram.request')}
        </text>
        <text x="28" y="64" className={styles.prompt}>
          {t('primer.diagram.prompt')} <tspan className={styles.chosenText}>{chosen}</tspan>
        </text>

        <path d="M162 88v28" className={styles.flow} markerEnd="url(#primer-arrow)" />

        <rect x="12" y="122" width="300" height="72" rx="10" className={styles.model} />
        <text x="28" y="152" className={styles.modelName}>
          {t('primer.diagram.model')}
        </text>
        <text x="28" y="176" className={styles.modelNote}>
          {t('primer.diagram.patterns')}
        </text>

        <path d="M162 198v28" className={styles.flow} markerEnd="url(#primer-arrow)" />

        <rect x="12" y="232" width="300" height="140" rx="10" className={styles.box} />
        <text x="28" y="258" className={styles.label}>
          {t('primer.diagram.candidates')}
        </text>
        <Candidates />

        <path
          d="M290 290h26a12 12 0 0 0 12-12V60a12 12 0 0 0-12-12h-2"
          className={styles.loop}
          markerEnd="url(#primer-arrow)"
        />
        <text x="180" y="404" textAnchor="middle" className={styles.step}>
          {t('primer.diagram.chosen')}
        </text>
        <text x="180" y="426" textAnchor="middle" className={styles.step}>
          {t('primer.diagram.repeat')}
        </text>
      </svg>
      <figcaption className={styles.caption}>{t('primer.diagram.caption')}</figcaption>
    </figure>
  );
}
