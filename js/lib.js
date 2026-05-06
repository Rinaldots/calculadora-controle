// numeros complexos
const cmplx = (re=0, im=0)=>({re, im});
const somaComplexo = (a,b)=>cmplx(a.re+b.re, a.im+b.im);
const subComplexo = (a,b)=>cmplx(a.re-b.re, a.im-b.im);
const multComplexo = (a,b)=>cmplx(a.re*b.re-a.im*b.im, a.re*b.im+a.im*b.re);
const divComplexo = (a,b)=>{const d=b.re*b.re+b.im*b.im;return cmplx((a.re*b.re+a.im*b.im)/d,(a.im*b.re-a.re*b.im)/d);};
const magnitude = a=>Math.hypot(a.re,a.im);
const angulo = a=>Math.atan2(a.im,a.re);

// polinomios - [a0, a1, a2, ...] onde a0 eh o termo constante
const multPoli = (a,b)=>{
  const r = new Array(a.length+b.length-1).fill(0);
  for(let i=0;i<a.length;i++)for(let j=0;j<b.length;j++) r[i+j]+=a[i]*b[j];
  return r;
};

const somaPoli = (a,b)=>{
  const n=Math.max(a.length,b.length); const r=new Array(n).fill(0);
  for(let i=0;i<n;i++) r[i]=(a[i]||0)+(b[i]||0);
  return r;
};

const escalaPoli = (a,k)=>a.map(c=>c*k);

const avaliaPoliLi = (p, s)=>{
  let r = cmplx(0,0);
  for(let i=p.length-1;i>=0;i--){ r = somaComplexo(multComplexo(r,s), cmplx(p[i],0)); }
  return r;
};

const trimaPoli = p=>{ let n=p.length; while(n>1 && Math.abs(p[n-1])<1e-12) n--; return p.slice(0,n); };

// acha raizes de um polinomio
function raizes(p){
  p = trimaPoli(p);
  const n = p.length-1;
  if(n<=0) return [];
  if(n===1) return [cmplx(-p[0]/p[1], 0)];
  if(n===2){
    const a=p[2], b=p[1], c=p[0];
    const disc = b*b-4*a*c;
    if(disc>=0){ const sq=Math.sqrt(disc); return [cmplx((-b+sq)/(2*a),0), cmplx((-b-sq)/(2*a),0)]; }
    const sq=Math.sqrt(-disc); return [cmplx(-b/(2*a), sq/(2*a)), cmplx(-b/(2*a), -sq/(2*a))];
  }
  const lead = p[n];
  const monic = p.map(c=>c/lead);
  let z = [];
  const r = 1 + Math.max(...monic.slice(0,-1).map(Math.abs));
  for(let k=0;k<n;k++){
    const ang = 2*Math.PI*k/n + Math.PI/(2*n);
    z.push(cmplx(r*Math.cos(ang), r*Math.sin(ang)));
  }
  for(let it=0;it<400;it++){
    let maxStep = 0;
    for(let i=0;i<n;i++){
      let denom = cmplx(1,0);
      for(let j=0;j<n;j++) if(j!==i) denom = multComplexo(denom, subComplexo(z[i], z[j]));
      const num = avaliaPoliLi(monic, z[i]);
      const step = divComplexo(num, denom);
      z[i] = subComplexo(z[i], step);
      maxStep = Math.max(maxStep, magnitude(step));
    }
    if(maxStep<1e-12) break;
  }
  return z.map(zz=>Math.abs(zz.im)<1e-8 ? cmplx(zz.re,0) : zz);
}

/* ============================================================
   PARSER DE POLINOMIOS - converte string para array de coeficientes
   ============================================================ */
