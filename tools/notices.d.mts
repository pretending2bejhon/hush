// Types for tools/notices.mjs, which vite.config.ts imports (tsc checks the config under strict).
import type { Plugin } from 'vite';

export declare const NOTICES_FILE: string;
export declare class NoticeError extends Error {}
export interface RuntimePackage {
  name: string;
  version: string;
  license: string;
  dir: string;
  author: unknown;
}
export declare function licenceOf(pkg: Record<string, unknown>): string;
export declare function holderOf(author: unknown): string | null;
export declare function normalizeText(text: string): string;
export declare function runtimePackages(root: string): RuntimePackage[];
export declare function licenceText(p: RuntimePackage): string | null;
export declare function packageDirOf(id: string): string | null;
export declare function bundleProblems(moduleIds: string[], packages: RuntimePackage[]): string[];
export declare function noticesText(root: string, packages?: RuntimePackage[]): string;
export declare function thirdPartyNotices(): Plugin;
