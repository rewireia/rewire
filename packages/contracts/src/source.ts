import { z } from 'zod';

/** An official source behind the data, with the credit its licence asks for. */
export const dataSourceSchema = z.object({
  id: z.string(),
  title: z.string(),
  publisher: z.string(),
  version: z.string(),
  url: z.url(),
  licence: z.object({ name: z.string(), url: z.url() }),
  attribution: z.string(),
  adaptationNotice: z.string().nullable(),
  /** The day the source was retrieved, as an ISO date. */
  retrievedOn: z.iso.date(),
});

export type DataSource = z.infer<typeof dataSourceSchema>;

export const dataSourceListSchema = z.object({ sources: z.array(dataSourceSchema) });

export type DataSourceList = z.infer<typeof dataSourceListSchema>;
