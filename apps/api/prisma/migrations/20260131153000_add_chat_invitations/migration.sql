-- CreateTable
CREATE TABLE "chat_invitations" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "chatId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "chat_invitations_code_key" ON "chat_invitations"("code");

-- CreateIndex
CREATE INDEX "chat_invitations_chatId_idx" ON "chat_invitations"("chatId");

-- CreateIndex
CREATE INDEX "chat_invitations_expiresAt_idx" ON "chat_invitations"("expiresAt");

-- AddForeignKey
ALTER TABLE "chat_invitations" ADD CONSTRAINT "chat_invitations_chatId_fkey" FOREIGN KEY ("chatId") REFERENCES "chats"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chat_invitations" ADD CONSTRAINT "chat_invitations_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
