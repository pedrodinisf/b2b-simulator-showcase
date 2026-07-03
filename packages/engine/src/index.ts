// @b2bsim/engine — Portugal B2B tax engine (ENI vs Unipessoal Lda., 2026 rules).
// Extracted verbatim from the single-file simulator (index.html). The default
// dataset reproduces the byte-identical baseline; arithmetic is never changed
// here, only at engine call sites via injected region/municipality data.

export const ENGINE_VERSION = '0.0.0';

export * from './types.ts';
export * from './constants.ts';
export * from './municipalities.ts';
export * from './tax.ts';
export * from './dataset.ts';
export * from './defaults.ts';
export * from './format.ts';
export * from './simulate.ts';
export * from './projection.ts';
