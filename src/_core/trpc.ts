import { initTRPC, TRPCError } from '@trpc/server';

export interface Context {
  req?: any;
  res?: any;
  user?: any;
}

export async function createContext(opts?: { req?: any; res?: any }) {
  return {
    req: opts?.req,
    res: opts?.res,
    user: null, // 简化版：暂无认证
  };
}

const t = initTRPC.context<Context>().create();

export const router = t.router;
export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: 'UNAUTHORIZED' });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});
