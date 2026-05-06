// Componentes de visualizacao - desenha graficos usando canvas
// muito mais rapido que SVG para coisas dinamicas

// desenha o mapa polo-zero
function PoleZeroPlot({ poles, zeros, target, width=380, height=280 }){
  const canvasRef = React.useRef(null);
  React.useEffect(()=>{
    const cv = canvasRef.current; if(!cv) return;
    const ctx = cv.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    cv.width = width*dpr; cv.height = height*dpr; 
    cv.style.width = width+'px'; 
    cv.style.height = height+'px';
    ctx.scale(dpr, dpr);
    ctx.clearRect(0,0,width,height);

    // acha os limites para ajustar a escala do grafico
    const all = [...poles, ...zeros];
    if(target) all.push(target);
    let xmin = -10, xmax = 2, ymin = -6, ymax = 6;
    if(all.length){
      xmin = Math.min(...all.map(p=>p.re), -2)-1;
      xmax = Math.max(...all.map(p=>p.re),  1)+1;
      const yMag = Math.max(...all.map(p=>Math.abs(p.im)), 2)+1;
      ymin = -yMag; ymax = yMag;
    }
    const mx = x => 40 + (x-xmin)/(xmax-xmin) * (width-60); // converte x para pixel
    const my = y => height-30 - (y-ymin)/(ymax-ymin) * (height-50); // converte y para pixel

    // desenha grid
    ctx.strokeStyle = '#3A3A3A'; ctx.lineWidth = 1;
    for(let x=Math.ceil(xmin);x<=Math.floor(xmax);x++){
      ctx.beginPath(); ctx.moveTo(mx(x),my(ymin)); ctx.lineTo(mx(x),my(ymax)); ctx.stroke();
    }
    for(let y=Math.ceil(ymin);y<=Math.floor(ymax);y++){
      ctx.beginPath(); ctx.moveTo(mx(xmin),my(y)); ctx.lineTo(mx(xmax),my(y)); ctx.stroke();
    }
    // desenha eixos
    ctx.strokeStyle = '#686867'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(mx(xmin),my(0)); ctx.lineTo(mx(xmax),my(0)); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(mx(0),my(ymin)); ctx.lineTo(mx(0),my(ymax)); ctx.stroke();
    ctx.fillStyle = '#DFDEDC'; ctx.font='10px JetBrains Mono';
    ctx.fillText('Re', width-22, my(0)-4);
    ctx.fillText('Im', mx(0)+6, 12);
    for(let x=Math.ceil(xmin);x<=Math.floor(xmax);x++){
      if(x===0) continue;
      ctx.fillText(x, mx(x)-4, my(0)+12);
    }
    for(let y=Math.ceil(ymin);y<=Math.floor(ymax);y++){
      if(y===0) continue;
      ctx.fillText(y, mx(0)+4, my(y)+3);
    }
    ctx.strokeStyle = '#E74C3C'; ctx.lineWidth = 1.8;
    poles.forEach(p=>{
      const px = mx(p.re), py = my(p.im);
      ctx.beginPath(); ctx.moveTo(px-6,py-6); ctx.lineTo(px+6,py+6);
      ctx.moveTo(px+6,py-6); ctx.lineTo(px-6,py+6); ctx.stroke();
    });
    ctx.strokeStyle = '#00ACAC'; ctx.lineWidth = 1.6;
    zeros.forEach(z=>{
      const px = mx(z.re), py = my(z.im);
      ctx.beginPath(); ctx.arc(px,py,5,0,2*Math.PI); ctx.stroke();
    });
    if(target){
      ctx.fillStyle = '#00ACAC'; ctx.strokeStyle = '#00ACAC'; ctx.lineWidth=1.6;
      const drawDiamond = (p)=>{
        const px = mx(p.re), py = my(p.im);
        ctx.beginPath(); ctx.moveTo(px,py-7); ctx.lineTo(px+7,py); ctx.lineTo(px,py+7); ctx.lineTo(px-7,py); ctx.closePath(); ctx.fill();
      };
      drawDiamond(target);
      if(Math.abs(target.im)>1e-9) drawDiamond({re:target.re,im:-target.im});
    }
  });
  return html`<canvas ref=${canvasRef}></canvas>`;
}

