-- CreateTable
CREATE TABLE "PageMetricDaily" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "date" DATETIME NOT NULL,
    "follows" INTEGER,
    "interactions" INTEGER,
    "link_clicks" INTEGER,
    "views" INTEGER,
    "visits" INTEGER,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "FollowerHistory" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "date" DATETIME NOT NULL,
    "followers" INTEGER NOT NULL,
    "daily_change" INTEGER NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "PageViewers" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "date" DATETIME NOT NULL,
    "total_viewers" INTEGER,
    "new_viewers" INTEGER NOT NULL,
    "returning_viewers" INTEGER NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "FollowerGender" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "gender" TEXT NOT NULL,
    "distribution" REAL NOT NULL
);

-- CreateTable
CREATE TABLE "FollowerTerritory" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "territory" TEXT NOT NULL,
    "distribution" REAL NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "PageMetricDaily_date_key" ON "PageMetricDaily"("date");

-- CreateIndex
CREATE UNIQUE INDEX "FollowerHistory_date_key" ON "FollowerHistory"("date");

-- CreateIndex
CREATE UNIQUE INDEX "PageViewers_date_key" ON "PageViewers"("date");

-- CreateIndex
CREATE UNIQUE INDEX "FollowerGender_gender_key" ON "FollowerGender"("gender");

-- CreateIndex
CREATE UNIQUE INDEX "FollowerTerritory_territory_key" ON "FollowerTerritory"("territory");
