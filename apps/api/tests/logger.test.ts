import { describe, expect, it } from 'vitest';

import { createLogger } from '../src/logger.ts';

import { anyString } from './support/client.ts';

describe('the logger', () => {
  it('drops lines below its minimum level', () => {
    const lines: string[] = [];
    const logger = createLogger('warn', (line) => lines.push(line));
    logger.debug('debug');
    logger.info('info');
    logger.warn('warn');
    logger.error('error');
    expect(lines.map((line) => (JSON.parse(line) as { level: string }).level)).toEqual([
      'warn',
      'error',
    ]);
  });

  it('writes one JSON object per line, with its fields', () => {
    const lines: string[] = [];
    createLogger('debug', (line) => lines.push(line)).info('request', { status: 200 });
    expect(lines).toHaveLength(1);
    expect(lines[0]?.endsWith('\n')).toBe(true);
    expect(lines[0]?.trimEnd()).not.toContain('\n');
    expect(JSON.parse(lines[0] ?? '')).toEqual({
      status: 200,
      time: anyString,
      level: 'info',
      message: 'request',
    });
  });
});
