import { getProjectBySlug } from "@/lib/projects";
import { getDbProject } from "@/lib/queries/projects";
import { AnnotationPage } from "@/components/annotation/AnnotationPage";
import { notFound } from "next/navigation";

interface AnnotateSlugPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ item?: string }>;
}

export default async function AnnotateSlugPage({
  params,
  searchParams,
}: AnnotateSlugPageProps) {
  const { slug } = await params;
  const { item } = await searchParams;
  const project = getProjectBySlug(slug);
  if (!project) notFound();

  const dbProject = await getDbProject(slug);
  if (!dbProject) notFound();

  const initialIndex = item ? Math.max(0, parseInt(item, 10) || 0) : undefined;

  return (
    <AnnotationPage
      projectId={dbProject.id}
      projectSlug={project.slug}
      projectName={project.name}
      instructions={project.instructions ?? null}
      config={project.config}
      initialIndex={initialIndex}
    />
  );
}
