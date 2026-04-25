import { useEffect, useMemo, useRef } from 'react';

function createPRNG(seed) {
  let value = seed % 2147483647;
  if (value <= 0) value += 2147483646;
  return () => {
    value = (value * 16807) % 2147483647;
    return (value - 1) / 2147483646;
  };
}

function buildLSystem({ params, width, height, emotion, seedText }) {
  const rand = createPRNG(
    seedText.split('').reduce((acc, char) => acc + char.charCodeAt(0), 137)
  );
  const iterations = 3 + Math.round(params.energy * 2);
  const baseAngle = (18 + params.chaos * 28 + params.tension * 10) * (Math.PI / 180);

  let sentence = 'X';
  for (let i = 0; i < iterations; i += 1) {
    let next = '';
    for (const char of sentence) {
      if (char === 'X') {
        const extra = rand() < params.chaos ? '+X' : '';
        next += `F[+X][-X]FX${extra}`;
      } else if (char === 'F') {
        next += rand() < params.energy ? 'FF' : 'F';
      } else {
        next += char;
      }
    }
    sentence = next.slice(0, 2800);
  }

  const stack = [];
  const turtle = {
    x: width / 2,
    y: height * (emotion === '疲惫' ? 0.84 : 0.9),
    angle: -Math.PI / 2,
    length: 9 + params.energy * 14,
    width: 1.1 + params.energy * 1.3,
    depth: 0,
  };

  const segments = [];
  const leaves = [];
  const flowers = [];

  for (const char of sentence) {
    if (char === 'F') {
      const jitter = (rand() - 0.5) * params.chaos * 0.4;
      const droop = emotion === '低落' ? params.tension * 0.03 : 0;
      const nextAngle = turtle.angle + jitter + droop;
      const factor = 0.91 - turtle.depth * 0.005;
      const length = Math.max(2.2, turtle.length * factor);
      const nx = turtle.x + Math.cos(nextAngle) * length;
      const ny = turtle.y + Math.sin(nextAngle) * length + (emotion === '疲惫' ? 0.35 : 0);

      segments.push({
        x1: turtle.x,
        y1: turtle.y,
        x2: nx,
        y2: ny,
        width: Math.max(0.6, turtle.width * factor),
        depth: turtle.depth,
      });

      if (rand() < 0.12 + params.hope * 0.25) {
        leaves.push({ x: nx, y: ny, angle: nextAngle, depth: turtle.depth, size: 3 + rand() * 7 });
      }
      if (rand() < params.hope * 0.12 + params.warmth * 0.08 && turtle.depth > 2) {
        flowers.push({ x: nx, y: ny, size: 2 + rand() * 5, glow: rand() * 0.7 + 0.3 });
      }

      turtle.x = nx;
      turtle.y = ny;
      turtle.angle = nextAngle;
    } else if (char === '+') {
      turtle.angle += baseAngle * (0.7 + rand() * (0.6 + params.chaos));
    } else if (char === '-') {
      turtle.angle -= baseAngle * (0.7 + rand() * (0.6 + params.chaos));
    } else if (char === '[') {
      stack.push({ ...turtle, depth: turtle.depth + 1, length: turtle.length * (0.75 + rand() * 0.15) });
    } else if (char === ']') {
      const popped = stack.pop();
      if (popped) Object.assign(turtle, popped);
    }
  }

  return { segments, leaves, flowers };
}

function drawLeaf(ctx, leaf, color, progress) {
  const grow = Math.min(1, progress * 1.4);
  if (grow <= 0) return;

  ctx.save();
  ctx.translate(leaf.x, leaf.y);
  ctx.rotate(leaf.angle);
  ctx.scale(grow, grow);
  ctx.strokeStyle = color;
  ctx.fillStyle = `${color}22`;
  ctx.lineWidth = 0.8;

  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(leaf.size, -leaf.size * 0.5, leaf.size * 1.8, 0);
  ctx.quadraticCurveTo(leaf.size, leaf.size * 0.6, 0, 0);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawFlower(ctx, flower, color, progress) {
  const bloom = Math.min(1, progress * 1.6);
  if (bloom <= 0) return;

  ctx.save();
  ctx.translate(flower.x, flower.y);
  const radius = flower.size * bloom;

  ctx.fillStyle = `${color}${Math.floor(110 + flower.glow * 90).toString(16).padStart(2, '0')}`;
  for (let i = 0; i < 5; i += 1) {
    const angle = (Math.PI * 2 * i) / 5;
    ctx.beginPath();
    ctx.arc(Math.cos(angle) * radius * 0.8, Math.sin(angle) * radius * 0.8, radius * 0.5, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.beginPath();
  ctx.fillStyle = '#f5f2e8';
  ctx.arc(0, 0, radius * 0.45, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export default function PlantCanvas({ emotion, config, seedText, runId, onComplete }) {
  const canvasRef = useRef(null);
  const doneRef = useRef(false);

  const sceneData = useMemo(() => {
    const width = 760;
    const height = 480;
    return buildLSystem({ params: config.params, width, height, emotion, seedText: `${seedText}-${runId}` });
  }, [config.params, emotion, runId, seedText]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return undefined;

    doneRef.current = false;
    let rafId;
    const start = performance.now();
    const totalMs = 6200 - config.params.energy * 1800;

    const render = (now) => {
      const elapsed = now - start;
      const p = Math.min(1, elapsed / totalMs);

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // 阶段1：种子
      const seedProgress = Math.min(1, p / 0.14);
      ctx.fillStyle = '#b5a48b';
      ctx.beginPath();
      ctx.ellipse(canvas.width / 2, canvas.height * 0.9, 4 + seedProgress * 4, 3 + seedProgress * 2, 0, 0, Math.PI * 2);
      ctx.fill();

      // 阶段2/3：主茎与分枝
      const branchProgress = Math.max(0, (p - 0.1) / 0.55);
      const maxSegment = Math.floor(sceneData.segments.length * branchProgress);

      ctx.strokeStyle = config.palette.stem;
      for (let i = 0; i < maxSegment; i += 1) {
        const seg = sceneData.segments[i];
        const sway = emotion === '焦虑' ? Math.sin((elapsed + i * 30) / 130) * 0.6 : 0;
        ctx.lineWidth = seg.width;
        ctx.beginPath();
        ctx.moveTo(seg.x1, seg.y1);
        ctx.lineTo(seg.x2 + sway, seg.y2);
        ctx.stroke();
      }

      // 阶段4：叶片
      const leafProgress = Math.max(0, (p - 0.45) / 0.28);
      const leafCount = Math.floor(sceneData.leaves.length * leafProgress);
      for (let i = 0; i < leafCount; i += 1) {
        drawLeaf(ctx, sceneData.leaves[i], config.palette.leaf, leafProgress);
      }

      // 阶段5：花朵/光点
      const bloomAllowed = config.params.hope > 0.45 || config.params.warmth > 0.65;
      if (bloomAllowed) {
        const flowerProgress = Math.max(0, (p - 0.74) / 0.24);
        const flowerCount = Math.floor(sceneData.flowers.length * flowerProgress);
        for (let i = 0; i < flowerCount; i += 1) {
          drawFlower(ctx, sceneData.flowers[i], config.palette.flower, flowerProgress);
        }
      }

      if (p < 1) {
        rafId = requestAnimationFrame(render);
      } else if (!doneRef.current) {
        doneRef.current = true;
        onComplete();
      }
    };

    rafId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(rafId);
  }, [config, emotion, onComplete, sceneData]);

  return <canvas ref={canvasRef} width={760} height={480} className="plant-canvas" />;
}
