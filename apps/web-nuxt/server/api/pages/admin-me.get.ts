// admin/page.tsx guard: 401 -> not signed in, 403 -> not an admin. Returns the signed-in admin.
export default defineEventHandler(async (event) => {
  const { user } = await requireAdmin(event);
  return { user };
});
