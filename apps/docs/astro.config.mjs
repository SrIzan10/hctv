// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import mermaid from 'astro-mermaid';
import catppuccin from "@catppuccin/starlight";

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
      plugins: [
        catppuccin({
          dark: { flavor: "mocha", accent: "blue" },
          light: { flavor: "latte", accent: "blue" }
        }),
      ]
		}),
	],
});
