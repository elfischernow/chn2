import type { ComponentType } from 'react';

import type { Block } from '@/lib/api/content/types';

import type { BlockProps } from './types';

/**
 * Map of `__component` → React component. Lookups are case-sensitive and
 * must match Strapi exactly (e.g. `currency-flow.faq`). Missing keys are
 * silent — the renderer skips unknown blocks rather than crash, so adding
 * a new admin component doesn't break the live site mid-deploy.
 */
const COIN_BLOCK_REGISTRY: Record<string, ComponentType<BlockProps>> = {};
const PAIR_BLOCK_REGISTRY: Record<string, ComponentType<BlockProps>> = {};

export function registerCoinBlock(component: string, fn: ComponentType<BlockProps>) {
  COIN_BLOCK_REGISTRY[component] = fn;
}

export function registerPairBlock(component: string, fn: ComponentType<BlockProps>) {
  PAIR_BLOCK_REGISTRY[component] = fn;
}

export function resolveBlock(
  block: Block,
  pageType: 'coin' | 'pair',
): ComponentType<BlockProps> | null {
  const reg = pageType === 'pair' ? PAIR_BLOCK_REGISTRY : COIN_BLOCK_REGISTRY;
  const direct = reg[block.__component];
  if (direct) return direct;
  // Pair pages may legitimately reuse coin-flow blocks.
  if (pageType === 'pair') {
    return COIN_BLOCK_REGISTRY[block.__component] ?? null;
  }
  return null;
}
