import type { AgWidgetField } from 'ag-studio';
import type { AgWidgetCustomCellRendererProps } from 'ag-studio-react';
import type { ComponentType } from 'react';

import styles from './Studio.module.css';

/** A figure of a grid widget, in the monospaced face of the tables. */
export function FigureCell({ valueFormatted, value }: AgWidgetCustomCellRendererProps) {
  return <span className={styles.figure}>{valueFormatted ?? String(value ?? '')}</span>;
}

/** Studio asks for a renderer per column: figures get `cell`; words keep Studio's own. */
export function figureRenderer(cell: ComponentType<AgWidgetCustomCellRendererProps>) {
  return (field: AgWidgetField) => (field.format === 'textFormat' ? undefined : cell);
}
