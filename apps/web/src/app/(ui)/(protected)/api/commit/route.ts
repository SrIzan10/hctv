export function GET() {
  return Response.json({
    version: process.env.version,
    commit: process.env.commit,
  });
}
