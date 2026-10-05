import { ChangePasswordForm } from "@/components/auth/ChangePasswordForm";

export const dynamic = "force-dynamic";

export default function SuperAdminChangePasswordPage() {
  return (
    <div className="flex h-[calc(100dvh-9rem)] min-h-0 w-full max-w-none items-center justify-center overflow-hidden">
      <ChangePasswordForm />
    </div>
  );
}
