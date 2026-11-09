// Partie complète pilotée dans Chrome headless via CDP (sans dépendance).
// Usage : node test/e2e-cdp.mjs <url> [capture-dir]
import { spawn } from 'node:child_process';
import { writeFileSync, mkdtempSync } from 'node:fs';
const url = process.argv[2], shots = process.argv[3] || '/tmp';
const prof = mkdtempSync('/tmp/chr-');
const chrome = spawn('google-chrome', ['--headless=new', '--no-sandbox', '--remote-debugging-port=9333', '--user-data-dir=' + prof, '--autoplay-policy=no-user-gesture-required', 'about:blank'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let ws, id = 0; const pend = new Map(); const errors = [];
async function connect() {
  for (let i = 0; i < 50; i++) {
    try { const l = await (await fetch('http://127.0.0.1:9333/json')).json(); const t = l.find(x => x.type === 'page'); if (t) return t.webSocketDebuggerUrl; } catch {}
    await sleep(200);
  }
  throw new Error('chrome injoignable');
}
const send = (method, params = {}) => new Promise(r => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async e => (await send('Runtime.evaluate', { expression: e, returnByValue: true })).result?.result?.value;
async function tap(x, y) {
  for (const type of ['mousePressed', 'mouseReleased']) await send('Input.dispatchMouseEvent', { type, x, y, button: 'left', clickCount: 1 });
  await sleep(120);
}
async function shot(name) { const r = await send('Page.captureScreenshot', { format: 'png' }); writeFileSync(`${shots}/${name}.png`, Buffer.from(r.result.data, 'base64')); }
const right = async () => { await tap(390, 740); await sleep(400); };
const st = () => ev(`(()=>{const s=game.scene.getScene('Jeu');return {active:game.scene.isActive('Jeu'),fin:game.scene.isActive('Fin'),face:s.face,strikes:s.strikes,solved:s.solved,rem:s.remaining}})()`);
try {
  ws = new WebSocket(await connect());
  await new Promise(r => ws.onopen = r);
  ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id); } if (d.method === 'Runtime.exceptionThrown') errors.push(d.params.exceptionDetails.exception?.description || d.params.exceptionDetails.text); if (d.method === 'Log.entryAdded' && d.params.entry.level === 'error') errors.push(d.params.entry.text + ' ' + (d.params.entry.url||'')); };
  await send('Runtime.enable'); await send('Log.enable'); await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 450, height: 800, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url });
  for (let i = 0; i < 50 && !(await ev('!!(window.game && game.isBooted)')); i++) await sleep(200);
  await sleep(500);
  await shot('01-titre');
  await tap(225, 640); await sleep(500);
  const p = await ev(`game.scene.getScene('Jeu').p`);
  console.log('série', p.serial, 'fils', p.wires.join(','), 'code', p.solution.code, 'vis', p.solution.screwOrder.join(''));
  await shot('02-fils');
  // erreur volontaire : un fil à ne pas couper
  const wrong = p.wires.findIndex((_, i) => !p.solution.wiresToCut.includes(i));
  await tap(225, 305 + wrong * 58);
  let s = await st(); console.log('après mauvais fil : erreurs', s.strikes, 'temps', Math.round(s.rem / 1000));
  if (s.strikes !== 1) throw new Error('pénalité non appliquée');
  for (const i of p.solution.wiresToCut) await tap(225, 305 + i * 58);
  await right(); await shot('03-clavier'); await right();
  await shot('04-panneau');
  const sc = [[110, 315], [340, 315], [110, 545], [340, 545]];
  for (const n of p.solution.screwOrder) { await tap(...sc[n - 1]); await sleep(150); }
  await sleep(1300); await shot('05-panneau-ouvert');
  await right();
  const pad = { n: [225, 497], w: [155, 552], e: [295, 552], s: [225, 552] };
  for (const d of p.solution.mazePath) { await tap(...pad[d]); await sleep(60); }
  await sleep(300); await shot('06-aiguille');
  s = await st(); console.log('résolus avant code', JSON.stringify(s.solved));
  await right(); await right();
  for (const ch of p.solution.code) { const d = +ch; const i = d === 0 ? 10 : d - 1; await tap(145 + (i % 3) * 80, 290 + Math.floor(i / 3) * 75); }
  await shot('07-code');
  await tap(145 + 2 * 80, 290 + 3 * 75);
  await sleep(1500);
  s = await st(); await shot('08-fin');
  console.log('écran Fin actif :', s.fin, '| erreurs :', s.strikes);
  if (!s.fin) throw new Error('victoire non atteinte');
  const win = await ev(`game.scene.getScene('Fin').d.win`); console.log('victoire :', win);
  if (!win) throw new Error('pas une victoire');
  // défaite : 3 erreurs
  await tap(225, 620); await sleep(500);
  const p2 = await ev(`game.scene.getScene('Jeu').p`);
  const bad = p2.wires.map((_, i) => i).filter(i => !p2.solution.wiresToCut.includes(i));
  for (const i of bad.slice(0, 3)) await tap(225, 305 + i * 58);
  await sleep(800); await shot('09-boum');
  const lose = await ev(`game.scene.isActive('Fin') && !game.scene.getScene('Fin').d.win`);
  console.log('défaite après 3 erreurs :', lose, '| nouvelle bombe différente :', p2.serial !== p.serial || p2.wires.join() !== p.wires.join());
  if (!lose) throw new Error('défaite non déclenchée');
  console.log('erreurs JS :', errors.length ? errors : 'aucune');
  if (errors.length) process.exitCode = 1;
} catch (e) { console.error('ÉCHEC', e.message, errors); process.exitCode = 1; }
finally { chrome.kill(); }
