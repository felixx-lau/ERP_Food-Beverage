-- Additive migration: no existing table or business row is deleted/replaced.
-- CreateTable
CREATE TABLE "Category" (
    "code" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "archivedAt" DATETIME,
    "version" INTEGER NOT NULL DEFAULT 0
);

-- CreateTable
CREATE TABLE "UnitOfMeasure" (
    "code" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "archivedAt" DATETIME,
    "version" INTEGER NOT NULL DEFAULT 0
);

-- CreateTable
CREATE TABLE "VendorPrice" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "vendorId" TEXT NOT NULL,
    "productSku" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'IDR',
    "minimumQty" INTEGER NOT NULL DEFAULT 1,
    "price" REAL NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 0,
    "archivedAt" DATETIME,
    CONSTRAINT "VendorPrice_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Contact" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "VendorPrice_productSku_fkey" FOREIGN KEY ("productSku") REFERENCES "ProductVariant" ("sku") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StockReservation" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "salesOrderLineId" TEXT NOT NULL,
    "locationCode" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    CONSTRAINT "StockReservation_salesOrderLineId_fkey" FOREIGN KEY ("salesOrderLineId") REFERENCES "SalesOrderLine" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "DocumentSequence" (
    "type" TEXT NOT NULL PRIMARY KEY,
    "value" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "RequestIdentity" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fingerprint" TEXT NOT NULL,
    "result" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "PosRefund" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "refundNumber" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "cost" REAL NOT NULL,
    "reason" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PosRefund_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "PosOrder" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);


ALTER TABLE "User" ADD COLUMN "active" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "User" ADD COLUMN "sessionVersion" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Contact" ADD COLUMN "email" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Contact" ADD COLUMN "phone" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Contact" ADD COLUMN "address" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Contact" ADD COLUMN "archivedAt" DATETIME;
ALTER TABLE "Contact" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "ProductVariant" ADD COLUMN "description" TEXT NOT NULL DEFAULT '';
ALTER TABLE "ProductVariant" ADD COLUMN "categoryCode" TEXT REFERENCES "Category"("code") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ProductVariant" ADD COLUMN "archivedAt" DATETIME;
ALTER TABLE "ProductVariant" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "WarehouseLocation" ADD COLUMN "archivedAt" DATETIME;
ALTER TABLE "WarehouseLocation" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Account" ADD COLUMN "archivedAt" DATETIME;
ALTER TABLE "Account" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "CrmLead" ADD COLUMN "archivedAt" DATETIME;
ALTER TABLE "CrmLead" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "SalesOrder" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "PurchaseOrder" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "CustomerInvoice" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "VendorBill" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "StockMove" ADD COLUMN "actorId" TEXT;
ALTER TABLE "StockMove" ADD COLUMN "reason" TEXT;
ALTER TABLE "StockMove" ADD COLUMN "journalEntryId" TEXT;
ALTER TABLE "JournalEntry" ADD COLUMN "reversalOfId" TEXT;
ALTER TABLE "Payment" ADD COLUMN "reversalJournalId" TEXT;
ALTER TABLE "Payment" ADD COLUMN "reversedAt" DATETIME;
-- CreateIndex
CREATE UNIQUE INDEX "VendorPrice_vendorId_productSku_minimumQty_key" ON "VendorPrice"("vendorId", "productSku", "minimumQty");

-- CreateIndex
CREATE UNIQUE INDEX "StockReservation_salesOrderLineId_locationCode_key" ON "StockReservation"("salesOrderLineId", "locationCode");

-- CreateIndex
CREATE UNIQUE INDEX "PosRefund_refundNumber_key" ON "PosRefund"("refundNumber");

-- CreateIndex
CREATE UNIQUE INDEX "PosRefund_orderId_key" ON "PosRefund"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "JournalEntry_reversalOfId_key" ON "JournalEntry"("reversalOfId");


CREATE TABLE "SchemaMigration" ("name" TEXT NOT NULL PRIMARY KEY, "checksum" TEXT NOT NULL, "appliedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE INDEX "StockMove_documentRef_idx" ON "StockMove"("documentRef");
CREATE INDEX "SalesOrder_contactId_idx" ON "SalesOrder"("contactId");
CREATE INDEX "PurchaseOrder_vendorId_idx" ON "PurchaseOrder"("vendorId");
CREATE INDEX "CustomerInvoice_customerId_idx" ON "CustomerInvoice"("customerId");
CREATE INDEX "VendorBill_vendorId_idx" ON "VendorBill"("vendorId");
INSERT INTO "UnitOfMeasure" ("code", "name") SELECT DISTINCT "unit", "unit" FROM "ProductVariant";
INSERT INTO "StockReservation" ("id", "salesOrderLineId", "locationCode", "quantity") SELECT 'migration-' || l.id, l.id, 'WH-JKT', l.quantity - l.deliveredQty FROM "SalesOrderLine" l JOIN "SalesOrder" o ON o.id = l.salesOrderId WHERE o.status = 'CONFIRMED' AND l.quantity > l.deliveredQty;
