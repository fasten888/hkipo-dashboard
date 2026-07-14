type JsonResponse = {
  status: (code: number) => JsonResponse
  json: (body: unknown) => void
}

export function sendError(response: JsonResponse, error: unknown) {
  console.error(error)

  response.status(500).json({
    ok: false,
    error: String(error),
    stack:
      process.env.NODE_ENV !== 'production' && error instanceof Error
        ? error.stack
        : undefined,
  })
}
