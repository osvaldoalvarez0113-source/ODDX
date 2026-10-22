/* OVA · Worker de NBA.com (Cloudflare).

   Por qué existe: NBA.com (cdn.nba.com) solo deja leer sus datos a páginas de nba.com, así que desde la app Safari los bloquea
   ("Load failed"). Este Worker los pide por ti y los devuelve con permiso para tu página. Medido con partidos en vivo:
   NBA.com llega unos 20 s antes que ESPN (31 s contra 52 s de atraso).

   Cómo ponerlo (desde el iPhone, en dash.cloudflare.com):
   1. Workers y Pages > Crear > Worker > ponle de nombre  nba-ova  > Implementar.
   2. Editar código > borra lo que trae, pega TODO este archivo > Implementar.
   3. Copia la dirección que te da (algo como https://nba-ova.TU-USUARIO.workers.dev) y pásamela, o ponla en envivo.js en NBA_PROXY.

   Seguridad: solo responde a tu página (Origin), solo a 3 tipos de archivo de NBA.com y solo con GET. No guarda copia (así llega fresco).
*/
const ORIGENES = ['https://osvaldoalvarez0113-source.github.io'];
const PERMITIDO = /^(scoreboard|playbyplay|boxscore)\/[A-Za-z0-9_.-]+\.json$/;

function cab(origen) {
  return { 'Access-Control-Allow-Origin': origen, 'Vary': 'Origin', 'Cache-Control': 'no-store' };
}

export default {
  async fetch(request) {
    const origen = request.headers.get('Origin') || '';
    const ok = ORIGENES.indexOf(origen) >= 0;
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: ok ? 204 : 403, headers: ok ? Object.assign(cab(origen), { 'Access-Control-Allow-Methods': 'GET', 'Access-Control-Max-Age': '600' }) : {} });
    }
    if (request.method !== 'GET' || !ok) return new Response('No permitido', { status: 403 });
    const url = new URL(request.url);
    const m = /^\/nba\/(.+)$/.exec(url.pathname);
    if (!m || !PERMITIDO.test(m[1])) return new Response('No encontrado', { status: 404, headers: cab(origen) });
    const r = await fetch('https://cdn.nba.com/static/json/liveData/' + m[1], {
      headers: { 'Referer': 'https://www.nba.com/', 'Origin': 'https://www.nba.com', 'Accept': 'application/json, text/plain, */*',
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' },
      cf: { cacheTtl: 0, cacheEverything: false }
    });
    return new Response(r.body, { status: r.status, headers: Object.assign({ 'content-type': 'application/json' }, cab(origen)) });
  }
};
