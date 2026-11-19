-- CreateTable
CREATE TABLE "Recipe" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productSku" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "outputQty" INTEGER NOT NULL DEFAULT 1,
    "mode" TEXT NOT NULL DEFAULT 'PRODUCTION',
    "version" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "lines" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ProductionOrder" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "number" TEXT NOT NULL,
    "recipeId" TEXT NOT NULL,
    "recipeVersion" INTEGER NOT NULL,
    "productSku" TEXT NOT NULL,
    "locationCode" TEXT NOT NULL,
    "plannedQty" INTEGER NOT NULL,
    "actualQty" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "recipeSnapshot" TEXT NOT NULL,
    "actualInputs" TEXT NOT NULL DEFAULT '[]',
    "varianceValue" REAL NOT NULL DEFAULT 0,
    "totalCost" REAL NOT NULL DEFAULT 0,
    "journalId" TEXT,
    "lotCode" TEXT,
    "expiresAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "StockLot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productSku" TEXT NOT NULL,
    "locationCode" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "onHand" INTEGER NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "receivedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sourceRef" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "LotMovement" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "lotId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "reference" TEXT NOT NULL,
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "WasteRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "number" TEXT NOT NULL,
    "productSku" TEXT NOT NULL,
    "locationCode" TEXT NOT NULL,
    "lotId" TEXT,
    "quantity" INTEGER NOT NULL,
    "cost" REAL NOT NULL,
    "reason" TEXT NOT NULL,
    "journalId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "PurchaseRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "number" TEXT NOT NULL,
    "productSku" TEXT NOT NULL,
    "locationCode" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "reason" TEXT NOT NULL,
    "requestedBy" TEXT NOT NULL,
    "approvedBy" TEXT,
    "purchaseOrderId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "ReorderRule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productSku" TEXT NOT NULL,
    "locationCode" TEXT NOT NULL,
    "minimum" INTEGER NOT NULL,
    "target" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true
);

-- CreateTable
CREATE TABLE "OutletAccess" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "locationCode" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "OrderingTable" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "locationCode" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "KitchenTicket" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "number" TEXT NOT NULL,
    "tableId" TEXT,
    "tableName" TEXT NOT NULL,
    "locationCode" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "lines" TEXT NOT NULL,
    "notes" TEXT NOT NULL DEFAULT '',
    "posOrderId" TEXT,
    "requestKey" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ProductVariant" (
    "trackLots" BOOLEAN NOT NULL DEFAULT false,
    "description" TEXT NOT NULL DEFAULT '',
    "categoryCode" TEXT,
    "archivedAt" DATETIME,
    "version" INTEGER NOT NULL DEFAULT 0,
    "sku" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "size" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "salesPrice" REAL NOT NULL,
    "standardCost" REAL NOT NULL,
    "defaultVendorId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ProductVariant_categoryCode_fkey" FOREIGN KEY ("categoryCode") REFERENCES "Category" ("code") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ProductVariant_defaultVendorId_fkey" FOREIGN KEY ("defaultVendorId") REFERENCES "Contact" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_ProductVariant" ("archivedAt", "categoryCode", "color", "createdAt", "defaultVendorId", "description", "name", "salesPrice", "size", "sku", "standardCost", "unit", "updatedAt", "version") SELECT "archivedAt", "categoryCode", "color", "createdAt", "defaultVendorId", "description", "name", "salesPrice", "size", "sku", "standardCost", "unit", "updatedAt", "version" FROM "ProductVariant";
DROP TABLE "ProductVariant";
ALTER TABLE "new_ProductVariant" RENAME TO "ProductVariant";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "Recipe_productSku_key" ON "Recipe"("productSku");

-- CreateIndex
CREATE UNIQUE INDEX "ProductionOrder_number_key" ON "ProductionOrder"("number");

-- CreateIndex
CREATE INDEX "StockLot_productSku_locationCode_expiresAt_idx" ON "StockLot"("productSku", "locationCode", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "StockLot_productSku_locationCode_code_key" ON "StockLot"("productSku", "locationCode", "code");

-- CreateIndex
CREATE UNIQUE INDEX "WasteRecord_number_key" ON "WasteRecord"("number");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseRequest_number_key" ON "PurchaseRequest"("number");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseRequest_purchaseOrderId_key" ON "PurchaseRequest"("purchaseOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "ReorderRule_productSku_locationCode_key" ON "ReorderRule"("productSku", "locationCode");

-- CreateIndex
CREATE UNIQUE INDEX "OutletAccess_userId_locationCode_key" ON "OutletAccess"("userId", "locationCode");

-- CreateIndex
CREATE UNIQUE INDEX "OrderingTable_token_key" ON "OrderingTable"("token");

-- CreateIndex
CREATE UNIQUE INDEX "KitchenTicket_number_key" ON "KitchenTicket"("number");

-- CreateIndex
CREATE UNIQUE INDEX "KitchenTicket_posOrderId_key" ON "KitchenTicket"("posOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "KitchenTicket_requestKey_key" ON "KitchenTicket"("requestKey");

