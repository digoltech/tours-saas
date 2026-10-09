BEGIN;

-- Optional branch attribution preserves agency-wide historical entries.
ALTER TABLE "Settlement" ADD COLUMN IF NOT EXISTS "branchId" TEXT;
ALTER TABLE "FinanceLedger" ADD COLUMN IF NOT EXISTS "branchId" TEXT;
CREATE INDEX IF NOT EXISTS "Settlement_agencyId_branchId_settledAt_idx" ON "Settlement"("agencyId", "branchId", "settledAt");
CREATE INDEX IF NOT EXISTS "FinanceLedger_agencyId_branchId_createdAt_idx" ON "FinanceLedger"("agencyId", "branchId", "createdAt");
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Settlement_branchId_fkey') THEN
    ALTER TABLE "Settlement" ADD CONSTRAINT "Settlement_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'FinanceLedger_branchId_fkey') THEN
    ALTER TABLE "FinanceLedger" ADD CONSTRAINT "FinanceLedger_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
UPDATE "FinanceLedger" l SET "branchId" = b."branchId" FROM "Booking" b WHERE l."bookingId" = b.id AND l."branchId" IS NULL;
-- Do not infer settlement branches from a person's current assignment: they may have moved.

CREATE TEMP TABLE desired_roles(code TEXT PRIMARY KEY, name TEXT, scope "RoleScope") ON COMMIT DROP;
INSERT INTO desired_roles VALUES ('AGENCY_ADMIN', 'Agency owner', 'AGENCY'), ('BRANCH_ADMIN', 'Branch admin', 'BRANCH'), ('AGENT', 'Employee', 'BRANCH');
INSERT INTO "Role" (id, code, name, scope, "isSystem")
SELECT 'team-default-' || code, code, name, scope, TRUE FROM desired_roles
ON CONFLICT (code) DO NOTHING;

CREATE TEMP TABLE desired_permissions(role_code TEXT, permission_code TEXT, PRIMARY KEY(role_code, permission_code)) ON COMMIT DROP;
INSERT INTO desired_permissions
SELECT r.code, p.code FROM desired_roles r CROSS JOIN "Permission" p
WHERE p.code IN ('agency:read', 'branch:read', 'bus:read', 'bus:create', 'bus:update', 'bus:delete',
  'driver:read', 'driver:create', 'driver:update', 'driver:delete', 'route:read', 'stop:read', 'boarding_point:read',
  'trip:read', 'trip:create', 'trip:update', 'trip:delete', 'trip:cancel', 'booking:read', 'booking:create',
  'finance:read', 'finance:payment', 'finance:refund', 'finance:cancel', 'finance:settlement')
OR (r.code IN ('AGENCY_ADMIN', 'BRANCH_ADMIN') AND p.code IN ('agent:read', 'agent:create', 'agent:update', 'agent:delete'))
OR (r.code = 'AGENCY_ADMIN' AND p.code IN ('agency:update', 'branch:create', 'branch:update', 'branch:delete',
  'route:create', 'route:update', 'route:delete', 'stop:create', 'stop:update', 'stop:delete',
  'boarding_point:create', 'boarding_point:update', 'boarding_point:delete', 'finance:settings'));

CREATE TEMP TABLE changed_users(id TEXT PRIMARY KEY) ON COMMIT DROP;
INSERT INTO changed_users
SELECT u.id FROM "User" u JOIN "Role" r ON r.id = u."roleId" JOIN desired_roles d ON d.code = r.code
WHERE r.name IS DISTINCT FROM d.name OR r.scope IS DISTINCT FROM d.scope
OR EXISTS (SELECT 1 FROM "RolePermission" rp JOIN "Permission" p ON p.id = rp."permissionId"
  WHERE rp."roleId" = r.id AND NOT EXISTS (SELECT 1 FROM desired_permissions dp WHERE dp.role_code = r.code AND dp.permission_code = p.code))
OR EXISTS (SELECT 1 FROM desired_permissions dp JOIN "Permission" p ON p.code = dp.permission_code
  WHERE dp.role_code = r.code AND NOT EXISTS (SELECT 1 FROM "RolePermission" rp WHERE rp."roleId" = r.id AND rp."permissionId" = p.id));

UPDATE "Role" r SET name = d.name, scope = d.scope FROM desired_roles d WHERE r.code = d.code;
DELETE FROM "RolePermission" rp USING "Role" r, "Permission" p
WHERE rp."roleId" = r.id AND rp."permissionId" = p.id AND r.code IN (SELECT code FROM desired_roles)
AND NOT EXISTS (SELECT 1 FROM desired_permissions dp WHERE dp.role_code = r.code AND dp.permission_code = p.code);
INSERT INTO "RolePermission" ("roleId", "permissionId")
SELECT r.id, p.id FROM desired_permissions dp JOIN "Role" r ON r.code = dp.role_code JOIN "Permission" p ON p.code = dp.permission_code
ON CONFLICT DO NOTHING;

-- Create a main branch only where standard accounts need one and no active branch exists.
INSERT INTO "Branch" (id, "agencyId", name, code, status, "createdAt", "updatedAt")
SELECT 'team-main-' || a.id, a.id, 'Main branch',
  CASE WHEN EXISTS (SELECT 1 FROM "Branch" b WHERE b."agencyId" = a.id AND b.code = 'MAIN') THEN 'MAIN-' || substr(md5(a.id), 1, 16) ELSE 'MAIN' END,
  'ACTIVE', NOW(), NOW()
FROM "Agency" a WHERE EXISTS (SELECT 1 FROM "User" u JOIN "Role" r ON r.id = u."roleId" WHERE u."agencyId" = a.id AND r.code IN (SELECT code FROM desired_roles))
AND NOT EXISTS (SELECT 1 FROM "Branch" b WHERE b."agencyId" = a.id AND b.status = 'ACTIVE')
ON CONFLICT DO NOTHING;

INSERT INTO changed_users
SELECT u.id FROM "User" u JOIN "Role" r ON r.id = u."roleId"
WHERE r.code IN (SELECT code FROM desired_roles) AND u."agencyId" IS NOT NULL
AND NOT EXISTS (SELECT 1 FROM "Branch" b WHERE b.id = u."branchId" AND b."agencyId" = u."agencyId" AND b.status = 'ACTIVE')
ON CONFLICT DO NOTHING;
UPDATE "User" u SET "branchId" = (
  SELECT b.id FROM "Branch" b WHERE b."agencyId" = u."agencyId" AND b.status = 'ACTIVE'
  ORDER BY (b.code = 'MAIN') DESC, b."createdAt", b.id LIMIT 1
), "updatedAt" = NOW()
FROM "Role" r WHERE r.id = u."roleId" AND r.code IN (SELECT code FROM desired_roles) AND u."agencyId" IS NOT NULL
AND NOT EXISTS (SELECT 1 FROM "Branch" b WHERE b.id = u."branchId" AND b."agencyId" = u."agencyId" AND b.status = 'ACTIVE');
UPDATE "Invitation" i SET "branchId" = u."branchId", "roleId" = u."roleId"
FROM "User" u WHERE i."userId" = u.id AND i."acceptedAt" IS NULL AND u.id IN (SELECT id FROM changed_users);
UPDATE "Session" SET "revokedAt" = NOW() WHERE "revokedAt" IS NULL AND "userId" IN (SELECT id FROM changed_users);

COMMIT;
