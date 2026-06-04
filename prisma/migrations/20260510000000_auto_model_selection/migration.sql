-- AlterTable: add auto model selection columns to RegressionModel
ALTER TABLE "RegressionModel" ADD COLUMN "coef_spend_sq" DOUBLE PRECISION;
ALTER TABLE "RegressionModel" ADD COLUMN "model_type" TEXT;
