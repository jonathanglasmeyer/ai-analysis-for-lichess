import typescript from 'rollup-plugin-typescript2';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import terser from '@rollup/plugin-terser';
import replace from '@rollup/plugin-replace';
import json from '@rollup/plugin-json';



export default [
  {
    input: 'src/content.ts',
    output: {
      file: 'public/content.js',
      format: 'iife',
      sourcemap: process.env.NODE_ENV !== 'production',
    },
    moduleContext: (id) => {
      // Suppress "this is undefined" warnings for Supabase and related modules
      if (id.includes('node_modules/@supabase/supabase-js/') || id.includes('node_modules/@supabase/functions-js/') || id.includes('node_modules/@supabase/auth-js/') || id.includes('node_modules/@supabase/storage-js/') || id.includes('node_modules/tr46/') || id.includes('node_modules/whatwg-url/')) {
        return 'window';
      }
    },
    plugins: [
      replace({
        preventAssignment: true,
        values: {
          'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
          'process.env.PROD_CHESS_GPT_API_KEY': JSON.stringify(process.env.PROD_CHESS_GPT_API_KEY || ''),
          'process.env.SUPABASE_URL': JSON.stringify(process.env.SUPABASE_URL || ''),
          'process.env.SUPABASE_ANON_KEY': JSON.stringify(process.env.SUPABASE_ANON_KEY || '')
        }
      }),
      typescript({
        tsconfig: 'tsconfig.json',
      }),
      json(),
      nodeResolve({ preferBuiltins: false, browser: true }),
      commonjs({
        transformMixedEsModules: true,
      }),
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
    moduleContext: (id) => {
      // For Service Worker context (background script), use 'self' instead of 'window'
      if (id.includes('node_modules/@supabase/supabase-js/') || id.includes('node_modules/@supabase/functions-js/') || id.includes('node_modules/@supabase/auth-js/') || id.includes('node_modules/@supabase/storage-js/') || id.includes('node_modules/tr46/') || id.includes('node_modules/whatwg-url/')) {
        return 'self';
      }
    },
    plugins: [
      replace({
        preventAssignment: true,
        values: {
          'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
          'process.env.PROD_CHESS_GPT_API_KEY': JSON.stringify(process.env.PROD_CHESS_GPT_API_KEY || ''),
          'process.env.SUPABASE_URL': JSON.stringify(process.env.SUPABASE_URL || ''),
          'process.env.SUPABASE_ANON_KEY': JSON.stringify(process.env.SUPABASE_ANON_KEY || '')
        }
      }),
      typescript({
        tsconfig: 'tsconfig.json',
      }),
      json(),
      nodeResolve({ preferBuiltins: false, browser: true }),
      commonjs({
        transformMixedEsModules: true,
      }),
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
    moduleContext: (id) => {
      // Suppress "this is undefined" warnings for Supabase and related modules
      if (id.includes('node_modules/@supabase/supabase-js/') || id.includes('node_modules/@supabase/functions-js/') || id.includes('node_modules/@supabase/auth-js/') || id.includes('node_modules/@supabase/storage-js/') || id.includes('node_modules/tr46/') || id.includes('node_modules/whatwg-url/')) {
        return 'window';
      }
    },
    plugins: [
      replace({
        preventAssignment: true,
        values: {
          'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
          'process.env.PROD_CHESS_GPT_API_KEY': JSON.stringify(process.env.PROD_CHESS_GPT_API_KEY || ''),
          'process.env.SUPABASE_URL': JSON.stringify(process.env.SUPABASE_URL || ''),
          'process.env.SUPABASE_ANON_KEY': JSON.stringify(process.env.SUPABASE_ANON_KEY || '')
        }
      }),
      typescript({
        tsconfig: 'tsconfig.json',
      }),
      json(),
      nodeResolve({ preferBuiltins: false, browser: true }),
      commonjs({
        transformMixedEsModules: true,
      }),
      process.env.NODE_ENV === 'production' && terser(),
    ],
  },
];
