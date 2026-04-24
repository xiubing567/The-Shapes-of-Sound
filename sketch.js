let bellSound = null;
let fft;
let audioLoaded = false;
let audioLoadFailed = false;
let started = false;

let smoothedEnergy = 0;
let reveal = 0;
let smoothedFlux = 0;
let prevSpectrum = null;

let startBtn;
let statusText;

function setup() {
  const canvas = createCanvas(windowWidth, windowHeight);
  const appEl = document.getElementById('app');
  if (appEl) canvas.parent('app');
  pixelDensity(1);

  fft = new p5.FFT(0.9, 2048);

  strokeJoin(ROUND);
  strokeCap(ROUND);
  noFill();

  startBtn = document.getElementById('startBtn');
  statusText = document.getElementById('statusText');

  // 兼容：如果用户只粘贴了 sketch.js（没粘 index.html），自动创建最小 UI。
  if (!startBtn || !statusText) {
    const panel = createDiv('');
    panel.class('ui-panel');
    panel.style('position', 'fixed');
    panel.style('top', '22px');
    panel.style('left', '50%');
    panel.style('transform', 'translateX(-50%)');
    panel.style('display', 'flex');
    panel.style('flex-direction', 'column');
    panel.style('align-items', 'center');
    panel.style('gap', '8px');
    panel.style('z-index', '10');

    const btn = createButton('Start');
    btn.id('startBtn');
    btn.parent(panel);

    const txt = createP('Ready: click Start to begin bell resonance.');
    txt.id('statusText');
    txt.style('margin', '0');
    txt.style('font-size', '11px');
    txt.style('color', '#9ba6b8');
    txt.parent(panel);

    startBtn = btn.elt;
    statusText = txt.elt;
  }

  startBtn.addEventListener('click', onStartPressed);

  // 非阻塞加载：即使 bell.mp3 不存在，渲染也不中断。
  bellSound = loadSound(
    'bell.mp3',
    () => {
      audioLoaded = true;
      fft.setInput(bellSound);
      setStatus('Bell loaded. Click Start to play.');
      if (started && !bellSound.isPlaying()) {
        bellSound.loop();
        setStatus('Playing bell.mp3');
      }
    },
    () => {
      audioLoadFailed = true;
      setStatus('bell.mp3 failed to load. Visual runs in silent fallback mode.');
    }
  );
}

function draw() {
  background(0);

  const analysis = analyzeResonance();
  smoothedEnergy = lerp(smoothedEnergy, analysis.energy, 0.12);
  smoothedFlux = lerp(smoothedFlux, analysis.flux, 0.15);
  reveal = constrain(reveal + 0.0025, 0, 1);

  push();
  translate(width * 0.5, height * 0.53);

  // 频率 -> 模式编号（理想振动系统映射）
  const modeA = mapBandToMode(analysis.bands[0], analysis.centroidNorm, 1.0);
  const modeB = mapBandToMode(analysis.bands[1] || analysis.bands[0], analysis.centroidNorm, 1.35);
  const modeC = mapBandToMode(analysis.bands[2] || analysis.bands[0], analysis.centroidNorm, 1.7);

  // 振幅/谱流 -> 半径与线强（动态来自实时频谱变化）
  const baseR = min(width, height) * 0.11;
  const radiusScale = 1 + smoothedEnergy * 0.45 + smoothedFlux * 0.3;
  const alphaBase = 22 + smoothedEnergy * 115 + smoothedFlux * 60;

  drawResonanceLayer({
    analysis,
    layerIndex: 0,
    mode: modeA,
    layerRadius: baseR * 1.05 * radiusScale,
    alpha: alphaBase,
    lineWeight: 0.9,
  });

  drawResonanceLayer({
    analysis,
    layerIndex: 1,
    mode: modeB,
    layerRadius: baseR * 1.6 * radiusScale,
    alpha: alphaBase * 0.72,
    lineWeight: 0.75,
  });

  drawResonanceLayer({
    analysis,
    layerIndex: 2,
    mode: modeC,
    layerRadius: baseR * 2.2 * radiusScale,
    alpha: alphaBase * 0.5,
    lineWeight: 0.62,
  });

  drawHarmonicLattice(analysis, baseR * 2.55 * radiusScale, 14 + smoothedEnergy * 34 + smoothedFlux * 30);

  stroke(205, 220, 255, 24 + smoothedEnergy * 25);
  strokeWeight(0.65);
  ellipse(0, 0, baseR * 0.9, baseR * 0.9);

  pop();
  drawVignette();
}

