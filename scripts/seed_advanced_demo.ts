/** Optional sample recipes outside the PDF, only in a disposable preview. Never resets data. */
import assert from 'node:assert/strict';
import { realpathSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { prisma } from '../src/lib/prisma';
import { advancedMutation } from '../src/lib/advancedOperations';
import { adjustStock } from '../src/lib/inventoryEngine';
import { kitchenAction } from '../src/lib/kitchen';
import { businessDate } from '../src/lib/businessDate';
async function main(){
 const cwd=realpathSync(process.cwd());assert(cwd.startsWith(realpathSync(os.tmpdir())+path.sep)&&path.basename(cwd).startsWith('aruna-dashboard-demo-'));assert(realpathSync((process.env.DATABASE_URL||'').replace(/^file:/,'')).startsWith(cwd+path.sep));
 const owner:any=await prisma.user.findFirstOrThrow({where:{role:'HEAD_ADMIN'}});
 const samples=[{sku:'DEMO-MILK-ML',name:'Contoh tambahan · Susu (ml)',unit:'ml',standardCost:30},{sku:'DEMO-COFFEE-G',name:'Contoh tambahan · Kopi (gram)',unit:'gram',standardCost:200},{sku:'DEMO-SAUCE',name:'Contoh tambahan · Saus siap pakai',unit:'unit',standardCost:600}];
 for(const s of samples){if(!await prisma.productVariant.findUnique({where:{sku:s.sku}})){await prisma.productVariant.create({data:{...s,size:'Dasar',color:'Original',salesPrice:0}});await adjustStock({sku:s.sku,locationCode:'CAFE-JKT',newOnHand:10000,reason:'Stok contoh perluasan di luar PDF',actor:owner});}}
 for(const sku of ['DEMO-MILK-ML','DEMO-COFFEE-G'])if(!await prisma.stockLot.findFirst({where:{productSku:sku}}))await advancedMutation('lot',{productSku:sku,locationCode:'CAFE-JKT',code:`SAMPLE-${sku}`,quantity:10000,expiresAt:businessDate(new Date(Date.now()+7*86400000)),sourceRef:'CONTOH TAMBAHAN, BUKAN DATA PDF'},owner);
 if(!await prisma.recipe.findUnique({where:{productSku:'DEMO-SAUCE'}}))await advancedMutation('recipe',{productSku:'DEMO-SAUCE',name:'Contoh tambahan · Resep saus',outputQty:10,mode:'PRODUCTION',lines:[{productSku:'DEMO-MILK-ML',quantity:100},{productSku:'DEMO-COFFEE-G',quantity:10}]},owner);
 // Keep PDF ready-made Latte untouched. The backflush sample uses its own new menu SKU.
 if(!await prisma.productVariant.findUnique({where:{sku:'DEMO-LATTE-RECIPE'}}))await prisma.productVariant.create({data:{sku:'DEMO-LATTE-RECIPE',name:'Contoh tambahan · Latte resep',size:'Regular',color:'Hot',unit:'cup',salesPrice:30000,standardCost:8100}});
 if(!await prisma.recipe.findUnique({where:{productSku:'DEMO-LATTE-RECIPE'}}))await advancedMutation('recipe',{productSku:'DEMO-LATTE-RECIPE',name:'Contoh tambahan · Latte backflush',outputQty:1,mode:'BACKFLUSH',lines:[{productSku:'DEMO-MILK-ML',quantity:150},{productSku:'DEMO-COFFEE-G',quantity:18}]},owner);
 if(!await prisma.orderingTable.findFirst({where:{name:'Meja Contoh 01'}}))await kitchenAction('table',{name:'Meja Contoh 01',locationCode:'CAFE-JKT'},owner);
 console.log('[PASS] Optional example recipes, batches and QR table prepared. PDF 15 SKU unchanged.');
}
main().finally(()=>prisma.$disconnect()).catch(e=>{console.error(e);process.exitCode=1;});
