-- CreateEnum
CREATE TYPE "SoilType" AS ENUM (
    'ALLUVIAL',
    'BLACK_REGUR',
    'RED',
    'LATERITE',
    'SANDY',
    'CLAY_HEAVY',
    'LOAMY_MIXED',
    'NOT_SURE'
);

-- AlterTable
ALTER TABLE "FarmPlot"
ADD COLUMN "soilType" "SoilType";
