import typescript from '@rollup/plugin-typescript'
import { createRequire } from 'module'

const require = createRequire(import.meta.url)
const pkg = require('./package.json')

export default [
  // CommonJS build
  {
    input: 'src/index.ts',
    output: {
      file: pkg.main,
      format: 'cjs',
      sourcemap: true
    },
    plugins: [typescript()],
    external: ['@ouroc/sdk', 'express']
  },
  // ES Module build
  {
    input: 'src/index.ts',
    output: {
      file: pkg.module,
      format: 'es',
      sourcemap: true
    },
    plugins: [typescript()],
    external: ['@ouroc/sdk', 'express']
  },
  // Express middleware build
  {
    input: 'src/express.ts',
    output: {
      file: 'dist/express.js',
      format: 'cjs',
      sourcemap: true
    },
    plugins: [typescript()],
    external: ['@ouroc/sdk', 'express']
  },
  {
    input: 'src/express.ts',
    output: {
      file: 'dist/express.esm.js',
      format: 'es',
      sourcemap: true
    },
    plugins: [typescript()],
    external: ['@ouroc/sdk', 'express']
  },
  // Next.js middleware build
  {
    input: 'src/nextjs.ts',
    output: {
      file: 'dist/nextjs.js',
      format: 'cjs',
      sourcemap: true
    },
    plugins: [typescript()],
    external: ['@ouroc/sdk', 'next/server']
  },
  {
    input: 'src/nextjs.ts',
    output: {
      file: 'dist/nextjs.esm.js',
      format: 'es',
      sourcemap: true
    },
    plugins: [typescript()],
    external: ['@ouroc/sdk', 'next/server']
  }
]