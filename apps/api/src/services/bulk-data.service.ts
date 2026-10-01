import { prisma } from "../config/prisma.js";
import type { AuthContext } from "../types/auth.js";
import * as transport from "./transport.service.js";
import { audit } from "./stage4.service.js";
import { isBranchScoped } from "../middleware/tenant-policy.js";

export type BulkEntity = "buses" | "drivers" | "routes" | "stops";
export type CsvRow = Record<string, string | number | boolean | null | undefined>;
type Failure = Error & { statusCode?: number };
function fail(message: string, statusCode = 400): never {
  throw Object.assign(new Error(message), { statusCode }) as Failure;
}
function value(row: CsvRow, key: string) { return String(row[key] ?? "").trim(); }
function num(row: CsvRow, key: string) { return Number(value(row, key)); }
function csvEscape(value: unknown) {
  const text = value === null || value === undefined ? "" : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}
const columns: Record<BulkEntity, string[]> = {
  buses: ["branchCode", "registrationNumber", "busNumber", "busType", "totalSeats", "operatorName", "make", "model", "year", "color", "description", "amenities"],
  drivers: ["branchCode", "firstName", "lastName", "phone", "licenseNumber", "email", "licenseExpiryDate"],
  routes: ["code", "name", "source", "destination", "description"],
  stops: ["routeCode", "name", "sequence", "address", "city", "estimatedMinutesFromOrigin"],
};
function csv(rows: Record<string, unknown>[], fields: string[]) {
  return [fields.join(","), ...rows.map((row) => fields.map((field) => csvEscape(row[field])).join(","))].join("\r\n");
}
async function agencyIdFor(context: AuthContext, requested?: string) {
  if (context.role === "SUPER_ADMIN") {
    if (!requested) fail("agencyId is required");
    return requested;
  }
  if (!context.agencyId || (requested && requested !== context.agencyId)) fail("You cannot access another agency", 403);
  return context.agencyId;
}
async function branchByCode(context: AuthContext, agencyId: string, code: string) {
  const branch = await prisma.branch.findFirst({ where: { agencyId, code: { equals: code, mode: "insensitive" } } });
  if (!branch || branch.status !== "ACTIVE") fail(`Active branch '${code}' was not found`);
  if (isBranchScoped(context) && context.branchId !== branch.id) fail("Branch is outside your assigned scope", 403);
  return branch;
}
async function routeByCode(agencyId: string, code: string) {
  const route = await prisma.route.findFirst({ where: { agencyId, code: { equals: code, mode: "insensitive" } } });
  if (!route || route.status !== "ACTIVE") fail(`Active route '${code}' was not found`);
  return route;
}
function requireFields(row: CsvRow, fields: string[]) {
  const missing = fields.find((field) => !value(row, field));
  if (missing) fail(`${missing} is required`);
}
function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Invalid row";
}

export function template(entity: BulkEntity) { return columns[entity].join(","); }

export async function exportRows(context: AuthContext, entity: BulkEntity, requested?: string) {
  const agencyId = await agencyIdFor(context, requested);
  const branchScope = isBranchScoped(context) ? context.branchId ?? "__missing__" : undefined;
  if (entity === "buses") {
    const data = await prisma.bus.findMany({ where: { agencyId, ...(branchScope ? { branchId: branchScope } : {}) }, include: { branch: true }, orderBy: { busNumber: "asc" }, take: 10000 });
    return csv(data.map((x) => ({ branchCode: x.branch.code, registrationNumber: x.registrationNumber, busNumber: x.busNumber, busType: x.busType, totalSeats: x.totalSeats, operatorName: x.operatorName, make: x.make, model: x.model, year: x.year, color: x.color, description: x.description, amenities: x.amenities.join("|") })), columns.buses);
  }
  if (entity === "drivers") {
    const data = await prisma.driver.findMany({ where: { agencyId, ...(branchScope ? { branchId: branchScope } : {}) }, include: { branch: true }, orderBy: { lastName: "asc" }, take: 10000 });
    return csv(data.map((x) => ({ branchCode: x.branch.code, firstName: x.firstName, lastName: x.lastName, phone: x.phone, licenseNumber: x.licenseNumber, email: x.email, licenseExpiryDate: x.licenseExpiryDate?.toISOString() })), columns.drivers);
  }
  if (entity === "routes") {
    const data = await prisma.route.findMany({ where: { agencyId }, orderBy: { code: "asc" }, take: 10000 });
    return csv(data, columns.routes);
  }
  const data = await prisma.stop.findMany({ where: { route: { agencyId } }, include: { route: true }, orderBy: [{ route: { code: "asc" } }, { sequence: "asc" }], take: 10000 });
  return csv(data.map((x) => ({ routeCode: x.route.code, name: x.name, sequence: x.sequence, address: x.address, city: x.city, estimatedMinutesFromOrigin: x.estimatedMinutesFromOrigin })), columns.stops);
}

