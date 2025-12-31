import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['./src/**/*.ts'],
  splitting: false,
  sourcemap: true,
  format: ['cjs', 'esm'],
  dts: true,
  clean: true,
})