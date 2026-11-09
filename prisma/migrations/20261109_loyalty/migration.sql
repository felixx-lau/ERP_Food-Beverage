CREATE TABLE "LoyaltyAccount" ("id" TEXT NOT NULL PRIMARY KEY, "contactId" TEXT NOT NULL, "points" INTEGER NOT NULL DEFAULT 0, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE UNIQUE INDEX "LoyaltyAccount_contactId_key" ON "LoyaltyAccount"("contactId");
CREATE TABLE "PromotionCoupon" ("id" TEXT NOT NULL PRIMARY KEY, "code" TEXT NOT NULL, "discountAmount" INTEGER NOT NULL, "usedOrderId" TEXT, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE UNIQUE INDEX "PromotionCoupon_code_key" ON "PromotionCoupon"("code");
CREATE UNIQUE INDEX "PromotionCoupon_usedOrderId_key" ON "PromotionCoupon"("usedOrderId");
CREATE TABLE "PosPromotion" ("id" TEXT NOT NULL PRIMARY KEY, "orderId" TEXT NOT NULL, "loyaltyAccountId" TEXT, "couponId" TEXT, "discountAmount" INTEGER NOT NULL DEFAULT 0, "pointsEarned" INTEGER NOT NULL DEFAULT 0);
CREATE UNIQUE INDEX "PosPromotion_orderId_key" ON "PosPromotion"("orderId");
