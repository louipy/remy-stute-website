/* Extrae un blueprint legible de los volcados de claudedesign.
   Uso: node _extract.cjs HOME.html  */
const fs = require('fs');
const p = require('../node_modules/parse5');

const file = process.argv[2];
const html = fs.readFileSync(__dirname + '/' + file, 'utf8');
const doc = p.parse(html);

function find(node, tag) {
  if (node.tagName === tag) return node;
  for (const c of node.childNodes || []) {
    const r = find(c, tag);
    if (r) return r;
  }
  return null;
}
const body = find(doc, 'body');

// props relevantes + default a ocultar
const KEEP = [
  'display','position','top','right','bottom','left','width','height',
  'max-width','min-width','min-height','max-height',
  'margin-top','margin-right','margin-bottom','margin-left',
  'padding-top','padding-right','padding-bottom','padding-left',
  'background-color','background-image','color',
  'font-family','font-size','font-weight','line-height','letter-spacing',
  'text-transform','text-align','font-style','white-space',
  'border-top-width','border-right-width','border-bottom-width','border-left-width',
  'border-top-style','border-top-color','border-bottom-color','border-left-color',
  'border-top-left-radius','border-top-right-radius',
  'box-shadow','opacity','z-index','overflow','overflow-x',
  'flex-direction','flex-wrap','justify-content','align-items','align-self','gap','flex-grow','flex-basis',
  'grid-template-columns','grid-template-rows','grid-auto-flow',
  'aspect-ratio','object-fit','transform','backdrop-filter','filter',
];
const DEFAULT = {
  'display':'inline','position':'static','top':'auto','right':'auto','bottom':'auto','left':'auto',
  'width':'auto','height':'auto','max-width':'none','min-width':'auto','min-height':'auto','max-height':'none',
  'margin-top':'0px','margin-right':'0px','margin-bottom':'0px','margin-left':'0px',
  'padding-top':'0px','padding-right':'0px','padding-bottom':'0px','padding-left':'0px',
  'background-color':'rgba(0, 0, 0, 0)','background-image':'none','font-style':'normal',
  'letter-spacing':'normal','text-transform':'none','text-align':'start','white-space':'normal',
  'border-top-width':'0px','border-right-width':'0px','border-bottom-width':'0px','border-left-width':'0px',
  'border-top-style':'none','border-top-left-radius':'0px','border-top-right-radius':'0px',
  'box-shadow':'none','opacity':'1','z-index':'auto','overflow':'visible','overflow-x':'visible',
  'flex-direction':'row','flex-wrap':'nowrap','justify-content':'normal','align-items':'normal',
  'align-self':'auto','gap':'normal','flex-grow':'0','flex-basis':'auto',
  'grid-template-columns':'none','grid-template-rows':'none','grid-auto-flow':'row',
  'aspect-ratio':'auto','object-fit':'fill','transform':'none','backdrop-filter':'none','filter':'none',
};

function parseStyle(s) {
  const m = {};
  if (!s) return m;
  for (const decl of s.split(';')) {
    const i = decl.indexOf(':');
    if (i < 0) continue;
    m[decl.slice(0, i).trim()] = decl.slice(i + 1).trim();
  }
  return m;
}

const NOISE = new Set([
  'border-bottom-color','border-left-color','min-width','min-height','top','right','bottom','left',
]);
function fmt(st) {
  const hasBorder = ['border-top-width','border-right-width','border-bottom-width','border-left-width']
    .some((k) => st[k] && st[k] !== '0px');
  const out = [];
  for (const k of KEEP) {
    let v = st[k];
    if (v == null) continue;
    if (DEFAULT[k] === v) continue;
    if (NOISE.has(k)) continue;
    if (k === 'border-top-color' && !hasBorder) continue;
    if (k === 'font-family') v = v.split(',')[0].replace(/["']/g, '');
    if (k === 'background-image' && v.length > 120) v = v.slice(0, 120) + '…';
    out.push(k + ':' + v);
  }
  return out;
}

let lines = [];
function walk(node, depth) {
  if (node.nodeName === '#text') return;
  if (!node.tagName) { (node.childNodes||[]).forEach(c=>walk(c,depth)); return; }
  if (node.tagName === 'script' || node.tagName === 'style') return;
  const attrs = {};
  (node.attrs || []).forEach(a => attrs[a.name] = a.value);
  const st = parseStyle(attrs.style);
  const cls = attrs.class ? '.' + attrs.class.trim().split(/\s+/).join('.') : '';
  const directText = (node.childNodes || [])
    .filter(c => c.nodeName === '#text')
    .map(c => c.value.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .join(' ');
  const props = fmt(st);
  const pad = '  '.repeat(depth);
  let line = pad + '<' + node.tagName + cls + '>';
  if (props.length) line += ' { ' + props.join('; ') + ' }';
  if (directText) line += '  "' + directText + '"';
  lines.push(line);
  (node.childNodes || []).forEach(c => walk(c, depth + 1));
}
walk(body, 0);

const outName = __dirname + '/_blueprint_' + (process.argv[3] || file.replace('.html', '')) + '.txt';
fs.writeFileSync(outName, lines.join('\n'), 'utf8');
console.log(file, '->', lines.length, 'elementos ->', outName);