function parsePoly(input, varName='s'){
  if(input==null) throw new Error('vazio');
  let str = String(input).trim();
  if(str==='') throw new Error('vazio');
  str = str.replace(/[−–—]/g,'-').replace(/[·×]/g,'*').replace(/\s+/g,'');
  str = str.replace(/(\d),(\d)/g, '$1.$2');

  let i = 0;
  function peek(){ return str[i]; }
  function eat(c){ if(str[i]!==c) throw new Error(`esperado '${c}' em pos ${i}`); i++; }
  function eof(){ return i>=str.length; }

  function parseExpr(){
    let r = parseTerm();
    while(!eof() && (peek()==='+' || peek()==='-')){
      const op = peek(); i++;
      const t = parseTerm();
      r = (op==='+') ? somaPoli(r, t) : somaPoli(r, escalaPoli(t, -1));
    }
    return r;
  }

  function parseTerm(){
    let sign = 1;
    if(peek()==='+'){ i++; }
    else if(peek()==='-'){ sign = -1; i++; }
    let r = parseFactor();
    while(!eof() && peek()!=='+' && peek()!=='-' && peek()!==')'){
      if(peek()==='*' || peek()==='/') {
        const op = peek(); i++;
        const f = parseFactor();
        if(op==='*') r = multPoli(r, f);
        else throw new Error('divisão de polinômios não suportada');
      } else {
        const f = parseFactor();
        r = multPoli(r, f);
      }
    }
    if(sign<0) r = escalaPoli(r, -1);
    return r;
  }

  function parseFactor(){
    let base;
    if(peek()==='('){
      i++; base = parseExpr(); eat(')');
    } else if(peek()===varName){
      i++; base = [0,1];
    } else if(/[0-9.]/.test(peek())){
      let s = '';
      while(!eof() && /[0-9.eE+\-]/.test(peek())){
        if((peek()==='+'||peek()==='-') && !/[eE]$/.test(s)) break;
        s += peek(); i++;
      }
      const n = parseFloat(s);
      if(!isFinite(n)) throw new Error(`número inválido '${s}'`);
      base = [n];
    } else {
      throw new Error(`token inesperado '${peek()}' em pos ${i}`);
    }
    if(peek()==='^'){
      i++;
      let s='';
      while(!eof() && /[0-9]/.test(peek())){ s+=peek(); i++; }
      const k = parseInt(s,10);
      if(!isFinite(k) || k<0) throw new Error('expoente inválido');
      let r = [1];
      for(let j=0;j<k;j++) r = multPoli(r, base);
      base = r;
    }
    return base;
  }

  const result = parseExpr();
  if(!eof()) throw new Error(`sobrou texto: '${str.slice(i)}'`);
  return trimaPoli(result);
}

function poliEmTex(p, varName='s'){
  p = trimaPoli(p);
  if(p.length===1) return formata(p[0]);
  const parts = [];
  for(let i=p.length-1;i>=0;i--){
    const c = p[i];
    if(Math.abs(c)<1e-10) continue;
    const sign = c<0 ? '-' : (parts.length? '+' : '');
    const ac = Math.abs(c);
    let coef;
    if(i===0) coef = formata(ac);
    else if(Math.abs(ac-1)<1e-10) coef = '';
    else coef = formata(ac);
    let term = coef;
    if(i>=1) term += varName + (i>1 ? `^{${i}}` : '');
    parts.push(`${sign}${term}`);
  }
  return parts.join(' ');
}

function tfEmTex(TF, varName='s'){
  return `\\dfrac{${poliEmTex(TF.num, varName)}}{${poliEmTex(TF.den, varName)}}`;
}

/* ============================================================
   HELPERS DE CALCULO DE CONTROLADORES
   ============================================================ */
const multTF = (A,B)=>({num:multPoli(A.num,B.num), den:multPoli(A.den,B.den)});
const avaliaTF = (T, s)=>divComplexo(avaliaPoliLi(T.num,s), avaliaPoliLi(T.den,s));

function lacoFechado(G, H){
  const num = multPoli(G.num, H.den);
  const den = somaPoli(multPoli(G.den, H.den), multPoli(G.num, H.num));
  return {num, den};
}

function lacoFechadoYR(G, H, Gc){ 
  return lacoFechado(multTF(Gc, G), H); 
}

/* ============================================================
   FORMA CANONICA CONTROLÁVEL - converte TF para estado espaço controlável
   ============================================================ */
function tfParaCCF(TF){
  const num = trimaPoli(TF.num).slice();
  const den = trimaPoli(TF.den).slice();
  const n = den.length - 1;
  if(n<=0){
    return null;
  }
  if(num.length > den.length) throw new Error('TF imprópria (deg(num)>deg(den))');
  const a0n = den[n];
  const a = den.slice(0,n).map(c=>c/a0n);
  const b = new Array(n+1).fill(0);
  for(let i=0;i<num.length;i++) b[i]=num[i]/a0n;
  const D = b[n] || 0;
  const Cv = new Array(n).fill(0);
  for(let i=0;i<n;i++) Cv[i] = (b[i]||0) - a[i]*D;
  const A = Array.from({length:n}, ()=>new Array(n).fill(0));
  for(let i=0;i<n-1;i++) A[i][i+1] = 1;
  for(let j=0;j<n;j++) A[n-1][j] = -a[j];
  const B = new Array(n).fill(0); B[n-1] = 1;
  return { A, B, C: Cv, D, n };
}

