/*
  Warnings:

  - You are about to drop the column `trigger` on the `AutomationRule` table. All the data in the column will be lost.
  - Added the required column `triggerType` to the `AutomationRule` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "AutomationRule" DROP COLUMN "trigger",
ADD COLUMN     "conditionLogic" TEXT NOT NULL DEFAULT 'AND',
ADD COLUMN     "triggerConfig" TEXT,
ADD COLUMN     "triggerType" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "AutomationRule_triggerType_idx" ON "AutomationRule"("triggerType");
