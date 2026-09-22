// ═════════════════════════════════════════════════════════════════
// cookie-consent.js — Banner de consentimiento de cookies (RGPD/LSSI)
// Bloquea Clarity, GA4 y Meta Pixel hasta que el usuario acepte.
// Un único archivo, incluido en todas las páginas con trackers.
// ═════════════════════════════════════════════════════════════════

(function () {
  var CLARITY_ID = "xf6ygmm5pw";
  var GA4_ID = "G-EJSDFDFZ3G";
  var PIXEL_ID = "1729071528498639";
  var STORAGE_KEY = "origennatal_cookie_consent";

  function loadClarity() {
    (function (c, l, a, r, i, t, y) {
      c[a] = c[a] || function () { (c[a].q = c[a].q || []).push(arguments); };
      t = l.createElement(r); t.async = 1; t.src = "https://www.clarity.ms/tag/" + i;
      y = l.getElementsByTagName(r)[0]; y.parentNode.insertBefore(t, y);
    })(window, document, "clarity", "script", CLARITY_ID);
  }

  function loadGA4() {
    var s = document.createElement("script");
    s.async = true;
    s.src = "https://www.googletagmanager.com/gtag/js?id=" + GA4_ID;
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { dataLayer.push(arguments); };
    gtag("js", new Date());
    gtag("config", GA4_ID);
  }

  function loadMetaPixel() {
    !function (f, b, e, v, n, t, s) {
      if (f.fbq) return; n = f.fbq = function () {
        n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
      };
      if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = "2.0";
      n.queue = []; t = b.createElement(e); t.async = !0;
      t.src = v; s = b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t, s);
    }(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");
    fbq("init", PIXEL_ID);
    fbq("track", "PageView");

    var img = document.createElement("img");
    img.height = 1; img.width = 1; img.style.display = "none";
    img.src = "https://www.facebook.com/tr?id=" + PIXEL_ID + "&ev=PageView&noscript=1";
    document.body.appendChild(img);
  }

  function loadAllTrackers() {
    loadClarity();
    loadGA4();
    loadMetaPixel();
  }

  function getConsent() {
    try { return localStorage.getItem(STORAGE_KEY); } catch (e) { return null; }
  }

  function setConsent(value) {
    try { localStorage.setItem(STORAGE_KEY, value); } catch (e) {}
  }

  function showBanner() {
    var banner = document.createElement("div");
    banner.id = "cookie-consent-banner";
    banner.setAttribute("role", "dialog");
    banner.setAttribute("aria-label", "Consentimiento de cookies");
    banner.style.cssText =
      "position:fixed;left:0;right:0;bottom:0;z-index:9999;" +
      "background:#0e3f4b;color:#fffbef;padding:.6rem 0;" +
      "font-family:'Open Sans',sans-serif;line-height:1.3;" +
      "box-shadow:0 -4px 24px rgba(0,0,0,.2);";

    var style = document.createElement("style");
    style.textContent =
      "#cookie-consent-banner .cc-wrap{width:min(1100px,92vw);margin-inline:auto;" +
      "display:flex;flex-wrap:wrap;gap:.9rem;align-items:center;justify-content:space-between;}" +
      "#cookie-consent-banner p{margin:0;font-size:.68rem !important;flex:1 1 260px;max-width:460px;}" +
      "#cookie-consent-banner button{font-family:'Open Sans',sans-serif;}" +
      "@media (max-width:640px){#cookie-consent-banner{padding:1.1rem 0 !important;}" +
      "#cookie-consent-banner p{font-size:.92rem !important;}}";
    document.head.appendChild(style);

    banner.innerHTML =
      '<div class="cc-wrap">' +
      '<p>' +
      "Usamos cookies propias y de terceros para analizar el tráfico y mejorar tu experiencia. " +
      'Más info en nuestra ' +
      '<a href="/politica-de-cookies" style="color:#cfb180;text-decoration:underline;">Política de Cookies</a>.' +
      "</p>" +
      '<div style="display:flex;gap:.6rem;flex:0 0 auto;">' +
      '<button id="cookie-config" style="background:transparent;color:#fffbef;border:1px solid rgba(255,251,239,.4);' +
      'border-radius:6px;padding:.6rem 1.1rem;font-size:.9rem;cursor:pointer;">Configurar</button>' +
      '<button id="cookie-reject" style="background:transparent;color:#fffbef;border:1px solid rgba(255,251,239,.4);' +
      'border-radius:6px;padding:.6rem 1.1rem;font-size:.9rem;cursor:pointer;">Rechazar</button>' +
      '<button id="cookie-accept" style="background:linear-gradient(135deg,#bd9048,#cfb180);color:#fff;border:none;' +
      'border-radius:6px;padding:.6rem 1.3rem;font-size:.9rem;font-weight:600;cursor:pointer;">Aceptar</button>' +
      "</div>" +
      "</div>";

    document.body.appendChild(banner);

    document.getElementById("cookie-config").addEventListener("click", function () {
      showPanel(banner);
    });

    document.getElementById("cookie-accept").addEventListener("click", function () {
      setConsent("accepted");
      banner.remove();
      loadAllTrackers();
    });

    document.getElementById("cookie-reject").addEventListener("click", function () {
      setConsent("rejected");
      banner.remove();
    });
  }


  // ── EL PANEL DE AJUSTES ────────────────────────────────────────
  //
  // Lo que sale al pulsar "Configurar": una linea por cada tipo de cookie de
  // los que hay de verdad en la web, con su interruptor y explicado en
  // castellano llano. Las necesarias no se pueden quitar, porque sin ellas no
  // se puede ni pagar.

  function unaFila(id, titulo, texto, fija) {
    return '<div style="padding:1rem 0;border-bottom:1px solid #e3ddd2;">' +
      '<div style="display:flex;align-items:center;justify-content:space-between;gap:1rem;">' +
      '<strong style="font-size:1rem;color:#0e3f4b;">' + titulo + '</strong>' +
      (fija
        ? '<span style="font-size:.85rem;color:#6e7b7f;white-space:nowrap;">Siempre activas</span>'
        : '<input type="checkbox" id="' + id + '" checked style="width:20px;height:20px;accent-color:#bd9048;cursor:pointer;">') +
      '</div>' +
      '<p style="margin:.4rem 0 0;font-size:.88rem;color:#3a3a3a;line-height:1.5;">' + texto + '</p>' +
      '</div>';
  }

  function showPanel(banner) {
    // Si ya estuviera abierto, no se abre otro encima.
    if (document.getElementById("cookie-consent-panel")) return;

    var fondo = document.createElement("div");
    fondo.id = "cookie-consent-panel";
    fondo.setAttribute("role", "dialog");
    fondo.setAttribute("aria-label", "Ajustes de cookies");
    fondo.style.cssText =
      "position:fixed;inset:0;z-index:10000;background:rgba(14,63,75,.55);" +
      "display:flex;align-items:center;justify-content:center;padding:1rem;" +
      "font-family:'Open Sans',sans-serif;";
    fondo.innerHTML =
      '<div style="background:#fffbef;border-radius:12px;max-width:520px;width:100%;' +
      'max-height:90vh;overflow:auto;padding:1.6rem;box-shadow:0 20px 60px rgba(0,0,0,.3);">' +
      '<h2 style="margin:0 0 .4rem;font-family:Georgia,serif;font-size:1.4rem;color:#0e3f4b;">Ajustes de cookies</h2>' +
      '<p style="margin:0 0 .6rem;font-size:.9rem;color:#3a3a3a;line-height:1.5;">Elige qué quieres permitir. Puedes cambiarlo cuando quieras.</p>' +
      unaFila("cookie-necesarias", "Necesarias",
        "Hacen que la web funcione: el pago, tu sesión y estos mismos ajustes. Sin ellas no se puede navegar.", true) +
      unaFila("cookie-analiticas", "Analíticas",
        "Nos dicen cuánta gente entra y qué páginas mira, para poder mejorarlas. No se usan para anuncios.", false) +
      unaFila("cookie-publicidad", "Publicidad",
        "Permiten medir si nuestros anuncios funcionan y mostrarte contenido que encaje contigo.", false) +
      '<div style="display:flex;gap:.6rem;justify-content:flex-end;margin-top:1.2rem;flex-wrap:wrap;">' +
      '<button id="cookie-cancelar" style="background:transparent;color:#0e3f4b;border:1px solid #c9c1b4;' +
      'border-radius:6px;padding:.6rem 1.1rem;font-size:.9rem;cursor:pointer;">Cancelar</button>' +
      '<button id="cookie-guardar" style="background:linear-gradient(135deg,#bd9048,#cfb180);color:#fff;border:none;' +
      'border-radius:6px;padding:.6rem 1.3rem;font-size:.9rem;font-weight:600;cursor:pointer;">Guardar ajustes</button>' +
      '</div></div>';

    document.body.appendChild(fondo);

    // CANCELAR no decide nada: se cierra el panel y la barra sigue ahi.
    document.getElementById("cookie-cancelar").addEventListener("click", function () {
      fondo.remove();
    });

    document.getElementById("cookie-guardar").addEventListener("click", function () {
      var analiticas = document.getElementById("cookie-analiticas").checked;
      var publicidad = document.getElementById("cookie-publicidad").checked;

      // Si no deja ninguna, es lo mismo que rechazar.
      setConsent(analiticas || publicidad ? "accepted" : "rejected");

      fondo.remove();
      banner.remove();

      if (analiticas) { loadClarity(); loadGA4(); }
      if (publicidad) { loadMetaPixel(); }
    });
  }

  function init() {
    var consent = getConsent();
    if (consent === "accepted") {
      loadAllTrackers();
    } else if (consent === "rejected") {
      // No se cargan trackers. No se vuelve a preguntar.
    } else {
      showBanner();
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
