-- AlterTable: add MLR columns to RegressionModel
ALTER TABLE "RegressionModel" ADD COLUMN "coef_reach" DOUBLE PRECISION;
ALTER TABLE "RegressionModel" ADD COLUMN "coef_messaging" DOUBLE PRECISION;
ALTER TABLE "RegressionModel" ADD COLUMN "coef_amount_spent" DOUBLE PRECISION;
ALTER TABLE "RegressionModel" ADD COLUMN "residual_std_error" DOUBLE PRECISION;
ALTER TABLE "RegressionModel" ADD COLUMN "best_lag" INTEGER;

-- AlterTable: add multi-input and interval columns to SimulationResult
ALTER TABLE "SimulationResult" ADD COLUMN "reach_input" DOUBLE PRECISION;
ALTER TABLE "SimulationResult" ADD COLUMN "messaging_input" DOUBLE PRECISION;
ALTER TABLE "SimulationResult" ADD COLUMN "interval_lower" DOUBLE PRECISION;
ALTER TABLE "SimulationResult" ADD COLUMN "interval_upper" DOUBLE PRECISION;
