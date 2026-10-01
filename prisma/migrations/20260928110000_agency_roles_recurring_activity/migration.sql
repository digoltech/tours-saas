ALTER TYPE "RoleCode" RENAME TO "RoleCode_old";
CREATE TYPE "RoleScope" AS ENUM ('PLATFORM', 'AGENCY', 'BRANCH');
ALTER TABLE "Role" ALTER COLUMN "code" TYPE TEXT USING "code"::text;
ALTER TABLE "Role" ADD COLUMN "scope" "RoleScope" NOT NULL DEFAULT 'AGENCY';
ALTER TABLE "Role" ADD COLUMN "isSystem" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Role" ADD COLUMN "agencyId" TEXT;
UPDATE "Role" SET "scope" = CASE
  WHEN "code" = 'SUPER_ADMIN' THEN 'PLATFORM'::"RoleScope"
  WHEN "code" IN ('BRANCH_ADMIN', 'AGENT') THEN 'BRANCH'::"RoleScope"
  ELSE 'AGENCY'::"RoleScope"
END;
ALTER TABLE "Role" ADD CONSTRAINT "Role_agencyId_fkey" FOREIGN KEY ("agencyId") REFERENCES "Agency"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX "Role_agencyId_isSystem_idx" ON "Role"("agencyId", "isSystem");
DROP TYPE "RoleCode_old";
ALTER TABLE "AuditLog" ADD COLUMN "branchId" TEXT;
CREATE INDEX "AuditLog_agencyId_branchId_createdAt_idx" ON "AuditLog"("agencyId", "branchId", "createdAt");
