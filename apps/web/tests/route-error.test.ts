import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { BRAND_NAME } from '../src/app/brand.ts';
import { ErrorView } from '../src/app/RouteError.tsx';

const render = (language: 'en' | 'es', standalone: boolean) =>
  renderToStaticMarkup(createElement(ErrorView, { language, standalone }));

describe('the error page of the router', () => {
  it('says what happened and what to do, in English', () => {
    const html = render('en', false);
    expect(html).toContain('Something went wrong while showing this page.');
    expect(html).toContain('Reload the page');
    expect(html).toContain('href="/start"');
    expect(html).toContain('Go to the start');
    expect(html).toContain('role="alert"');
  });

  it('says it in Spanish', () => {
    const html = render('es', false);
    expect(html).toContain('Algo ha fallado al mostrar esta página.');
    expect(html).toContain('Recargar la página');
    expect(html).toContain('Ir al inicio');
  });

  it('brings its own name bar only when the frame failed', () => {
    expect(render('en', true)).toContain(BRAND_NAME);
    expect(render('en', false)).not.toContain(BRAND_NAME);
  });

  it('shows no technical detail', () => {
    const html = render('en', true);
    expect(html).not.toMatch(/stack|Error:|undefined|at \w+ \(/);
  });
});
