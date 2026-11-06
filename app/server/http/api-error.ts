export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly fields?: Record<string, string>,
    public readonly headers?: HeadersInit,
  ) {
    super(message);
    this.name = "ApiError";
  }
}
