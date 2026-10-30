// settings/channel/page.tsx: name of the user's personal channel (or null)
export default defineEventHandler(async (event) => {
  const { user } = await requireUser(event);
  const channel = await resolvePersonalChannel(user.id);
  return { name: channel?.name ?? null };
});
