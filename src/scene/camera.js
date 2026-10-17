import { Mat4, Vec3 } from '../math/index.js';

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export class OrbitCamera {
  constructor(canvas) {
    this.canvas = canvas;
    this.fieldOfView = (55 * Math.PI) / 180;
    this.near = 0.1;
    this.far = 500;
    this.keys = new Set();
    this.drag = null;
    this.reset();
    this.bindControls();
  }

  reset() {
    this.target = Vec3.create();
    this.yaw = 0.42;
    this.pitch = 0.66;
    this.distance = 90;
    this.minDistance = 5;
    this.maxDistance = 125;
  }

  focus(position, radius) {
    this.target = Vec3.create(...position);
    this.minDistance = Math.max(radius * 1.8, 0.8);
    this.distance = Math.max(radius * 6, 4);
  }

  get eye() {
    const horizontal = this.distance * Math.cos(this.pitch);
    return Vec3.add(
      this.target,
      Vec3.create(
        horizontal * Math.sin(this.yaw),
        this.distance * Math.sin(this.pitch),
        horizontal * Math.cos(this.yaw),
      ),
    );
  }

  get view() {
    return Mat4.lookAt(this.eye, this.target);
  }

  verticalFieldOfView(aspect) {
    // Preserve the horizontal field of view on narrow screens instead of cropping.
    return 2 * Math.atan(Math.tan(this.fieldOfView / 2) / Math.min(aspect, 1));
  }

  projection(aspect) {
    return Mat4.perspective(
      this.verticalFieldOfView(aspect),
      aspect,
      this.near,
      this.far,
    );
  }

  // move the camera around the ball
  orbit(dx, dy) {
    this.yaw -= dx * 0.006;
    this.pitch = clamp(this.pitch + dy * 0.006, -1.35, 1.35);
  }

  // bring the camera closer/further
  zoom(amount) {
    this.distance = clamp(
      this.distance * Math.exp(amount),
      this.minDistance,
      this.maxDistance,
    );
  }

  // move the camera around
  pan(dx, dy) {
    const backward = Vec3.normalize(Vec3.subtract(this.eye, this.target));
    const right = Vec3.normalize(Vec3.cross(Vec3.create(0, 1, 0), backward));
    const up = Vec3.cross(backward, right);
    const height = Math.max(this.canvas.clientHeight, 1);
    const aspect = Math.max(this.canvas.clientWidth, 1) / height;
    const unitsPerPixel =
      (2 * this.distance * Math.tan(this.verticalFieldOfView(aspect) / 2)) /
      height;
    const horizontal = Vec3.scale(right, -dx * unitsPerPixel);
    const vertical = Vec3.scale(up, dy * unitsPerPixel);
    this.target = Vec3.add(this.target, Vec3.add(horizontal, vertical));
  }

  // frequent check of keys to update on call
  update(deltaTime) {
    const pixels = deltaTime * 150;
    if (this.keys.has('ArrowLeft')) this.orbit(pixels, 0);
    if (this.keys.has('ArrowRight')) this.orbit(-pixels, 0);
    if (this.keys.has('ArrowUp')) this.orbit(0, pixels);
    if (this.keys.has('ArrowDown')) this.orbit(0, -pixels);
    if (this.keys.has('a')) this.pan(pixels, 0);
    if (this.keys.has('d')) this.pan(-pixels, 0);
    if (this.keys.has('w')) this.pan(0, pixels);
    if (this.keys.has('s')) this.pan(0, -pixels);
    if (this.keys.has('+') || this.keys.has('=')) this.zoom(-deltaTime);
    if (this.keys.has('-')) this.zoom(deltaTime);
  }

  // add event listeners to every camera controller
  bindControls() {
    const canvas = this.canvas;
    canvas.addEventListener('contextmenu', (event) => event.preventDefault());

    canvas.addEventListener('pointerdown', (event) => {
      if (this.drag || event.button > 2) return;
      event.preventDefault();
      canvas.focus({ preventScroll: true });
      canvas.setPointerCapture(event.pointerId);
      this.drag = {
        id: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        pan: event.button !== 0 || event.shiftKey,
      };
      canvas.classList.add('dragging');
    });

    canvas.addEventListener('pointermove', (event) => {
      if (!this.drag || this.drag.id !== event.pointerId) return;
      const dx = event.clientX - this.drag.x;
      const dy = event.clientY - this.drag.y;
      if (this.drag.pan || event.shiftKey) this.pan(dx, dy);
      else this.orbit(dx, dy);
      this.drag.x = event.clientX;
      this.drag.y = event.clientY;
    });

    const endDrag = (event) => {
      if (this.drag?.id !== event.pointerId) return;
      this.drag = null;
      canvas.classList.remove('dragging');
    };

    canvas.addEventListener('pointerup', endDrag);

    canvas.addEventListener('pointercancel', endDrag);

    canvas.addEventListener('lostpointercapture', endDrag);

    canvas.addEventListener(
      'wheel',
      (event) => {
        event.preventDefault();
        const pixels =
          event.deltaY *
          (event.deltaMode === 1
            ? 16
            : event.deltaMode === 2
              ? canvas.clientHeight
              : 1);
        this.zoom(clamp(pixels * 0.001, -0.5, 0.5));
      },
      { passive: false },
    );

    const supported = new Set([
      'ArrowLeft',
      'ArrowRight',
      'ArrowUp',
      'ArrowDown',
      'w',
      'a',
      's',
      'd',
      '+',
      '=',
      '-',
    ]);

    canvas.addEventListener('keydown', (event) => {
      const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
      if (supported.has(key)) {
        event.preventDefault();
        this.keys.add(key);
      }
    });

    canvas.addEventListener('keyup', (event) => {
      this.keys.delete(
        event.key.length === 1 ? event.key.toLowerCase() : event.key,
      );
    });

    canvas.addEventListener('blur', () => this.keys.clear());

    window.addEventListener('blur', () => this.keys.clear());
  }
}
