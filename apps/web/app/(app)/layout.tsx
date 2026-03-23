import { auth0 } from "@/lib/auth";
import { syncUser } from "@/lib/queries/users";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth0.getSession();
  const userProfile = session?.user;

  // Sync user to DB (upsert on each visit)
  if (userProfile) {
    await syncUser({
      sub: userProfile.sub as string,
      email: userProfile.email as string,
      name: userProfile.name as string | null,
      picture: userProfile.picture as string | null,
    });
  }

  const userName =
    (userProfile?.name as string) ??
    (userProfile?.email as string) ??
    "User";

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <header className="mb-8 flex items-center justify-between">
        <h1 className="text-xl font-semibold">
          <a href="/projects">Colabel</a>
        </h1>
        <nav className="flex items-center gap-4 text-sm">
          <a href="/projects" className="hover:underline">
            Projects
          </a>
          <span className="text-gray-400">|</span>
          <span className="text-gray-600">{userName}</span>
          <a
            href="/api/auth/logout"
            className="text-red-600 hover:underline"
          >
            Log out
          </a>
        </nav>
      </header>
      <main>{children}</main>
    </div>
  );
}
