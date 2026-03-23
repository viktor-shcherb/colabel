import { redirect } from "next/navigation";

interface AnnotatePageProps {
  searchParams: Promise<{ project?: string }>;
}

export default async function AnnotatePage({
  searchParams,
}: AnnotatePageProps) {
  const params = await searchParams;

  // If a project slug is provided as query param, redirect to the slug route
  if (params.project) {
    redirect(`/annotate/${params.project}`);
  }

  // Otherwise, send to projects page
  redirect("/projects");
}
