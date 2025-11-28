/** @type {import('knip').Config} */
module.exports = {
  entry: [
    'src/app/**/*.{ts,tsx}',
    'src/components/**/*.{ts,tsx}',
    'src/contexts/**/*.{ts,tsx}',
    'src/hooks/**/*.{ts,tsx}',
    'src/lib/**/*.{ts,tsx}',
    'next.config.mjs',
    'tailwind.config.ts',
  ],
  project: ['src/**/*.{ts,tsx}'],
  ignore: [
    'src/app/**/page.tsx', // Next.js pages
    'src/app/**/layout.tsx', // Next.js layouts
    '**/*.test.{ts,tsx}',
    '**/*.spec.{ts,tsx}',
  ],
  ignoreDependencies: [
    'next',
    'react',
    'react-dom',
    '@types/node',
    '@types/react',
    '@types/react-dom',
    'autoprefixer',
    'postcss',
    'tailwindcss',
    'typescript',
    'eslint',
    'eslint-config-next',
  ],
};

