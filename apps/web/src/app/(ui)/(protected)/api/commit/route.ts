
type CommitResponse = {
  version: string | undefined;
  commit: string | undefined;
};

/**
 * Get version.
 * @description Returns the current version and commit hash of the application.
 * @response CommitResponse
 */
export function GET() {
  return Response.json({
    version: process.env.version,
    commit: process.env.commit,
  });
}
