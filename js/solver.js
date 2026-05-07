// Solucionadores de controladores - metodo do lugar das raizes

// calcula o angulo de GH no ponto desejado sd
function angleGH(GH, sd){ 
  return angulo(avaliaTF(GH, sd))*180/Math.PI; 
}

// arredondamento consistente para cálculos exibidos
const ROUND_DIGITS = 5;
const roundTo = (x, d=ROUND_DIGITS) => Math.round(x * Math.pow(10, d)) / Math.pow(10, d);

// --- CONTROLADOR PD: Gc(s) = Kc(s+z)
// adiciona um zero para ajustar o angulo
function solvePD({GH, sd}){
  const phaseGH = angleGH(GH, sd);
  const phi_z = wrap180(-180 - phaseGH); // angulo necessario do zero
  const phiRad = phi_z*Math.PI/180;
  let z = Math.abs(Math.cos(phiRad))<1e-10 ? -sd.re : sd.im/Math.tan(phiRad) - sd.re;
  z = roundTo(z);
  const magGH = roundTo(magnitude(avaliaTF(GH, sd)));
  const m = roundTo(magAt(sd, z));
  const Kc = roundTo(1/(magGH * m)); // ganho para satisfazer criterio de magnitude
  return {
    Gc: {num:[Kc*z, Kc], den:[1]},
    params: { z, Kc, Kp: Kc*z, Kd: Kc, phi_z, phaseGH },
    name: 'PD',
    formula: `G_c(s) = K_c(s+z) = ${formata(Kc,4)}(s+${formata(z,4)})`
  };
}

// --- CONTROLADOR PI: Gc(s) = Kc(s+z)/s
// adiciona um zero e integrador
function solvePI({GH, sd}){
  const phaseGH = angleGH(GH, sd);
  const phi_sd = angleOf(sd); // angulo do polo desejado
  const phi_z = wrap180(-180 - phaseGH + phi_sd); // ajusta angulo
  const phiRad = phi_z*Math.PI/180;
  let z = Math.abs(Math.cos(phiRad))<1e-10 ? -sd.re : sd.im/Math.tan(phiRad) - sd.re;
  z = roundTo(z);
  const magGH = roundTo(magnitude(avaliaTF(GH, sd)));
  const m = roundTo(magAt(sd, z));
  const Kc = roundTo(magnitude(sd) / (magGH * m)); // magnitude
  return {
    Gc: {num:[Kc*z, Kc], den:[0,1]},
    params: { z, Kc, Kp: Kc, Ki: Kc*z, phi_z, phaseGH, phi_sd },
    name: 'PI',
    formula: `G_c(s) = K_c\\dfrac{s+z}{s} = ${formata(Kc,4)}\\dfrac{s+${formata(z,4)}}{s}`
  };
}

// --- CONTROLADOR PID DUPLO: Gc(s) = Kc(s+z)²/s
// dois zeros iguais
function solvePIDdouble({GH, sd}){
  const phaseGH = angleGH(GH, sd);
  const phi_sd = angleOf(sd);
  const phi_z = wrap180((-180 - phaseGH + phi_sd)/2); // divide o angulo por 2
  const phiRad = phi_z*Math.PI/180;
  let z = Math.abs(Math.cos(phiRad))<1e-10 ? -sd.re : sd.im/Math.tan(phiRad) - sd.re;
  z = roundTo(z);
  const magGH = roundTo(magnitude(avaliaTF(GH, sd)));
  const m = roundTo(magAt(sd, z));
  const Kc = roundTo(magnitude(sd) / (magGH * m * m));
  const numz = multPoli([z,1],[z,1]);
  return {
    Gc: {num: escalaPoli(numz, Kc), den:[0,1]},
    params: { z, Kc, Kp: 2*Kc*z, Ki: Kc*z*z, Kd: Kc, phi_z, phaseGH, phi_sd },
    name: 'PID (z₁=z₂)',
    formula: `G_c(s) = K_c\\dfrac{(s+z)^2}{s} = ${formata(Kc,4)}\\dfrac{(s+${formata(z,4)})^2}{s}`
  };
}

