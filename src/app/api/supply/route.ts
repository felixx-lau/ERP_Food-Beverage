import { NextRequest } from 'next/server';
import { withUser } from '@/lib/apiResult';
import { prisma } from '@/lib/prisma';
import { idempotent } from '@/lib/atomic';
import { BusinessError, permit } from '@/lib/validation';
import { isSupplyArea, supplyAreas, validateSupplyAction } from '@/lib/supplyAccess';
import { ruleAvailability } from '@/lib/reorderRules';
import { advancedMutation } from '@/lib/advancedOperations';

function areaOf(request: NextRequest) {
  const area = request.nextUrl.searchParams.get('area') ?? '';
  if (!isSupplyArea(area)) throw new BusinessError('Modul tidak ditemukan.', 404);
  return area;
}

export async function GET(request: NextRequest) {
  return withUser(request, async user => {
    const area = areaOf(request);
    permit(user, [...supplyAreas[area]]);
    const [products, locations, recipes] = await Promise.all([
      prisma.productVariant.findMany({
        select: { sku: true, name: true, unit: true, kind: true, salesPrice: true, standardCost: true, trackLots: true, defaultVendorId: true, archivedAt: true },
        orderBy: { name: 'asc' },
      }),
      prisma.warehouseLocation.findMany({ where: { archivedAt: null }, select: { code: true, name: true }, orderBy: { name: 'asc' } }),
      prisma.recipe.findMany({ orderBy: [{ active: 'desc' }, { name: 'asc' }] }),
    ]);
    const common = { user: { role: user.role, name: user.name }, products, locations };
    if (area === 'production') {
      const orders = await prisma.productionOrder.findMany({ orderBy: { createdAt: 'desc' } });
      return {
        ...common,
        recipes: recipes.map(recipe => ({ ...recipe, lines: JSON.parse(recipe.lines) })),
        orders: orders.map(order => ({ ...order, recipeSnapshot: JSON.parse(order.recipeSnapshot) })),
      };
    }

    const canOrder = ['HEAD_ADMIN', 'PROCUREMENT'].includes(user.role);
    const [rules, requests, vendors, vendorPrices] = await Promise.all([
      prisma.reorderRule.findMany({ orderBy: [{ active: 'desc' }, { productSku: 'asc' }, { locationCode: 'asc' }] }),
      prisma.purchaseRequest.findMany({ orderBy: { createdAt: 'desc' } }),
      canOrder ? prisma.contact.findMany({ where: { type: 'VENDOR', archivedAt: null }, select: { id: true, name: true }, orderBy: { name: 'asc' } }) : [],
      canOrder ? prisma.vendorPrice.findMany({
        where: { archivedAt: null, vendor: { archivedAt: null, type: 'VENDOR' } },
        orderBy: { minimumQty: 'desc' },
        select: { vendorId: true, productSku: true, minimumQty: true, price: true },
      }) : [],
    ]);
    const orderIds = requests.flatMap(row => row.purchaseOrderId ? [row.purchaseOrderId] : []);
    const orders = await prisma.purchaseOrder.findMany({
      where: { id: { in: orderIds } }, select: { id: true, poNumber: true, status: true, sentAt: true },
    });
    const ordersById = new Map(orders.map(order => [order.id, order]));
    const productsBySku = new Map(products.map(product => [product.sku, product]));
    return {
      ...common,
      backflushSkus: recipes.filter(recipe => recipe.active && recipe.mode === 'BACKFLUSH').map(recipe => recipe.productSku),
      rules: await Promise.all(rules.map(async rule => ({
        ...rule,
        available: await ruleAvailability(prisma, rule.productSku, rule.locationCode, productsBySku.get(rule.productSku)?.trackLots ?? false),
      }))),
      requests: requests.map(row => ({ ...row, purchaseOrder: row.purchaseOrderId ? ordersById.get(row.purchaseOrderId) : null })),
      vendors,
      vendorPrices,
    };
  });
}

export async function POST(request: NextRequest) {
  return withUser(request, async user => {
    const area = areaOf(request);
    permit(user, [...supplyAreas[area]]);
    const body = await request.json();
    if (!body || typeof body.action !== 'string') throw new BusinessError('Tindakan tidak valid.');
    validateSupplyAction(area, body.action, user.role);
    const result = await idempotent(user, `SUPPLY_${body.action}`, request.headers.get('idempotency-key') || undefined,
      body, () => advancedMutation(body.action, body, user));
    return { success: true, result };
  });
}
