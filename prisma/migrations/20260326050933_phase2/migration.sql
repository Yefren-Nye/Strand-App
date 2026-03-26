-- CreateTable
CREATE TABLE "Profile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "targetLanguage" TEXT NOT NULL,
    "nativeLanguage" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Profile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "StrandSnooze" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "profileId" TEXT NOT NULL,
    "strand" TEXT NOT NULL,
    "snoozedUntil" DATETIME NOT NULL,
    "snoozeCountThisWeek" INTEGER NOT NULL DEFAULT 0,
    "weekStartDate" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StrandSnooze_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "AvoidanceEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "profileId" TEXT NOT NULL,
    "strand" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AvoidanceEvent_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "profileId" TEXT,
    "strand" TEXT NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "activityType" TEXT NOT NULL,
    "notes" TEXT,
    "source" TEXT,
    "focusRating" INTEGER,
    "loggedExternally" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Session_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Session" ("activityType", "createdAt", "durationMinutes", "id", "notes", "source", "strand", "userId") SELECT "activityType", "createdAt", "durationMinutes", "id", "notes", "source", "strand", "userId" FROM "Session";
DROP TABLE "Session";
ALTER TABLE "new_Session" RENAME TO "Session";
CREATE TABLE "new_StrandBalance" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "profileId" TEXT,
    "date" TEXT NOT NULL,
    "inputMinutes" INTEGER NOT NULL DEFAULT 0,
    "outputMinutes" INTEGER NOT NULL DEFAULT 0,
    "formMinutes" INTEGER NOT NULL DEFAULT 0,
    "fluencyMinutes" INTEGER NOT NULL DEFAULT 0,
    "balanceScore" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StrandBalance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "StrandBalance_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_StrandBalance" ("balanceScore", "createdAt", "date", "fluencyMinutes", "formMinutes", "id", "inputMinutes", "outputMinutes", "userId") SELECT "balanceScore", "createdAt", "date", "fluencyMinutes", "formMinutes", "id", "inputMinutes", "outputMinutes", "userId" FROM "StrandBalance";
DROP TABLE "StrandBalance";
ALTER TABLE "new_StrandBalance" RENAME TO "StrandBalance";
CREATE UNIQUE INDEX "StrandBalance_userId_date_key" ON "StrandBalance"("userId", "date");
CREATE TABLE "new_UserWord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "profileId" TEXT,
    "corpusWordId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'UNSEEN',
    "encounters" INTEGER NOT NULL DEFAULT 0,
    "lastEncountered" DATETIME,
    "easeFactor" REAL NOT NULL DEFAULT 2.5,
    "interval" INTEGER NOT NULL DEFAULT 1,
    "nextReview" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserWord_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "UserWord_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "Profile" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "UserWord_corpusWordId_fkey" FOREIGN KEY ("corpusWordId") REFERENCES "CorpusWord" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_UserWord" ("corpusWordId", "createdAt", "easeFactor", "encounters", "id", "interval", "lastEncountered", "nextReview", "status", "userId") SELECT "corpusWordId", "createdAt", "easeFactor", "encounters", "id", "interval", "lastEncountered", "nextReview", "status", "userId" FROM "UserWord";
DROP TABLE "UserWord";
ALTER TABLE "new_UserWord" RENAME TO "UserWord";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
