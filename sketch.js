const MODES = ["Bell", "Ocean", "Rain", "Bass", "Pulsar"];

const SOUND_FILES = {
  Bell: "assets/bell.mp3",
  Ocean: "assets/ocean.mp3",
  Rain: "assets/rain.mp3",
  Bass: "assets/bass.mp3",
  Pulsar: "assets/pulsar.mp3",
};

let sounds = {};
let fft;
let activeMode = "Bell";
let currentPattern;
let controls;
let buttons = {};

function preload() {
  for (const mode of MODES) {
    sounds[mode] = loadSound(SOUND_FILES[mode]);
  }
}

function setup() {
  const canvas = createCanvas(windowWidth, windowHeight);
  canvas.parent("app");
  pixelDensity(1);

  fft = new p5.FFT(0.88, 1024);

  createControls();
  currentPattern = createPattern(activeMode);
  activateModeUI(activeMode);

  // 用户首击前不自动播放，避免浏览器自动播放策略拦截。
}

function draw() {
  background(0);

  const metrics = analyzeSound();

  push();
  translate(width * 0.5, height * 0.56);
  currentPattern.render(metrics);
  pop();

  drawVignette();
}

function createControls() {
  controls = createDiv("");
  controls.class("controls");

  for (const mode of MODES) {
    const btn = createButton(mode);
    btn.class("mode-btn");
    btn.parent(controls);
    btn.mousePressed(() => switchMode(mode));
    buttons[mode] = btn;
  }

  const hint = createDiv("Tap a mode to awaken the hidden order");
  hint.class("hint");
}

function switchMode(mode) {
  userStartAudio();

  if (mode === activeMode) {
    restartModeSound(mode);
    return;
  }

  stopAllSounds();
  activeMode = mode;
  currentPattern = createPattern(activeMode);
  activateModeUI(activeMode);
  playModeSound(activeMode);
}

function restartModeSound(mode) {
  if (!sounds[mode]) return;

  if (sounds[mode].isPlaying()) {
    sounds[mode].jump(0);
  } else {
    stopAllSounds();
    playModeSound(mode);
  }
}

function stopAllSounds() {
  for (const mode of MODES) {
    if (sounds[mode] && sounds[mode].isPlaying()) {
      sounds[mode].stop();
    }
  }
}

function playModeSound(mode) {
  const sound = sounds[mode];
  if (!sound) return;
  sound.setLoop(true);
  sound.play();
}

function activateModeUI(mode) {
  for (const key of Object.keys(buttons)) {
    buttons[key].removeClass("active");
  }
  buttons[mode].addClass("active");
}

function analyzeSound() {
  const spectrum = fft.analyze();
  const bass = fft.getEnergy("bass") / 255;
  const mid = fft.getEnergy("mid") / 255;
  const treble = fft.getEnergy("treble") / 255;
  const level = constrain((bass * 0.4 + mid * 0.35 + treble * 0.25), 0, 1);

  return {
    t: millis() * 0.001,
    level,
    bass,
    mid,
    treble,
    centroid: spectralCentroid(spectrum),
  };
}

function spectralCentroid(spectrum) {
  let weighted = 0;
  let total = 0;
  for (let i = 0; i < spectrum.length; i++) {
    weighted += i * spectrum[i];
    total += spectrum[i];
  }
  if (total === 0) return 0;
  return weighted / total / spectrum.length;
}

function createPattern(mode) {
  switch (mode) {
    case "Bell":
      return new BellPattern();
    case "Ocean":
      return new OceanPattern();
    case "Rain":
      return new RainPattern();
    case "Bass":
      return new BassPattern();
    case "Pulsar":
      return new PulsarPattern();
    default:
      return new BellPattern();
  }
}

class BellPattern {
  render(m) {
    const baseR = min(width, height) * 0.14;
    const petals = 16;
    const rings = 11;
    const breath = 1 + sin(m.t * 0.45) * 0.035 + m.treble * 0.05;

    stroke(220, 230, 255, 95 + m.treble * 45);
    noFill();

    for (let r = 0; r < rings; r++) {
      const k = (r + 1) / rings;
      const radius = baseR * (0.5 + k * 1.7) * breath;
      beginShape();
      for (let i = 0; i <= 360; i += 3) {
        const a = radians(i);
        const harmonic = sin(a * petals + m.t * (0.25 + k * 0.2));
        const ripple = harmonic * baseR * 0.035 * (0.45 + m.level * 0.8);
        const x = cos(a) * (radius + ripple);
        const y = sin(a) * (radius + ripple);
        vertex(x, y);
      }
      endShape();
    }

    // 核心几何：双重六边星线网
    stroke(235, 240, 255, 70 + m.level * 35);
    const core = baseR * (1.2 + m.mid * 0.15);
    polygon(6, core, m.t * 0.07);
    polygon(6, core, m.t * 0.07 + PI / 6);
  }
}

