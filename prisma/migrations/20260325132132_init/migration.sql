-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "targetLanguage" TEXT NOT NULL,
    "nativeLanguage" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "hardcoreMode" BOOLEAN NOT NULL DEFAULT false,
    "hardcoreIntervalMinutes" INTEGER NOT NULL DEFAULT 20,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "strand" TEXT NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "activityType" TEXT NOT NULL,
    "notes" TEXT,
    "source" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CorpusWord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "language" TEXT NOT NULL,
    "word" TEXT NOT NULL,
    "reading" TEXT,
    "definition" TEXT NOT NULL,
    "frequencyRank" INTEGER NOT NULL,
    "level" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "UserWord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "corpusWordId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'UNSEEN',
    "encounters" INTEGER NOT NULL DEFAULT 0,
    "lastEncountered" DATETIME,
    "easeFactor" REAL NOT NULL DEFAULT 2.5,
    "interval" INTEGER NOT NULL DEFAULT 1,
    "nextReview" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserWord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "UserWord_corpusWordId_fkey" FOREIGN KEY ("corpusWordId") REFERENCES "CorpusWord" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StrandBalance" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "inputMinutes" INTEGER NOT NULL DEFAULT 0,
    "outputMinutes" INTEGER NOT NULL DEFAULT 0,
    "formMinutes" INTEGER NOT NULL DEFAULT 0,
    "fluencyMinutes" INTEGER NOT NULL DEFAULT 0,
    "balanceScore" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StrandBalance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "StrandBalance_userId_date_key" ON "StrandBalance"("userId", "date");
