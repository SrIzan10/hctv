export default defineEventHandler(() => {
  const { public: config } = useRuntimeConfig();
  return Response.json({
    version: config.version,
    commit: config.commit,
  });
});
