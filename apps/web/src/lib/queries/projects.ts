import "server-only";
import { db } from "@/db";
import { project } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function getDbProject(slug: string) {
  return db.query.project.findFirst({
    where: eq(project.slug, slug),
  });
}
