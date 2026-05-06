// Metodos de discretizacao - converte funcoes de transferencia continuas em discretas

// substitui 's' por uma razao de polinomios em 'z'
// Nz e Dz sao polinomios - Nz representa o numerador, Dz o denominador
function substituteRational(num, den, Nz, Dz){
  const numDeg = num.length - 1;
  const denDeg = den.length - 1;
  const totalDeg = Math.max(numDeg, denDeg);
  
  function transform(p){
    const deg = p.length - 1;
    let result = [0];
    for(let i=0;i<=deg;i++){
      if(p[i]===0) continue;
      let term = [1];
      for(let j=0;j<i;j++) term = multPoli(term, Nz); // eleva Nz a potencia i
      for(let j=0;j<totalDeg - i;j++) term = multPoli(term, Dz); // eleva Dz
      term = escalaPoli(term, p[i]); // multiplica pelo coeficiente
      result = somaPoli(result, term); // soma no resultado
    }
    return trimaPoli(result);
  }
  
  return { num: transform(num), den: transform(den) };
}

// TUSTIN (bilinear) - s = (2/T)(z-1)/(z+1)
// boa aproximacao
function tustin(TF, T){
  // Nz = 2/T(z-1), Dz = z+1
  return substituteRational(TF.num, TF.den, [-2/T, 2/T], [1, 1]);
}

function eulerForward(TF, T){
  // s = (z-1)/T
  return substituteRational(TF.num, TF.den, [-1/T, 1/T], [1]);
}

function eulerBackward(TF, T){
  // s = (z-1)/(T z)
  // Nz = (z-1)/T = [-1/T, 1/T], Dz = z = [0, 1]
  return substituteRational(TF.num, TF.den, [-1/T, 1/T], [0, 1]);
}

const DISC_METHODS = {
  'tustin':   { label:'Tustin (bilinear)', fn: tustin, sub: 's = (2/T)(z-1)/(z+1)' },
  'forward':  { label:'Euler-Forward',     fn: eulerForward, sub: 's = (z-1)/T' },
  'backward': { label:'Euler-Backward',    fn: eulerBackward, sub: 's = (z-1)/(Tz)' }
};
