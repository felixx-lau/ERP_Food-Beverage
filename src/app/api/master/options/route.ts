import { NextRequest } from 'next/server';
import { withUser } from '@/lib/apiResult';
import { prisma } from '@/lib/prisma';
export async function GET(request:NextRequest) {
  return withUser(request,async user=>{
    if (user.role==='CASHIER') return {products:await prisma.productVariant.findMany({where:{archivedAt:null},select:{sku:true,name:true,salesPrice:true}})};
    const [customers,vendors,products,categories,units,locations]=await Promise.all([
      prisma.contact.findMany({where:{type:'CUSTOMER',archivedAt:null},select:{id:true,name:true}}),
      prisma.contact.findMany({where:{type:'VENDOR',archivedAt:null},select:{id:true,name:true}}),
      prisma.productVariant.findMany({where:{archivedAt:null},select:{sku:true,name:true,salesPrice:true,standardCost:true}}),
      prisma.category.findMany({where:{archivedAt:null}}),prisma.unitOfMeasure.findMany({where:{archivedAt:null}}),prisma.warehouseLocation.findMany({where:{archivedAt:null}}),
    ]);
    const vendorPrices=["OWNER","PROCUREMENT"].includes(user.role)?await prisma.vendorPrice.findMany({where:{archivedAt:null},orderBy:{minimumQty:"desc"}}):[];
    return {customers,vendors,products,categories,units,locations,vendorPrices};
  });
}
