// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import mermaid from 'astro-mermaid';
import catppuccin from '@catppuccin/starlight';
import starlightTypeDoc, { typeDocSidebarGroup } from 'starlight-typedoc';

// https://astro.build/config
export default defineConfig({
  integrations: [
    mermaid({
      theme: 'base',
      autoTheme: true,
    }),
    starlight({
      title: 'hctv docs',
      social: [{ icon: 'github', label: 'GitHub', href: 'https://github.com/SrIzan10/hctv' }],
      plugins: [
        catppuccin({
          dark: { flavor: 'mocha', accent: 'blue' },
          light: { flavor: 'latte', accent: 'blue' },
        }),
        starlightTypeDoc({
          entryPoints: ['../../packages/sdk/src/index.ts'],
          tsconfig: '../../packages/sdk/tsconfig.json',
          output: 'typedoc-sdk',
          sidebar: {
            label: 'SDK Reference',
          },
        }),
      ],
      sidebar: [
        {
          label: 'API',
          autogenerate: { directory: 'api' },
        },
        {
          label: 'Guides',
          autogenerate: { directory: 'guides' },
        },
        typeDocSidebarGroup,
      ],
    }),
  ],
});