function simulaResposta(T, t_end, dt){
  const ss = tfParaCCF(T);
  if(!ss){
    const k = (T.num[0]||0)/(T.den[0]||1);
    const ts=[],ys=[];
    for(let t=0;t<=t_end;t+=dt){ ts.push(t); ys.push(k); }
    return {t:ts, y:ys};
  }
  const {A,B,C:Cv,D,n} = ss;
  const x = new Array(n).fill(0);
  function deriv(xx, u){
    const dx = new Array(n).fill(0);
    for(let i=0;i<n;i++){
      let s=0; for(let j=0;j<n;j++) s+=A[i][j]*xx[j];
      s += B[i]*u; dx[i]=s;
    }
    return dx;
  }
  function output(xx, u){
    let y=D*u; for(let i=0;i<n;i++) y+=Cv[i]*xx[i]; return y;
  }
  const ts=[],ys=[];
  let t=0; ts.push(0); ys.push(output(x,1));
  const u=1;
  while(t<t_end){
    const k1=deriv(x,u);
    const x2=x.map((v,i)=>v+0.5*dt*k1[i]);
    const k2=deriv(x2,u);
    const x3=x.map((v,i)=>v+0.5*dt*k2[i]);
    const k3=deriv(x3,u);
    const x4=x.map((v,i)=>v+dt*k3[i]);
    const k4=deriv(x4,u);
    for(let i=0;i<n;i++) x[i]+=dt/6*(k1[i]+2*k2[i]+2*k3[i]+k4[i]);
    t+=dt; ts.push(t); ys.push(output(x,u));
  }
  return {t:ts, y:ys};
}

/* ============================================================
   ZETA E MP PELA PORCENTAGEM DE OVERSHOOT
   ============================================================ */
function zetaFromMp(MpPercent){
  if(MpPercent<=0) return 0.99;
  if(MpPercent>=100) return 0.01;
  const ln = Math.log(MpPercent/100);
  return Math.abs(ln) / Math.sqrt(Math.PI*Math.PI + ln*ln);
}

function mpFromZeta(z){ 
  if(z>=1) return 0; 
  if(z<=0) return 100; 
  return 100*Math.exp(-z*Math.PI/Math.sqrt(1-z*z)); 
}

function omegaFromTs(z, ts, percent){
  const k = (percent===2) ? 4 : 3;
  return k/(z*ts);
}

function sdComZeta(z, wn){ 
  return cmplx(-z*wn, wn*Math.sqrt(Math.max(0, 1-z*z))); 
}

const wrap180 = a => ((a + 180) % 360 + 360) % 360 - 180;
const angleAt = (sd, k)=> Math.atan2(sd.im, sd.re + k) * 180/Math.PI;
const magAt   = (sd, k)=> Math.hypot(sd.re + k, sd.im);
const angleOf = sd => Math.atan2(sd.im, sd.re) * 180/Math.PI;

/* ============================================================
   FORMATAÇAO DE NÚMEROS E EXPRESSÕES PARA TEXTO
   ============================================================ */
const formata = (x, d=4)=>{
  if(!isFinite(x)) return '∞';
  if(Math.abs(x) < 1e-10) return '0';
  return Number(x).toLocaleString('pt-BR',{minimumFractionDigits:0,maximumFractionDigits:d});
};

/* ============================================================
   GH(s_d) Passos Itermediarios - calcula os valores intermediarios 
   ============================================================ */
function calculaPassosGH(GH, sd){
  const numVal = avaliaPoliLi(GH.num, sd);
  const denVal = avaliaPoliLi(GH.den, sd);
  const result = divComplexo(numVal, denVal);
  
  return {
    numVal, denVal, result,
    numMag: magnitude(numVal),
    denMag: magnitude(denVal),
    numAngle: angulo(numVal) * 180/Math.PI,
    denAngle: angulo(denVal) * 180/Math.PI
  };
}
