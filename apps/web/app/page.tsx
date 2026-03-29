import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";

export default async function Home() {
  const session = await getSession();

  if (session) {
    redirect("/projects");
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-white to-gray-100 px-4">
      <div className="w-full max-w-md text-center">
        {/* Logo / title */}
        <h1 className="text-4xl font-bold tracking-tight text-gray-900">
          Colabel
        </h1>
        <p className="mt-3 text-lg text-gray-500">
          Collaborative text annotation for research teams
        </p>

        {/* Description */}
        <p className="mx-auto mt-6 max-w-sm text-sm leading-relaxed text-gray-400">
          Label chat conversations with configurable annotation schemas.
          Manage teams, track progress, and export results to HuggingFace.
        </p>

        {/* Login button */}
        <a
          href="/auth/login"
          className="mt-8 inline-flex items-center gap-2 rounded-lg bg-gray-900 px-6 py-3 text-sm font-medium text-white shadow-sm transition-colors hover:bg-gray-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900"
        >
          Log in with Google
        </a>

        {/* Footer */}
        <p className="mt-12 text-xs text-gray-300">
          Built for annotation research workflows
        </p>
      </div>
    </div>
  );
}
