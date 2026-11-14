/* Acceso con código: cada persona tiene su código y solo abre en un teléfono.
   Va en el <head> de cada página, antes de todo lo demás. El control vive en el Worker ova-acceso (acceso-worker/).
   ACTIVO=false mientras el Worker no esté montado: así nadie se queda fuera. */
(function () {
  var ACTIVO = false;
  var URL_ACCESO = 'https://ova-acceso.osvaldoalvarez0113.workers.dev';
  var GRACIA = 3 * 864e5;   // sin internet, deja entrar si se verificó en los últimos 3 días
  if (!ACTIVO) return;
  if (/[?&]admin-acceso/.test(location.search) || /acceso-admin\.html$/.test(location.pathname)) return;

  var K = 'ova_acceso_v1', st = {};
  try { st = JSON.parse(localStorage.getItem(K) || '{}') || {}; } catch (e) {}
  if (!st.dev) {
    st.dev = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : (Date.now().toString(36) + Math.random().toString(36).slice(2));
    guardar();
  }
  function guardar() { try { localStorage.setItem(K, JSON.stringify(st)); } catch (e) {} }

  var raiz = document.documentElement;
  raiz.style.visibility = 'hidden';
  function mostrar() { raiz.style.visibility = ''; var p = document.getElementById('ovaAcc'); if (p) p.remove(); }

  function enPantallaDeInicio() {
    return window.navigator.standalone === true || (window.matchMedia && matchMedia('(display-mode: standalone)').matches);
  }
  function llamar(accion) {
    return fetch(URL_ACCESO, { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accion: accion, codigo: st.codigo, dev: st.dev }) }).then(function (r) { return r.json(); });
  }

  function pantalla(html) {
    function pintar() {
      var p = document.getElementById('ovaAcc');
      if (!p) {
        p = document.createElement('div'); p.id = 'ovaAcc';
        p.style.cssText = 'position:fixed;inset:0;z-index:2147483647;visibility:visible;background:radial-gradient(circle at 50% 30%,#1c1a12,#050505 70%);' +
          'color:#eee;font:16px -apple-system,system-ui,sans-serif;display:flex;align-items:center;justify-content:center;padding:28px;text-align:center';
        document.body.appendChild(p);
      }
      p.innerHTML = '<div style="max-width:340px;width:100%">' +
        '<div style="font:800 44px/1 -apple-system,system-ui;letter-spacing:4px;background:linear-gradient(135deg,#f5d77a,#b8892b);-webkit-background-clip:text;color:transparent">OVA</div>' +
        '<div style="margin-top:22px">' + html + '</div></div>';
      var inp = p.querySelector('input'), btn = p.querySelector('button');
      if (btn) btn.onclick = entrar;
      if (inp) { inp.onkeydown = function (e) { if (e.key === 'Enter') entrar(); }; setTimeout(function () { inp.focus(); }, 300); }
    }
    if (document.body) pintar(); else document.addEventListener('DOMContentLoaded', pintar);
  }
  var CAJA = 'width:100%;box-sizing:border-box;padding:14px;border-radius:12px;border:1px solid #6b5a2a;background:#111;color:#f5d77a;font:700 22px monospace;text-align:center;letter-spacing:4px;text-transform:uppercase';
  var BOTON = 'margin-top:14px;width:100%;padding:14px;border:0;border-radius:12px;background:linear-gradient(135deg,#f5d77a,#b8892b);color:#111;font:700 17px -apple-system,system-ui';

  function pedirCodigo(msg) {
    if (!enPantallaDeInicio()) {
      pantalla('<div style="font-size:18px;font-weight:700">Primero instálala</div>' +
        '<div style="margin-top:12px;color:#bbb;line-height:1.5">En Safari toca <b>Compartir</b> → <b>Añadir a pantalla de inicio</b>, y abre OVA desde el icono. Ahí te pide tu código.</div>');
      return;
    }
    pantalla('<div style="font-size:18px;font-weight:700">Escribe tu código</div>' +
      (msg ? '<div style="margin-top:10px;color:#ff8a7a">' + msg + '</div>' : '') +
      '<input id="ovaCod" autocomplete="off" autocapitalize="characters" spellcheck="false" maxlength="12" style="margin-top:16px;' + CAJA + '">' +
      '<button style="' + BOTON + '">Entrar</button>' +
      '<div style="margin-top:14px;color:#888;font-size:13px">El código queda amarrado a este teléfono.</div>');
  }
  function entrar() {
    var inp = document.getElementById('ovaCod'); var c = inp ? inp.value.toUpperCase().replace(/[^A-Z0-9]/g, '') : '';
    if (!c) return;
    st.codigo = c; guardar();
    var btn = document.querySelector('#ovaAcc button'); if (btn) { btn.disabled = true; btn.textContent = 'Revisando…'; }
    llamar('entrar').then(function (r) {
      if (r && r.ok) { st.ok = Date.now(); st.nombre = r.nombre; guardar(); location.reload(); }
      else { delete st.codigo; delete st.ok; guardar(); r && r.bloqueado ? bloqueado(r.msg) : pedirCodigo((r && r.msg) || 'No se pudo entrar.'); }
    }).catch(function () { pedirCodigo('Sin conexión. Intenta otra vez.'); });
  }
  function bloqueado(msg) {
    pantalla('<div style="font-size:18px;font-weight:700">Acceso cerrado</div>' +
      '<div style="margin-top:12px;color:#bbb;line-height:1.5">' + (msg || 'Este código está bloqueado.') + '<br>Pídele a Osvaldo un código nuevo.</div>' +
      '<input id="ovaCod" autocomplete="off" autocapitalize="characters" spellcheck="false" maxlength="12" placeholder="Código nuevo" style="margin-top:16px;' + CAJA + '">' +
      '<button style="' + BOTON + '">Entrar</button>');
  }

  if (!st.codigo) { pedirCodigo(); return; }
  var recien = st.ok && Date.now() - st.ok < GRACIA;
  if (recien) mostrar();   // abre ya y verifica por detrás, para no hacer esperar
  llamar('ver').then(function (r) {
    if (r && r.ok) { st.ok = Date.now(); guardar(); if (!recien) mostrar(); return; }
    delete st.codigo; delete st.ok; guardar();
    raiz.style.visibility = 'hidden';
    r && r.bloqueado ? bloqueado(r.msg) : pedirCodigo(r && r.msg);
  }).catch(function () {
    if (!recien) pedirCodigo('Sin conexión. Necesitas internet para verificar tu código.');
  });
})();
