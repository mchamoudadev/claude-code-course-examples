/**
 * GET    /api/posts/[id] — the live poll shape + full payload (T11/T12).
 * DELETE /api/posts/[id] — remove the post AND its GridFS poster bytes.
 *
 * Next 16: the dynamic route `params` is a Promise and MUST be awaited.
 */

import { ObjectId } from "mongodb";
import { getPostForUser, deletePostForUser } from "@/lib/posts-repo";
import { getBucket } from "@/lib/mongo";
import {
  errorBody,
  toPostDetail,
  type DeletePostResponse,
} from "@/lib/dto";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

async function requireUser(): Promise<{ id: string } | Response> {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json(errorBody("Authentication required.", "unauthorized"), {
      status: 401,
    });
  }
  return user;
}

export async function GET(_request: Request, ctx: Ctx): Promise<Response> {
  const auth = await requireUser();
  if (auth instanceof Response) return auth;
  const { id } = await ctx.params;

  // Scoped to the owner — a post that isn't yours is indistinguishable from
  // one that doesn't exist (no cross-tenant existence leak).
  const post = await getPostForUser(auth.id, id);
  if (!post) {
    return Response.json(errorBody("Post not found", "not_found"), {
      status: 404,
    });
  }
  return Response.json(toPostDetail(post));
}

export async function DELETE(_request: Request, ctx: Ctx): Promise<Response> {
  const auth = await requireUser();
  if (auth instanceof Response) return auth;
  const { id } = await ctx.params;

  const post = await getPostForUser(auth.id, id);
  if (!post) {
    return Response.json(errorBody("Post not found", "not_found"), {
      status: 404,
    });
  }

  // 1. Remove the GridFS poster bytes first (no orphans). Tolerate an
  //    already-missing file — the goal state is "no bytes for this id".
  if (post.posterImageId && ObjectId.isValid(post.posterImageId)) {
    try {
      const bucket = await getBucket();
      await bucket.delete(new ObjectId(post.posterImageId));
    } catch {
      // File already gone (or never fully written) — deletion is idempotent.
    }
  }

  // 2. Remove the post document, scoped to the owner.
  await deletePostForUser(auth.id, post._id);

  const body: DeletePostResponse = { id: post._id.toString(), deleted: true };
  return Response.json(body);
}
