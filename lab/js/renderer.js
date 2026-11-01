import * as THREE from "three";
import { vertex } from "./passes/common.js";
import { content } from "./passes/content.js";
import { ghost } from "./passes/ghost.js";
import { blur } from "./passes/blur.js";
import { display } from "./passes/display.js";

// Colors pass through untouched: the shaders do their own color math.
THREE.ColorManagement.enabled = false;

const GRID_MODES = { scanlines: 0, "pixel grid": 1, off: 2 };

function hexToVec(hex) {
  const c = new THREE.Color(hex);
  return new THREE.Vector3(c.r, c.g, c.b);
}

function makeTarget(filter, type = THREE.UnsignedByteType) {
  return new THREE.WebGLRenderTarget(1, 1, { minFilter: filter, magFilter: filter, type, depthBuffer: true });
}

export function createRenderer(canvas, contentCanvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false });
  renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
  renderer.autoClear = false;

  // Texture storage is allocated once per size, so it is rebuilt on every resize.
  const makeContentTex = () => {
    const tex = new THREE.CanvasTexture(contentCanvas);
    tex.minFilter = tex.magFilter = THREE.NearestFilter;
    tex.generateMipmaps = false;
    return tex;
  };
  let contentTex = makeContentTex();

  const sceneRT = makeTarget(THREE.NearestFilter);
  let ghostRead = makeTarget(THREE.NearestFilter, THREE.HalfFloatType);
  let ghostWrite = makeTarget(THREE.NearestFilter, THREE.HalfFloatType);
  const blurA = makeTarget(THREE.LinearFilter, THREE.HalfFloatType);
  const blurB = makeTarget(THREE.LinearFilter, THREE.HalfFloatType);

  // One fullscreen triangle pair, re-skinned with each pass's material.
  const quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2));
  const quadScene = new THREE.Scene().add(quad);

  const pass = (fragmentShader, uniforms) =>
    new THREE.ShaderMaterial({ vertexShader: vertex, fragmentShader, uniforms, depthTest: false, depthWrite: false });

  const shared = { uLight: { value: 0 } };
  const contentMat = pass(content, { ...shared, tContent: { value: contentTex }, uGround: { value: new THREE.Vector3() }, uHard: { value: 0 } });
  const ghostMat = pass(ghost, {
    ...shared,
    tCurrent: { value: sceneRT.texture },
    tPrevious: { value: null },
    uDecay: { value: 0 },
    uShift: { value: 0 },
    uPersistInk: { value: new THREE.Vector3() },
    uGroundInk: { value: new THREE.Vector3() },
  });
  const blurMat = pass(blur, { tInput: { value: null }, uDirection: { value: new THREE.Vector2() } });
  const displayMat = pass(display, {
    ...shared,
    tImage: { value: null },
    tGlow: { value: blurB.texture },
    uBufferSize: { value: new THREE.Vector2() },
    uScreenSize: { value: new THREE.Vector2() },
    uPixelScale: { value: 1 },
    uDpr: { value: 1 },
    uGlow: { value: 0 },
    uTint: { value: 0 },
    uPhosphorInk: { value: new THREE.Vector3() },
    uGroundInk: { value: new THREE.Vector3() },
    uJitter: { value: 0 },
    uFlicker: { value: 0 },
    uTime: { value: 0 },
    uGridMode: { value: 0 },
    uGridOpacity: { value: 0 },
    uGridPitch: { value: 1 },
  });

  // Placeholder low-poly object, drawn into the emulated buffer so it gets every effect.
  const objScene = new THREE.Scene();
  const objCam = new THREE.PerspectiveCamera(35, 1, 0.1, 50);
  objCam.position.set(0, 0, 6);
  const geometry = new THREE.IcosahedronGeometry(1.4, 1);
  const faces = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 }));
  const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geometry), new THREE.LineBasicMaterial());
  const obj = new THREE.Group().add(faces, edges);
  objScene.add(obj);

  const run = (material, target) => {
    quad.material = material;
    renderer.setRenderTarget(target);
    renderer.render(quadScene, quadCam);
  };

  let size = { w: 0, h: 0, bw: 0, bh: 0, ps: 0, dpr: 0 };

  return {
    // Resizes all buffers; returns the emulated buffer size the content canvas must match.
    resize(pixelScale) {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const dpr = window.devicePixelRatio || 1;
      const bw = Math.ceil(w / pixelScale);
      const bh = Math.ceil(h / pixelScale);
      if (w === size.w && h === size.h && dpr === size.dpr && pixelScale === size.ps) return size;
      size = { w, h, bw, bh, ps: pixelScale, dpr };
      renderer.setPixelRatio(dpr);
      renderer.setSize(w, h, false);
      for (const rt of [sceneRT, ghostRead, ghostWrite, blurA, blurB]) rt.setSize(bw, bh);
      contentCanvas.width = bw;
      contentCanvas.height = bh;
      contentTex.dispose();
      contentTex = makeContentTex();
      contentMat.uniforms.tContent.value = contentTex;
      return size;
    },

    render({ params, renderY, velocity, time, viewport }) {
      const light = params.theme.mode === "light" ? 1 : 0;
      const theme = params.theme[params.theme.mode];
      const toInk = (hex) => {
        const v = hexToVec(hex);
        return light ? new THREE.Vector3(1 - v.x, 1 - v.y, 1 - v.z) : v;
      };
      const groundInk = toInk(theme.ground);
      shared.uLight.value = light;

      // 1. Content canvas → ink-space buffer.
      contentTex.needsUpdate = true;
      contentMat.uniforms.uGround.value = hexToVec(theme.ground);
      contentMat.uniforms.uHard.value = params.resolution.hardText;
      run(contentMat, sceneRT);

      // 2. 3D object into its slot in the same buffer.
      if (viewport) {
        const ps = size.ps;
        const x = Math.round(viewport.x / ps);
        const y = Math.round(size.bh - (viewport.y + viewport.h - renderY) / ps);
        const w = Math.round(viewport.w / ps);
        const h = Math.round(viewport.h / ps);
        if (y + h > 0 && y < size.bh) {
          const phosphorInk = toInk(theme.phosphor);
          edges.material.color.setRGB(phosphorInk.x, phosphorInk.y, phosphorInk.z);
          faces.material.color.setRGB(groundInk.x, groundInk.y, groundInk.z);
          faces.visible = params.object.style === "edges + faces";
          obj.rotation.y = time * params.object.spin;
          obj.rotation.x = time * params.object.spin * 0.4;
          objCam.aspect = w / h;
          objCam.updateProjectionMatrix();
          sceneRT.viewport.set(x, y, w, h);
          sceneRT.scissor.set(x, y, w, h);
          sceneRT.scissorTest = true;
          renderer.setRenderTarget(sceneRT);
          renderer.clearDepth();
          renderer.render(objScene, objCam);
          sceneRT.viewport.set(0, 0, size.bw, size.bh);
          sceneRT.scissor.set(0, 0, size.bw, size.bh);
          sceneRT.scissorTest = false;
        }
      }

      // 3. Persistence, stronger while scrolling fast.
      const speed = Math.min(velocity / 3000, 1);
      ghostMat.uniforms.tPrevious.value = ghostRead.texture;
      ghostMat.uniforms.uDecay.value = Math.min(params.ghost.decay + params.ghost.scrollGain * speed, 0.98);
      ghostMat.uniforms.uShift.value = params.phosphor.shift;
      ghostMat.uniforms.uPersistInk.value = toInk(params.phosphor.persistenceColor);
      ghostMat.uniforms.uGroundInk.value = groundInk;
      run(ghostMat, ghostWrite);
      [ghostRead, ghostWrite] = [ghostWrite, ghostRead];

      // 4. Glow: separable blur of the persisted image.
      const r = params.glow.radius;
      blurMat.uniforms.tInput.value = ghostRead.texture;
      blurMat.uniforms.uDirection.value.set(r / size.bw, 0);
      run(blurMat, blurA);
      blurMat.uniforms.tInput.value = blurA.texture;
      blurMat.uniforms.uDirection.value.set(0, r / size.bh);
      run(blurMat, blurB);

      // 5. Upscale + overlay to the screen.
      const u = displayMat.uniforms;
      u.tImage.value = ghostRead.texture;
      u.uBufferSize.value.set(size.bw, size.bh);
      u.uScreenSize.value.set(size.w, size.h);
      u.uPixelScale.value = size.ps;
      u.uDpr.value = size.dpr;
      u.uGlow.value = params.glow.intensity;
      u.uTint.value = params.glow.tintToPhosphor;
      u.uPhosphorInk.value = toInk(theme.phosphor);
      u.uGroundInk.value = groundInk;
      u.uJitter.value = params.phosphor.jitter;
      u.uFlicker.value = params.phosphor.flicker;
      u.uTime.value = time;
      u.uGridMode.value = GRID_MODES[params.grid.mode];
      u.uGridOpacity.value = params.grid.opacity;
      u.uGridPitch.value = params.grid.pitch;
      run(displayMat, null);
    },
  };
}
