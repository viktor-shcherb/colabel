import { getSession } from "@/lib/auth";
import { getAnnotationStats } from "@/lib/queries/annotations";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId");

  if (!projectId) {
    return Response.json(
      { error: "Missing required param: projectId" },
      { status: 400 },
    );
  }

  const currentUserId = session.user.sub as string;

  try {
    const stats = await getAnnotationStats(projectId);

    // Exclude the current user from the annotators list
    const annotators = stats
      .filter((s) => s.userId !== currentUserId)
      .map((s) => ({
        userId: s.userId,
        userName: s.userName,
        userEmail: s.userEmail,
        count: s.count,
      }));

    return Response.json({ annotators });
  } catch (err) {
    console.error("Failed to fetch annotators:", err);
    return Response.json(
      { error: "Failed to fetch annotators" },
      { status: 500 },
    );
  }
}
