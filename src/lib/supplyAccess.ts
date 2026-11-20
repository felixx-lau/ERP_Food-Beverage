import { BusinessError } from './validation';

export const supplyAreas = {
  production: ['HEAD_ADMIN', 'WAREHOUSE', 'KITCHEN'],
  purchase: ['HEAD_ADMIN', 'OWNER', 'PROCUREMENT', 'WAREHOUSE'],
} as const;

export function isSupplyArea(area: string): area is keyof typeof supplyAreas {
  return Object.hasOwn(supplyAreas, area);
}

const actions = {
  production: ['recipe', 'deactivateRecipe', 'production', 'finishProduction', 'cancelProduction'],
  purchase: ['rule', 'toggleRule', 'evaluateRules', 'approveRequest', 'rejectRequest', 'requestToPO'],
};

export function validateSupplyAction(area: keyof typeof supplyAreas, action: string, role: string) {
  if (!actions[area].includes(action)) throw new BusinessError('Tindakan tidak tersedia.', 404);
  if (role === 'OWNER' && !['approveRequest', 'rejectRequest'].includes(action)) throw new BusinessError('Akses ditolak (SR-15).', 403);
}
