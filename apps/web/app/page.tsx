import { redirect } from "next/navigation";
import { auth0 } from "@/lib/auth";

export default async function Home() {
  const session = await auth0.getSession();

  if (session) {
    redirect("/projects");
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6">
      <h1 className="text-3xl font-bold">Colabel</h1>
      <p className="text-gray-600">
        Collaborative text annotation platform for research teams.
      </p>
      <a
        href="/auth/login"
        className="rounded bg-gray-900 px-6 py-3 text-sm font-medium text-white hover:bg-gray-700"
      >
        Log in with Google
      </a>
    </div>
  );
}
