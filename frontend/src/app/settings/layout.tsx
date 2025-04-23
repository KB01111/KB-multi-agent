export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-screen w-screen flex flex-col overflow-hidden bg-gray-50">
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
