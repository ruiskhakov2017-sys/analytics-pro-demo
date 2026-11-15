ALTER TABLE "Account" ADD COLUMN "dailyLimit" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Account" ADD COLUMN "quality" TEXT NOT NULL DEFAULT 'Не оценено';
ALTER TABLE "Account" ADD CONSTRAINT "nonnegative_daily_limit" CHECK ("dailyLimit" BETWEEN 0 AND 100000000);
ALTER TABLE "Account" ADD CONSTRAINT "valid_quality" CHECK ("quality" IN ('Не оценено','Высокое','Стандартное','Риск'));
