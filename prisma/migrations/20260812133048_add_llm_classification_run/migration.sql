-- CreateTable
CREATE TABLE "LlmClassificationRun" (
    "id" SERIAL NOT NULL,
    "model_name" TEXT NOT NULL,
    "run_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "post_ids" INTEGER[],
    "raw_response" TEXT NOT NULL,
    "succeeded" BOOLEAN NOT NULL,

    CONSTRAINT "LlmClassificationRun_pkey" PRIMARY KEY ("id")
);
