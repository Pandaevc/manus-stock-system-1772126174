import { router, publicProcedure } from './trpc';

export const systemRouter = router({
  health: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),
  version: publicProcedure.query(() => {
    return { version: '1.0.0' };
  }),
});
