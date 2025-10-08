import resolve from '@rollup/plugin-node-resolve'
import commonjs from '@rollup/plugin-commonjs'
import typescript from '@rollup/plugin-typescript'
import peerDepsExternal from 'rollup-plugin-peer-deps-external'
import postcss from 'rollup-plugin-postcss'

export default {
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
    peerDepsExternal(),
    resolve({
      browser: true,
      preferBuiltins: false
    }),
    commonjs(),
    typescript({
      tsconfig: './tsconfig.json',
      exclude: ['**/*.test.*', '**/*.stories.*', 'examples/**/*']
    }),
    postcss({
      extract: true,
      minimize: true
    })
  ],
  external: (id) => {
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
}