import { getSession } from "@/lib/auth";
import {
  getAnnotationsForItem,
  getAnnotationsForItemByUsers,
} from "@/lib/queries/annotations";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get("projectId");
  const itemIndexStr = searchParams.get("itemIndex");
  const userIdsParam = searchParams.get("userIds");

  if (!projectId || itemIndexStr === null) {
    return Response.json(
      { error: "Missing required params: projectId, itemIndex" },
      { status: 400 },
    );
  }

  const itemIndex = Number(itemIndexStr);
  if (!Number.isInteger(itemIndex) || itemIndex < 0) {
    return Response.json({ error: "Invalid itemIndex" }, { status: 400 });
  }

  const currentUserId = session.user.sub as string;

  try {
    let annotations;
    if (userIdsParam) {
      // Filter to specific users, excluding current user
      const userIds = userIdsParam
        .split(",")
        .filter((id) => id.trim() && id.trim() !== currentUserId)
        .map((id) => id.trim());
      annotations = await getAnnotationsForItemByUsers(
        projectId,
        itemIndex,
        userIds,
      );
    } else {
      // Get all other annotators' annotations for this item
      annotations = await getAnnotationsForItem(
        projectId,
        itemIndex,
        currentUserId,
      );
    }

    return Response.json({
      annotations: annotations.map((a) => ({
        userId: a.userId,
        userName: a.userName,
        labels: a.labels,
      })),
    });
  } catch (err) {
    console.error("Failed to fetch comparison annotations:", err);
    return Response.json(
      { error: "Failed to fetch comparison annotations" },
      { status: 500 },
    );
  }
}
