import type { Region, StudyPlan, StudyTimeline } from '@rewire/contracts';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api } from './instance.ts';

const studyPlanKey = (region: Region, isco08: string) => ['study-plan', region, isco08] as const;

/** While PayPal or an employer has yet to settle a payment, the plan is read again this often. */
const PAYMENT_WATCH_MS = 15_000;

/** The courses whose payment PayPal or the employer has yet to settle. */
function unsettled(timeline: StudyTimeline | undefined) {
  return (timeline?.stages ?? [])
    .flatMap((stage) => stage.courses)
    .filter((course) => course.payment === 'held-by-paypal' || course.payment === 'invoice-sent');
}

/**
 * Asks Rewire to check with PayPal the payments and invoices still out for these courses, as
 * "Check again" on the dashboard does. PayPal also tells Rewire on its own; this only makes the
 * plan learn it sooner. A failed check changes nothing: the plan is read as it stands.
 */
async function checkPayments(timeline: StudyTimeline | undefined): Promise<number> {
  const waiting = unsettled(timeline);
  const invoiced = new Set(waiting.filter((c) => c.payment === 'invoice-sent').map((c) => c.id));
  const held = new Set(waiting.filter((c) => c.payment === 'held-by-paypal').map((c) => c.id));
  const checks: Promise<unknown>[] = [];
  if (invoiced.size > 0) {
    const { sponsorships } = await api.sponsorships();
    sponsorships
      .filter((request) => request.status === 'sent' && invoiced.has(request.courseId))
      .forEach((request) => checks.push(api.refreshSponsorship(request.id)));
  }
  if (held.size > 0) {
    const { payments } = await api.payments();
    payments
      .filter((payment) => payment.status === 'pending' && held.has(payment.courseId))
      .forEach((payment) => checks.push(api.refreshPayment(payment.orderId)));
  }
  await Promise.allSettled(checks);
  return checks.length;
}

/**
 * The plan in time; `today` is the reader's own day, written as `YYYY-MM-DD`. While a payment
 * is out, it is read again every few seconds and when the page comes back into view, quietly,
 * so a course unlocks on screen as soon as it is paid for.
 */
export function useStudyTimeline(region: Region, isco08: string, today: string) {
  const client = useQueryClient();
  const key = studyPlanKey(region, isco08);
  return useQuery({
    queryKey: key,
    queryFn: async ({ signal }) => {
      const shown = client.getQueryData<StudyTimeline>(key);
      if (unsettled(shown).length > 0) {
        const checked = await checkPayments(shown).catch(() => 0);
        if (checked > 0) {
          // What was checked may have moved money: the tables that show it read it again.
          for (const table of ['payments', 'sponsorships', 'enrolments']) {
            void client.invalidateQueries({ queryKey: [table] });
          }
        }
      }
      return api.studyTimeline(region, isco08, today, signal);
    },
    refetchInterval: (query) => (unsettled(query.state.data).length > 0 ? PAYMENT_WATCH_MS : false),
    refetchOnWindowFocus: (query) => unsettled(query.state.data).length > 0,
  });
}

/** Saves the plan; the server's answer replaces the cached one, so its dates are the ones shown. */
export function useSaveStudyPlan(region: Region, isco08: string, today: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (plan: StudyPlan) => api.saveStudyPlan(region, isco08, today, plan),
    onSuccess: (timeline) => {
      client.setQueryData(studyPlanKey(region, isco08), timeline);
      // The first save gives a visitor a session.
      void client.invalidateQueries({ queryKey: ['session'] });
    },
  });
}