class OceanPattern {
  render(m) {
    const maxR = min(width, height) * 0.38;
    const rings = 18;
    const drift = m.t * 0.12;

    noFill();
    for (let i = 0; i < rings; i++) {
      const p = i / (rings - 1);
      const radius = maxR * (0.16 + p * 0.9) * (1 + m.level * 0.04);
      const alpha = 18 + (1 - p) * 60 + m.mid * 28;
      stroke(190, 220, 255, alpha);

      beginShape();
      for (let a = 0; a <= TWO_PI + 0.05; a += 0.05) {
        const wave = sin(a * 6 + drift * (1 + p * 1.6)) * (4 + p * 9) * (0.25 + m.bass * 0.6);
        const x = cos(a) * (radius + wave);
        const y = sin(a) * (radius + wave);
        vertex(x, y);
      }
      endShape();
    }

    stroke(220, 235, 255, 58 + m.treble * 25);
    ellipse(0, 0, maxR * 0.43, maxR * 0.43);
  }
}

class RainPattern {
  render(m) {
    const grid = 19;
    const span = min(width, height) * 0.52;
    const step = span / (grid - 1);
    const amp = 8 + m.treble * 14;

    noFill();
    stroke(205, 225, 255, 46 + m.mid * 24);

    for (let row = 0; row < grid; row++) {
      beginShape();
      for (let col = 0; col < grid; col++) {
        const x = -span * 0.5 + col * step;
        const yBase = -span * 0.5 + row * step;
        const d = dist(x, yBase, 0, 0);
        const phase = d * 0.045 - m.t * (0.35 + m.level * 0.7);
        const y = yBase + sin(phase) * amp;
        curveVertex(x, y);
      }
      endShape();
    }

    stroke(200, 215, 245, 36 + m.treble * 30);
    for (let col = 0; col < grid; col++) {
      beginShape();
      for (let row = 0; row < grid; row++) {
        const y = -span * 0.5 + row * step;
        const xBase = -span * 0.5 + col * step;
        const d = dist(xBase, y, 0, 0);
        const phase = d * 0.045 - m.t * (0.28 + m.level * 0.5);
        const x = xBase + cos(phase) * amp * 0.65;
        curveVertex(x, y);
      }
      endShape();
    }
  }
}

class BassPattern {
  render(m) {
    const layers = 9;
    const spokes = 12;
    const base = min(width, height) * 0.11;
    const pulse = 1 + m.bass * 0.16 + sin(m.t * 0.6) * 0.03;

    noFill();
    stroke(225, 230, 255, 72 + m.bass * 55);

    for (let l = 0; l < layers; l++) {
      const p = (l + 1) / layers;
      const radius = base * (0.7 + p * 2.5) * pulse;
      beginShape();
      for (let i = 0; i <= spokes; i++) {
        const a = (i / spokes) * TWO_PI + m.t * 0.03;
        const mod = sin(a * 3 + l + m.t * 0.4) * (radius * 0.08) * (0.3 + m.level);
        const x = cos(a) * (radius + mod);
        const y = sin(a) * (radius + mod);
        vertex(x, y);
      }
      endShape(CLOSE);
    }

    stroke(180, 200, 245, 55 + m.mid * 35);
    for (let i = 0; i < spokes; i++) {
      const a = (i / spokes) * TWO_PI + m.t * 0.05;
      const r1 = base * 0.95;
      const r2 = base * 3.2 * (1 + m.bass * 0.05);
      line(cos(a) * r1, sin(a) * r1, cos(a) * r2, sin(a) * r2);
    }
  }
}

class PulsarPattern {
  render(m) {
    const rays = 24;
    const rings = 7;
    const core = min(width, height) * 0.09;
    const pulse = sin(m.t * (0.8 + m.level * 1.8)) * 0.5 + 0.5;

    noFill();

    for (let r = 0; r < rings; r++) {
      const p = r / (rings - 1);
      const radius = core * (1.1 + p * 4.4 + pulse * 0.25);
      stroke(210, 225, 255, 20 + (1 - p) * 50 + m.treble * 20);
      ellipse(0, 0, radius * 2, radius * 2);
    }

    stroke(230, 238, 255, 45 + m.level * 45);
    for (let i = 0; i < rays; i++) {
      const a = (i / rays) * TWO_PI + m.t * 0.02;
      const jitter = sin(m.t * 0.9 + i) * 6 * (0.2 + m.treble * 0.8);
      const r1 = core * 0.45;
      const r2 = core * (3.8 + pulse * 0.9) + jitter;
      line(cos(a) * r1, sin(a) * r1, cos(a) * r2, sin(a) * r2);
    }

    stroke(245, 248, 255, 80 + m.mid * 50);
    polygon(8, core * (1.2 + pulse * 0.25), m.t * 0.12);
  }
}

function polygon(sides, radius, rot = 0) {
  beginShape();
  for (let i = 0; i < sides; i++) {
    const a = (i / sides) * TWO_PI + rot;
    vertex(cos(a) * radius, sin(a) * radius);
  }
  endShape(CLOSE);
}

function drawVignette() {
  noStroke();
  const steps = 8;
  for (let i = 0; i < steps; i++) {
    const p = i / (steps - 1);
    fill(0, 0, 0, 8 + p * 13);
    rect(-2 + i, -2 + i, width + 4 - i * 2, height + 4 - i * 2);
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
