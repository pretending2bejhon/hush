import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';

// D2 and D3 as lint rules: the sim is pure and deterministic, and no product folder imports the probe.
const domAndClockGlobals = [
  'window', 'document', 'navigator', 'location', 'performance', 'requestAnimationFrame',
  'cancelAnimationFrame', 'AudioContext', 'localStorage', 'sessionStorage', 'indexedDB',
  'fetch', 'setTimeout', 'setInterval', 'Date', 'crypto',
];
const engineDependentMath = [
  'sin', 'cos', 'tan', 'asin', 'acos', 'atan', 'atan2', 'sinh', 'cosh', 'tanh', 'asinh',
  'acosh', 'atanh', 'pow', 'exp', 'expm1', 'log', 'log2', 'log10', 'log1p', 'cbrt',
  'hypot', 'random',
];
const probeImports = { group: ['**/probe', '**/probe/**'], message: 'D2: product code never imports src/probe.' };

export default defineConfig(
  { ignores: ['dist/**', 'node_modules/**', 'build/**', 'test-results/**', 'playwright-report/**'] },
  {
    files: ['**/*.ts'],
    languageOptions: { parser: tseslint.parser, ecmaVersion: 2022, sourceType: 'module' },
  },
  {
    files: ['src/sim/**/*.ts'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [
          probeImports,
          {
            group: ['**/render', '**/render/**', '**/audio', '**/audio/**', '**/input', '**/input/**',
              '**/clock', '**/clock/**', '**/fx', '**/fx/**'],
            message: 'D2: src/sim imports nothing from render, audio, input, clock or fx.',
          },
          { group: ['phaser', 'phaser/**', '@strudel/*', 'superdough'], message: 'D2: src/sim imports no engine or audio library.' },
        ],
      }],
      'no-restricted-globals': ['error', ...domAndClockGlobals.map((name) => ({
        name, message: 'D2/D3: src/sim touches no DOM, timer or clock global.',
      }))],
      'no-restricted-properties': ['error', ...engineDependentMath.map((property) => ({
        object: 'Math', property, message: 'D3: the sim uses + - * /, floor, abs, min, max, sqrt and integer math only.',
      }))],
      'no-restricted-syntax': ['error',
        { selector: "BinaryExpression[operator='**']", message: 'D3: no exponentiation in the sim.' },
        { selector: "AssignmentExpression[operator='**=']", message: 'D3: no exponentiation in the sim.' },
      ],
    },
  },
  {
    files: ['src/render/**/*.ts', 'src/fx/**/*.ts'],
    rules: { 'no-restricted-imports': ['error', { patterns: [probeImports] }] },
  },
);
