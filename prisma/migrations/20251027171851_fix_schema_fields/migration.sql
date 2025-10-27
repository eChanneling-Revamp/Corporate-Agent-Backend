/*
  Warnings:

  - You are about to drop the column `failedBookings` on the `bulk_bookings` table. All the data in the column will be lost.
  - You are about to drop the column `successfulBookings` on the `bulk_bookings` table. All the data in the column will be lost.
  - You are about to drop the column `totalSlots` on the `bulk_bookings` table. All the data in the column will be lost.
  - You are about to drop the column `medicalInfo` on the `customers` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `doctors` table. All the data in the column will be lost.
  - You are about to drop the column `doctorId` on the `patient_histories` table. All the data in the column will be lost.
  - You are about to drop the column `hospitalId` on the `patient_histories` table. All the data in the column will be lost.
  - You are about to drop the column `prescription` on the `patient_histories` table. All the data in the column will be lost.
  - You are about to drop the column `treatment` on the `patient_histories` table. All the data in the column will be lost.
  - You are about to drop the column `assignedAgentId` on the `workflow_steps` table. All the data in the column will be lost.
  - You are about to drop the column `stepNumber` on the `workflow_steps` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[workflowId,stepOrder]` on the table `workflow_steps` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `consultationFee` to the `bulk_booking_items` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sequenceNumber` to the `bulk_booking_items` table without a default value. This is not possible if the table is not empty.
  - Added the required column `batchName` to the `bulk_bookings` table without a default value. This is not possible if the table is not empty.
  - Added the required column `customerId` to the `bulk_bookings` table without a default value. This is not possible if the table is not empty.
  - Added the required column `totalItems` to the `bulk_bookings` table without a default value. This is not possible if the table is not empty.
  - Added the required column `agentId` to the `customers` table without a default value. This is not possible if the table is not empty.
  - Added the required column `firstName` to the `doctors` table without a default value. This is not possible if the table is not empty.
  - Added the required column `lastName` to the `doctors` table without a default value. This is not possible if the table is not empty.
  - Added the required column `agentId` to the `patient_histories` table without a default value. This is not possible if the table is not empty.
  - Added the required column `chiefComplaint` to the `patient_histories` table without a default value. This is not possible if the table is not empty.
  - Added the required column `agentId` to the `tickets` table without a default value. This is not possible if the table is not empty.
  - Added the required column `stepOrder` to the `workflow_steps` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."patient_histories" DROP CONSTRAINT "patient_histories_doctorId_fkey";

-- DropForeignKey
ALTER TABLE "public"."patient_histories" DROP CONSTRAINT "patient_histories_hospitalId_fkey";

-- DropForeignKey
ALTER TABLE "public"."workflow_steps" DROP CONSTRAINT "workflow_steps_assignedAgentId_fkey";

-- DropIndex
DROP INDEX "public"."workflow_steps_workflowId_stepNumber_key";

-- AlterTable
ALTER TABLE "approval_workflows" ADD COLUMN     "cancellationReason" TEXT,
ADD COLUMN     "estimatedValue" DECIMAL(12,2),
ADD COLUMN     "justification" TEXT;

-- AlterTable
ALTER TABLE "bulk_booking_items" ADD COLUMN     "consultationFee" DECIMAL(10,2) NOT NULL,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "processedAt" TIMESTAMP(3),
ADD COLUMN     "sequenceNumber" INTEGER NOT NULL,
ALTER COLUMN "appointmentTime" SET DATA TYPE TEXT,
ALTER COLUMN "status" SET DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "bulk_bookings" DROP COLUMN "failedBookings",
DROP COLUMN "successfulBookings",
DROP COLUMN "totalSlots",
ADD COLUMN     "batchName" TEXT NOT NULL,
ADD COLUMN     "customerId" TEXT NOT NULL,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "failedItems" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "successfulItems" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "totalItems" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "customers" DROP COLUMN "medicalInfo",
ADD COLUMN     "agentId" TEXT NOT NULL,
ADD COLUMN     "lastVisit" TIMESTAMP(3),
ADD COLUMN     "medicalHistory" TEXT,
ADD COLUMN     "registrationDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "address" SET DATA TYPE TEXT,
ALTER COLUMN "emergencyContact" SET DATA TYPE TEXT;

-- AlterTable
ALTER TABLE "doctors" DROP COLUMN "name",
ADD COLUMN     "firstName" TEXT NOT NULL,
ADD COLUMN     "lastName" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "patient_histories" DROP COLUMN "doctorId",
DROP COLUMN "hospitalId",
DROP COLUMN "prescription",
DROP COLUMN "treatment",
ADD COLUMN     "agentId" TEXT NOT NULL,
ADD COLUMN     "chiefComplaint" TEXT NOT NULL,
ADD COLUMN     "followUpInstructions" TEXT,
ADD COLUMN     "labResults" JSONB,
ADD COLUMN     "medications" TEXT,
ADD COLUMN     "treatmentPlan" TEXT,
ADD COLUMN     "vitalSigns" JSONB;

-- AlterTable
ALTER TABLE "tickets" ADD COLUMN     "agentId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "workflow_steps" DROP COLUMN "assignedAgentId",
DROP COLUMN "stepNumber",
ADD COLUMN     "approverId" TEXT,
ADD COLUMN     "approverNotes" TEXT,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "isOptional" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "processedBy" TEXT,
ADD COLUMN     "stepOrder" INTEGER NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "workflow_steps_workflowId_stepOrder_key" ON "workflow_steps"("workflowId", "stepOrder");

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_steps" ADD CONSTRAINT "workflow_steps_approverId_fkey" FOREIGN KEY ("approverId") REFERENCES "agents"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bulk_bookings" ADD CONSTRAINT "bulk_bookings_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_histories" ADD CONSTRAINT "patient_histories_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "agents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
