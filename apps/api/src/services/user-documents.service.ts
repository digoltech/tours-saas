import { prisma } from "../config/prisma.js";
import type { AuthContext } from "../types/auth.js";
import { getAgent } from "./management.service.js";

function invalid(message: string): never {
  throw Object.assign(new Error(message), {
    statusCode: 400,
    code: "INVALID_REQUEST",
  });
}
export function decodeDocumentImage(mimeType: string, base64: string) {
  if (
    base64.length > 1398104 ||
    base64.length % 4 !== 0 ||
    !/^[A-Za-z0-9+/]*={0,2}$/.test(base64)
  )
    invalid("Choose an image no larger than 1 MB");
  const content = Buffer.from(base64, "base64");
  if (
    !content.length ||
    content.length > 1048576 ||
    content.toString("base64") !== base64
  )
    invalid("Choose an image no larger than 1 MB");
  const png = content
    .subarray(0, 8)
    .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const jpeg =
    content[0] === 255 &&
    content[1] === 216 &&
    content[2] === 255 &&
    content.at(-2) === 255 &&
    content.at(-1) === 217;
  const webp =
    content.toString("ascii", 0, 4) === "RIFF" &&
    content.toString("ascii", 8, 12) === "WEBP";
  if (!(
    (mimeType === "image/png" && png) ||
    (mimeType === "image/jpeg" && jpeg) ||
    (mimeType === "image/webp" && webp)
  ))
    invalid("Upload a valid PNG, JPEG or WebP image");
  return content;
}
const metadata = {
  id: true,
  userId: true,
  label: true,
  documentType: true,
  fileName: true,
  mimeType: true,
  size: true,
  createdAt: true,
} as const;
export async function listUserDocuments(context: AuthContext, userId: string) {
  await getAgent(context, userId);
  return prisma.userDocument.findMany({
    where: { userId },
    select: metadata,
    orderBy: { createdAt: "desc" },
  });
}
export async function readUserDocument(
  context: AuthContext,
  userId: string,
  id: string,
) {
  await getAgent(context, userId);
  const document = await prisma.userDocument.findFirst({
    where: { id, userId },
  });
  if (!document)
    throw Object.assign(new Error("Document not found"), {
      statusCode: 404,
      code: "NOT_FOUND",
    });
  return {
    ...document,
    content: undefined,
    uploadedById: undefined,
    dataUrl: `data:${document.mimeType};base64,${Buffer.from(document.content).toString("base64")}`,
  };
}
export async function uploadUserDocument(
  context: AuthContext,
  userId: string,
  input: {
    label: string;
    documentType: string;
    fileName: string;
    mimeType: string;
    base64: string;
  },
) {
  const member = await getAgent(context, userId);
  const content = decodeDocumentImage(input.mimeType, input.base64);
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${userId} FOR UPDATE`;
    if ((await tx.userDocument.count({ where: { userId } })) >= 10)
      invalid("A team member can have up to 10 documents");
    const document = await tx.userDocument.create({
      data: {
        userId,
        label: input.label,
        documentType: input.documentType,
        fileName: input.fileName,
        mimeType: input.mimeType,
        content,
        size: content.length,
        uploadedById: context.userId,
      },
      select: metadata,
    });
    await tx.auditLog.create({
      data: {
        agencyId: member.agencyId!,
        branchId: member.branchId,
        actorId: context.userId,
        action: "USER_DOCUMENT_UPLOADED",
        entityType: "UserDocument",
        entityId: document.id,
        details: { userId, documentType: input.documentType },
      },
    });
    return document;
  });
}
export async function deleteUserDocument(
  context: AuthContext,
  userId: string,
  id: string,
) {
  const member = await getAgent(context, userId);
  return prisma.$transaction(async (tx) => {
    const result = await tx.userDocument.deleteMany({ where: { id, userId } });
    if (!result.count)
      throw Object.assign(new Error("Document not found"), {
        statusCode: 404,
        code: "NOT_FOUND",
      });
    await tx.auditLog.create({
      data: {
        agencyId: member.agencyId!,
        branchId: member.branchId,
        actorId: context.userId,
        action: "USER_DOCUMENT_DELETED",
        entityType: "UserDocument",
        entityId: id,
        details: { userId },
      },
    });
    return { deleted: true };
  });
}
export type PersonalDetailsInput = {
  dateOfBirth?: string | null;
  gender?: string | null;
  jobTitle?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
};
export async function savePersonalDetails(
  context: AuthContext,
  userId: string,
  input: PersonalDetailsInput,
) {
  const member = await getAgent(context, userId);
  const { dateOfBirth, ...otherDetails } = input;
  const data = {
    ...otherDetails,
    ...(dateOfBirth !== undefined
      ? {
          dateOfBirth: dateOfBirth
            ? new Date(`${dateOfBirth}T00:00:00Z`)
            : null,
        }
      : {}),
  };
  return prisma.$transaction(async (tx) => {
    const result = await tx.userPersonalDetails.upsert({
      where: { userId },
      create: { userId, ...data },
      update: data,
    });
    await tx.auditLog.create({
      data: {
        agencyId: member.agencyId!,
        branchId: member.branchId,
        actorId: context.userId,
        action: "USER_PERSONAL_DETAILS_UPDATED",
        entityType: "User",
        entityId: userId,
      },
    });
    return result;
  });
}
