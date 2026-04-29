-- AlterTable
ALTER TABLE "CommunityPost" ADD COLUMN "likeCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "CommunityPost" ADD COLUMN "saveCount" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "CommunityPostLike" (
  "id" TEXT NOT NULL,
  "postId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "CommunityPostLike_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityPostSave" (
  "id" TEXT NOT NULL,
  "postId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "CommunityPostSave_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CommunityPostLike_postId_userId_key" ON "CommunityPostLike"("postId", "userId");

-- CreateIndex
CREATE INDEX "CommunityPostLike_userId_createdAt_idx" ON "CommunityPostLike"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "CommunityPostLike_postId_createdAt_idx" ON "CommunityPostLike"("postId", "createdAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "CommunityPostSave_postId_userId_key" ON "CommunityPostSave"("postId", "userId");

-- CreateIndex
CREATE INDEX "CommunityPostSave_userId_createdAt_idx" ON "CommunityPostSave"("userId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "CommunityPostSave_postId_createdAt_idx" ON "CommunityPostSave"("postId", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "CommunityPostLike" ADD CONSTRAINT "CommunityPostLike_postId_fkey" FOREIGN KEY ("postId") REFERENCES "CommunityPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityPostLike" ADD CONSTRAINT "CommunityPostLike_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityPostSave" ADD CONSTRAINT "CommunityPostSave_postId_fkey" FOREIGN KEY ("postId") REFERENCES "CommunityPost"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommunityPostSave" ADD CONSTRAINT "CommunityPostSave_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
