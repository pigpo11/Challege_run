export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);

        // /img-proxy 경로로 들어오는 요청을 가로채서 캐싱 처리
        if (url.pathname === '/img-proxy') {
            const targetUrl = url.searchParams.get('url');

            if (!targetUrl) {
                return new Response('No target URL provided', { status: 400 });
            }

            // Cloudflare 캐싱 규칙 적용 (1주일간 전 세계 서버에 저장)
            return fetch(targetUrl, {
                cf: {
                    cacheEverything: true,
                    cacheTtl: 604800,
                },
            });
        }

        // 그 외 모든 요청은 웹사이트 정적 파일(Vite 빌드 결과물)을 보여줌
        return env.ASSETS.fetch(request);
    },
};
