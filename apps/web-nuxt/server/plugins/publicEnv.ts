// exposes NEXT_PUBLIC_* variables to the browser as window.__ENV, read at request time so
// one image can be configured per deployment (same contract as the old Next root layout)
export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('render:html', (html) => {
    const publicEnv = Object.fromEntries(
      Object.entries(process.env).filter(([key]) => key.startsWith('NEXT_PUBLIC_'))
    );
    html.head.push(`<script>window.__ENV = ${JSON.stringify(publicEnv).replace(/</g, '\\u003c')}</script>`);
  });
});
