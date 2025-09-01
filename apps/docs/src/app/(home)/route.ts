export function GET() {
  return new Response('Redirecting...', {
    status: 302,
    headers: {
      Location: '/docs',
    },
  });
}