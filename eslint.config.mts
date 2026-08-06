import obsidianmd from 'eslint-plugin-obsidianmd';
import globals from 'globals';
import { globalIgnores, defineConfig } from 'eslint/config';

export default defineConfig(
	globalIgnores([
		'node_modules',
		'dist',
		'esbuild.config.mjs',
		'version-bump.mjs',
		'versions.json',
		'main.js',
		'package.json',
		'package-lock.json',
		'tsconfig.json',
		'tests/**',
		'vitest.config.ts',
	]),
	{
		languageOptions: {
			globals: {
				...globals.browser,
			},
			parserOptions: {
				projectService: {
					allowDefaultProject: ['eslint.config.mts', 'manifest.json'],
				},
				tsconfigRootDir: import.meta.dirname,
				extraFileExtensions: ['.json'],
			},
		},
	},
	...obsidianmd.configs.recommended,
	{
		// contextbar.ts and partition.ts are unit-tested under jsdom (tests/*.test.ts), which
		// does not provide Obsidian's runtime DOM polyfills (createFragment/createSpan,
		// Node#instanceOf — see obsidian.d.ts `declare global`). Both files intentionally stay
		// free of any 'obsidian' import so they run standalone in jsdom; switching to the
		// Obsidian helpers here would break the unit tests without adding real Obsidian API
		// coverage (obsidianmd/prefer-create-el disallows inline eslint-disable comments via
		// eslint-comments/no-restricted-disable, hence this file-scoped override instead).
		files: ['src/contextbar.ts'],
		rules: {
			'obsidianmd/prefer-create-el': 'off',
		},
	},
	{
		// Same rationale as above: partition.ts is exercised directly by jsdom unit tests
		// (tests/partition.test.ts, tests/reveal.test.ts) and has no 'obsidian' import.
		files: ['src/partition.ts'],
		rules: {
			'obsidianmd/prefer-instanceof': 'off',
		},
	},
);
