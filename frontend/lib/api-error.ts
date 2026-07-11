/** Parsed API error with user-facing message. */
export class ApiError extends Error {
  readonly status: number;
  readonly code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

function messageFromDetail(detail: unknown): string | null {
  if (detail == null) return null;
  if (typeof detail === "string") return detail;
  if (typeof detail !== "object") return null;

  const obj = detail as Record<string, unknown>;

  if (obj.error && typeof obj.error === "object") {
    const nested = obj.error as Record<string, unknown>;
    if (typeof nested.message === "string") return nested.message;
    if (typeof nested.code === "string" && typeof nested.message === "string") {
      return nested.message;
    }
  }

  if (typeof obj.message === "string") return obj.message;
  if (typeof obj.error === "string") return obj.error;

  return null;
}

/** Extract a single user-facing message from a FastAPI error body. */
export function parseApiErrorBody(
  body: unknown,
  status: number,
  fallback = "Something went wrong. Please try again.",
): ApiError {
  if (body != null && typeof body === "object") {
    const obj = body as Record<string, unknown>;

    if (obj.error && typeof obj.error === "object") {
      const err = obj.error as Record<string, unknown>;
      const message =
        typeof err.message === "string"
          ? err.message
          : fallback;
      const code = typeof err.code === "string" ? err.code : undefined;
      return new ApiError(message, status, code);
    }

    if (Array.isArray(obj.detail)) {
      const first = obj.detail[0];
      if (first && typeof first === "object" && "msg" in first) {
        return new ApiError(String((first as { msg: string }).msg), status, "VALIDATION_ERROR");
      }
    }

    const detailMessage = messageFromDetail(obj.detail);
    if (detailMessage) {
      return new ApiError(detailMessage, status);
    }
  }

  return new ApiError(fallback, status);
}