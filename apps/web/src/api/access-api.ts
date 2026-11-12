import { z } from 'zod';

import { sendJson, type Request } from './request.ts';

const accessSchema = z.object({ authenticated: z.boolean() });

export function accessApi(request: Request) {
  return {
    signIn(username: string, password: string, role: 'learner' | 'business' = 'learner') {
      return request(
        '/session/sign-in',
        accessSchema,
        sendJson('POST', { username, password, role }),
      );
    },
    signOut() {
      return request('/session/sign-out', accessSchema, sendJson('POST', {}));
    },
  };
}