async function onStartPressed() {
  await userStartAudio();
  started = true;

  if (audioLoaded && bellSound && !bellSound.isPlaying()) {
    bellSound.loop();
    startBtn.disabled = true;
    startBtn.textContent = 'Playing';
    setStatus('Playing bell.mp3');
    return;
  }

  if (audioLoadFailed) {
    setStatus('Audio unavailable. Running fallback resonance mode.');
  } else {
    setStatus('Audio context started. Waiting for bell.mp3...');
  }
}

function analyzeResonance() {
  // FFT 分析：只有音频实际播放时才使用真实频谱。
  if (audioLoaded && bellSound && bellSound.isPlaying()) {
    const spectrum = fft.analyze();
    const bands = extractDominantBands(spectrum, 6);
    const energy = normalizedBandEnergy(bands);
    const centroidNorm = spectralCentroidNorm(spectrum);
    const flux = spectralFluxNorm(spectrum);

    return {
      bands: bands.length ? bands : fallbackBands(),
      energy,
      centroidNorm,
      flux,
    };
  }

  // 静默降级：仍给出小能量，保持图形可显示。
  return {
    bands: fallbackBands(),
    energy: started ? 0.14 : 0.08,
    centroidNorm: 0.35,
    flux: started ? 0.1 : 0.05,
  };
}

function fallbackBands() {
  const t = millis() * 0.001;
  return [
    { freq: 420, amp: 0.14 + 0.02 * sin(t * 0.43) },
    { freq: 840, amp: 0.1 + 0.02 * sin(t * 0.29 + 0.8) },
    { freq: 1260, amp: 0.08 + 0.015 * sin(t * 0.24 + 1.9) },
    { freq: 1680, amp: 0.06 + 0.01 * sin(t * 0.17 + 2.4) },
  ];
}

function extractDominantBands(spectrum, count) {
  const nyquist = sampleRate() * 0.5;
  const lowCut = 80;
  const highCut = min(6000, nyquist * 0.9);
  const peaks = [];

  for (let i = 2; i < spectrum.length - 2; i++) {
    const freq = (i / spectrum.length) * nyquist;
    if (freq < lowCut || freq > highCut) continue;

    const current = spectrum[i];
    const amp = current / 255;
    const isPeak = current > spectrum[i - 1] && current >= spectrum[i + 1] && current > spectrum[i - 2] && current >= spectrum[i + 2];

    if (isPeak && amp > 0.06) peaks.push({ freq, amp });
  }

  peaks.sort((a, b) => b.amp - a.amp);
  return peaks.slice(0, count);
}

function normalizedBandEnergy(bands) {
  if (!bands.length) return 0;
  let sum = 0;
  for (const b of bands) sum += b.amp;
  return constrain(sum / bands.length, 0, 1);
}

function spectralCentroidNorm(spectrum) {
  let weighted = 0;
  let total = 0;
  for (let i = 0; i < spectrum.length; i++) {
    weighted += i * spectrum[i];
    total += spectrum[i];
  }
  if (total === 0) return 0.3;
  return constrain((weighted / total) / spectrum.length, 0, 1);
}

function spectralFluxNorm(spectrum) {
  if (!prevSpectrum) {
    prevSpectrum = spectrum.slice();
    return 0;
  }

  let rise = 0;
  let total = 0;
  for (let i = 0; i < spectrum.length; i++) {
    const delta = spectrum[i] - prevSpectrum[i];
    if (delta > 0) rise += delta;
    total += spectrum[i];
  }
  prevSpectrum = spectrum.slice();
  return constrain(rise / max(total, 1), 0, 1);
}