// --- PID com z₁ fixo, busca z₂: Gc(s) = Kc(s+z₁)(s+z₂)/s
function solvePIDdistinct({GH, sd, z1}){
  const phaseGH = angleGH(GH, sd);
  const phi_sd = angleOf(sd);
  const phi_z1 = angleAt(sd, z1);
  const phi_z2 = wrap180(-180 - phaseGH + phi_sd - phi_z1);
  const phiRad = phi_z2*Math.PI/180;
  let z2 = Math.abs(Math.cos(phiRad))<1e-10 ? -sd.re : sd.im/Math.tan(phiRad) - sd.re;
  z2 = roundTo(z2);
  const magGH = roundTo(magnitude(avaliaTF(GH, sd)));
  const m1 = roundTo(magAt(sd, z1)), m2 = roundTo(magAt(sd, z2));
  const Kc = roundTo(magnitude(sd) / (magGH * m1 * m2));
  const numz = multPoli([z1,1],[z2,1]);
  return {
    Gc: {num: escalaPoli(numz, Kc), den:[0,1]},
    params: { z1, z2, Kc, phi_z1, phi_z2, phaseGH, phi_sd,
              Kp: Kc*(z1+z2), Ki: Kc*z1*z2, Kd: Kc },
    name: 'PID (z₁≠z₂)',
    formula: `G_c(s) = K_c\\dfrac{(s+z_1)(s+z_2)}{s} = ${formata(Kc,4)}\\dfrac{(s+${formata(z1,4)})(s+${formata(z2,4)})}{s}`
  };
}

// --- a/(s+b)
function solveAoverSpb({GH, sd}){
  const phaseGH = angleGH(GH, sd);
  const phi_b = wrap180(phaseGH + 180);
  const phiRad = phi_b*Math.PI/180;
  let b = Math.abs(Math.cos(phiRad))<1e-10 ? -sd.re : sd.im/Math.tan(phiRad) - sd.re;
  b = roundTo(b);
  const magGH = roundTo(magnitude(avaliaTF(GH, sd)));
  const m = roundTo(magAt(sd, b));
  const a = roundTo(m / magGH);
  return {
    Gc: {num:[a], den:[b,1]},
    params: { a, b, phi_b, phaseGH },
    name: 'a/(s+b)',
    formula: `G_c(s) = \\dfrac{a}{s+b} = \\dfrac{${formata(a,4)}}{s+${formata(b,4)}}`
  };
}

// --- (s+a)/(s+b)
function solveLeadLagFixedA({GH, sd, a_zero}){
  const phaseGH = angleGH(GH, sd);
  const phi_a = angleAt(sd, a_zero);
  const phi_b = wrap180(phaseGH + phi_a + 180);
  const phiRad = phi_b*Math.PI/180;
  let b = Math.abs(Math.cos(phiRad))<1e-10 ? -sd.re : sd.im/Math.tan(phiRad) - sd.re;
  b = roundTo(b);
  const magGH = roundTo(magnitude(avaliaTF(GH, sd)));
  const m_a = roundTo(magAt(sd, a_zero)), m_b = roundTo(magAt(sd, b));
  const Kc = roundTo(m_b / (magGH * m_a));
  return {
    Gc: {num: escalaPoli([a_zero,1], Kc), den:[b,1]},
    params: { Kc, a_zero, b, phi_a, phi_b, phaseGH },
    name: 'lead/lag (zero fixo)',
    formula: `G_c(s) = K_c\\dfrac{s+a}{s+b} = ${formata(Kc,4)}\\dfrac{s+${formata(a_zero,4)}}{s+${formata(b,4)}}`
  };
}

const CONTROLLER_TYPES = {
  'PD': { label: 'PD: Kc(s+z)', solver: solvePD, extra:[] },
  'PI': { label: 'PI: Kc(s+z)/s', solver: solvePI, extra:[] },
  'PID-eq': { label: 'PID com z₁=z₂: Kc(s+z)²/s', solver: solvePIDdouble, extra:[] },
  'PID-neq': { label: 'PID com z₁≠z₂: Kc(s+z₁)(s+z₂)/s', solver: solvePIDdistinct,
               extra: [{key:'z1', label:'z₁ (fixo)', default: 1}] },
  'LeadLag': { label: 'lead/lag: Kc(s+a)/(s+b)', solver: solveLeadLagFixedA,
               extra: [{key:'a_zero', label:'a (zero fixo)', default: 1}] },
  'AoverSpb': { label: 'a/(s+b)', solver: solveAoverSpb, extra:[] }
};
