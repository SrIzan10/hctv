// the HLS edge authenticates with basic auth `<anything>:<lucia session id>`, and the session cookie
// is httpOnly, so the player gets the id from here (the Next app passed it down via SessionProvider)
export default defineEventHandler(async (event) => {
  const { session } = await validateRequest(event);
  return { sessionId: session?.id ?? null };
});
