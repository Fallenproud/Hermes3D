import path from "node:path";

const DEFAULT_VOICE_MIME = "audio/webm";
const DEFAULT_VOICE_BASENAME = "voice-note";

const MIME_EXTENSION_MAP: Record<string, string> = {
  "audio/mp4": ".m4a",
  "audio/mpeg": ".mp3",
  "audio/ogg": ".ogg",
  "audio/wav": ".wav",
  "audio/webm": ".webm",
  "audio/x-m4a": ".m4a",
  "audio/x-wav": ".wav",
};

type TranscriptionDecision = {
  outcome?: string;
  attachments?: Array<{
    attempts?: Array<{
      reason?: string;
    }>;
  }>;
};

export type VoiceTranscriptionResult = {
  transcript: string | null;
  provider: string | null;
  model: string | null;
  decision: TranscriptionDecision | null;
  ignored: boolean;
};

export const normalizeVoiceMimeType = (value: string | null | undefined): string => {
  const trimmed = value?.trim().toLowerCase() ?? "";
  if (!trimmed) return DEFAULT_VOICE_MIME;
  const [baseType] = trimmed.split(";", 1);
  return MIME_EXTENSION_MAP[baseType] ? baseType : trimmed.startsWith("audio/") ? baseType : DEFAULT_VOICE_MIME;
};

export const inferVoiceFileExtension = (
  fileName: string | null | undefined,
  mimeType: string | null | undefined,
): string => {
  const trimmedName = fileName?.trim() ?? "";
  const nameExtension = path.extname(trimmedName).toLowerCase();
  if (nameExtension && Object.values(MIME_EXTENSION_MAP).includes(nameExtension)) {
    return nameExtension;
  }
  return MIME_EXTENSION_MAP[normalizeVoiceMimeType(mimeType)] ?? MIME_EXTENSION_MAP[DEFAULT_VOICE_MIME];
};

export const sanitizeVoiceFileName = (
  fileName: string | null | undefined,
  mimeType: string | null | undefined,
): string => {
  const extension = inferVoiceFileExtension(fileName, mimeType);
  const rawBase = path.basename(fileName?.trim() || DEFAULT_VOICE_BASENAME, path.extname(fileName?.trim() || ""));
  const sanitizedBase =
    rawBase.replace(/[^a-z0-9._-]+/gi, "-").replace(/-+/g, "-").replace(/^[-.]+|[-.]+$/g, "") ||
    DEFAULT_VOICE_BASENAME;
  const normalizedBase = sanitizedBase.toLowerCase();
  return normalizedBase.endsWith(extension) ? normalizedBase : `${normalizedBase}${extension}`;
};

export const buildVoiceTranscriptionErrorMessage = (
  decision: TranscriptionDecision | null | undefined,
): string => {
  if (!decision) return "The transcription provider did not return a transcript.";
  const outcome = decision.outcome?.trim() || "unknown";
  const reasons = (decision.attachments ?? [])
    .flatMap((attachment) => attachment.attempts ?? [])
    .map((attempt) => attempt.reason?.trim() ?? "")
    .filter(Boolean);
  const detail = reasons[0] ? ` ${reasons[0]}` : "";
  switch (outcome) {
    case "disabled":
      return `Audio transcription is disabled.${detail}`.trim();
    case "no-attachment":
      return "The transcription provider did not receive any audio to transcribe.";
    case "scope-deny":
      return `The transcription provider blocked audio transcription for this request.${detail}`.trim();
    case "skipped":
      return `The transcription provider skipped audio transcription.${detail}`.trim();
    default:
      return `The transcription provider did not return a transcript.${detail}`.trim();
  }
};

export const shouldIgnoreVoiceTranscription = (params: {
  transcript: string | null | undefined;
  decision: TranscriptionDecision | null | undefined;
}): boolean => {
  const transcript = params.transcript?.trim() ?? "";
  if (transcript) return false;
  const reasons = (params.decision?.attachments ?? [])
    .flatMap((attachment) => attachment.attempts ?? [])
    .map((attempt) => attempt.reason?.trim().toLowerCase() ?? "")
    .filter(Boolean);
  return reasons.some((reason) =>
    [
      "missing text",
      "empty transcript",
      "no speech",
      "no audio detected",
      "no transcript text",
    ].some((snippet) => reason.includes(snippet)),
  );
};
