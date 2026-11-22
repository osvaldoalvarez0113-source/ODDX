/* OVA · animaciones del Veredicto (las 6 apps: MLB, fútbol, NBA, NHL, NFL y tenis).
   Al abrir un juego: los dos lados entran de los costados, los % suben contando, el anillo se dibuja, la barra se llena
   y las secciones del análisis entran una tras otra. Al cambiar de pestaña, la pestaña nueva entra suave.
   Sirve para los dos tipos de cabecera: «.hero» (NBA, NHL, NFL, tenis) y «.ovaHero» (MLB y fútbol, que ya dibujan su anillo
   solos: ahí no se toca el anillo).
   Es el mismo tipo de animación que hace Motion.dev, hecho con la Web Animations API del navegador (cero peso extra).
   No cambia ningún número ni el diseño: solo cómo aparece. Se apaga solo con «Reducir movimiento» del iPhone
   y con localStorage.ova_anim = '0'. Si algo falla, no pasa nada: la pantalla queda igual que siempre. */
(function (root) {
  'use strict';
  var doc = root.document;
  function apagado() {
    try { if (root.localStorage && root.localStorage.getItem('ova_anim') === '0') return true; } catch (e) { }
    try { return !!(root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { return false; }
  }
  var RESORTE = 'cubic-bezier(.2,.9,.25,1.15)', SUAVE = 'cubic-bezier(.22,1,.36,1)';
  function anim(el, frames, ops) { try { if (el && el.animate) return el.animate(frames, Object.assign({ fill: 'backwards' }, ops)); } catch (e) { } return null; }

  /* «62.3%» sube contando desde 0 y termina exactamente en el texto original */
  function contar(el, ms, espera) {
    var txt = el.textContent, m = /^(\D*)(\d+(?:\.(\d+))?)(.*)$/.exec(txt); if (!m) return;
    var fin = parseFloat(m[2]), dec = m[3] ? m[3].length : 0, t0 = null;
    el.textContent = m[1] + (0).toFixed(dec) + m[4];
    function paso(t) {
      if (t0 === null) t0 = t;
      var x = Math.min(1, Math.max(0, (t - t0 - espera) / ms)), e = 1 - Math.pow(1 - x, 3);
      el.textContent = x >= 1 ? txt : m[1] + (fin * e).toFixed(dec) + m[4];
      if (x < 1) root.requestAnimationFrame(paso);
    }
    root.requestAnimationFrame(paso);
  }

  function panelDe(el) { while (el && el !== doc.body) { if (el.classList && (el.classList.contains('pane') || (el.classList.contains('tab') && el.tagName !== 'BUTTON'))) return el; el = el.parentNode; } return null; }
  function veredicto(hero) {
    var cont = panelDe(hero) || hero.parentNode; if (!cont) return;
    var propio = hero.classList.contains('ovaHero');            /* MLB y fútbol: su anillo ya se anima solo */
    var lados = hero.querySelectorAll('.side');
    if (lados[0]) anim(lados[0], [{ opacity: 0, transform: 'translateX(-46px) scale(.9)' }, { opacity: 1, transform: 'none' }], { duration: 650, easing: RESORTE });
    if (lados[1]) anim(lados[1], [{ opacity: 0, transform: 'translateX(46px) scale(.9)' }, { opacity: 1, transform: 'none' }], { duration: 650, easing: RESORTE, delay: 60 });
    Array.prototype.forEach.call(hero.querySelectorAll('.pc'), function (pc) { contar(pc, 900, 150); });
    var gz = hero.querySelector('.gz');
    if (gz) anim(gz, [{ opacity: 0, transform: propio ? 'scale(.85)' : 'scale(.82) rotate(-25deg)' }, { opacity: 1, transform: 'none' }], { duration: 800, easing: RESORTE, delay: 80 });
    if (!propio) Array.prototype.forEach.call(hero.querySelectorAll('path.sg'), function (p, i) {
      var da = p.style.strokeDasharray; if (!da || /^0(px)?[ ,]/.test(da)) return;
      anim(p, [{ strokeDasharray: '0 100' }, { strokeDasharray: da }], { duration: 1000, easing: SUAVE, delay: 150 + i * 120 });
    });
    var fav = hero.querySelector('.side.fav .pc');
    if (fav) anim(fav, [{ transform: 'scale(1)' }, { transform: 'scale(1.14)' }, { transform: 'scale(1)' }], { duration: 520, easing: 'ease-in-out', delay: 1080, fill: 'none' });
    /* la barra se llena: la primera parte desde la izquierda, la última desde la derecha y la del medio (empate) desde el centro */
    var bar = cont.querySelector('.bar');
    if (bar) {
      var ps = Array.prototype.filter.call(bar.children, function (x) { return x.tagName === 'SPAN'; });
      ps.forEach(function (sp, i) {
        var ini = i === 0 ? 'inset(0 100% 0 0)' : (i === ps.length - 1 ? 'inset(0 0 0 100%)' : 'inset(0 50% 0 50%)');
        anim(sp, [{ clipPath: ini }, { clipPath: 'inset(0 0 0 0)' }], { duration: 900, easing: SUAVE, delay: 250 });
      });
    }
    var rv = cont.querySelector('.rv');
    if (rv) escalera(rv, 420);
    else escalera(cont, 420, function (c) { return c !== hero && !c.contains(hero) && c !== bar; });
  }
  /* las secciones del análisis entran una tras otra (máximo 14 piezas, para que no se haga largo) */
  function escalera(caja, espera, sirve) {
    if (!caja) return;
    var piezas = [];
    Array.prototype.forEach.call(caja.children, function (c) {
      if (sirve && !sirve(c)) return;
      if (c.classList && c.classList.contains('rvLs')) Array.prototype.forEach.call(c.children, function (x) { piezas.push(x); });
      else if (c.hasAttribute && c.hasAttribute('data-an')) Array.prototype.forEach.call(c.firstElementChild ? c.firstElementChild.children : c.children, function (x) { piezas.push(x); });
      else piezas.push(c);
    });
    piezas.slice(0, 14).forEach(function (p, i) {
      anim(p, [{ opacity: 0, transform: 'translateY(14px)' }, { opacity: 1, transform: 'none' }], { duration: 480, easing: SUAVE, delay: espera + i * 45 });
    });
  }
  function pestana(pane) {
    var hijos = Array.prototype.slice.call(pane.children, 0, 8);
    hijos.forEach(function (c, i) { anim(c, [{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }], { duration: 380, easing: SUAVE, delay: i * 35 }); });
  }

  var vistos = typeof WeakSet === 'function' ? new WeakSet() : null;
  function revisar(nodo) {
    if (!nodo || nodo.nodeType !== 1 || !vistos) return;
    var heroes = nodo.matches && nodo.matches('.hero, .ovaHero') ? [nodo] : nodo.querySelectorAll ? nodo.querySelectorAll('.hero, .ovaHero') : [];
    /* solo si se ve: si la pestaña está escondida, se anima cuando se abra (lo ve el observador de clases) */
    Array.prototype.forEach.call(heroes, function (h) { if (vistos.has(h) || h.offsetParent === null) return; vistos.add(h); try { veredicto(h); } catch (e) { } });
  }
  function arrancar() {
    if (apagado() || !root.MutationObserver || !doc.body) return;
    new root.MutationObserver(function (lista) {
      lista.forEach(function (m) {
        if (m.type === 'childList') Array.prototype.forEach.call(m.addedNodes, revisar);
        else if (m.type === 'attributes' && m.target.classList && m.target.classList.contains('on') && !/\bon\b/.test(m.oldValue || '') && panelDe(m.target) === m.target) {
          var hero = m.target.querySelector('.hero, .ovaHero');
          if (hero && vistos && !vistos.has(hero)) { vistos.add(hero); try { veredicto(hero); } catch (e) { } } else try { pestana(m.target); } catch (e) { }
        }
      });
    }).observe(doc.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'], attributeOldValue: true });
  }
  root.OVAAnimar = { contar: contar, apagado: apagado };
  if (doc.readyState === 'loading') doc.addEventListener('DOMContentLoaded', arrancar); else arrancar();
})(typeof window !== 'undefined' ? window : this);
