import { NextResponse } from "next/server";

export const runtime = "nodejs";

export const MAX_VOICE_UPLOAD_BYTES = 20 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    // ── Early size check via Content-Length ──────────────────────────────────
    // Reject obviously-oversized uploads BEFORE buffering any request body
    // into memory. This prevents a DoS/OOM attack where a huge payload is
    // fully read before the limit is enforced.
    //
    // Important: Content-Length for multipart/form-data includes boundary
    // headers and field metadata overhead — not just the raw audio bytes.
    // A typical multipart envelope adds ~200–500 bytes; we use a generous
    // 1 KB overhead allowance so that a file at exactly MAX_VOICE_UPLOAD_BYTES
    // is never incorrectly rejected by this pre-buffer check.
    //
    // The post-buffer check (below) is the authoritative size limit and
    // measures the actual audio bytes — this early check only eliminates
    // obviously-oversized requests.
    const MULTIPART_OVERHEAD_ALLOWANCE = 1024; // 1 KB — safe upper bound
    const contentLengthHeader = request.headers.get("content-length");
    if (contentLengthHeader !== null) {
      const contentLength = Number(contentLengthHeader);
      if (
        !Number.isNaN(contentLength) &&
        contentLength > MAX_VOICE_UPLOAD_BYTES + MULTIPART_OVERHEAD_ALLOWANCE
      ) {
        return NextResponse.json(
          {
            error: `Audio upload exceeds the ${MAX_VOICE_UPLOAD_BYTES} byte limit.`,
          },
          { status: 413 },
        );
      }
    }

    const formData = await request.formData();
    const audio = formData.get("audio");
    // Use duck-typing instead of `instanceof File` to guard against cross-realm
    // issues where jsdom/test environments expose a different File constructor.
    if (
      audio === null ||
      typeof audio !== "object" ||
      typeof (audio as File).arrayBuffer !== "function"
    ) {
      return NextResponse.json({ error: "audio file is required." }, { status: 400 });
    }
    const audioFile = audio as File;

    const arrayBuffer = await audioFile.arrayBuffer();
    const byteLength = arrayBuffer.byteLength;
    if (byteLength <= 0) {
      return NextResponse.json({ error: "Audio upload is empty." }, { status: 400 });
    }

    // ── Secondary (post-buffer) size check ──────────────────────────────────
    // Guards against a missing or falsified Content-Length header. Status 413
    // is used here too for consistency (the body IS too large, regardless of
    // what the header claimed).
    if (byteLength > MAX_VOICE_UPLOAD_BYTES) {
      return NextResponse.json(
        {
          error: `Audio upload exceeds the ${MAX_VOICE_UPLOAD_BYTES} byte limit.`,
        },
        { status: 413 },
      );
    }

    // Hermes3D does not bundle a speech-to-text provider. The upload is validated
    // here so callers get a useful error, but transcription itself is unimplemented.
    return NextResponse.json(
      {
        error:
          "Voice transcription is not configured. Connect an external transcription provider to enable voice notes.",
      },
      { status: 501 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to transcribe audio.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
