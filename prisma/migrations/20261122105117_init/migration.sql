-- CreateEnum
CREATE TYPE "Visibility" AS ENUM ('PUBLIC', 'NEEDS_REVIEW', 'HIDDEN');

-- CreateTable
CREATE TABLE "Doctor" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameKey" TEXT NOT NULL,
    "specialty" TEXT,
    "city" TEXT,
    "years" INTEGER NOT NULL DEFAULT 0,
    "clinic" TEXT,
    "hospitals" TEXT[],
    "pubs" INTEGER NOT NULL DEFAULT 0,
    "trials" INTEGER NOT NULL DEFAULT 0,
    "teaching" BOOLEAN NOT NULL DEFAULT false,
    "reviews" INTEGER NOT NULL DEFAULT 0,
    "interests" TEXT,
    "url" TEXT,
    "nominated" BOOLEAN NOT NULL DEFAULT false,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "isSample" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Doctor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Question" (
    "id" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "specialty" TEXT NOT NULL,
    "city" TEXT,
    "setting" TEXT NOT NULL,
    "volume" INTEGER NOT NULL DEFAULT 0,
    "question" TEXT NOT NULL,
    "population" TEXT,
    "tags" TEXT[],
    "seedVotes" INTEGER NOT NULL DEFAULT 0,
    "visibility" "Visibility" NOT NULL DEFAULT 'PUBLIC',
    "isSample" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Question_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestionVote" (
    "questionId" TEXT NOT NULL,
    "voterKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuestionVote_pkey" PRIMARY KEY ("questionId","voterKey")
);

-- CreateTable
CREATE TABLE "Paper" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "stage" TEXT NOT NULL,
    "settings" TEXT[],
    "summary" TEXT NOT NULL,
    "source" TEXT,
    "role" TEXT,
    "submitter" TEXT,
    "conceptIds" TEXT[],
    "claim" TEXT,
    "population" TEXT,
    "needs" TEXT[],
    "limits" TEXT,
    "rightsConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "visibility" "Visibility" NOT NULL DEFAULT 'PUBLIC',
    "isSample" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Paper_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Endorsement" (
    "paperId" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Endorsement_pkey" PRIMARY KEY ("paperId","doctorId")
);

-- CreateTable
CREATE TABLE "Nomination" (
    "id" TEXT NOT NULL,
    "doctorId" TEXT NOT NULL,
    "by" TEXT NOT NULL,
    "reasons" TEXT[],
    "area" TEXT,
    "since" TEXT,
    "note" VARCHAR(300),
    "voterKey" TEXT,
    "visibility" "Visibility" NOT NULL DEFAULT 'PUBLIC',
    "isSample" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Nomination_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WriteEvent" (
    "id" BIGSERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WriteEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Doctor_nameKey_idx" ON "Doctor"("nameKey");

-- CreateIndex
CREATE UNIQUE INDEX "Nomination_doctorId_voterKey_key" ON "Nomination"("doctorId", "voterKey");

-- CreateIndex
CREATE INDEX "WriteEvent_key_createdAt_idx" ON "WriteEvent"("key", "createdAt");

-- AddForeignKey
ALTER TABLE "QuestionVote" ADD CONSTRAINT "QuestionVote_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Endorsement" ADD CONSTRAINT "Endorsement_paperId_fkey" FOREIGN KEY ("paperId") REFERENCES "Paper"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Endorsement" ADD CONSTRAINT "Endorsement_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "Doctor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Nomination" ADD CONSTRAINT "Nomination_doctorId_fkey" FOREIGN KEY ("doctorId") REFERENCES "Doctor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
