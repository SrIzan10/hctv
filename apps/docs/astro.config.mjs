// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import mermaid from 'astro-mermaid';

// https://astro.build/config
export default defineConfig({
	integrations: [
    mermaid({
      theme: 'base',
      autoTheme: true
    }),
		starlight({
			title: 'hctv docs',
			social: [{ icon: 'github', label: 'GitHub', href: 'https://github.com/SrIzan10/hctv' }],
		}),
	],
});
