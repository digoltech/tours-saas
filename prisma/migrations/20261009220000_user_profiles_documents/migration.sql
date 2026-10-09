CREATE TABLE "UserPersonalDetails" (
 "userId" TEXT NOT NULL, "dateOfBirth" DATE, "gender" TEXT, "jobTitle" TEXT, "address" TEXT, "city" TEXT, "state" TEXT, "country" TEXT,
 "emergencyContactName" TEXT, "emergencyContactPhone" TEXT, "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "UserPersonalDetails_pkey" PRIMARY KEY ("userId"),
 CONSTRAINT "UserPersonalDetails_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE "UserDocument" (
 "id" TEXT NOT NULL, "userId" TEXT NOT NULL, "label" TEXT NOT NULL, "documentType" TEXT NOT NULL, "fileName" TEXT NOT NULL,
 "mimeType" TEXT NOT NULL, "size" INTEGER NOT NULL, "content" BYTEA NOT NULL, "uploadedById" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 CONSTRAINT "UserDocument_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "UserDocument_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "UserDocument_userId_createdAt_idx" ON "UserDocument"("userId", "createdAt");
