import type { SuppressKeyboardEventParams } from 'ag-grid-community';

/** The actions a cell holds that can be used now: links and buttons not waiting. */
function actionsOf(cell: Element): HTMLElement[] {
  return [...cell.querySelectorAll<HTMLElement>('a[href], button:not(:disabled)')];
}

const isActivation = (key: KeyboardEvent) => key.key === 'Enter' || key.key === ' ';

/**
 * Enter or Space on the cell itself uses the action inside it. A cell with several actions
 * takes the focus in to the first one instead, so the person chooses.
 */
function enterCell(cell: Element, key: KeyboardEvent): boolean {
  const actions = actionsOf(cell);
  const [first] = actions;
  if (first === undefined) {
    return false;
  }
  key.preventDefault();
  if (actions.length === 1) {
    first.click();
  } else {
    first.focus();
  }
  return true;
}

/** Keys on an action inside a cell: Tab moves between the cell's actions before leaving it. */
function withinCell(cell: HTMLElement, action: HTMLElement, key: KeyboardEvent): boolean {
  if (key.key === 'Escape') {
    cell.focus();
    return true;
  }
  if (key.key === 'Tab') {
    const actions = actionsOf(cell);
    const next = actions.indexOf(action) + (key.shiftKey ? -1 : 1);
    return next >= 0 && next < actions.length;
  }
  // Enter and Space belong to the link or the button.
  return isActivation(key);
}

/**
 * The keyboard of cells that hold actions, as AG Grid's `suppressKeyboardEvent`, which runs
 * before the grid handles a key: `true` keeps the grid from handling it. On the cell, Enter or
 * Space uses its action; on an action, Tab and Shift+Tab go through the cell's other actions,
 * and Escape goes back to the cell.
 */
export function actionKeys<T>({ event }: SuppressKeyboardEventParams<T>): boolean {
  const target = event.target;
  if (event.type !== 'keydown' || !(target instanceof HTMLElement)) {
    return false;
  }
  const cell = target.closest<HTMLElement>('[role="gridcell"]');
  if (cell === null) {
    return false;
  }
  if (target === cell) {
    return isActivation(event) && enterCell(cell, event);
  }
  return withinCell(cell, target, event);
}
