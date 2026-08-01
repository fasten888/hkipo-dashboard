type JsonResponse = {
  status: (code: number) => JsonResponse
  json: (body: unknown) => void
}

export function sendError(
  response: JsonResponse,
  error: unknown,
  stage = 'database-query',
) {
  const classified = classifyDatabaseError(error)
  console.error('[api]', { stage, code: classified.code, error })

  response.status(500).json({
    ok: false,
    error: classified.message,
    code: classified.code,
    stage,
    stack:
      process.env.NODE_ENV !== 'production' && error instanceof Error
        ? error.stack
        : undefined,
  })
}

function classifyDatabaseError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error)

  if (/tenant\/user .* not found|no tenant identifier/i.test(message)) {
    return {
      code: 'SUPABASE_TENANT_NOT_FOUND',
      message: 'Supabase 数据库租户不存在，请检查 DATABASE_URL 的项目 Ref、Pooler 区域和用户名。',
    }
  }
  if (/P1001|can't reach database server|connect timeout|connection refused/i.test(message)) {
    return {
      code: 'DATABASE_UNREACHABLE',
      message: '无法连接 Supabase 数据库，请检查 DATABASE_URL 和项目网络状态。',
    }
  }
  if (/P1010|permission denied|not authorized/i.test(message)) {
    return {
      code: 'DATABASE_PERMISSION_DENIED',
      message: 'Supabase 数据库权限验证失败，请检查数据库凭证。',
    }
  }
  if (/P2021|table .* does not exist|column .* does not exist/i.test(message)) {
    return {
      code: 'DATABASE_SCHEMA_MISMATCH',
      message: '数据库结构与 Prisma Schema 不一致。',
    }
  }
  return {
    code: 'DATABASE_QUERY_FAILED',
    message: '数据库查询失败，请查看 Vercel Function 日志。',
  }
}
