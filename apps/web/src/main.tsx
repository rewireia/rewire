import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { applyToDocument } from './app/preferences.ts';
import { Providers } from './app/Providers.tsx';
import { decideOpening } from './features/home/intro/once.ts';
import './theme/fonts.ts';
import './theme/tokens.css';
import './theme/base.css';

const container = document.getElementById('root');
if (container === null) {
  throw new Error('The page has no #root element.');
}

applyToDocument();
// The opening plays only when the site opens at its home page.
decideOpening(window.location.pathname === '/');
createRoot(container).render(
  <StrictMode>
    <Providers />
  </StrictMode>,
);
