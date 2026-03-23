import { getProjectBySlug } from "@/lib/projects";
import { AnnotationPage } from "@/components/annotation/AnnotationPage";
import { notFound } from "next/navigation";

interface AnnotateSlugPageProps {
  params: Promise<{ slug: string }>;
}

export default async function AnnotateSlugPage({
  params,
}: AnnotateSlugPageProps) {
  const { slug } = await params;
  const project = getProjectBySlug(slug);

  if (!project) {
    notFound();
  }

  return (
    <AnnotationPage
      projectId={project.id}
      projectSlug={project.slug}
      projectName={project.name}
      instructions={project.instructions ?? null}
      config={project.config}
    />
  );
}
