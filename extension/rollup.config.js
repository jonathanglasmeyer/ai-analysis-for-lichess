import typescript from 'rollup-plugin-typescript2';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import terser from '@rollup/plugin-terser';
import replace from '@rollup/plugin-replace';

export default [
  {
    input: 'src/content.ts',
    output: {
      file: 'public/content.js',
      format: 'iife',
      sourcemap: process.env.NODE_ENV !== 'production',
    },
    plugins: [
      replace({
        preventAssignment: true,
        values: {
          'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
          'process.env.PROD_CHESS_GPT_API_KEY': JSON.stringify(process.env.PROD_CHESS_GPT_API_KEY || '')
        }
      }),
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
      replace({
        preventAssignment: true,
        values: {
          'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
          'process.env.PROD_CHESS_GPT_API_KEY': JSON.stringify(process.env.PROD_CHESS_GPT_API_KEY || '')
        }
      }),
      typescript({
        tsconfig: 'tsconfig.json',
      }),
      nodeResolve(),
      commonjs(),
      process.env.NODE_ENV === 'production' && terser(),
    ],
  },
  // Optional: Add popup.ts or other files if needed
  {
    input: 'src/popup/index.ts',
    output: {
      file: 'public/popup.js',
      format: 'iife',
      sourcemap: process.env.NODE_ENV !== 'production',
    },
    plugins: [
      replace({
        preventAssignment: true,
        values: {
          'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
          'process.env.PROD_CHESS_GPT_API_KEY': JSON.stringify(process.env.PROD_CHESS_GPT_API_KEY || '')
        }
      }),
      typescript({
        tsconfig: 'tsconfig.json',
      }),
      nodeResolve(),
      commonjs(),
      process.env.NODE_ENV === 'production' && terser(),
    ],
  },
];
