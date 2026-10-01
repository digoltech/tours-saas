import { describe, expect, test } from "bun:test";
import { template } from "./bulk-data.service.js";

describe("bulk CSV templates", () => {
  test("include the columns required to resolve owned fleet and route data", () => {
    expect(template("buses").split(",")).toContain("branchCode");
    expect(template("drivers").split(",")).toContain("licenseNumber");
    expect(template("routes").split(",")).toEqual(["code", "name", "source", "destination", "description"]);
    expect(template("stops").split(",")).toContain("routeCode");
  });
});
