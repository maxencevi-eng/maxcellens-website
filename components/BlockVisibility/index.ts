export { BlockVisibilityProvider, useBlockVisibility } from './BlockVisibilityContext';
export type { BlockOrderPage, BlockWidthMode } from './blockOrders';
export {
  BLOCK_ORDER_PAGES,
  DEFAULT_BLOCK_ORDERS,
  mergeBlockOrder,
  parseBlockOrder,
  orderSettingKey,
} from './blockOrders';

/**
 * Contrôles hérités, rendus individuellement à côté des blocs.
 * Remplacés par `AdminToolbar` (components/admin) — conservés le temps que
 * toutes les pages soient migrées.
 */
export { default as BlockVisibilityToggle } from './BlockVisibilityToggle';
export { default as BlockWidthToggle } from './BlockWidthToggle';
export { default as BlockOrderButtons } from './BlockOrderButtons';
