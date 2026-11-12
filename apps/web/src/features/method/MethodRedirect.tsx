import { Navigate, useLocation } from 'react-router';

/** Where the sections that left the method page live now. */
const MOVED: Readonly<Record<string, string>> = { '#sources': '/credits', '#privacy': '/privacy' };

/** The former address, `/how-it-works`: credits and privacy go to their pages, the rest stays. */
export function MethodRedirect() {
  const { hash } = useLocation();
  return <Navigate replace to={MOVED[hash] ?? { pathname: '/what-is-rewire', hash }} />;
}
