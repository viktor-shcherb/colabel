export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <header className="mb-8 flex items-center justify-between">
        <h1 className="text-xl font-semibold">Colabel</h1>
        <nav className="flex gap-4 text-sm">
          <a href="/projects" className="hover:underline">
            Projects
          </a>
          <a href="/api/auth/logout" className="hover:underline">
            Log out
          </a>
        </nav>
      </header>
      <main>{children}</main>
    </div>
  );
}
