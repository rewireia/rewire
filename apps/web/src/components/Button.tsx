import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Link } from 'react-router';

import styles from './Button.module.css';
import { cx } from './cx.ts';
import { Icon } from './Icon.tsx';

interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className'> {
  readonly primary?: boolean;
  /** An arrow after the words, for a button that moves the person on. */
  readonly arrow?: boolean;
  readonly children: ReactNode;
}

export function Button({
  primary = false,
  arrow = false,
  type = 'button',
  children,
  ...rest
}: ButtonProps) {
  return (
    <button type={type} className={cx(styles.button, primary && styles.primary)} {...rest}>
      {children}
      {arrow && (
        <span className={styles.arrow}>
          <Icon name="arrow" size={18} />
        </span>
      )}
    </button>
  );
}

/** A link that looks like a button, for actions that go to another page: it carries an arrow. */
export function ButtonLink({
  to,
  primary = false,
  children,
}: {
  readonly to: string;
  readonly primary?: boolean;
  readonly children: ReactNode;
}) {
  return (
    <Link to={to} className={cx(styles.button, primary && styles.primary)}>
      {children}
      <span className={styles.arrow}>
        <Icon name="arrow" size={18} />
      </span>
    </Link>
  );
}
