-- CreateTable
CREATE TABLE "registration_messages" (
    "id" SERIAL NOT NULL,
    "thread_user_id" INTEGER NOT NULL,
    "sender_id" INTEGER NOT NULL,
    "body" TEXT NOT NULL,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "registration_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "registration_messages_thread_user_id_created_at_idx" ON "registration_messages"("thread_user_id", "created_at");

-- CreateIndex
CREATE INDEX "registration_messages_sender_id_idx" ON "registration_messages"("sender_id");

-- AddForeignKey
ALTER TABLE "registration_messages" ADD CONSTRAINT "registration_messages_thread_user_id_fkey" FOREIGN KEY ("thread_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registration_messages" ADD CONSTRAINT "registration_messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
