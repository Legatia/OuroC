import resolve from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import typescript from '@rollup/plugin-typescript'
import json from '@rollup/plugin-json'
import peerDepsExternal from 'rollup-plugin-peer-deps-external'
import postcss from 'rollup-plugin-postcss'

const sharedPlugins = [
  peerDepsExternal(),
  json(),
  resolve({
    browser: true,
    preferBuiltins: false
  }),
  commonjs(),
  postcss({
    extract: true,
    minimize: true
  })
]

const externalDeps = (id) => {
  // Externalize all peer dependencies and common imports
  return id.startsWith('react') ||
         id.startsWith('@solana') ||
         id.startsWith('@dfinity') ||
         id.startsWith('@coral-xyz') ||
         id.startsWith('@sqds') ||
         id === 'axios' ||
         id === 'bs58' ||
         id === 'bn.js'
}

export default [
  // Standard SDK build
  {
    input: 'src/index.ts',
    output: [
      {
        file: 'dist/index.js',
        format: 'cjs',
        sourcemap: true
      },
      {
        file: 'dist/index.esm.js',
        format: 'esm',
        sourcemap: true
      }
    ],
    plugins: [
      ...sharedPlugins,
      typescript({
        tsconfig: './tsconfig.json',
        exclude: ['**/*.test.*', '**/*.stories.*', 'examples/**/*', 'src/agents/**/*', 'src/grid/**/*'],
        declaration: true,
        declarationDir: 'dist',
        rootDir: 'src'
      })
    ],
    external: externalDeps
  },
  // Enterprise SDK build
  {
    input: 'src/enterprise.ts',
    output: [
      {
        file: 'dist/enterprise.js',
        format: 'cjs',
        sourcemap: true
      },
      {
        file: 'dist/enterprise.esm.js',
        format: 'esm',
        sourcemap: true
      }
    ],
    plugins: [
      ...sharedPlugins,
      typescript({
        tsconfig: './tsconfig.json',
        exclude: ['**/*.test.*', '**/*.stories.*', 'examples/**/*', 'src/agents/**/*', 'src/grid/**/*'],
        declaration: true,
        declarationDir: 'dist',
        rootDir: 'src'
      })
    ],
    external: externalDeps
  }
]