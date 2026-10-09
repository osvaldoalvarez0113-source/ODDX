/* OVA · Worker de IA (Cloudflare) — VERSION ENDURECIDA.

   Por que existe: el Worker original acepta CUALQUIER peticion de CUALQUIER sitio y la reenvia a Anthropic con tu clave.
   La direccion del Worker esta escrita en el repo publico (index.html / historial.js), asi que cualquiera que la lea puede
   gastar tu credito con peticiones propias (mas tokens, mas busquedas, otros modelos).

   Que hace esta version:
   - Solo contesta a peticiones que vienen de tu pagina (cabecera Origin). OJO: eso frena a otras PAGINAS WEB, no a alguien
     con curl, que puede inventar la cabecera. Por eso tambien:
   - Fija el modelo, la herramienta y los topes aqui, no los toma de quien llama (max_tokens y max_uses tienen techo).
   - Acepta un solo mensaje de texto de tamano limitado.
   - Limite de peticiones por IP si creas el binding LIMITE (opcional, ver abajo).

   Lo que sigue siendo tu responsabilidad:
   - En console.anthropic.com pon un LIMITE DE GASTO MENSUAL a esa clave. Es la unica proteccion real.
   - En Cloudflare, Worker > Settings > Variables:  ANTHROPIC_API_KEY (secreto, ya la tienes)  y  MODELO  (el modelo que ya
     usas hoy; si no la pones, se usa el de abajo).
   - Limite por IP (opcional): en wrangler.toml agrega
       [[unsafe.bindings]]
       name = "LIMITE"
       type = "ratelimit"
       namespace_id = "1001"
       simple = { limit = 10, period = 60 }
     y el Worker lo usara solo.
*/
const ORIGENES = ['https://osvaldoalvarez0113-source.github.io'];
const MAX_TOKENS = 4000;       /* techo de la respuesta (la app pide 4000) */
const MAX_BUSQUEDAS = 10;      /* techo de busquedas web (la app pide 10) */
const MAX_PROMPT = 12000;      /* caracteres del mensaje */
const HERRAMIENTA = 'web_search_20250305';   /* si Anthropic cambia la version de la herramienta, se cambia aqui */
const MODELO_POR_DEFECTO = 'claude-sonnet-5-5';

function json(obj, status, extra) {
  return new Response(JSON.stringify(obj), { status, headers: Object.assign({ 'content-type': 'application/json' }, extra || {}) });
}

export default {
  async fetch(request, env) {
    const origen = request.headers.get('Origin') || '';
    const permitido = ORIGENES.indexOf(origen) >= 0;
    const cors = {
      'Access-Control-Allow-Origin': permitido ? origen : ORIGENES[0],
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'content-type, anthropic-version, anthropic-dangerous-direct-browser-access',
      'Access-Control-Max-Age': '86400',
      'Vary': 'Origin'
    };
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (request.method !== 'POST') return json({ error: { message: 'Solo POST' } }, 405, cors);
    if (!permitido) return json({ error: { message: 'Origen no permitido' } }, 403, cors);
    if (!env.ANTHROPIC_API_KEY) return json({ error: { message: 'Falta ANTHROPIC_API_KEY en el Worker' } }, 500, cors);

    if (env.LIMITE) {
      const ip = request.headers.get('CF-Connecting-IP') || 'sin-ip';
      const r = await env.LIMITE.limit({ key: ip });
      if (!r.success) return json({ error: { message: 'Demasiadas peticiones, espera un minuto' } }, 429, cors);
    }

    let b;
    try { b = await request.json(); } catch (e) { return json({ error: { message: 'JSON invalido' } }, 400, cors); }
    const msgs = Array.isArray(b && b.messages) ? b.messages : [];
    if (msgs.length !== 1 || msgs[0].role !== 'user' || typeof msgs[0].content !== 'string') {
      return json({ error: { message: 'Se espera un solo mensaje de usuario con texto' } }, 400, cors);
    }
    if (msgs[0].content.length > MAX_PROMPT) return json({ error: { message: 'Mensaje demasiado largo' } }, 413, cors);

    const pedidoTokens = Math.floor(+b.max_tokens) || 1800;
    const pedidoBusq = Math.floor(+(b.tools && b.tools[0] && b.tools[0].max_uses)) || 5;
    const cuerpo = {
      model: env.MODELO || MODELO_POR_DEFECTO,
      max_tokens: Math.max(256, Math.min(pedidoTokens, MAX_TOKENS)),
      messages: [{ role: 'user', content: msgs[0].content }],
      tools: [{ type: HERRAMIENTA, name: 'web_search', max_uses: Math.max(1, Math.min(pedidoBusq, MAX_BUSQUEDAS)) }]
    };

    let r;
    try {
      r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': env.ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify(cuerpo)
      });
    } catch (e) {
      return json({ error: { message: 'No pude llegar a Anthropic: ' + (e && e.message ? e.message : e) } }, 502, cors);
    }
    const texto = await r.text();
    return new Response(texto, { status: r.status, headers: Object.assign({ 'content-type': 'application/json' }, cors) });
  }
};
