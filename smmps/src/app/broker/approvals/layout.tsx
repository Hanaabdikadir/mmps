export default function BrokerApprovalsLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="-my-6 flex min-h-[calc(100dvh-8.5rem)] flex-col items-center justify-center px-2 py-3 sm:-my-6 sm:px-4">
      {children}
    </div>
  );
}
