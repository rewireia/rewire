import {
  captureResultSchema,
  courseCardSchema,
  pathwaySchema,
  paymentConfigSchema,
  paymentListSchema,
  sponsorshipListSchema,
  sponsorshipSchema,
  startedOrderSchema,
  type CaptureResult,
  type CourseCard,
  type Pathway,
  type PaymentConfig,
  type PaymentList,
  type Region,
  type Sponsorship,
  type SponsorshipList,
  type SponsorshipRequest,
  type StartedOrder,
  type StartOrderRequest,
} from '@rewire/contracts';

import { segment, sendJson, type Request } from './request.ts';

/** The learning plan, the catalogue, PayPal checkout and the employer's invoices. */
export function commerceApi(request: Request) {
  const opts = (signal?: AbortSignal) => ({ signal: signal ?? null });
  return {
    pathway(region: Region, isco08: string, signal?: AbortSignal): Promise<Pathway> {
      const query = new URLSearchParams({ isco08 });
      return request(`/regions/${region}/pathway?${query}`, pathwaySchema, opts(signal));
    },
    course(region: Region, courseId: string, signal?: AbortSignal): Promise<CourseCard> {
      const path = `/regions/${region}/courses/${segment(courseId)}`;
      return request(path, courseCardSchema, opts(signal));
    },
    paymentConfig(region: Region, signal?: AbortSignal): Promise<PaymentConfig> {
      return request(`/regions/${region}/payment-config`, paymentConfigSchema, opts(signal));
    },
    startOrder(body: StartOrderRequest): Promise<StartedOrder> {
      return request('/checkout/orders', startedOrderSchema, sendJson('POST', body));
    },
    captureOrder(orderId: string): Promise<CaptureResult> {
      const path = `/checkout/orders/${segment(orderId)}/capture`;
      return request(path, captureResultSchema, sendJson('POST'));
    },
    payments(signal?: AbortSignal): Promise<PaymentList> {
      return request('/payments', paymentListSchema, opts(signal));
    },
    refreshPayment(orderId: string): Promise<CaptureResult> {
      const path = `/payments/${segment(orderId)}/refresh`;
      return request(path, captureResultSchema, sendJson('POST'));
    },
    refundPayment(orderId: string): Promise<CaptureResult> {
      const path = `/payments/${segment(orderId)}/refund`;
      return request(path, captureResultSchema, sendJson('POST'));
    },
    requestSponsorship(body: SponsorshipRequest): Promise<Sponsorship> {
      return request('/sponsorships', sponsorshipSchema, sendJson('POST', body));
    },
    sponsorships(signal?: AbortSignal): Promise<SponsorshipList> {
      return request('/sponsorships', sponsorshipListSchema, opts(signal));
    },
    refreshSponsorship(id: string): Promise<Sponsorship> {
      const path = `/sponsorships/${segment(id)}/refresh`;
      return request(path, sponsorshipSchema, sendJson('POST'));
    },
    /** Withdraws a request still out: PayPal cancels the invoice and tells the employer. */
    cancelSponsorship(id: string): Promise<Sponsorship> {
      const path = `/sponsorships/${segment(id)}/cancel`;
      return request(path, sponsorshipSchema, sendJson('POST'));
    },
  };
}
