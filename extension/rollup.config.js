import typescript from 'rollup-plugin-typescript2';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import terser from '@rollup/plugin-terser';

export default [
  {
    input: 'src/content.ts',
    output: {
      file: 'public/content.js',
      format: 'iife',
      sourcemap: process.env.NODE_ENV !== 'production',
    },
    plugins: [
      typescript({
        tsconfig: 'tsconfig.json',
      }),
      nodeResolve(),
      commonjs(),
      process.env.NODE_ENV === 'production' && terser(),
    ],
  },
  {
    input: 'src/background.ts',
    output: {
      file: 'public/background.js',
      format: 'iife',
      sourcemap: process.env.NODE_ENV !== 'production',
    },
    plugins: [
      typescript({
        tsconfig: 'tsconfig.json',
      }),
      nodeResolve(),
      commonjs(),
      process.env.NODE_ENV === 'production' && terser(),
    ],
  },
  // Optional: Add popup.ts or other files if needed
];