async function applyRow(context: AuthContext, agencyId: string, entity: BulkEntity, row: CsvRow, validateOnly: boolean) {
  if (entity === "buses") {
    requireFields(row, ["branchCode", "registrationNumber", "busNumber", "busType", "totalSeats"]);
    const branch = await branchByCode(context, agencyId, value(row, "branchCode"));
    const busType = value(row, "busType").toUpperCase();
    const totalSeats = num(row, "totalSeats");
    if (!["SEATER", "SLEEPER", "SEATER_SLEEPER"].includes(busType)) fail("busType must be SEATER, SLEEPER, or SEATER_SLEEPER");
    if (!Number.isInteger(totalSeats) || totalSeats < 1 || totalSeats > 1000) fail("totalSeats must be an integer from 1 to 1000");
    const conflict = await prisma.bus.findFirst({ where: { agencyId, OR: [{ busNumber: value(row, "busNumber") }, { registrationNumber: value(row, "registrationNumber").toUpperCase() }] } });
    if (conflict) fail("Bus number or registration number already exists");
    if (validateOnly) return { branchCode: branch.code, busNumber: value(row, "busNumber") };
    return transport.createBus(context, { agencyId, branchId: branch.id, busNumber: value(row, "busNumber"), registrationNumber: value(row, "registrationNumber"), busType: busType as "SEATER" | "SLEEPER" | "SEATER_SLEEPER", totalSeats, operatorName: value(row, "operatorName"), make: value(row, "make") || null, model: value(row, "model") || null, year: value(row, "year") ? num(row, "year") : null, color: value(row, "color") || null, description: value(row, "description") || null, amenities: value(row, "amenities").split("|").map((x) => x.trim()).filter(Boolean) });
  }
  if (entity === "drivers") {
    requireFields(row, ["branchCode", "firstName", "lastName", "phone", "licenseNumber"]);
    const branch = await branchByCode(context, agencyId, value(row, "branchCode"));
    const conflict = await prisma.driver.findFirst({ where: { agencyId, licenseNumber: value(row, "licenseNumber") } });
    if (conflict) fail("License number already exists");
    const expiry = value(row, "licenseExpiryDate");
    if (expiry && !Number.isFinite(new Date(expiry).getTime())) fail("licenseExpiryDate must be a valid date");
    if (validateOnly) return { branchCode: branch.code, licenseNumber: value(row, "licenseNumber") };
    return transport.createDriver(context, { agencyId, branchId: branch.id, firstName: value(row, "firstName"), lastName: value(row, "lastName"), phone: value(row, "phone"), licenseNumber: value(row, "licenseNumber"), email: value(row, "email"), licenseExpiryDate: expiry || undefined });
  }
  if (entity === "routes") {
    requireFields(row, ["code", "name", "source", "destination"]);
    const conflict = await prisma.route.findFirst({ where: { agencyId, code: value(row, "code").toUpperCase() } });
    if (conflict) fail("Route code already exists");
    if (validateOnly) return { code: value(row, "code") };
    return transport.createRoute(context, { agencyId, code: value(row, "code"), name: value(row, "name"), source: value(row, "source"), destination: value(row, "destination"), description: value(row, "description") });
  }
  requireFields(row, ["routeCode", "name", "sequence"]);
  const route = await routeByCode(agencyId, value(row, "routeCode"));
  const sequence = num(row, "sequence");
  if (!Number.isInteger(sequence) || sequence < 1) fail("sequence must be a positive integer");
  if (await prisma.stop.findFirst({ where: { routeId: route.id, sequence } })) fail("Stop sequence already exists on this route");
  const estimated = value(row, "estimatedMinutesFromOrigin");
  if (estimated && (!Number.isInteger(Number(estimated)) || Number(estimated) < 0)) fail("estimatedMinutesFromOrigin must be a non-negative integer");
  if (validateOnly) return { routeCode: route.code, sequence };
  return transport.createStop(context, route.id, { name: value(row, "name"), sequence, address: value(row, "address"), city: value(row, "city"), estimatedMinutesFromOrigin: estimated ? Number(estimated) : undefined });
}

export async function importRows(context: AuthContext, entity: BulkEntity, rows: CsvRow[], commit: boolean, requested?: string) {
  if (rows.length > 500) fail("Upload at most 500 rows at a time");
  const agencyId = await agencyIdFor(context, requested);
  const seen = new Set<string>();
  const results = [];
  for (let index = 0; index < rows.length; index += 1) {
    try {
      const row = rows[index];
      const keys = entity === "buses" ? [`bus:${value(row, "busNumber").toUpperCase()}`, `registration:${value(row, "registrationNumber").toUpperCase()}`]
        : entity === "drivers" ? [`license:${value(row, "licenseNumber").toUpperCase()}`]
          : entity === "routes" ? [`route:${value(row, "code").toUpperCase()}`]
            : [`stop:${value(row, "routeCode").toUpperCase()}:${value(row, "sequence")}`];
      if (keys.every((key) => key.endsWith(":"))) fail("Row is empty");
      if (keys.some((key) => seen.has(key))) fail("Duplicate identifier in this file");
      keys.forEach((key) => seen.add(key));
      const data = await applyRow(context, agencyId, entity, row, !commit);
      results.push({ row: index + 2, ok: true, message: commit ? "Imported" : "Valid", data: data && "id" in data ? { id: data.id } : undefined });
    } catch (error) {
      results.push({ row: index + 2, ok: false, message: errorMessage(error) });
    }
  }
  if (commit) {
    const imported = results.filter((x) => x.ok).length;
    await audit(context, agencyId, "BULK_IMPORT_COMPLETED", entity, undefined, { imported, failed: results.length - imported, ...(isBranchScoped(context) ? { branchId: context.branchId } : {}) });
  }
  return { results, valid: results.filter((x) => x.ok).length, invalid: results.filter((x) => !x.ok).length };
}
