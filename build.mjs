import { build, context } from 'esbuild';

const isWatch = process.argv.includes('--watch');

const buildOptions = {
  entryPoints: ['src/main.ts'],
  bundle: true,
  outfile: './code.js',
  // ES2017 to avoid optional chaining (?.) which Figma's QuickJS doesn't support
  target: 'es2017',
  format: 'iife',
  // No minification for readability during debugging
  minify: false,
  // Source maps off - Figma plugin console doesn't use them
  sourcemap: false,
  // Log build info
  logLevel: 'info',
};

if (isWatch) {
  const ctx = await context(buildOptions);
  await ctx.watch();
  console.log('\uD83D\uDC40 Watching for changes...');
} else {
  await build(buildOptions);
  console.log('\u2705 Built \u2192 code.js');
}
