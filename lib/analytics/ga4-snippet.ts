// Custom GA4 inline snippet — direct POST/sendBeacon to
// https://www.google-analytics.com/g/collect. No gtag.js, no dataLayer.
// Ported verbatim from legacy embeds.pug:88-257 with these deliberate
// changes:
//   - UA snippet (embeds.pug:1-86) dropped — Google retired UA in July 2024.
//   - `#{googleDataStreamId}` placeholder is substituted with the real
//     measurement id by buildGa4Snippet() before render.
//   - The `if (window.addEventListener)` outer guard is kept — defensive
//     against ancient browsers / WebViews that miss it.
//   - `window.ma` (UA shim) intentionally NOT attached. `window.ga` (GA4
//     shim) is the only one call sites talk to.

export function buildGa4Snippet(measurementId: string): string {
  const id = JSON.stringify(measurementId);

  return `if (window.addEventListener) {
  window.addEventListener('load', function () {
    var enScroll = false,
      startTime = Date.now();
    var lStor = localStorage,
      sStor = sessionStorage,
      doc = document,
      docEl = document.documentElement,
      docBody = document.body,
      docLoc = document.location,
      w = window,
      s = screen,
      nav = navigator || {},
      history = w.history,
      pushState = history.pushState;

    function a(eventName, eventParams) {
      var extraParams = (typeof window !== 'undefined' && typeof window.getUTMs === 'function')
        ? window.getUTMs()
        : {};

      var k = ${id},
        t = function () { return Math.floor(Math.random() * 1e9) + 1; },
        n = function () { return Math.floor(Date.now() / 1e3); },
        y = function () { return sStor._p || (sStor._p = t()), sStor._p; },
        v = function () { return Math.random().toString(36); },
        p = function () { return lStor.cid || (lStor.cid = v()), lStor.cid; },
        m = lStor.getItem('cid'),
        u = function () { return m ? void 0 : enScroll == true ? void 0 : '1'; },
        l = function () { return sStor.sid || (sStor.sid = n()), sStor.sid; },
        d = function () {
          if (!sStor._ss) return sStor._ss = '1', sStor._ss;
          if (sStor.getItem('_ss') == '1') return void 0;
        },
        r = '1',
        h = function () {
          if (sStor.sct) {
            if (enScroll == true) return sStor.sct;
            else { var x = +sStor.getItem('sct') + +r; sStor.sct = x; }
          } else sStor.sct = r;
          return sStor.sct;
        },
        e = docLoc.search,
        f = new URLSearchParams(e),
        getSafeDocumentLocation = function () {
          try {
            if (docLoc && docLoc.origin && docLoc.pathname) {
              return docLoc.origin + docLoc.pathname + (e || '');
            }
            if (w && w.location && w.location.href) return w.location.href;
            if (docLoc && docLoc.href) return docLoc.href;
          } catch (error) { /* swallow */ }
          return '';
        },
        getDeltaTime = function () { var deltaTime = Date.now() - startTime; startTime = Date.now(); return deltaTime; },
        getUserId = function () { return (sStor && sStor.uid) || void 0; },
        searchKeys = ['q', 's', 'search', 'query', 'keyword'],
        g = searchKeys.some(function (t) { return e.includes('&' + t + '=') || e.includes('?' + t + '='); }),
        i = function () { return eventName || (eventParams ? 'event' : (g == true ? 'view_search_results' : enScroll == true ? 'scroll' : 'page_view')); },
        b = function () { return enScroll == true ? '90' : void 0; },
        j = function () {
          if (i() == 'view_search_results') {
            for (var entry of f) if (searchKeys.includes(entry[0])) return entry[1];
          } else return void 0;
        },
        o = encodeURIComponent,
        _ = function (e) {
          var t = [];
          for (var n in e) e.hasOwnProperty(n) && e[n] !== void 0 && t.push(o(n) + '=' + o(e[n]));
          return t.join('&');
        },
        C = 'https://www.google-analytics.com/g/collect',
        E = _(Object.assign({
          v: '2',
          tid: k,
          _p: y(),
          sr: (s.width * w.devicePixelRatio + 'x' + s.height * w.devicePixelRatio).toString(),
          ul: (nav.language || '').toLowerCase(),
          cid: p(),
          uid: getUserId(),
          _fv: u(),
          _s: '1',
          _et: ['user_engagement', 'event', 'scroll'].includes(i()) ? getDeltaTime() : void 0,
          dl: getSafeDocumentLocation(),
          dt: doc.title || void 0,
          dr: doc.referrer || void 0,
          sid: l(),
          sct: h(),
          seg: '1',
          en: i(),
          'epn.percent_scrolled': b(),
          'ep.search_term': j(),
          'ep.event_category': eventParams ? eventParams.category : void 0,
          'ep.event_action': eventParams ? eventParams.action : void 0,
          'ep.event_label': eventParams ? eventParams.label : void 0,
          'ep.event_value': eventParams && typeof eventParams.value === 'string'
            ? eventParams.value
            : (typeof (eventParams && eventParams.value) === 'object'
                ? JSON.stringify(eventParams.value)
                : void 0),
          'epn.event_value': eventParams && typeof eventParams.value === 'number' ? eventParams.value : void 0,
          'ep.user_type': eventParams ? eventParams.user_type : void 0,
          'ep.user_property': eventParams ? eventParams.user_property : void 0,
          'ep.platform': eventParams ? eventParams.platform : void 0,
          _ss: d(),
        }, extraParams)),
        c = C + '?' + E;
      if (nav.sendBeacon) nav.sendBeacon(c);
      else { var xhr = new XMLHttpRequest(); xhr.open('POST', c, true); xhr.send(); }
    }

    a();

    w.ga = {
      trackEvent: function (category, action, label, value) {
        return a('event', { category: category, action: action, label: label, value: value });
      },
      trackProEvent: function (eventName, platform, user_type, user_property) {
        return a(eventName, { platform: platform, user_type: user_type, user_property: user_property });
      },
    };

    history.pushState = function (r) {
      return typeof history.onpushstate == 'function' && history.onpushstate({ state: r }),
        setTimeout(a, 10), pushState.apply(history, arguments);
    };

    function sPr() {
      return (docEl.scrollTop || docBody.scrollTop) / ((docEl.scrollHeight || docBody.scrollHeight) - docEl.clientHeight) * 100;
    }

    function sEv() {
      var v = sPr();
      if (v < 90) return;
      enScroll = true;
      a();
      doc.removeEventListener('scroll', sEv, { passive: true });
    }

    doc.addEventListener('scroll', sEv, { passive: true });

    w.pageIsUnloading = false;
    w.addEventListener('pagehide', function () { w.pageIsUnloading = true; });

    w.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'visible') {
        startTime = Date.now();
        w.pageIsUnloading = false;
      } else if (document.visibilityState === 'hidden') {
        setTimeout(function () {
          if (!w.pageIsUnloading) a('user_engagement');
        }, 100);
      }
    });
  });
}`;
}
