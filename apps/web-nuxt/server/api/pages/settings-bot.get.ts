import { getBotBySlug } from '../../utils/dbResolve';

// settings/bot/[slug]/page.tsx: ?slug=<slug>. 403 when the user may not update the bot (page redirects)
export default defineEventHandler(async (event) => {
  const { user } = await requireUser(event);
  const { slug } = getQuery(event);
  const bot = typeof slug === 'string' ? await getBotBySlug(slug) : null;
  if (!bot || !can(user, 'update', 'bot', { bot })) {
    throw createError({ statusCode: 403, statusMessage: 'Forbidden' });
  }
  return bot;
});
