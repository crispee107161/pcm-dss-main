-- CreateEnum
CREATE TYPE "CorrelationMethod" AS ENUM ('PEARSON', 'SPEARMAN');

-- CreateTable
CREATE TABLE "CorrelationAssumptionRun" (
    "id" SERIAL NOT NULL,
    "run_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "n" INTEGER NOT NULL,
    "method" "CorrelationMethod" NOT NULL,
    "coefficient" DOUBLE PRECISION NOT NULL,
    "p_value" DOUBLE PRECISION NOT NULL,
    "shapiro_x_w" DOUBLE PRECISION NOT NULL,
    "shapiro_x_p" DOUBLE PRECISION NOT NULL,
    "shapiro_y_w" DOUBLE PRECISION NOT NULL,
    "shapiro_y_p" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "CorrelationAssumptionRun_pkey" PRIMARY KEY ("id")
);
