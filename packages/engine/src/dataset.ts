import { T, REGIONS, type TaxConstants } from './constants.ts';
import { MUNICIPALITIES } from './municipalities.ts';
import type { Municipality, Region, RegionCode } from './types.ts';

/** A complete, versionable set of tax inputs the engine computes against. */
export interface Dataset {
  T: TaxConstants;
  REGIONS: Record<RegionCode, Region>;
  MUNICIPALITIES: Municipality[];
}

/** The bundled 2026 defaults — reproduces today's byte-identical baseline. */
export const DEFAULT_DATASET: Dataset = { T, REGIONS, MUNICIPALITIES };
