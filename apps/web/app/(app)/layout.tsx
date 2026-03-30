import { getSession } from "@/lib/auth";
import { syncUser } from "@/lib/queries/users";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  const userProfile = session?.user;

  // Sync user to DB (upsert on each visit)
  if (userProfile) {
    await syncUser({
      sub: userProfile.sub as string,
      email: userProfile.email as string,
      name: userProfile.name as string | null,
      picture: (userProfile.picture as string | null) ?? null,
    });
  }

  const userName =
    (userProfile?.name as string) ??
    (userProfile?.email as string) ??
    "User";

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:px-6">
          <a
            href="/projects"
            className="text-lg font-semibold tracking-tight text-gray-900"
          >
            Colabel
          </a>
          <nav className="flex items-center gap-1 text-sm">
            <a
              href="/projects"
              className="rounded-md px-3 py-1.5 font-medium text-gray-600 transition-colors hover:bg-gray-100 hover:text-gray-900"
            >
              Projects
            </a>
            <span className="mx-1 h-4 w-px bg-gray-200" aria-hidden="true" />
            <span className="px-2 text-sm text-gray-500">{userName}</span>
            <a
              href="/logout"
              className="rounded-md px-3 py-1.5 font-medium text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
            >
              Log out
            </a>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        {children}
      </main>
    </div>
  );
}
