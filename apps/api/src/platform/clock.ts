/** Tells the time. Passed in wherever time matters, so tests can set it. */
export type Clock = () => Date;

export const systemClock: Clock = () => new Date();
