/**
 * GET /api/posters/[id] — stream poster bytes out of the GridFS "posters"
 * bucket. Content-Type comes from the file's `metadata.mime`; bytes are
 * immutable per id, so they are served with long-lived cache headers + an ETag
 * (supporting conditional 304s). Unknown/malformed ids 404 cleanly.
 *
 * Next 16: `params` is a Promise (awaited); the body is a Web `ReadableStream`
 * wrapping the mongodb v7 GridFS download stream (a Node `Readable`).
 */

import { ObjectId } from "mongodb";
import { getBucket } from "@/lib/mongo";
import { errorBody } from "@/lib/dto";
import { getCurrentUser } from "@/lib/auth";
import { findPostByPosterId } from "@/lib/posts-repo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/** One year, in seconds — poster bytes never change for a given id. */
const ONE_YEAR = 60 * 60 * 24 * 365;

function notFound(): Response {
  return Response.json(errorBody("Poster not found", "not_found"), {
    status: 404,
  });
}

export async function GET(request: Request, ctx: Ctx): Promise<Response> {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json(errorBody("Authentication required.", "unauthorized"), {
      status: 401,
    });
  }
  const { id } = await ctx.params;

  if (!ObjectId.isValid(id)) return notFound();
  const fileId = new ObjectId(id);

  // Only serve a poster that belongs to a post the caller owns (404 otherwise —
  // no cross-tenant existence leak).
  const owningPost = await findPostByPosterId(user.id, id);
  if (!owningPost) return notFound();

  const bucket = await getBucket();

  // Look the file up first so we can 404 cleanly and read its mime/length
  // before opening a byte stream (openDownloadStream errors async on a miss).
  const file = await bucket.find({ _id: fileId }).limit(1).next();
  if (!file) return notFound();

  const mime =
    (typeof file.metadata?.mime === "string" && file.metadata.mime) ||
    "image/png";
  const etag = `"${file._id.toHexString()}"`;

  // Conditional request: bytes are immutable, so a matching ETag is a 304.
  if (request.headers.get("if-none-match") === etag) {
    return new Response(null, {
      status: 304,
      headers: {
        ETag: etag,
        "Cache-Control": `public, max-age=${ONE_YEAR}, immutable`,
      },
    });
  }

  const download = bucket.openDownloadStream(fileId);
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      download.on("data", (chunk: Buffer) => {
        controller.enqueue(
          new Uint8Array(chunk.buffer, chunk.byteOffset, chunk.byteLength),
        );
      });
      download.on("end", () => controller.close());
      download.on("error", (err) => controller.error(err));
    },
    cancel() {
      download.destroy();
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": mime,
      "Content-Length": String(file.length),
      "Cache-Control": `public, max-age=${ONE_YEAR}, immutable`,
      ETag: etag,
    },
  });
}
