import { SITES, loadVisitors } from '../data/visitors.js';
import { buildWorld } from '../three/world.js';
import { esc } from '../ui.js';

const fmt = (n) => (n == null ? '미집계' : n.toLocaleString('ko-KR'));
const hex = (c) => '#' + c.toString(16).padStart(6, '0');

// 3D 제주 + 서귀포시 직영관광지 관람객수(월별) 시각화
export function renderVisual3D(root) {
  root.innerHTML = `<section class="viz">
    <div class="viz-canvas" id="vizCanvas"></div>
    <div class="viz-top"><h2>3D 제주 · 직영관광지 관람객</h2><p id="vizBadge" class="viz-badge">불러오는 중…</p></div>
    <aside class="viz-rank" id="vizRank"></aside>
    <aside class="viz-info" id="vizInfo" hidden></aside>
    <div class="viz-bar">
      <button id="vizPlay" class="btn primary small" aria-label="재생/일시정지">▶</button>
      <input id="vizRange" type="range" min="0" max="0" value="0" aria-label="월 선택" />
      <b id="vizTick">-</b>
    </div>
    <p class="viz-hint">드래그: 회전 · 휠: 확대/축소 · 기둥을 클릭하면 자세히 · 오른쪽 순위를 눌러도 이동해요</p>
  </section>`;

  let disposed = false, cleanup = () => {};
  init().catch((e) => {
    const b = root.querySelector('#vizBadge');
    if (b) b.innerHTML = `<span class="err">3D 화면을 시작하지 못했어요: ${esc(e.message || e)}</span>`;
  });
  return () => { disposed = true; cleanup(); };

  async function init() {
    const [THREE, { OrbitControls }, data] = await Promise.all([
      import('three'), import('three/examples/jsm/controls/OrbitControls.js'), loadVisitors(),
    ]);
    if (disposed) return;
    const stage = root.querySelector('#vizCanvas');
    const rankEl = root.querySelector('#vizRank'), infoEl = root.querySelector('#vizInfo'), badge = root.querySelector('#vizBadge');
    const range = root.querySelector('#vizRange'), tick = root.querySelector('#vizTick'), playBtn = root.querySelector('#vizPlay');
    const { periods } = data;

    badge.innerHTML = data.source === 'api'
      ? '출처: 공공데이터포털 · 서귀포시 직영관광지 관람객수 추이'
      : `<span class="warn">⚠ 예시 데이터</span> ${esc(data.note)}`;
    if (data.missingSites?.length) badge.innerHTML += ` <span class="warn">(응답에 없는 관광지: ${esc(data.missingSites.join(', '))})</span>`;

    // ---------- three 기본 ----------
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    stage.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, 1, 0.5, 600);
    camera.position.set(0, 26, 52);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(-5, 2, 9); controls.enableDamping = true; controls.minDistance = 10; controls.maxDistance = 100; controls.maxPolarAngle = Math.PI / 2 - 0.05;
    const world = buildWorld(THREE, scene);
    const resize = () => { const w = stage.clientWidth, h = stage.clientHeight; renderer.setSize(w, h); camera.aspect = w / Math.max(1, h); camera.updateProjectionMatrix(); };
    resize(); addEventListener('resize', resize);

    // ---------- 관광지 기둥 ----------
    const maxV = Math.max(1, ...periods.flatMap((p) => Object.values(p.values).filter((v) => v != null)));
    const H = (v) => (v == null ? 0.15 : Math.max(0.35, (v / maxV) * 11));
    const dotTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 32; const g = c.getContext('2d'), gr = g.createRadialGradient(16, 16, 0, 16, 16, 16); gr.addColorStop(0, '#fff'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, 32, 32); return new THREE.CanvasTexture(c); })();
    const makeLabel = (color) => {
      const cv = document.createElement('canvas'); cv.width = 512; cv.height = 160; const ctx = cv.getContext('2d');
      const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false })); sp.renderOrder = 10; sp.scale.set(5.2, 1.63, 1);
      return { sprite: sp, set(name, val) {
        ctx.clearRect(0, 0, 512, 160); ctx.fillStyle = 'rgba(12,40,60,.86)'; ctx.beginPath(); ctx.roundRect(6, 6, 500, 148, 30); ctx.fill();
        ctx.fillStyle = color; ctx.fillRect(24, 26, 10, 108);
        ctx.fillStyle = '#fff'; ctx.font = "700 40px 'Noto Sans KR', sans-serif"; ctx.textBaseline = 'alphabetic'; ctx.fillText(name, 50, 70);
        ctx.fillStyle = '#ffd27a'; ctx.font = "800 54px 'Noto Sans KR', sans-serif"; ctx.fillText(val, 50, 130); tex.needsUpdate = true;
      } };
    };
    const sites = SITES.map((s, i) => {
      const p = world.coastPoint(s.x, s.inland), group = new THREE.Group(); group.position.set(p.x, p.y, p.z); scene.add(group);
      const mat = new THREE.MeshStandardMaterial({ color: s.color, emissive: s.color, emissiveIntensity: 0.35, roughness: 0.35, transparent: true, opacity: 0.93 });
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.78, 1, 20).translate(0, 0.5, 0), mat); col.userData.i = i; group.add(col);
      const cap = new THREE.Mesh(new THREE.SphereGeometry(0.85, 20, 14), mat); cap.userData.i = i; group.add(cap);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(1.5, 0.09, 8, 40), new THREE.MeshBasicMaterial({ color: s.color, transparent: true, opacity: 0.9 })); ring.rotation.x = Math.PI / 2; ring.position.y = 0.2; group.add(ring);
      const label = makeLabel(hex(s.color)); group.add(label.sprite);
      const N = 40, pp = new Float32Array(N * 3), fr = Array.from({ length: N }, () => Math.random()), ang = Array.from({ length: N }, () => Math.random() * 6.28);
      const pg = new THREE.BufferGeometry(); pg.setAttribute('position', new THREE.BufferAttribute(pp, 3));
      const pts = new THREE.Points(pg, new THREE.PointsMaterial({ color: 0xffffff, size: 0.55, map: dotTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })); pts.frustumCulled = false; group.add(pts);
      return { s, i, p, group, col, cap, ring, label, mat, pg, pp, fr, ang, N, h: 0.2, target: 0.2, value: null };
    });

    // ---------- 상태 / UI ----------
    let idx = Math.max(0, periods.length - 1), selected = -1, playing = false, acc = 0, fly = null;
    range.max = String(periods.length - 1);

    const sparkline = (cv, series, cur, color) => {
      const g = cv.getContext('2d'), w = cv.width, h = cv.height, vals = series.map((v) => v ?? 0), mx = Math.max(1, ...vals);
      g.clearRect(0, 0, w, h); g.strokeStyle = color; g.lineWidth = 3; g.lineJoin = 'round'; g.beginPath();
      vals.forEach((v, k) => { const x = 8 + (k / Math.max(1, vals.length - 1)) * (w - 16), y = h - 10 - (v / mx) * (h - 22); k ? g.lineTo(x, y) : g.moveTo(x, y); }); g.stroke();
      const cx = 8 + (cur / Math.max(1, vals.length - 1)) * (w - 16), cy = h - 10 - (vals[cur] / mx) * (h - 22);
      g.fillStyle = '#fff'; g.strokeStyle = color; g.lineWidth = 3; g.beginPath(); g.arc(cx, cy, 6, 0, 7); g.fill(); g.stroke();
    };
    const drawInfo = () => {
      if (selected < 0) { infoEl.hidden = true; return; }
      const o = sites[selected], series = periods.map((p) => p.values[o.s.id]), valid = series.filter((v) => v != null);
      const mx = valid.length ? Math.max(...valid) : null, mxLabel = mx != null ? periods[series.indexOf(mx)].label : '-', avg = valid.length ? Math.round(valid.reduce((a, b) => a + b, 0) / valid.length) : null;
      infoEl.hidden = false;
      infoEl.innerHTML = `<button class="x" aria-label="닫기">✕</button><h3>${o.s.emoji} ${esc(o.s.name)}</h3>
        <p class="big">${fmt(series[idx])}<small>${series[idx] == null ? '' : ' 명'}</small></p><p class="muted small">${periods[idx].label} 관람객</p>
        <canvas width="260" height="78"></canvas>
        <dl><dt>최대 (${mxLabel})</dt><dd>${fmt(mx)}</dd><dt>월 평균</dt><dd>${fmt(avg)}</dd></dl>`;
      sparkline(infoEl.querySelector('canvas'), series, idx, hex(o.s.color));
      infoEl.querySelector('.x').onclick = () => select(-1);
    };
    const drawRank = () => {
      const p = periods[idx], list = sites.map((o) => ({ o, v: p.values[o.s.id] })).sort((a, b) => (b.v ?? -1) - (a.v ?? -1)), total = list.reduce((a, b) => a + (b.v ?? 0), 0);
      rankEl.innerHTML = `<h3>${p.label} 관람객 순위</h3><ol>${list.map(({ o, v }, k) => `
        <li data-i="${o.i}" class="${selected === o.i ? 'on' : ''}"><span class="rk">${k + 1}</span><span class="nm">${esc(o.s.name)}</span><b>${fmt(v)}</b><i style="width:${v == null ? 0 : (v / maxV) * 100}%;background:${hex(o.s.color)}"></i></li>`).join('')}</ol>
        <p class="total">합계 <b>${fmt(total)}</b> 명</p>`;
    };
    const setIdx = (n) => {
      idx = clampI(n, 0, periods.length - 1); range.value = String(idx); tick.textContent = `${periods[idx].label}  (${idx + 1}/${periods.length})`;
      const p = periods[idx];
      sites.forEach((o) => { o.value = p.values[o.s.id]; o.target = H(o.value); o.label.set(o.s.name, o.value == null ? '미집계' : `${fmt(o.value)}명`); o.mat.opacity = o.value == null ? 0.35 : 0.93; });
      drawRank(); drawInfo();
    };
    const select = (i) => {
      selected = i; drawRank(); drawInfo();
      if (i >= 0) { const o = sites[i], g = o.group.position; fly = { tgt: new THREE.Vector3(g.x, g.y + 3, g.z), pos: new THREE.Vector3(g.x + 6, g.y + 15, g.z + 22) }; }
    };
    setIdx(idx);

    range.addEventListener('input', () => { setIdx(+range.value); acc = 0; });
    playBtn.addEventListener('click', () => { playing = !playing; playBtn.textContent = playing ? '⏸' : '▶'; if (playing && idx >= periods.length - 1) setIdx(0); });
    rankEl.addEventListener('click', (e) => { const li = e.target.closest('li[data-i]'); if (li) select(+li.dataset.i); });
    controls.addEventListener('start', () => { fly = null; });

    // 기둥 클릭 (드래그와 구분)
    const ray = new THREE.Raycaster(), mouse = new THREE.Vector2(); let down = null;
    const onDown = (e) => { down = { x: e.clientX, y: e.clientY }; };
    const onUp = (e) => {
      if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 5) { down = null; return; } down = null;
      const r = renderer.domElement.getBoundingClientRect(); mouse.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(mouse, camera); const hit = ray.intersectObjects(sites.flatMap((o) => [o.col, o.cap]))[0];
      select(hit ? hit.object.userData.i : -1);
    };
    renderer.domElement.addEventListener('pointerdown', onDown); renderer.domElement.addEventListener('pointerup', onUp);

    // ---------- 애니메이션 루프 ----------
    let raf = 0, last = performance.now(), time = 0;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      const now = performance.now(), dt = Math.min((now - last) / 1000, 0.05); last = now; time += dt;
      world.update(time, dt);
      if (playing) { acc += dt; if (acc > 1.3) { acc = 0; if (idx >= periods.length - 1) { playing = false; playBtn.textContent = '▶'; } else setIdx(idx + 1); } }
      const k = 1 - Math.exp(-dt * 4.5);
      for (const o of sites) {
        o.h += (o.target - o.h) * k;
        o.col.scale.y = Math.max(0.05, o.h); o.cap.position.y = o.h; o.cap.scale.setScalar(o.value == null ? 0.01 : 1 + Math.sin(time * 3 + o.i) * 0.06);
        o.label.sprite.position.y = o.h + 1.9 + (o.i % 2) * 1.5;
        o.ring.scale.setScalar(1 + (selected === o.i ? 0.25 : 0) + Math.sin(time * 3 + o.i) * 0.08); o.mat.emissiveIntensity = selected === o.i ? 0.9 : 0.35;
        // 관람객 입자: 현재 높이까지 올라가며 반짝
        for (let n = 0; n < o.N; n++) {
          o.fr[n] = (o.fr[n] + dt * (0.18 + (n % 5) * 0.05)) % 1;
          const r = 0.5 + 0.5 * Math.sin(o.ang[n] * 3), a = o.ang[n] + time * 0.8;
          o.pp[n * 3] = Math.cos(a) * r; o.pp[n * 3 + 1] = o.fr[n] * Math.max(0.2, o.h); o.pp[n * 3 + 2] = Math.sin(a) * r;
        }
        o.pg.attributes.position.needsUpdate = true; o.pg.setDrawRange(0, o.value == null ? 0 : o.N);
      }
      if (fly) { camera.position.lerp(fly.pos, 1 - Math.exp(-dt * 3)); controls.target.lerp(fly.tgt, 1 - Math.exp(-dt * 3)); }
      controls.update(); renderer.render(scene, camera);
    };
    loop();
    window.__viz = { sites, setIdx, select, get idx() { return idx; }, camera, controls };   // 디버그/검증용

    cleanup = () => {
      cancelAnimationFrame(raf); removeEventListener('resize', resize);
      renderer.domElement.removeEventListener('pointerdown', onDown); renderer.domElement.removeEventListener('pointerup', onUp);
      controls.dispose(); world.dispose(); dotTex.dispose(); renderer.dispose(); renderer.domElement.remove();
      delete window.__viz;
    };
    if (disposed) cleanup();
  }
}

function clampI(n, a, b) { return Math.min(b, Math.max(a, n)); }
