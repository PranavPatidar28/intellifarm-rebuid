-- AlterTable
ALTER TABLE "DiseaseReport" ADD COLUMN "userId" TEXT;
ALTER TABLE "DiseaseReport" ADD COLUMN "placeLabel" TEXT;
ALTER TABLE "DiseaseReport" ALTER COLUMN "cropSeasonId" DROP NOT NULL;

-- Backfill direct report ownership from existing saved crop seasons.
UPDATE "DiseaseReport" AS report
SET "userId" = plot."userId"
FROM "CropSeason" AS season
INNER JOIN "FarmPlot" AS plot ON plot."id" = season."farmPlotId"
WHERE report."cropSeasonId" = season."id";

ALTER TABLE "DiseaseReport" ALTER COLUMN "userId" SET NOT NULL;

-- CreateIndex
CREATE INDEX "DiseaseReport_userId_createdAt_idx" ON "DiseaseReport"("userId", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "DiseaseReport" ADD CONSTRAINT "DiseaseReport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