function mapBandToMode(band, centroidNorm, scale) {
  if (!band) return { m: 6, n: 3, symmetry: 8, amp: 0.1, freq: 440 };

  // 物理映射近似：
  // 频率越高 -> 角向节点数 m 越高；
  // 频率越低 -> 径向节点层 n 更明显。
  const freqNorm = constrain((Math.log2(band.freq / 80)) / Math.log2(6000 / 80), 0, 1);
  const m = floor(3 + (freqNorm * 11 + centroidNorm * 4) * 0.55 * scale);
  const n = floor(2 + ((1 - freqNorm) * 8 + (1 - centroidNorm) * 2) * 0.5 * scale);
  const symmetry = constrain(round((m + n) * 0.85), 5, 20);

  return { m, n, symmetry, amp: band.amp, freq: band.freq };
}

function drawResonanceLayer({ analysis, layerIndex, mode, layerRadius, alpha, lineWeight }) {
  const samples = 960;
  const rot = frameCount * 0.00025 * (layerIndex + 1);

  stroke(205, 222, 255, alpha * reveal);
  strokeWeight(lineWeight);
  noFill();

  beginShape();
  for (let i = 0; i <= samples; i++) {
    const theta = (i / samples) * TWO_PI;

    // Chladni / 驻波图案艺术化近似：
    // 用 m,n 形成极坐标节点场，nodeField≈0 视作节点带。
    const nodeField = Math.sin(mode.m * theta + rot) * Math.cos(mode.n * theta * 0.5 - rot * 0.6);

    const harmonic = harmonicContribution(theta, analysis.bands, layerIndex);
    const displacement = layerRadius * (0.05 + mode.amp * 0.24 + analysis.flux * 0.18) * (nodeField + harmonic * 0.55);
    const nodeCompression = 1 - 0.17 * Math.exp(-Math.abs(nodeField) * 5.4);

    const r = layerRadius * nodeCompression + displacement;
    vertex(Math.cos(theta) * r, Math.sin(theta) * r);
  }
  endShape(CLOSE);

  stroke(168, 193, 240, alpha * 0.22 * reveal);
  strokeWeight(0.45);
  for (let k = 0; k < mode.symmetry; k++) {
    const a = (k / mode.symmetry) * TWO_PI + rot * 0.4;
    const r1 = layerRadius * 0.2;
    const r2 = layerRadius * 1.02;
    line(Math.cos(a) * r1, Math.sin(a) * r1, Math.cos(a) * r2, Math.sin(a) * r2);
  }
}

function harmonicContribution(theta, bands, layerIndex) {
  if (bands.length < 2) return 0;

  const root = bands[0].freq;
  const use = bands.slice(1, min(5, bands.length));
  let sum = 0;

  for (let i = 0; i < use.length; i++) {
    const b = use[i];
    const ratio = b.freq / root;
    const order = constrain(round(ratio * (3.2 + layerIndex)), 2, 18);
    const phase = i * 0.42 + layerIndex * 0.55;
    sum += Math.sin(theta * order + phase) * b.amp;
  }

  return sum / use.length;
}

function drawHarmonicLattice(analysis, radius, alpha) {
  const bands = analysis.bands;
  if (bands.length < 2) return;

  stroke(188, 207, 252, alpha * reveal);
  strokeWeight(0.5);

  const root = bands[0].freq;
  const rings = min(4, bands.length - 1);

  for (let i = 1; i <= rings; i++) {
    const ratio = bands[i].freq / root;
    const petals = constrain(round(ratio * 6 + analysis.centroidNorm * 4), 4, 28);

    beginShape();
    for (let t = 0; t <= TWO_PI + 0.02; t += 0.02) {
      const rosette = Math.cos(petals * t);
      const r = radius * (0.3 + i * 0.14) * (0.82 + 0.18 * rosette);
      vertex(Math.cos(t) * r, Math.sin(t) * r);
    }
    endShape();
  }
}

function drawVignette() {
  noStroke();
  const steps = 10;
  for (let i = 0; i < steps; i++) {
    const p = i / (steps - 1);
    fill(0, 0, 0, 8 + p * 13);
    rect(-2 + i, -2 + i, width + 4 - i * 2, height + 4 - i * 2);
  }
}

function setStatus(msg) {
  if (statusText) statusText.textContent = msg;
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
