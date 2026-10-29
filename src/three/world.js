// 제주도 로우폴리 지형 (동서로 긴 타원 + 한라산 + 오름 + 성산일출봉 + 우도) 과 바다/하늘/조명
export function buildWorld(THREE, scene) {
  // ---- 높이 함수 ----
  const rnd = (() => { let s = 20241029; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
  const oreums = [];
  for (let i = 0; i < 16; i++) { const a = rnd() * Math.PI * 2, r = 7 + rnd() * 13; oreums.push([Math.cos(a) * r * 1.35, Math.sin(a) * r * 0.8, 0.8 + rnd() * 0.6, 0.7 + rnd() * 1.0]); }
  const SEONGSAN = [24.3, -1.2], UDO = [31, 4.2];
  function hAt(x, z) {
    const e = (x / 28) ** 2 + (z / 16) ** 2, land = Math.max(0, 1 - e);
    let h = -1.2 + 3.5 * Math.pow(land, 0.6);
    h += 0.22 * Math.sin(x * 0.7) * Math.cos(z * 0.9) * Math.min(1, land * 4);
    const r2 = x * x + z * z;
    h += 5 * Math.exp(-(x * x / (2 * 13 * 13) + z * z / (2 * 8 * 8)));
    h += 4 * Math.exp(-r2 / (2 * 3.6 * 3.6));
    h -= 2.2 * Math.exp(-r2 / (2 * 0.75 * 0.75));
    for (const [ox, oz, s, hh] of oreums) h += hh * Math.exp(-((x - ox) ** 2 + (z - oz) ** 2) / (2 * s * s)) * Math.min(1, land * 6);
    const ds = (x - SEONGSAN[0]) ** 2 + (z - SEONGSAN[1]) ** 2;
    h += 3.6 * Math.exp(-ds / (2 * 1.3 * 1.3)) - 1.1 * Math.exp(-ds / (2 * 0.55 * 0.55));
    h += 2.3 * Math.exp(-((x - UDO[0]) ** 2 + (z - UDO[1]) ** 2) / (2 * 1.7 * 1.7));
    h -= Math.max(0, Math.hypot(x, z) - 45) * 0.05;
    return h;
  }
  // 남쪽 해안선(바다와 만나는 지점)의 z 좌표를 찾아, 거기서 inland 만큼 내륙으로 들어간 위치를 돌려준다.
  function coastPoint(x, inland = 0) {
    let z = 18;
    while (z > -10 && hAt(x, z) < 0.35) z -= 0.1;
    z -= inland;
    return { x, z, y: hAt(x, z) };
  }

  // ---- 지형 메시 ----
  scene.background = new THREE.Color(0xbfe3f5);
  scene.fog = new THREE.Fog(0xbfe3f5, 80, 190);
  const geo = new THREE.PlaneGeometry(160, 120, 200, 150).rotateX(-Math.PI / 2);
  const pos = geo.attributes.position, col = new Float32Array(pos.count * 3);
  const cSea = new THREE.Color('#cbbd8e'), cSand = new THREE.Color('#e8d9a6'), cG1 = new THREE.Color('#86b64c'), cG2 = new THREE.Color('#437f3a'), cRock = new THREE.Color('#756a5f'), cLake = new THREE.Color('#4b97c0'), c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i), h = hAt(x, z);
    pos.setY(i, h);
    if (h < 0) c.copy(cSea); else if (h < 0.4) c.copy(cSand);
    else if (h < 4.5) c.lerpColors(cG1, cG2, THREE.MathUtils.smoothstep(h, 0.6, 4.5));
    else c.lerpColors(cG2, cRock, THREE.MathUtils.smoothstep(h, 4.5, 7.5));
    if (Math.hypot(x, z) < 0.85 && h < 6.8) c.copy(cLake);
    c.offsetHSL(0, 0, (Math.random() - 0.5) * 0.04);
    col.set([c.r, c.g, c.b], i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.computeVertexNormals();
  const terrain = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 1 }));
  scene.add(terrain);

  // ---- 바다 ----
  const oGeo = new THREE.PlaneGeometry(240, 240, 120, 120).rotateX(-Math.PI / 2), base = oGeo.attributes.position.array.slice();
  const ocean = new THREE.Mesh(oGeo, new THREE.MeshStandardMaterial({ color: 0x1c9ccc, flatShading: true, roughness: 0.25, metalness: 0.1, transparent: true, opacity: 0.74 }));
  scene.add(ocean);

  // ---- 조명 ----
  scene.add(new THREE.HemisphereLight(0xdff3ff, 0x6a9a50, 1.5));
  const sun = new THREE.DirectionalLight(0xfff3d6, 2.2); sun.position.set(35, 45, 28); scene.add(sun);

  // ---- 구름 ----
  const clouds = [];
  const cm = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, fog: false });
  for (let i = 0; i < 6; i++) {
    const g = new THREE.Group(), n = 4 + (i % 3);
    for (let k = 0; k < n; k++) { const m = new THREE.Mesh(new THREE.IcosahedronGeometry(1.4 + rnd() * 1.2, 1), cm); m.position.set((k - n / 2) * 1.7, rnd() * 0.6, (rnd() - 0.5) * 1.6); m.scale.y = 0.65; g.add(m); }
    g.position.set(-70 + rnd() * 140, 22 + rnd() * 8, -40 + rnd() * 70); scene.add(g); clouds.push({ g, v: 0.5 + rnd() * 0.8 });
  }

  const op = oGeo.attributes.position;
  function update(t, dt) {
    for (let i = 0; i < op.count; i++) {
      const x = base[i * 3], z = base[i * 3 + 2];
      op.setY(i, Math.sin(x * 0.45 + t * 1.3) * 0.07 + Math.cos(z * 0.4 + t * 0.9) * 0.07 + Math.sin((x + z) * 0.9 + t * 2) * 0.025);
    }
    op.needsUpdate = true;
    for (const cl of clouds) { cl.g.position.x += cl.v * dt; if (cl.g.position.x > 80) cl.g.position.x = -80; }
  }
  function dispose() {
    scene.traverse((o) => { if (o.geometry) o.geometry.dispose(); const ms = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : []; ms.forEach((m) => { if (m.map) m.map.dispose(); m.dispose(); }); });
  }
  return { hAt, coastPoint, update, dispose };
}
