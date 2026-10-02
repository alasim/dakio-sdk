import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'react/index': 'src/react/index.tsx',
    'next/index': 'src/next/index.ts',
    'bd/index': 'src/bd/index.ts',
    'pixel/index': 'src/pixel/index.ts',
    'webhooks/index': 'src/webhooks/index.ts',
  },
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  target: 'es2020',
  splitting: false,
  sourcemap: true,
  external: ['react'],
  esbuildOptions(options) { options.jsx = 'automatic' },
})
