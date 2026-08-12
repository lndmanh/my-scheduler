<script setup lang="ts">
import { onBeforeUnmount, onMounted, useTemplateRef, watch } from 'vue';
import { useMediaQuery, useResizeObserver } from '@vueuse/core';

const props = defineProps<{
  active: boolean;
}>();

const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
const containerRef = useTemplateRef<HTMLDivElement>('container');
const canvasRef = useTemplateRef<HTMLCanvasElement>('canvas');

let pixels: Pixel[] = [];
let animationId = 0;
let previousTime = 0;

class Pixel {
  private readonly maxSize = Math.random() * 1.5 + 0.5;
  private readonly sizeStep = Math.random() * 0.35 + 0.05;
  private readonly shimmerSpeed: number;
  private readonly delay: number;
  private readonly counterStep: number;
  private size = 0;
  private counter = 0;
  private isReverse = false;
  private isShimmering = false;
  isIdle = false;

  constructor(
    private readonly context: CanvasRenderingContext2D,
    private readonly x: number,
    private readonly y: number,
    private readonly color: string,
    speed: number,
    delay: number,
    width: number,
    height: number,
  ) {
    this.shimmerSpeed = (Math.random() * 0.8 + 0.1) * speed;
    this.delay = delay;
    this.counterStep = Math.random() * 4 + (width + height) * 0.01;
  }

  appear() {
    this.isIdle = false;

    if (this.counter <= this.delay) {
      this.counter += this.counterStep;
      return;
    }

    if (this.size >= this.maxSize) {
      this.isShimmering = true;
    }

    if (this.isShimmering) {
      this.shimmer();
    } else {
      this.size += this.sizeStep;
    }

    this.draw();
  }

  disappear() {
    this.isShimmering = false;
    this.counter = 0;

    if (this.size <= 0) {
      this.isIdle = true;
      return;
    }

    this.size -= 0.1;
    this.draw();
  }

  private shimmer() {
    if (this.size >= this.maxSize) {
      this.isReverse = true;
    } else if (this.size <= 0.5) {
      this.isReverse = false;
    }

    this.size += this.isReverse ? -this.shimmerSpeed : this.shimmerSpeed;
  }

  private draw() {
    const offset = 1 - this.size * 0.5;

    this.context.save();
    this.context.globalAlpha = 0.3;
    this.context.fillStyle = this.color;
    this.context.fillRect(this.x + offset, this.y + offset, this.size, this.size);
    this.context.restore();
  }
}

function getAnimationSpeed() {
  return reducedMotion.value ? 0 : 0.035;
}

function clearCanvas(context: CanvasRenderingContext2D, canvas: HTMLCanvasElement) {
  context.save();
  context.setTransform(1, 0, 0, 1, 0, 0);
  context.clearRect(0, 0, canvas.width, canvas.height);
  context.restore();
}

function initializePixels() {
  const container = containerRef.value;
  const canvas = canvasRef.value;
  if (!container || !canvas) return;

  const { width, height } = container.getBoundingClientRect();
  if (!width || !height) return;

  const context = canvas.getContext('2d');
  if (!context) return;

  const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.floor(width * pixelRatio);
  canvas.height = Math.floor(height * pixelRatio);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

  const color = getComputedStyle(container).color;
  const gap = 7;
  const speed = getAnimationSpeed();
  pixels = [];

  for (let x = 0; x < width; x += gap) {
    for (let y = 0; y < height; y += gap) {
      const distance = Math.hypot(x - width / 2, y - height / 2);
      pixels.push(new Pixel(context, x, y, color, speed, distance, width, height));
    }
  }
}

function animate(mode: 'appear' | 'disappear') {
  const canvas = canvasRef.value;
  if (!canvas || !pixels.length || reducedMotion.value) return;

  const context = canvas.getContext('2d');
  if (!context) return;

  cancelAnimationFrame(animationId);
  previousTime = performance.now();

  function loop(time: number) {
    animationId = requestAnimationFrame(loop);
    if (time - previousTime < 1000 / 60) return;

    previousTime = time;
    clearCanvas(context, canvas);

    let allIdle = true;
    for (const pixel of pixels) {
      pixel[mode]();
      if (!pixel.isIdle) {
        allIdle = false;
      }
    }

    if (mode === 'disappear' && allIdle) {
      cancelAnimationFrame(animationId);
    }
  }

  animationId = requestAnimationFrame(loop);
}

function startAnimation() {
  if (!pixels.length) {
    initializePixels();
  }

  animate('appear');
}

function stopAnimation() {
  animate('disappear');
}

watch([() => props.active, reducedMotion], ([active, motionReduced]) => {
  if (motionReduced) {
    cancelAnimationFrame(animationId);

    const canvas = canvasRef.value;
    const context = canvas?.getContext('2d');
    if (canvas && context) {
      clearCanvas(context, canvas);
    }
    return;
  }

  if (active) {
    startAnimation();
  } else {
    stopAnimation();
  }
});

onMounted(() => {
  if (props.active && !reducedMotion.value) {
    startAnimation();
  }
});

useResizeObserver(containerRef, () => {
  if (!pixels.length) return;

  initializePixels();
  if (props.active && !reducedMotion.value) {
    animate('appear');
  }
});

onBeforeUnmount(() => cancelAnimationFrame(animationId));
</script>

<template>
  <div
    ref="container"
    aria-hidden="true"
    class="pointer-events-none absolute inset-0 text-primary opacity-0 transition-opacity duration-200"
    :class="{ 'opacity-100': active && !reducedMotion }"
  >
    <canvas ref="canvas" class="block size-full" />
  </div>
</template>