function StepPlot({ T, t_end=10, width=380, height=240 }){
  const canvasRef = React.useRef(null);
  React.useEffect(()=>{
    const cv = canvasRef.current; if(!cv) return;
    const ctx = cv.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    cv.width = width*dpr; cv.height = height*dpr; 
    cv.style.width = width+'px'; 
    cv.style.height = height+'px';
    ctx.scale(dpr, dpr);
    ctx.clearRect(0,0,width,height);
    const dt = t_end/2000;
    let sim;
    try{ sim = simulaResposta(T, t_end, dt); }
    catch(e){ 
      ctx.fillStyle='#E74C3C'; ctx.font='12px JetBrains Mono'; 
      ctx.fillText('Erro de simulação: '+e.message, 10, 20); 
      return; 
    }
    const ymin = Math.min(0, ...sim.y, -0.1);
    const ymax = Math.max(1.6, ...sim.y, 1.1);
    const mx = t => 40 + (t/t_end) * (width-60);
    const my = y => height-30 - (y-ymin)/(ymax-ymin) * (height-50);
    ctx.strokeStyle='#3A3A3A'; ctx.lineWidth=1;
    for(let i=0;i<=10;i++){
      const x = i*t_end/10;
      ctx.beginPath(); ctx.moveTo(mx(x),my(ymin)); ctx.lineTo(mx(x),my(ymax)); ctx.stroke();
    }
    const yStep = (ymax-ymin)/8;
    for(let i=0;i<=8;i++){
      const y = ymin + i*yStep;
      ctx.beginPath(); ctx.moveTo(mx(0),my(y)); ctx.lineTo(mx(t_end),my(y)); ctx.stroke();
    }
    ctx.strokeStyle='#686867';
    ctx.beginPath(); ctx.moveTo(mx(0),my(0)); ctx.lineTo(mx(t_end),my(0)); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(mx(0),my(ymin)); ctx.lineTo(mx(0),my(ymax)); ctx.stroke();
    ctx.strokeStyle='#686867'; ctx.setLineDash([3,3]);
    ctx.beginPath(); ctx.moveTo(mx(0),my(1)); ctx.lineTo(mx(t_end),my(1)); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle='#DFDEDC'; ctx.font='10px JetBrains Mono';
    ctx.fillText('t [s]', width-30, my(0)+14);
    ctx.fillText('y(t)', 6, 14);
    ctx.fillText('1.0', mx(0)-26, my(1)+3);
    ctx.fillText('0', mx(0)-10, my(0)+3);
    for(let i=1;i<=10;i++){
      const x = i*t_end/10;
      ctx.fillText(formata(x,1), mx(x)-6, my(ymin)-2);
    }
    ctx.strokeStyle='#00ACAC'; ctx.lineWidth=1.6;
    ctx.beginPath();
    sim.t.forEach((tt,i)=>{
      const px = mx(tt), py = my(sim.y[i]);
      if(i===0) ctx.moveTo(px,py); else ctx.lineTo(px,py);
    });
    ctx.stroke();
    const ySteady = sim.y[sim.y.length-1];
    const yPeak = Math.max(...sim.y);
    const Mp = ySteady>1e-6 ? Math.max(0,(yPeak - ySteady)/ySteady*100) : 0;
    let tsIdx = 0;
    for(let i=sim.t.length-1;i>=0;i--){
      if(Math.abs(sim.y[i]-ySteady) > 0.05*Math.abs(ySteady)){ tsIdx=i; break; }
    }
    let ts2Idx = 0;
    for(let i=sim.t.length-1;i>=0;i--){
      if(Math.abs(sim.y[i]-ySteady) > 0.02*Math.abs(ySteady)){ ts2Idx=i; break; }
    }
    ctx.fillStyle='#00ACAC'; ctx.font='10px JetBrains Mono';
    ctx.fillText(`Mp ≈ ${formata(Mp,1)}%`, width-120, 16);
    ctx.fillText(`ts(5%) ≈ ${formata(sim.t[tsIdx],2)}s`, width-120, 30);
    ctx.fillText(`ts(2%) ≈ ${formata(sim.t[ts2Idx],2)}s`, width-120, 44);
    ctx.fillText(`y(∞) ≈ ${formata(ySteady,3)}`, width-120, 58);
  });
  return html`<canvas ref=${canvasRef}></canvas>`;
}
