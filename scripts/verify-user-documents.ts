import assert from "node:assert/strict";
const base = "http://localhost:4000";
const origin = "http://localhost:3000";
const password = process.env.TEAM_TEST_PASSWORD ?? "AOnePhase2!2026";
async function login(email: string) {
  const response = await fetch(`${base}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: origin },
    body: JSON.stringify({ email, password }),
  });
  assert.equal(response.status, 200, `Login failed for ${email}`);
  return {
    cookie: response.headers
      .getSetCookie()
      .map((value) => value.split(";")[0])
      .join("; "),
    user: (await response.json()).data.user,
  };
}
async function req(
  session: Awaited<ReturnType<typeof login>>,
  path: string,
  status: number,
  body?: unknown,
  method = body ? "POST" : "GET",
) {
  const response = await fetch(`${base}/api${path}`, {
    method,
    headers: {
      Cookie: session.cookie,
      Origin: origin,
      "Content-Type": "application/json",
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await response.json();
  assert.equal(
    response.status,
    status,
    `${method} ${path}: ${JSON.stringify(data)}`,
  );
  return { data: data.data, headers: response.headers };
}
const owner = await login("agency.admin.a@aone.local"),
  admin = await login("branch.admin.a1@aone.local"),
  employee = await login("agent.a1@aone.local");
const userId = employee.user.id;
let documentId = "",
  roleId = "";
try {
  const member = (await req(owner, `/agents/${userId}`, 200)).data;
  assert.equal(member.passwordHash, undefined);
  assert.ok(member.agency);
  assert.ok(member.branch);
  assert.ok(Array.isArray(member.role.permissions));
  await req(employee, `/agents/${userId}/documents`, 403);
  await req(admin, `/agents/${owner.user.id}/documents`, 403);
  const image = {
    label: "QA temporary image",
    documentType: "IDENTITY",
    fileName: "qa-image.png",
    mimeType: "image/png",
    base64:
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jA4sAAAAASUVORK5CYII=",
  };
  await req(owner, `/agents/${userId}/documents`, 400, {
    ...image,
    mimeType: "image/jpeg",
  });
  const created = await req(admin, `/agents/${userId}/documents`, 200, image);
  documentId = created.data.id;
  assert.equal(created.data.content, undefined);
  const listed = await req(owner, `/agents/${userId}/documents`, 200);
  assert.ok(listed.data.some((item: { id: string }) => item.id === documentId));
  assert.ok(
    listed.data.every(
      (item: { content?: unknown }) => item.content === undefined,
    ),
  );
  const read = await req(
    admin,
    `/agents/${userId}/documents/${documentId}`,
    200,
  );
  assert.equal(read.data.dataUrl, `data:image/png;base64,${image.base64}`);
  assert.equal(read.headers.get("Cache-Control"), "private, no-store");
  await req(employee, `/agents/${userId}/documents`, 403, image);
  await req(
    owner,
    `/agents/${userId}/personal-details`,
    400,
    { dateOfBirth: "2099-01-01" },
    "PATCH",
  );
  await req(
    owner,
    `/agents/${userId}/personal-details`,
    400,
    { emergencyContactPhone: "123" },
    "PATCH",
  );
  const role = (
    await req(owner, "/agency/roles", 201, {
      name: `QA temporary ${Date.now()}`,
      scope: "BRANCH",
      permissions: ["booking:read"],
    })
  ).data;
  roleId = role.id;
  assert.ok(roleId);
  await req(admin, "/agency/roles", 403, {
    name: "Blocked",
    scope: "BRANCH",
    permissions: ["booking:read"],
  });
  console.log(
    "User profile, document upload/read/delete boundaries, file validation, personal field validation and custom-role creation checks passed.",
  );
} finally {
  if (documentId)
    await req(
      owner,
      `/agents/${userId}/documents/${documentId}`,
      200,
      undefined,
      "DELETE",
    );
  if (roleId)
    await req(owner, `/agency/roles/${roleId}`, 200, undefined, "DELETE");
  await Promise.all(
    [owner, admin, employee].map((session) =>
      fetch(`${base}/api/auth/logout`, {
        method: "POST",
        headers: { Cookie: session.cookie, Origin: origin },
      }),
    ),
  );
}
