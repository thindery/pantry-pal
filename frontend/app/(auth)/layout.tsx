export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-[100dvh] flex flex-col items-center justify-center bg-gradient-to-br from-[var(--primary-muted)] to-slate-100 p-4">
      {children}
    </div>
  );
}