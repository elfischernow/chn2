// Inline UTM helper. Runs before the GA4 snippet so `window.getUTMs` is
// already wired by the time any tracker calls it.
//
// Behaviour ported from legacy:
//   src/client/utils/analytics-cookie-setter.js  — capture incoming params
//   src/react-ssr/utils/get-utms.js              — read cookies on demand
// One difference: legacy used js-cookie + query-string + lodash. We inline a
// minimal cookie reader/writer to keep the snippet dependency-free and tiny.

const UTM_PARAMS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'utm_term',
  'gclid',
];

const COOKIE_TTL_DAYS = 900;

// Each line written to be terser-friendly. Returned as a string so the
// AnalyticsScripts server component can drop it inline with no FOUC risk.
export const utmSnippet = `(function(){
try{
var P=${JSON.stringify(UTM_PARAMS)};
var TTL=${COOKIE_TTL_DAYS};
function setC(n,v){var d=new Date();d.setTime(d.getTime()+TTL*864e5);document.cookie=n+'='+encodeURIComponent(v)+';expires='+d.toUTCString()+';path=/;SameSite=Lax';}
function getC(n){var m=document.cookie.match('(^|;)\\\\s*'+n+'=([^;]+)');return m?decodeURIComponent(m[2]):'';}
var u=new URL(window.location.href);
var dirty=false;
P.forEach(function(p){var v=u.searchParams.get(p);if(v){setC(p,v);u.searchParams.delete(p);dirty=true;}});
if(dirty){try{window.history.replaceState({},'',u.pathname+(u.search?u.search:'')+u.hash);}catch(e){}}
window.getUTMs=function(){var o={};P.forEach(function(p){var v=getC(p);if(v)o[p]=v;});return o;};
}catch(e){window.getUTMs=function(){return{};};}
})();`;
