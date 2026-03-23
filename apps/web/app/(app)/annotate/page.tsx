interface AnnotatePageProps {
  searchParams: Promise<{ project?: string }>;
}

export default async function AnnotatePage({ searchParams }: AnnotatePageProps) {
  const params = await searchParams;
  const projectSlug = params.project;

  return (
    <div>
      <h2 className="mb-4 text-lg font-medium">Annotate</h2>
      {projectSlug ? (
        <p className="text-gray-600">
          Annotation interface for project{" "}
          <code className="rounded bg-gray-100 px-1 text-sm">
            {projectSlug}
          </code>{" "}
          will be implemented in stage 06.
        </p>
      ) : (
        <p className="text-gray-500">
          Select a project from the{" "}
          <a href="/projects" className="text-blue-600 hover:underline">
            projects page
          </a>{" "}
          first.
        </p>
      )}
    </div>
  );
}
