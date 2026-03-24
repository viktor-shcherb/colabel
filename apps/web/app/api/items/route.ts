import { getSession } from "@/lib/auth";
import { getCachedItem, getCachedItemCount, prefetchItemWindow } from "@/lib/cache";
import { getProjectBySlug } from "@/lib/projects";
import { getDbProject } from "@/lib/queries/projects";
import { getAnnotation } from "@/lib/queries/annotations";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const projectSlug = searchParams.get("project");
  const indexStr = searchParams.get("index");
  const windowStr = searchParams.get("window");

  if (!projectSlug || indexStr === null) {
    return Response.json(
      { error: "Missing required params: project, index" },
      { status: 400 },
    );
  }

  const index = Number(indexStr);
  const windowSize = Number(windowStr || "5");

  if (!Number.isInteger(index) || index < 0) {
    return Response.json({ error: "Invalid index" }, { status: 400 });
  }

  const proj = getProjectBySlug(projectSlug);
  if (!proj) {
    return Response.json({ error: "Project not found" }, { status: 404 });
  }

  // Get the real DB project ID (not the hardcoded one)
  const dbProject = await getDbProject(projectSlug);
  if (!dbProject) {
    return Response.json({ error: "Project not in database" }, { status: 404 });
  }

  const { hf_dataset, hf_config, hf_split } = proj.config;
  const userId = session.user.sub as string;

  try {
    // Fetch item count, current item, and user's annotation in parallel
    const [itemCount, item, existingAnnotation] = await Promise.all([
      getCachedItemCount(hf_dataset, hf_config, hf_split),
      getCachedItem(hf_dataset, hf_config, hf_split, index),
      getAnnotation(dbProject.id, userId, index),
    ]);

    if (index >= itemCount) {
      return Response.json({ error: "Index out of range" }, { status: 400 });
    }

    // Prefetch adjacent items in background (don't await)
    const prefetchOffset = Math.max(0, index - 2);
    const prefetchLength = Math.min(10, itemCount - prefetchOffset);
    prefetchItemWindow(
      hf_dataset,
      hf_config,
      hf_split,
      prefetchOffset,
      prefetchLength,
    ).catch((err) => console.error("Prefetch failed:", err));

    return Response.json({
      item,
      itemCount,
      annotation: existingAnnotation?.labels ?? null,
      projectId: dbProject.id,
    });
  } catch (err) {
    console.error("Failed to fetch item:", err);
    return Response.json(
      { error: "Failed to fetch item" },
      { status: 500 },
    );
  }
}
