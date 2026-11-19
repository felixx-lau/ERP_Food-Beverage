import { prisma } from './prisma';
import { BusinessError, type Actor } from './validation';
export async function permittedOutlets(actor: Actor) {
 const active=await prisma.warehouseLocation.findMany({where:{archivedAt:null},select:{code:true,name:true}});
 if(actor.role==='HEAD_ADMIN')return active;
 if(actor.role!=='CASHIER')return [];
 const assignments=await prisma.outletAccess.findMany({where:{userId:actor.id}});
 const codes=assignments.length?assignments.map(a=>a.locationCode):['CAFE-JKT'];
 return active.filter(l=>codes.includes(l.code));
}
export async function requireOutlet(actor: Actor, location: string) {
 if(!(await permittedOutlets(actor)).some(l=>l.code===location))throw new BusinessError('Kasir tidak ditugaskan ke outlet ini.',403);
}
