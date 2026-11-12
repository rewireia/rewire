import { roadmapSchema } from '@rewire/contracts';
import { afterEach, describe, expect, it } from 'vitest';

import { bodyOf } from './support/client.ts';
import { buyCourse, createTestApi, signInDemo, type TestApi } from './support/test-api.ts';

let api: TestApi | undefined;

afterEach(async () => {
  await api?.close();
  api = undefined;
});

const ROADMAP = '/api/marketplace/roadmap?region=us&language=en';

describe('taking every course out of the plan', () => {
  it('empties the plan of the courses not bought', async () => {
    api = await createTestApi({ overrides: { model: null } });
    const client = api.client();
    await signInDemo(client);
    const chosen = { region: 'us', courseIds: ['ai-foundations', 'checking-ai-work'] };
    expect((await client.put('/api/marketplace/roadmap', chosen)).status).toBe(200);

    const emptied = await client.put('/api/marketplace/roadmap', { region: 'us', courseIds: [] });
    expect(emptied.status).toBe(200);
    const { courses } = await bodyOf(await client.get(ROADMAP), 200, roadmapSchema);
    expect(courses).toEqual([]);
  });

  it('never takes out a course already bought', async () => {
    api = await createTestApi({ overrides: { model: null } });
    const client = api.client();
    await signInDemo(client);
    const chosen = { region: 'us', courseIds: ['ai-foundations', 'checking-ai-work'] };
    expect((await client.put('/api/marketplace/roadmap', chosen)).status).toBe(200);
    await buyCourse(client, 'ai-foundations');

    await client.put('/api/marketplace/roadmap', { region: 'us', courseIds: [] });
    const { courses } = await bodyOf(await client.get(ROADMAP), 200, roadmapSchema);
    expect(courses.map((course) => course.courseId)).toEqual(['ai-foundations']);
  });
});
