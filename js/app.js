/* ============================================================
   COMPONENTES REACT E APLICACAO PRINCIPAL
   ============================================================ */

// Engine
const html = htm.bind(React.createElement);

// renderiza as equacoes LaTeX usando KaTeX
function Tex({ tex, display = false }){
  const containerRef = React.useRef(null);
  React.useEffect(()=>{
    const el = containerRef.current;
    if(!el || !tex) return;
    try{
      katex.render(tex, el, { displayMode: display, throwOnError: false });
    } catch(e){
      el.textContent = `erro KaTeX: ${e.message}`;
    }
  }, [tex, display]);
  return html`<div ref=${containerRef}></div>`;
}

// secao numerada com titulo - para mostrar os passos da solucao
function Section({ n, title, children }){
  return html`
    <div class="mt-5 pt-4 border-t border-[var(--line)]">
      <h3 class="flex items-baseline gap-2 text-[var(--paper)] font-display mb-3">
        <span class="step-num text-lg">§${n}</span>
        <span class="text-sm">${title}</span>
      </h3>
      <div class="space-y-2 text-sm text-[var(--paper-dim)]">
        ${children}
      </div>
    </div>
  `;
}

// mostra um resultado
function KV({ k, v, color, mono=true }){
  return html`
  <div class="flex justify-between text-xs py-1">
    <span class="text-[var(--paper-mute)] chip">${k}</span>
    <span class=${`${mono?'font-mono':''} text-sm ${color||'text-[var(--paper)]'}`}>${v}</span>
  </div>`;
}

// campo de entrada de polinomio - com validacao de erro
function PolyField({ label, value, onChange, hint, error }){
  return html`
    <div>
      <div class="flex justify-between text-xs">
        <label class="text-[var(--paper-dim)]">${label}</label>
        <span class="text-[var(--paper-mute)] font-mono">${hint||''}</span>
      </div>
      <input type="text" value=${value} onInput=${e=>onChange(e.target.value)}
        class=${`mt-1 ${error?'field-error':''}`}
        spellcheck="false" autocomplete="off"/>
      ${error && html`<p class="text-xs text-[var(--rose)] mt-1 font-mono">${error}</p>`}
    </div>
  `;
}

/* ============================================================
   EXEMPLOS PRE-CONFIGURADOS - casos de teste
   ============================================================ */
const PRESETS = [
 
];

const DEFAULT_STATE = {
  gNum:'(s+2)', gDen:'s(s+5)', hNum:'1', hDen:'1',
  ctrl:'PD', extra:{},
  sdMode:'zeta_wn', mp:10, ts:4, tsTol:5, zeta:0.7, wn:2.0, sdRe:-1.4, sdIm:1.4,
  sdFormat:'re_im', sdLm:1.4,
  disc:'tustin', T:0.5,
  useRoundedKc: true
};

// codifica e decodifica estado em base64 para salvar na URL
function encodeState(s){
  try{
    const json = JSON.stringify(s);
    return btoa(unescape(encodeURIComponent(json)));
  } catch(e){ return ''; }
}

function decodeState(b64){
  try{
    return JSON.parse(decodeURIComponent(escape(atob(b64))));
  } catch(e){ return null; }
}

// gera a equacao de diferencas a partir da funcao de transferencia discreta
function diffEq(TF, varOut='y', varIn='u'){
  const num = TF.num, den = TF.den;
  const N = den.length-1;
  const dn = den[N];
  if(Math.abs(dn) < 1e-12) return 'denominador degenerado';
  const numNorm = num.map(c=>c/dn);
  const denNorm = den.map(c=>c/dn);
  const terms = [];
  for(let i=N;i>=0;i--){
    const c = numNorm[i] || 0;
    const lag = N - i;
    if(Math.abs(c)<1e-10) continue;
    const sign = c<0 ? '-' : (terms.length ? '+' : '');
    terms.push(`${sign}${formata(Math.abs(c),5)}\\,${varIn}[k${lag===0?'':'-'+lag}]`);
  }
  const dterms = [];
  for(let i=N-1;i>=0;i--){
    const c = denNorm[i] || 0;
    const lag = N - i;
    if(Math.abs(c)<1e-10) continue;
    const sign = c<0 ? '+' : '-';
    dterms.push(`${sign}${formata(Math.abs(c),5)}\\,${varOut}[k-${lag}]`);
  }
  return `${varOut}[k] = ${terms.join('')} ${dterms.join('')}`;
}

/* ============================================================
   APLICACAO PRINCIPAL - componente React que gerencia tudo
   ============================================================ */
