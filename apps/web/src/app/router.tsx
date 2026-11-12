import { createBrowserRouter } from 'react-router';

import { CertificatePage } from '../features/certificate/CertificatePage.tsx';
import { CoursePage } from '../features/course/CoursePage.tsx';
import { HomePage } from '../features/home/HomePage.tsx';
import { StartPage } from '../features/home/StartPage.tsx';
import { LearnPage } from '../features/learn/LearnPage.tsx';
import { MethodPage } from '../features/method/MethodPage.tsx';
import { MethodRedirect } from '../features/method/MethodRedirect.tsx';
import { CreditsPage } from '../features/credits/CreditsPage.tsx';
import { PrivacyPage } from '../features/privacy/PrivacyPage.tsx';
import { ConfirmPage } from '../features/occupation/ConfirmPage.tsx';
import { PlanPage } from '../features/plan/PlanPage.tsx';
import { ReportPage } from '../features/report/ReportPage.tsx';

import { LoadingBar } from '../components/LoadingBar.tsx';
import pageStyles from './Page.module.css';

import { Layout } from './Layout.tsx';
import { NotFoundPage } from './NotFoundPage.tsx';
import { RouteError } from './RouteError.tsx';

export const router = createBrowserRouter([
  {
    element: <Layout />,
    hydrateFallbackElement: (
      <div className={pageStyles.page}>
        <LoadingBar />
      </div>
    ),
    // The frame itself failed: the error page brings its own name bar.
    errorElement: <RouteError standalone />,
    children: [
      {
        // A page failed: the error shows inside the frame, with the menu still there.
        errorElement: <RouteError />,
        children: [
          { index: true, element: <HomePage /> },
          { path: 'start', element: <StartPage /> },
          {
            path: 'explore',
            // AG Grid and AG Charts load only when the explorer opens.
            lazy: async () => ({
              Component: (await import('../features/explorer/ExplorerPage.tsx')).ExplorerPage,
            }),
          },
          { path: 'what-is-rewire', element: <MethodPage /> },
          { path: 'how-it-works', element: <MethodRedirect /> },
          { path: 'credits', element: <CreditsPage /> },
          { path: 'privacy', element: <PrivacyPage /> },
          {
            path: 'what-is-ai',
            lazy: async () => ({
              Component: (await import('../features/ai-primer/AiPrimerPage.tsx')).AiPrimerPage,
            }),
          },
          {
            path: 'library',
            lazy: async () => ({
              Component: (await import('../features/library/LibraryPage.tsx')).LibraryPage,
            }),
          },
          {
            path: 'courses',
            lazy: async () => ({
              Component: (await import('../features/courses/CoursesPage.tsx')).CoursesPage,
            }),
          },
          {
            path: 'cart',
            lazy: async () => ({
              Component: (await import('../features/cart/CartPage.tsx')).CartPage,
            }),
          },
          {
            path: ':region/sandbox-access',
            lazy: async () => ({
              Component: (await import('../features/checkout/SandboxAccessPage.tsx'))
                .SandboxAccessPage,
            }),
          },
          { path: ':region/confirm', element: <ConfirmPage /> },
          { path: ':region/report/:isco08', element: <ReportPage /> },
          { path: ':region/plan/:isco08', element: <PlanPage /> },
          { path: ':region/courses/:courseId', element: <CoursePage /> },
          { path: 'learn/:courseId', element: <LearnPage /> },
          { path: 'certificates/:id', element: <CertificatePage /> },
          {
            path: 'dashboard',
            // Its tables load AG Grid only when the dashboard opens.
            lazy: async () => ({
              Component: (await import('../features/dashboard/DashboardPage.tsx')).DashboardPage,
            }),
          },
          {
            path: 'business',
            lazy: async () => ({
              Component: (await import('../features/marketplace/BusinessPage.tsx')).BusinessPage,
            }),
          },
          { path: '*', element: <NotFoundPage /> },
        ],
      },
    ],
  },
]);
