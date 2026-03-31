ALTER TABLE "Message"
  ADD COLUMN "tempMediaId" uuid UNIQUE;

CREATE TABLE "TempMedia" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "contentType" text NOT NULL,
  "data" bytea NOT NULL,
  "expiresAt" timestamptz,
  "createdAt" timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE "Message"
  ADD CONSTRAINT "Message_tempMediaId_fkey" FOREIGN KEY ("tempMediaId") REFERENCES "TempMedia"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "TempMedia_expiresAt_idx" ON "TempMedia"("expiresAt");
