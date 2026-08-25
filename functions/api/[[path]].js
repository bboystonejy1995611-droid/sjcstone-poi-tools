/**
 * Pages 同域 API 入口。
 * POI_API 是指向 poi-billing-api Worker 的 Service Binding，调用不经过公网。
 */
export async function onRequest({ request, env }) {
  if (!env.POI_API?.fetch) {
    return Response.json(
      {
        ok: false,
        error: { code: 'service_unavailable', message: '服务暂时不可用，请稍后重试' }
      },
      { status: 503 }
    )
  }

  return env.POI_API.fetch(request)
}
