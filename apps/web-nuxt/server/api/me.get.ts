export default defineEventHandler(async (event) => {
  const { user } = await validateRequest(event);
  return { user };
});