function App(){
  // Load initial state from URL hash or use default
  const [state, setState] = React.useState(()=>{
    const url = new URL(window.location);
    const s = url.hash.startsWith('#s=') ? decodeState(url.hash.slice(3)) : null;
    return s || DEFAULT_STATE;
  });

  const upd = patch => setState(s=>({...s, ...patch, extra: patch.extra ? {...s.extra, ...patch.extra} : s.extra }));

  // Save to URL hash
  React.useEffect(()=>{
    const enc = encodeState(state);
    if(enc) history.replaceState(null,'', '#s='+enc);
  }, [state]);

  // Parse polynomials
  const parsed = React.useMemo(()=>{
    const errors = {};
    let gNum, gDen, hNum, hDen;
    try{ gNum = parsePoly(state.gNum); } catch(e){ errors.gNum = e.message; }
    try{ gDen = parsePoly(state.gDen); } catch(e){ errors.gDen = e.message; }
    try{ hNum = parsePoly(state.hNum); } catch(e){ errors.hNum = e.message; }
    try{ hDen = parsePoly(state.hDen); } catch(e){ errors.hDen = e.message; }
    return { gNum, gDen, hNum, hDen, errors };
  }, [state.gNum, state.gDen, state.hNum, state.hDen]);

  const hasParseError = Object.keys(parsed.errors).length > 0;

  // sd from spec
  const sd = React.useMemo(()=>{
    if(state.sdMode === 'sd_direct'){
      const re = parseFloat(state.sdRe) || -1;
      const im = (state.sdFormat === 're_lm') ? (parseFloat(state.sdLm) || 1) : (parseFloat(state.sdIm) || 1);
      return cmplx(re, im);
    }
    if(state.sdMode === 'zeta_wn'){
      const z = parseFloat(state.zeta), w = parseFloat(state.wn);
      return sdComZeta(z, w);
    }
    if(state.sdMode === 'mp_ts'){
      const z = zetaFromMp(parseFloat(state.mp));
      const w = omegaFromTs(z, parseFloat(state.ts), parseInt(state.tsTol));
      return sdComZeta(z, w);
    }
    return cmplx(-1,1);
  }, [state.sdMode, state.sdRe, state.sdIm, state.sdLm, state.sdFormat, state.zeta, state.wn, state.mp, state.ts, state.tsTol]);

  // Solve controller
  const solution = React.useMemo(()=>{
    if(hasParseError) return { error:'corrija os polinômios para resolver' };
    try{
      const G = { num: parsed.gNum, den: parsed.gDen };
      const H = { num: parsed.hNum, den: parsed.hDen };
      const GH = multTF(G, H);
      const ctrlDef = CONTROLLER_TYPES[state.ctrl];
      // gather extras with defaults
      const extras = {};
      for(const e of ctrlDef.extra){
        const v = state.extra[e.key];
        extras[e.key] = (v===undefined || v===null || v==='') ? e.default : parseFloat(v);
      }
      const sol = ctrlDef.solver({ GH, sd, ...extras });
      // closed loop (also compute from rounded controller for display/plots)
      const cl = lacoFechadoYR(G, H, sol.Gc);
      const ol = multTF(sol.Gc, GH);
      // generate rounded version of controller (use 5 display digits)
      const DISPLAY_DIGITS = 5;
      const roundToLocal = (x,d=DISPLAY_DIGITS)=>Math.round(x*Math.pow(10,d))/Math.pow(10,d);
      const roundTF = TF=>({ num: (TF.num||[]).map(c=>roundToLocal(c)), den: (TF.den||[]).map(c=>roundToLocal(c)) });
      const GcRounded = roundTF(sol.Gc);
      const clRounded = lacoFechadoYR(G, H, GcRounded);
      const olRounded = multTF(GcRounded, GH);
      // verification at sd (use rounded open-loop for verification)
      const v = avaliaTF(olRounded, sd);
      const verAng = angulo(v)*180/Math.PI;
      const verMag = magnitude(v);
      // GH evaluated at sd (for showing calculation)
      const GH_sd = avaliaTF(GH, sd);
      const GH_sd_angle = angulo(GH_sd)*180/Math.PI;
      const GH_sd_mag = magnitude(GH_sd);
      const sd_mag = magnitude(sd);
      const ghSteps = calculaPassosGH(GH, sd);
      // discretization (use rounded controller coefficients)
      const Tsamp = parseFloat(state.T) || 1;
      const discFn = DISC_METHODS[state.disc].fn;
      let GcZ, errorDisc = null;
      let GcZRounded = null;
      try { GcZ = discFn(sol.Gc, Tsamp); }
      catch(e){ errorDisc = e.message; }
      try { GcZRounded = discFn(GcRounded, Tsamp); } catch(e){}
      // Also discretize G·H·Gc (open-loop pulse)
      let GHGcZ = null;
      let GHGcZRounded = null;
      try { GHGcZ = discFn(ol, Tsamp); } catch(e){}
      try { GHGcZRounded = discFn(olRounded, Tsamp); } catch(e){}
      // debug: recompute Kc from normalized Gc (if Kc present) to verify magnitude criterion
      let debugKc = null;
      let Kc_display = null;
      try{
        const Kc = sol.params && sol.params.Kc;
        if(Kc !== undefined && isFinite(Kc) && Math.abs(Kc) > 0){
          const Gc = sol.Gc;
          const GcNorm = { num: escalaPoli(Gc.num, 1/Kc), den: Gc.den };
          const magGcNorm = magnitude(avaliaTF(GcNorm, sd));
          const Kc_expected = 1/(magGcNorm * GH_sd_mag);
          // also compute Kc using displayed rounded factors (to reproduce TeX shown values)
          const DISPLAY_DIGITS = 5;
          const sd_mag_r = Math.round(sd_mag * Math.pow(10, DISPLAY_DIGITS)) / Math.pow(10, DISPLAY_DIGITS);
          const GH_sd_mag_r = Math.round(GH_sd_mag * Math.pow(10, DISPLAY_DIGITS)) / Math.pow(10, DISPLAY_DIGITS);
          // product of |s_d + z_i| using roots of Gc numerator
          let product = 1;
          try{
            const roots = raizes(sol.Gc.num || []);
            const parts = roots.map(r=>Math.hypot(sd.re - r.re, sd.im - r.im));
            const parts_r = parts.map(p=>Math.round(p * Math.pow(10, DISPLAY_DIGITS)) / Math.pow(10, DISPLAY_DIGITS));
            product = parts_r.reduce((a,b)=>a*b, 1);
            Kc_display = sd_mag_r / (GH_sd_mag_r * product);
            debugKc = { Kc, magGcNorm, Kc_expected, sd_mag_r, GH_sd_mag_r, parts_r, product, Kc_display };
          } catch(e){ debugKc = { Kc, magGcNorm, Kc_expected, errorParts: e.message } }
        }
      } catch(e){ debugKc = { error: e.message }; }
      
      // Create controller with displayed (rounded) Kc
      const GcDisplay = Kc_display && sol.params && sol.params.Kc ? 
        { num: escalaPoli(GcRounded.num, Kc_display/sol.params.Kc), den: GcRounded.den } 
        : GcRounded;
      // Choose final controller based on useRoundedKc setting
      const GcFinal = state.useRoundedKc ? GcDisplay : sol.Gc;
      const clFinal = lacoFechadoYR(G, H, GcFinal);
      const olFinal = multTF(GcFinal, GH);
      let GcZFinal = null;
      let GHGcZFinal = null;
      try { GcZFinal = discFn(GcFinal, Tsamp); } catch(e){}
      try { GHGcZFinal = discFn(olFinal, Tsamp); } catch(e){}

      return { G, H, GH, sd, sol, cl, ol, GcRounded, clRounded, olRounded, GcDisplay, GcFinal, clFinal, olFinal, verAng, verMag, GcZ, GcZRounded, GcZFinal, GHGcZ, GHGcZRounded, GHGcZFinal, errorDisc, Tsamp, GH_sd, GH_sd_angle, GH_sd_mag, sd_mag, ghSteps, debugKc: debugKc || {} };
    } catch(e){ return { error: e.message }; }
  }, [parsed, state.ctrl, state.extra, state.disc, state.T, sd, hasParseError, state.useRoundedKc]);
  // Derived plots
  const poles = solution && solution.clFinal ? raizes(solution.clFinal.den) : [];
  const zeros = solution && solution.clFinal ? raizes(solution.clFinal.num) : [];
  const debugKc = solution && solution.debugKc ? solution.debugKc : null;

  const ctrlDef = CONTROLLER_TYPES[state.ctrl];
  const discDef = DISC_METHODS[state.disc];

  return html`
    <div class="grid-bg min-h-screen">
    <header class="border-b border-[var(--line)] bg-[var(--ink-1)]/80 backdrop-blur sticky top-0 z-20">
      <div class="max-w-7xl mx-auto px-6 py-4 flex items-center gap-4 flex-wrap">
        <div class="font-display text-2xl tracking-tight">
          <span class="italic">Calculadora</span><span class="text-[var(--amber)]"> controle</span>
          <span class="text-[var(--paper-mute)] text-base ml-2 font-mono uppercase">V1.0</span>
        </div>
        <div class="flex-1"></div>
        <div class="flex flex-wrap gap-1">
          ${PRESETS.map(p=> html`
            <button class="btn" onClick=${()=>setState({...DEFAULT_STATE, ...p.state})}>${p.name.split(' · ')[0]}</button>
          `)}
        </div>
        <button class="btn" onClick=${()=>setState(DEFAULT_STATE)}>reset</button>
      </div>
      <div class="marquee h-1 opacity-30"></div>
    </header>

    <main class="max-w-7xl mx-auto px-6 py-8">

      <section class="grid md:grid-cols-3 gap-6 items-start mb-8">
        <div class="md:col-span-2">
          <p class="chip text-[var(--amber)]">projeto de controladores · contínuo & discreto</p>
          <p class="mt-4 text-[var(--paper-dim)] max-w-2xl text-[15px]">
            Defina G(s) e H(s) livremente — coeficientes ou forma fatorada.
          </p>
        </div>
        <div class="panel rounded-md p-5">
          <p class="chip text-[var(--paper-mute)]">notação</p>
          <div class="mt-2 space-y-1 text-[13px] font-mono text-[var(--paper-dim)]">
            <div>• Polinômio: <span class="text-[var(--paper)]">s^2 + 2s + 1</span></div>
            <div>• Fatorado: <span class="text-[var(--paper)]">5(s+3)</span>, <span class="text-[var(--paper)]">s(s+4)</span></div>
            <div>• Composto: <span class="text-[var(--paper)]">(s+1)(s^2+2s+2)</span></div>
            <div>• Decimal vírgula ou ponto: <span class="text-[var(--paper)]">0,5</span> = <span class="text-[var(--paper)]">0.5</span></div>
          </div>
        </div>
      </section>

      <section class="grid lg:grid-cols-3 gap-6">

        <!-- LEFT: configuration -->
        <div class="lg:col-span-1 space-y-5">

          <!-- G(s), H(s) -->
          <div class="panel rounded-md p-5">
            <p class="chip text-[var(--paper-mute)]">planta &amp; realimentação</p>
            <div class="mt-3 space-y-3">
              <${PolyField} label="Numerador G(s)" value=${state.gNum} onChange=${v=>upd({gNum:v})} hint="N(s)" error=${parsed.errors.gNum}/>
              <${PolyField} label="Denominador G(s)" value=${state.gDen} onChange=${v=>upd({gDen:v})} hint="D(s)" error=${parsed.errors.gDen}/>
              <div class="grid grid-cols-2 gap-3">
                <${PolyField} label="Num H(s)" value=${state.hNum} onChange=${v=>upd({hNum:v})} hint="" error=${parsed.errors.hNum}/>
                <${PolyField} label="Den H(s)" value=${state.hDen} onChange=${v=>upd({hDen:v})} hint="" error=${parsed.errors.hDen}/>
              </div>
              ${!hasParseError && html`
                <div class="mt-3 pt-3 border-t border-[var(--line)] text-sm">
                  <div class="text-[var(--paper-mute)] chip mb-2">forma simbólica</div>
                  <${Tex} display=${true} tex=${`G(s) = ${tfEmTex({num:parsed.gNum,den:parsed.gDen})}`}/>
                  <${Tex} display=${true} tex=${`H(s) = ${tfEmTex({num:parsed.hNum,den:parsed.hDen})}`}/>
                </div>
              `}
            </div>
          </div>

          <!-- Controller type -->
          <div class="panel rounded-md p-5">
            <p class="chip text-[var(--paper-mute)]">tipo de controlador</p>
            <select class="mt-2" value=${state.ctrl} onChange=${e=>upd({ctrl:e.target.value, extra:{}})}>
              ${Object.entries(CONTROLLER_TYPES).map(([k,v])=> html`<option value=${k}>${v.label}</option>`)}
            </select>
            ${ctrlDef.extra.length > 0 && html`
              <div class="mt-3 space-y-2">
                ${ctrlDef.extra.map(e=> html`
                  <div>
                    <label class="text-xs text-[var(--paper-dim)]">${e.label}</label>
                    <input type="number" step="0.01" value=${state.extra[e.key]??e.default}
                      onInput=${ev=>upd({extra:{[e.key]: ev.target.value}})}/>
                  </div>
                `)}
              </div>
            `}
          </div>

          <!-- Spec mode -->
          <div class="panel rounded-md p-5">
            <p class="chip text-[var(--paper-mute)]">polo desejado · sd</p>
            <div class="mt-2 flex gap-1 flex-wrap">
              ${[
                ['mp_ts', 'Mp + ts'],
                ['zeta_wn', 'ζ + ωₙ'],
                ['sd_direct', 'sd direto']
              ].map(([k,l])=> html`
                <button class=${`pill ${state.sdMode===k?'pill-on':''}`} onClick=${()=>upd({sdMode:k})}>${l}</button>
              `)}
            </div>
            ${state.sdMode==='mp_ts' && html`
              <div class="mt-3 space-y-2">
                <div class="grid grid-cols-2 gap-2">
                  <div>
                    <label class="text-xs text-[var(--paper-dim)]">Mp (%)</label>
                    <input type="number" step="0.5" value=${state.mp} onInput=${e=>upd({mp:e.target.value})}/>
                  </div>
                  <div>
                    <label class="text-xs text-[var(--paper-dim)]">ts (s)</label>
                    <input type="number" step="0.1" value=${state.ts} onInput=${e=>upd({ts:e.target.value})}/>
                  </div>
                </div>
                <div>
                  <label class="text-xs text-[var(--paper-dim)]">tolerância de ts</label>
                  <select value=${state.tsTol} onChange=${e=>upd({tsTol:parseInt(e.target.value)})}>
                    <option value="2">2% (ts = 4/ζωₙ)</option>
                    <option value="5">5% (ts = 3/ζωₙ)</option>
                  </select>
                </div>
                <div class="mt-2 text-xs text-[var(--paper-mute)] font-mono">
                  → ζ = ${formata(zetaFromMp(parseFloat(state.mp)),4)} ·
                  ωₙ = ${formata(omegaFromTs(zetaFromMp(parseFloat(state.mp)), parseFloat(state.ts), parseInt(state.tsTol)),4)} rad/s
                </div>
              </div>
            `}
            ${state.sdMode==='zeta_wn' && html`
              <div class="mt-3 grid grid-cols-2 gap-2">
                <div>
                  <label class="text-xs text-[var(--paper-dim)]">ζ</label>
                  <input type="number" step="0.01" min="0.01" max="0.99" value=${state.zeta} onInput=${e=>upd({zeta:parseFloat(e.target.value)})}/>
                </div>
                <div>
                  <label class="text-xs text-[var(--paper-dim)]">ωₙ (rad/s)</label>
                  <input type="number" step="0.1" min="0.01" value=${state.wn} onInput=${e=>upd({wn:parseFloat(e.target.value)})}/>
                </div>
                <div class="col-span-2 text-xs text-[var(--paper-mute)] font-mono">
                  → Mp ≈ ${formata(mpFromZeta(parseFloat(state.zeta)),2)}% ·
                  ts(2%) ≈ ${formata(4/(parseFloat(state.zeta)*parseFloat(state.wn)),2)}s ·
                  ts(5%) ≈ ${formata(3/(parseFloat(state.zeta)*parseFloat(state.wn)),2)}s
                </div>
              </div>
            `}
            ${state.sdMode==='sd_direct' && html`
              <div class="mt-3 space-y-2">
                <div class="flex gap-1 flex-wrap">
                  ${[
                    ['re_im', 'Re + Im'],
                    ['re_lm', 'Re ± Lm']
                  ].map(([k,l])=> html`
                    <button class=${`pill ${state.sdFormat===k?'pill-on':''}`} onClick=${()=>upd({sdFormat:k})}>${l}</button>
                  `)}
                </div>
                ${state.sdFormat==='re_im' && html`
                  <div class="grid grid-cols-2 gap-2">
                    <div>
                      <label class="text-xs text-[var(--paper-dim)]">Re(sd)</label>
                      <input type="number" step="0.1" value=${state.sdRe} onInput=${e=>upd({sdRe:parseFloat(e.target.value)})}/>
                    </div>
                    <div>
                      <label class="text-xs text-[var(--paper-dim)]">Im(sd)</label>
                      <input type="number" step="0.1" value=${state.sdIm} onInput=${e=>upd({sdIm:parseFloat(e.target.value)})}/>
                    </div>
                  </div>
                `}

              
                ${state.sdFormat==='re_lm' && html`
                  <div class="grid grid-cols-2 gap-2">
                    <div>
                      <label class="text-xs text-[var(--paper-dim)]">Re</label>
                      <input type="number" step="0.1" value=${state.sdRe} onInput=${e=>upd({sdRe:parseFloat(e.target.value)})}/>
                    </div>
                    <div>
                      <label class="text-xs text-[var(--paper-dim)]">Lm (magnitude)</label>
                      <input type="number" step="0.1" min="0" value=${state.sdLm} onInput=${e=>upd({sdLm:Math.abs(parseFloat(e.target.value))})}/>
                    </div>
                  </div>
                  <div class="text-xs text-[var(--paper-mute)] font-mono">
                    polos: ${formata(state.sdRe,3)} + j${formata(state.sdLm,3)} e ${formata(state.sdRe,3)} − j${formata(state.sdLm,3)}
                  </div>
                `}
              </div>
            `}
            <div class="mt-3 pt-3 border-t border-[var(--line)] font-mono text-xs">
              <div class="flex justify-between">
                <span class="text-[var(--paper-mute)]">sd =</span>
                <span class="text-[var(--amber)]">${formata(sd.re,4)} + j${formata(sd.im,4)}</span>
              </div>
            </div>
          </div>

          <!-- Discretization -->
          <div class="panel rounded-md p-5">
            <p class="chip text-[var(--paper-mute)]">discretização</p>
            <select class="mt-2" value=${state.disc} onChange=${e=>upd({disc:e.target.value})}>
              ${Object.entries(DISC_METHODS).map(([k,v])=> html`<option value=${k}>${v.label}</option>`)}
            </select>
            <div class="mt-2">
              <label class="text-xs text-[var(--paper-dim)]">período de amostragem T (s)</label>
              <input type="number" step="0.01" min="0.001" value=${state.T} onInput=${e=>upd({T:parseFloat(e.target.value)})}/>
            </div>
            <p class="mt-2 text-xs text-[var(--paper-mute)] font-mono">${discDef.sub}</p>
          </div>

          <!-- Rounding option -->
          <div class="panel rounded-md p-5">
            <p class="chip text-[var(--paper-mute)]">cálculos</p>
            <div class="mt-2 flex gap-1 flex-wrap">
              ${[
                [true, 'Kc arredondado'],
                [false, 'Kc exato']
              ].map(([val,label])=> html`
                <button class=${`pill ${state.useRoundedKc===val?'pill-on':''}`} onClick=${()=>upd({useRoundedKc:val})}>${label}</button>
              `)}
            </div>
          </div>

          <!-- Snapshot -->
          ${solution && !solution.error && html`
            <div class="panel rounded-md p-5">
              <p class="chip text-[var(--paper-mute)]">snapshot</p>
              <div class="mt-3">
                <${KV} k="sd" v=${`${formata(sd.re,3)} + j${formata(sd.im,3)}`}/>
                ${Object.entries(solution.sol.params).filter(([k])=>!['Kc','phaseGH','phi_sd','phi_z','phi_b','phi_z1','phi_z2','phi_a'].includes(k)).map(([k,v])=> html`
                  <${KV} k=${k} v=${formata(v,5)}/>
                `)}
                ${state.useRoundedKc && solution.debugKc && solution.debugKc.Kc_display !== undefined && html`
                  <${KV} k="Kc (valores arredondados)" v=${formata(solution.debugKc.Kc_display,5)}/>
                `}
                ${!state.useRoundedKc && solution.sol.params.Kc !== undefined && html`
                  <${KV} k="Kc (exato)" v=${formata(solution.sol.params.Kc,5)}/>
                `}
              </div>
              <div class="mt-3 pt-3 border-t border-dashed border-[var(--line)]">
                <p class="chip text-[var(--paper-mute)]">verificação no sd</p>
                <div class="mt-2 font-mono text-xs space-y-1">
                  <div class="flex justify-between">
                    <span class="text-[var(--paper-dim)]">∠[GcGH](sd)</span>
                    <span class=${Math.abs(Math.abs(solution.verAng)-180)<0.5?'text-[var(--green)]':'text-[var(--rose)]'}>
                      ${formata(solution.verAng,3)}° ${Math.abs(Math.abs(solution.verAng)-180)<0.5?'✓':'✗'}
                    </span>
                  </div>
                  <div class="flex justify-between">
                    <span class="text-[var(--paper-dim)]">|GcGH|(sd)</span>
                    <span class=${Math.abs(solution.verMag-1)<1e-3?'text-[var(--green)]':'text-[var(--rose)]'}>
                      ${formata(solution.verMag,5)} ${Math.abs(solution.verMag-1)<1e-3?'✓':'✗'}
                    </span>
                  </div>
                </div>
              </div>
              <div class="mt-3 grid grid-cols-2 gap-2">
                <button class="btn" onClick=${()=>{
                  let txt = `Gc(s): ${solution.sol.formula.replace(/\\dfrac\{([^}]+)\}\{([^}]+)\}/g,'($1)/($2)').replace(/\\,/g,'')}\n`;
                  for(const [k,v] of Object.entries(solution.sol.params)){
                    if(['phaseGH','phi_sd','phi_z','phi_b','phi_z1','phi_z2','phi_a'].includes(k)) continue;
                    txt += `${k}=${formata(v,6)}\n`;
                  }
                  navigator.clipboard.writeText(txt.trim());
                }}>copiar params</button>
                <button class="btn" onClick=${()=>navigator.clipboard.writeText(window.location.href)}>copiar URL</button>
              </div>
            </div>
          `}
        </div>

        <!-- RIGHT: solution -->
        <div class="lg:col-span-2 space-y-5">
          <div class="panel rounded-md p-6 min-h-[200px]">
            <div class="flex items-center justify-between">
              <p class="chip text-[var(--paper-mute)]">solução ·</p>
              <span class="font-mono text-xs text-[var(--paper-mute)]">live</span>
            </div>

            ${solution.error && html`
              <div class="mt-4 p-4 border border-[var(--rose)] rounded text-[var(--rose)] font-mono text-sm">
                ${solution.error}
              </div>
            `}

            ${!solution.error && html`
              <${Section} n="1" title="Especificações → polo desejado">
                ${state.sdMode==='mp_ts' && html`
                  <p>De Mp ≤ ${state.mp}%:</p>
                  <${Tex} display=${true} tex=${`\\zeta = \\dfrac{|\\ln(M_p/100)|}{\\sqrt{\\pi^2+\\ln^2(M_p/100)}} = ${formata(zetaFromMp(parseFloat(state.mp)),4)}`}/>
                  <p>De ts(${state.tsTol}%) &lt; ${state.ts}s:</p>
                  <${Tex} display=${true} tex=${`\\omega_n = \\dfrac{${state.tsTol===2?4:3}}{\\zeta\\, t_s} = ${formata(omegaFromTs(zetaFromMp(parseFloat(state.mp)), parseFloat(state.ts), parseInt(state.tsTol)),4)}\\,\\text{rad/s}`}/>
                `}
                ${state.sdMode==='zeta_wn' && html`
                  <p>Com ζ = ${state.zeta}, ωₙ = ${state.wn}:</p>
                `}
                ${state.sdMode==='sd_direct' && state.sdFormat==='re_im' && html`
                  <p>Polo informado como Re + jIm:</p>
                `}
                ${state.sdMode==='sd_direct' && state.sdFormat==='re_lm' && html`
                  <p>Polos conjugados em formato Re ± Lm:</p>
                  <${Tex} display=${true} tex=${`s_{d,1} = ${formata(sd.re,4)} + j\\,${formata(sd.im,4)}`}/>
                  <${Tex} display=${true} tex=${`s_{d,2} = ${formata(sd.re,4)} - j\\,${formata(sd.im,4)}`}/>
                `}
                ${!(state.sdMode==='sd_direct' && state.sdFormat==='re_lm') && html`
                  <${Tex} display=${true} tex=${`s_d = ${formata(sd.re,4)} + j\\,${formata(sd.im,4)}`}/>
                `}
              </${Section}>

              <${Section} n="2" title="Avaliação de GH(s_d)">
                <p>Temos:</p>
                <${Tex} display=${true} tex=${`GH(s) = ${tfEmTex(solution.GH)}`}/>
                <${Tex} display=${true} tex=${`s_d = ${formata(sd.re,4)} + j\\,${formata(sd.im,4)}`}/>
                <p class="mt-3">Avaliando o numerador:</p>
                <${Tex} display=${true} tex=${`\\mathrm{Numerador}(s_d) = ${formata(solution.ghSteps.numVal.re,5)} + j\\,${formata(solution.ghSteps.numVal.im,5)}`}/>
                <${Tex} display=${true} tex=${`|\\mathrm{Num}| = ${formata(solution.ghSteps.numMag,5)}, \\quad \\angle\\mathrm{Num} = ${formata(solution.ghSteps.numAngle,3)}^\\circ`}/>
                <p class="mt-3">Avaliando o denominador:</p>
                <${Tex} display=${true} tex=${`\\mathrm{Denominador}(s_d) = ${formata(solution.ghSteps.denVal.re,5)} + j\\,${formata(solution.ghSteps.denVal.im,5)}`}/>
                <${Tex} display=${true} tex=${`|\\mathrm{Den}| = ${formata(solution.ghSteps.denMag,5)}, \\quad \\angle\\mathrm{Den} = ${formata(solution.ghSteps.denAngle,3)}^\\circ`}/>
                <p class="mt-3">Dividindo:</p>
                <${Tex} display=${true} tex=${`GH(s_d) = \\dfrac{\\mathrm{Numerador}}{\\mathrm{Denominador}} = \\dfrac{${formata(solution.ghSteps.numVal.re,5)} + j${formata(solution.ghSteps.numVal.im,5)}}{${formata(solution.ghSteps.denVal.re,5)} + j${formata(solution.ghSteps.denVal.im,5)}}`}/>
                <${Tex} display=${true} tex=${`GH(s_d) = ${formata(solution.GH_sd.re,5)} + j\\,${formata(solution.GH_sd.im,5)}`}/>
                <${Tex} display=${true} tex=${`\\boxed{|GH(s_d)| = ${formata(solution.GH_sd_mag,5)}, \\quad \\angle GH(s_d) = ${formata(solution.GH_sd_angle,3)}^\\circ}`}/>
              </${Section}>

              <${Section} n="3" title=${`Critério de ângulo · controlador ${solution.sol.name}`}>
                <p>Condição: ∠Gc(s_d) · GH(s_d) = −180°</p>
                <p class="mt-2">Do passo anterior:</p>
                <${Tex} display=${true} tex=${`\\angle GH(s_d) = ${formata(solution.GH_sd_angle,3)}^\\circ`}/>
                <p class="mt-3">Ângulo necessário do controlador:</p>
                <${Tex} display=${true} tex=${`\\angle G_c(s_d) = -180^\\circ - \\angle GH(s_d) = -180^\\circ - (${formata(solution.GH_sd_angle,3)}^\\circ) = ${formata(-180 - solution.GH_sd_angle,3)}^\\circ`}/>
                ${solution.sol.params.phi_z !== undefined && html`
                  <p class="mt-2">Ângulo necessário para o zero:</p>
                  <${Tex} display=${true} tex=${`\\phi_z = ${formata(solution.sol.params.phi_z,3)}^\\circ`}/>
                  <${Tex} display=${true} tex=${`z = -s_d^{Re} + \\dfrac{s_d^{Im}}{\\tan(\\phi_z)} = ${formata(solution.sol.params.z,5)}`}/>
                `}
                ${solution.sol.params.phi_z2 !== undefined && html`
                  <p class="mt-2">Ângulos necessários para os zeros:</p>
                  <${Tex} display=${true} tex=${`\\phi_{z_1} = ${formata(solution.sol.params.phi_z1,3)}^\\circ \\Rightarrow z_1 = ${formata(solution.sol.params.z1,5)}`}/>
                  <${Tex} display=${true} tex=${`\\phi_{z_2} = ${formata(solution.sol.params.phi_z2,3)}^\\circ \\Rightarrow z_2 = ${formata(solution.sol.params.z2,5)}`}/>
                `}
                ${solution.sol.params.phi_b !== undefined && solution.sol.params.phi_a===undefined && html`
                  <p class="mt-2">Ângulo necessário para o pólo:</p>
                  <${Tex} display=${true} tex=${`\\phi_b = 180^\\circ + \\angle GH(s_d) = 180^\\circ + (${formata(solution.GH_sd_angle,3)}^\\circ) = ${formata(solution.sol.params.phi_b,3)}^\\circ`}/>
                  <${Tex} display=${true} tex=${`b = -s_d^{Re} + \\dfrac{s_d^{Im}}{\\tan(\\phi_b)} = ${formata(solution.sol.params.b,5)}`}/>
                `}
                ${solution.sol.params.phi_a !== undefined && html`
                  <p class="mt-2">Ângulo do zero fixo e pólo desejado:</p>
                  <${Tex} display=${true} tex=${`\\phi_a = \\angle(s_d + a) = ${formata(solution.sol.params.phi_a,3)}^\\circ \\text{ (fixo: } a = ${formata(solution.sol.params.a_zero,5)} \\text{)}`}/>
                  <${Tex} display=${true} tex=${`\\phi_b = -180^\\circ - \\angle GH(s_d) + \\phi_a + \\angle s_d = ${formata(solution.sol.params.phi_b,3)}^\\circ`}/>
                  <${Tex} display=${true} tex=${`b = -s_d^{Re} + \\dfrac{s_d^{Im}}{\\tan(\\phi_b)} = ${formata(solution.sol.params.b,5)}`}/>
                `}
              </${Section}>

              <${Section} n="4" title="Critério de magnitude → ganho">
                <p>Condição: |G_c(s_d)| · |GH(s_d)| = 1</p>
                <p>Magnitude de GH no polo desejado:</p>
                <${Tex} display=${true} tex=${`|GH(s_d)| = \\sqrt{[\\mathrm{Re}(GH(s_d))]^2 + [\\mathrm{Im}(GH(s_d))]^2}`}/>
                <${Tex} display=${true} tex=${`= \\sqrt{${formata(solution.GH_sd.re,5)}^2 + ${formata(solution.GH_sd.im,5)}^2}`}/>
                <${Tex} display=${true} tex=${`= \\sqrt{${formata(solution.GH_sd.re*solution.GH_sd.re,8)} + ${formata(solution.GH_sd.im*solution.GH_sd.im,8)}}`}/>
                <${Tex} display=${true} tex=${`= ${formata(solution.GH_sd_mag,5)}`}/>
                ${((debugKc && debugKc.Kc_display !== undefined) || solution.sol.params.Kc) && html`
                  <p class="mt-3">Magnitude de s_d:</p>
                  <${Tex} display=${true} tex=${`|s_d| = \\sqrt{(${formata(sd.re,5)})^2 + (${formata(sd.im,5)})^2} = \\sqrt{${formata(sd.re*sd.re,8)} + ${formata(sd.im*sd.im,8)}} = ${formata(solution.sd_mag,5)}`}/>
                  <p class="mt-3">Ganho necessário (critério de magnitude):</p>
                  ${state.useRoundedKc && solution.debugKc.Kc_display !== undefined && html`
                    <${Tex} display=${true} tex=${`K_c = \\dfrac{|s_d|}{|GH(s_d)| \\cdot \\prod |s_d + z_i|} = \\dfrac{${formata(solution.sd_mag,5)}}{${formata(solution.GH_sd_mag,5)} \\cdot \\prod |s_d + z_i|} = ${formata(solution.debugKc.Kc_display,5)}`}/>
                  `}
                  ${!state.useRoundedKc && solution.sol.params.Kc && html`
                    <${Tex} display=${true} tex=${`K_c = \\dfrac{|s_d|}{|GH(s_d)| \\cdot \\prod |s_d + z_i|} = ${formata(solution.sol.params.Kc,5)}`}/>
                  `}
                `}
                ${solution.sol.params.a !== undefined && solution.sol.params.b !== undefined && solution.debugKc.Kc_display===undefined && html`
                  <p class="mt-3">Magnitude de (s_d + b):</p>
                  <${Tex} display=${true} tex=${`|s_d+b| = \\sqrt{(${formata(sd.re,5)}+${formata(solution.sol.params.b,5)})^2 + (${formata(sd.im,5)})^2}`}/>
                  <${Tex} display=${true} tex=${`= \\sqrt{${formata(sd.re+solution.sol.params.b,5)}^2 + ${formata(sd.im,5)}^2}`}/>
                  <${Tex} display=${true} tex=${`= \\sqrt{${formata((sd.re+solution.sol.params.b)*(sd.re+solution.sol.params.b),8)} + ${formata(sd.im*sd.im,8)}}`}/>
                  <${Tex} display=${true} tex=${`= ${formata(Math.hypot(sd.re+solution.sol.params.b, sd.im),5)}`}/>
                  <p class="mt-3">Ganho necessário (critério de magnitude):</p>
                  <${Tex} display=${true} tex=${`a = \\dfrac{|s_d+b|}{|GH(s_d)|} = \\dfrac{${formata(Math.hypot(sd.re+solution.sol.params.b, sd.im),5)}}{${formata(solution.GH_sd_mag,5)}} = ${formata(solution.sol.params.a,5)}`}/>
                `}
              </${Section}>

              ${state.useRoundedKc && debugKc && debugKc.Kc_display !== undefined && html`
                <${Section} n="4.1" title="Detalhamento: produto de |s_d + z_i|">
                  ${(() => {
                    try{
                      const zerosGc = raizes(solution.sol.Gc.num || []);
                      if(!zerosGc || zerosGc.length===0) return html`<p class="text-xs text-[var(--paper-mute)]">Nenhum zero no numerador (produto vazio).</p>`;
                      const parts = zerosGc.map((r,i)=>{
                        const re = sd.re - r.re;
                        const im = sd.im - r.im;
                        const mag = Math.hypot(re, im);
                        return { r, re, im, mag };
                      });
                      const product = parts.reduce((p,x)=>p*x.mag, 1);
                      return html`
                        <div class="text-xs font-mono space-y-2">
                          ${parts.map((p,i)=> html`
                            <div>
                              <${Tex} display=${true} tex=${`|s_d - (${formata(p.r.re,5)} + j\,${formata(p.r.im,5)})| = \\sqrt{(${formata(p.re,5)})^2 + (${formata(p.im,5)})^2} = ${formata(p.mag,5)}`}/>
                            </div>
                          `)}
                          <div>
                            <${Tex} display=${true} tex=${`\\prod_{i=1}^{${parts.length}} |s_d + z_i| = ${parts.map(p=>formata(p.mag,5)).join(' \\cdot ')} = ${formata(product,5)}`}/>
                          </div>
                          <div>
                            <${Tex} display=${true} tex=${`K_c = \\dfrac{|s_d|}{|GH(s_d)| \\cdot \\prod |s_d + z_i|} = \\dfrac{${formata(solution.sd_mag,5)}}{${formata(solution.GH_sd_mag,5)} \\cdot ${formata(product,5)}} = ${formata(solution.debugKc.Kc_display,5)}`}/>
                          </div>
                        </div>
                      `;
                    } catch(e){
                      return html`<p class="text-xs text-[var(--rose)]">erro no detalhamento: ${e.message}</p>`;
                    }
                  })()}
                </${Section}>
              `}

              <${Section} n="5" title="Controlador final no contínuo">
                <${Tex} display=${true} tex=${`\\boxed{\\,${solution.sol.formula}\\,}`}/>
                <p class="mt-2">Forma racional${state.useRoundedKc ? ' (com Kc arredondado)' : ' (Kc exato)'}:</p>
                <${Tex} display=${true} tex=${`G_c(s) = ${tfEmTex(solution.GcFinal || solution.sol.Gc)}`}/>
              </${Section}>

              <${Section} n="6" title="Malha fechada y/r">
                <${Tex} display=${true} tex=${`\\dfrac{Y(s)}{R(s)} = \\dfrac{G_c\\,G}{1 + G_c\\,G\\,H} = ${tfEmTex(solution.clFinal || solution.cl)}`}/>
              </${Section}>

              <${Section} n="7" title=${`Discretização · ${discDef.label} · T = ${state.T}s`}>
                <p>Substituição: <${Tex} tex=${discDef.sub}/></p>
                ${solution.errorDisc && html`<p class="text-[var(--rose)] font-mono text-sm">erro: ${solution.errorDisc}</p>`}
                ${solution.GcZFinal && html`
                  <p class="mt-2">Controlador discretizado${state.useRoundedKc ? ' (a partir dos coeficientes com Kc arredondado)' : ' (Kc exato)'}:</p>
                  <${Tex} display=${true} tex=${`G_c(z) = ${tfEmTex(solution.GcZFinal,'z')}`}/>
                  <p class="text-[var(--paper-mute)] text-sm italic mt-2">Equação de diferenças (e[k] = entrada de erro, u[k] = saída de controle):</p>
                  <${Tex} display=${true} tex=${diffEq(solution.GcZFinal, 'u', 'e')}/>
                `}
                ${solution.GHGcZFinal && html`
                  <details class="mt-3">
                    <summary class="chip text-[var(--paper-mute)] hover:text-[var(--amber)]">também discretizar {G(s)·H(s)·G_c(s)} →</summary>
                    <div class="mt-3">
                      <${Tex} display=${true} tex=${`\{G(s)H(s)G_c(s)\}_z = ${tfEmTex(solution.GHGcZFinal,'z')}`}/>
                    </div>
                  </details>
                `}
              </${Section}>

              <!-- Plots -->
              <div class="mt-5 pt-4 border-t border-[var(--line)] space-y-4">
                <div class="flex gap-4 flex-wrap">
                  <div>
                    <p class="text-xs text-[var(--paper-mute)] chip mb-2">mapa polo-zero</p>
                    <${PoleZeroPlot} poles=${poles} zeros=${zeros} target=${sd}/>
                  </div>
                  <div>
                    <p class="text-xs text-[var(--paper-mute)] chip mb-2">resposta ao degrau</p>
                    <${StepPlot} T=${solution.clFinal || solution.cl}/>
                  </div>
                </div>
              </div>
            `}
          </div>
        </div>

      </section>
    </main>
    </div>
  `;
}

// Render app
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(html`<${App}/>`);
