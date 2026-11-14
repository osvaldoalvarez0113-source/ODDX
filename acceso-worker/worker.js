// Worker ova-acceso: un código por persona, amarrado a un solo teléfono.
// Datos en KV (binding ACCESO): "c:CODIGO" -> {nombre, dev, estado, creado, usado, motivo, intentos}
// Secreto ADMIN_KEY: la clave de Osvaldo para la página acceso-admin.html.
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};
const json = (o, st = 200) => new Response(JSON.stringify(o), { status: st, headers: { ...CORS, "Content-Type": "application/json" } });
const LETRAS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sin 0/O ni 1/I

function nuevoCodigo() {
  const b = crypto.getRandomValues(new Uint8Array(6));
  return Array.from(b, (x) => LETRAS[x % LETRAS.length]).join("");
}
const limpio = (c) => String(c || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12);

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") return new Response(null, { headers: CORS });
    if (request.method !== "POST") return json({ ok: false, msg: "Solo POST" }, 405);
    if (!env.ACCESO) return json({ ok: false, msg: "Falta el espacio KV ACCESO en Cloudflare" }, 500);
    let b;
    try { b = await request.json(); } catch (e) { return json({ ok: false, msg: "Petición mala" }, 400); }
    const ahora = Date.now();

    // ---- usuarios: entrar (primera vez, amarra el teléfono) y ver (cada vez que abre) ----
    if (b.accion === "entrar" || b.accion === "ver") {
      const codigo = limpio(b.codigo), dev = String(b.dev || "").slice(0, 64);
      if (!codigo || !dev) return json({ ok: false, msg: "Falta el código" });
      const r = await env.ACCESO.get("c:" + codigo, "json");
      if (!r) return json({ ok: false, msg: "Ese código no existe." });
      if (r.estado === "bloqueado") return json({ ok: false, bloqueado: true, msg: "Este código está bloqueado." });
      if (!r.dev) {
        if (b.accion !== "entrar") return json({ ok: false, msg: "Código sin activar." });
        r.dev = dev; r.usado = ahora;
        await env.ACCESO.put("c:" + codigo, JSON.stringify(r));
        return json({ ok: true, nombre: r.nombre });
      }
      if (r.dev === dev) {
        if (!r.usado || ahora - r.usado > 6 * 3600e3) { r.usado = ahora; await env.ACCESO.put("c:" + codigo, JSON.stringify(r)); }
        return json({ ok: true, nombre: r.nombre });
      }
      // Otro teléfono con el mismo código: se bloquea el código (para los dos).
      r.intentos = (r.intentos || []).concat([{ ts: ahora, dev: dev.slice(0, 8) }]).slice(-10);
      r.estado = "bloqueado"; r.motivo = "Se intentó usar en otro teléfono";
      await env.ACCESO.put("c:" + codigo, JSON.stringify(r));
      return json({ ok: false, bloqueado: true, msg: "Este código ya está en otro teléfono. Quedó bloqueado." });
    }

    // ---- dueño ----
    if (b.accion === "admin") {
      if (!env.ADMIN_KEY || String(b.clave || "").trim() !== String(env.ADMIN_KEY).trim()) return json({ ok: false, msg: "Clave incorrecta" }, 403);
      const codigo = limpio(b.codigo);
      const leer = async () => (codigo ? await env.ACCESO.get("c:" + codigo, "json") : null);
      const guardar = (r) => env.ACCESO.put("c:" + codigo, JSON.stringify(r));
      switch (b.op) {
        case "lista": {
          const out = []; let cursor;
          do {
            const l = await env.ACCESO.list({ prefix: "c:", cursor });
            for (const k of l.keys) { const r = await env.ACCESO.get(k.name, "json"); if (r) out.push({ codigo: k.name.slice(2), ...r, dev: r.dev ? r.dev.slice(0, 8) : null }); }
            cursor = l.list_complete ? null : l.cursor;
          } while (cursor);
          out.sort((a, b2) => (b2.creado || 0) - (a.creado || 0));
          return json({ ok: true, codigos: out });
        }
        case "crear": {
          let c; for (let i = 0; i < 5; i++) { c = nuevoCodigo(); if (!(await env.ACCESO.get("c:" + c))) break; }
          const r = { nombre: String(b.nombre || "Sin nombre").slice(0, 40), dev: null, estado: "ok", creado: ahora, usado: null };
          await env.ACCESO.put("c:" + c, JSON.stringify(r));
          return json({ ok: true, codigo: c });
        }
        case "bloquear": case "desbloquear": case "liberar": {
          const r = await leer(); if (!r) return json({ ok: false, msg: "No existe" });
          if (b.op === "bloquear") { r.estado = "bloqueado"; r.motivo = "Bloqueado por ti"; }
          if (b.op === "desbloquear") { r.estado = "ok"; r.motivo = null; }
          if (b.op === "liberar") { r.dev = null; r.estado = "ok"; r.motivo = null; } // para cuando cambia de teléfono
          await guardar(r); return json({ ok: true });
        }
        case "borrar": { await env.ACCESO.delete("c:" + codigo); return json({ ok: true }); }
      }
      return json({ ok: false, msg: "Operación desconocida" });
    }
    return json({ ok: false, msg: "Acción desconocida" }, 400);
  },
};
