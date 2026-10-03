(function () {
  "use strict";

  var config = window.PRESENTATION_CONFIG;
  var stage = document.getElementById("stage");
  var titleScreen = document.getElementById("title-screen");
  var directoryUI = document.getElementById("directory-ui");
  var chapterScreen = document.getElementById("chapter-screen");
  var endingScreen = document.getElementById("ending-screen");
  var fallback = document.getElementById("fallback");
  var fallbackMessage = document.getElementById("fallback-message");
  var chapterNumber = document.getElementById("chapter-number");
  var chapterKicker = document.getElementById("chapter-kicker");
  var chapterTitle = document.getElementById("chapter-title");
  var chapterSummary = document.getElementById("chapter-summary");
  var chapterProgress = document.getElementById("chapter-progress");
  var chapterScreenNumber = document.getElementById("chapter-screen-number");
  var chapterScreenTitle = document.getElementById("chapter-screen-title");
  var chapterScreenSummary = document.getElementById("chapter-screen-summary");
  var chapterScreenNote = document.getElementById("chapter-screen-note");
  var chapterPageProgress = document.getElementById("chapter-page-progress");
  var chapterPageType = document.getElementById("chapter-page-type");
  var chapterContent = document.getElementById("chapter-content");
  var chapterVisual = document.getElementById("chapter-visual");
  var chapterReadoutLabel = document.getElementById("chapter-readout-label");
  var chapterReadoutValue = document.getElementById("chapter-readout-value");
  var titleResult = document.getElementById("title-result");
  var fullscreenState = document.getElementById("fullscreen-state");

  var state = {
    view: "title",
    selectedIndex: 0,
    visualIndex: 0,
    chapterPageIndex: 0,
    pageAnimating: false,
    chapterEndTimer: null,
    endingTimer: null,
    transitionStartedAt: 0,
    reducedMotion: window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches
  };
  var scene;
  var camera;
  var renderer;
  var panels = [];
  var backdrop;
  var floor;
  var clock = new THREE.Clock();
  var lastTime = 0;

  if (!config || !config.chapters || !config.chapters.length || !window.THREE) {
    showFallback("Missing local configuration or Three.js library.");
    return;
  }

  try {
    init();
  } catch (error) {
    showFallback(error && error.message ? error.message : "Unable to initialize the local stage.");
  }

  function init() {
    document.title = config.presentation.title;
    scene = new THREE.Scene();
    scene.background = new THREE.Color(config.themes[config.presentation.theme].background);
    scene.fog = new THREE.FogExp2(0x05080d, 0.055);

    camera = new THREE.PerspectiveCamera(35, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 0.15, 11.2);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.18;
    stage.appendChild(renderer.domElement);

    addEnvironment();
    config.chapters.forEach(function (chapter, index) {
      panels.push(createPanel(chapter, index));
    });

    updateOverlay();
    startTitleWordCycle();
    updateFullscreenState();
    window.addEventListener("resize", resize);
    window.addEventListener("keydown", onKeyDown, { passive: false });
    document.addEventListener("fullscreenchange", function () {
      updateFullscreenState();
      requestAnimationFrame(resize);
    });
    document.addEventListener("visibilitychange", function () {
      if (!document.hidden) {
        clock.getDelta();
      }
    });
    animate();
  }

  function addEnvironment() {
    var ambient = new THREE.HemisphereLight(0x8cefff, 0x030508, 1.35);
    scene.add(ambient);

    var keyLight = new THREE.PointLight(0x46e7ff, 14, 25, 2);
    keyLight.position.set(-4, 5, 6);
    scene.add(keyLight);

    var rimLight = new THREE.PointLight(0xc8ff65, 5, 20, 2);
    rimLight.position.set(7, -1, -2);
    scene.add(rimLight);

    var floorGeometry = new THREE.PlaneGeometry(45, 40);
    var floorMaterial = new THREE.MeshStandardMaterial({
      color: 0x06151b,
      roughness: 0.38,
      metalness: 0.62,
      transparent: true,
      opacity: 0.34
    });
    floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(0, -3.04, -5.5);
    scene.add(floor);

    var backgroundMaterial = new THREE.ShaderMaterial({
      depthWrite: false,
      depthTest: false,
      uniforms: { time: { value: 0 } },
      vertexShader: "varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }",
      fragmentShader: [
        "uniform float time; varying vec2 vUv;",
        "float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453123); }",
        "void main(){",
        "vec2 uv=vUv; float band=sin(uv.y*8.0+time*.08)*.035;",
        "vec3 col=mix(vec3(.004,.012,.02),vec3(.012,.075,.085),uv.y+band);",
        "float grid=step(.965,fract(uv.x*34.0))*0.035+step(.965,fract(uv.y*18.0))*0.022;",
        "float stars=step(.992,hash(floor(uv*vec2(180.,98.))));",
        "float pulse=0.5+0.5*sin(time*.72+uv.x*27.0+uv.y*11.0);",
        "col += grid*vec3(.08,.38,.42);",
        "col += stars*vec3(.22,.86,.91)*(0.18+0.82*pulse);",
        "float scan=smoothstep(.03,0.,abs(uv.y-fract(time*.035)));",
        "col += scan*vec3(.02,.18,.2);",
        "gl_FragColor=vec4(col,1.0); }"
      ].join("\n")
    });
    backdrop = new THREE.Mesh(new THREE.PlaneGeometry(38, 23), backgroundMaterial);
    backdrop.position.set(0, 0.5, -16);
    scene.add(backdrop);
  }

  function createPanel(chapter, index) {
    var panel = new THREE.Group();
    var width = 5.15;
    var height = 3.18;
    var depth = 0.12;
    var posterTexture = new THREE.CanvasTexture(createPoster(chapter, index));
    posterTexture.colorSpace = THREE.SRGBColorSpace;
    posterTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();

    var posterMaterial = new THREE.MeshBasicMaterial({ map: posterTexture, transparent: true, opacity: 1 });
    var poster = new THREE.Mesh(new THREE.PlaneGeometry(width, height), posterMaterial);
    poster.position.z = 0.005;
    panel.add(poster);

    var glassMaterial = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(chapter.palette[0]),
      transparent: true,
      opacity: 0.17,
      metalness: 0.68,
      roughness: 0.14,
      clearcoat: 1,
      clearcoatRoughness: 0.05,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    var glass = new THREE.Mesh(new THREE.PlaneGeometry(width + 0.08, height + 0.08), glassMaterial);
    glass.position.z = 0.09;
    glass.renderOrder = 4;
    panel.add(glass);

    var glowMaterial = createGlowMaterial(chapter.palette[0]);
    var glow = new THREE.Mesh(new THREE.PlaneGeometry(width - 0.12, height - 0.12), glowMaterial);
    glow.position.z = 0.11;
    glow.renderOrder = 5;
    panel.add(glow);

    var frameMaterial = new THREE.MeshStandardMaterial({
      color: 0x9befff,
      metalness: 0.9,
      roughness: 0.2,
      emissive: new THREE.Color(chapter.palette[0]),
      emissiveIntensity: 0.24
    });
    var frame = new THREE.Group();
    addFramePiece(frame, width + 0.18, 0.055, depth, 0, height / 2 + 0.06, 0.05, frameMaterial);
    addFramePiece(frame, width + 0.18, 0.055, depth, 0, -height / 2 - 0.06, 0.05, frameMaterial);
    addFramePiece(frame, 0.055, height + 0.18, depth, width / 2 + 0.06, 0, 0.05, frameMaterial);
    addFramePiece(frame, 0.055, height + 0.18, depth, -width / 2 - 0.06, 0, 0.05, frameMaterial);
    panel.add(frame);

    var labelMaterial = new THREE.SpriteMaterial({
      map: new THREE.CanvasTexture(createLabel(chapter.number)),
      transparent: true,
      opacity: 0.9,
      depthWrite: false
    });
    var label = new THREE.Sprite(labelMaterial);
    label.scale.set(0.55, 0.55, 1);
    label.position.set(-width / 2 + 0.38, height / 2 - 0.32, 0.14);
    label.renderOrder = 6;
    panel.add(label);

    panel.userData = { poster: poster, glass: glass, glow: glow, frame: frame, label: label, chapter: chapter, index: index };
    scene.add(panel);
    return panel;
  }

  function addFramePiece(group, x, y, z, px, py, pz, material) {
    var piece = new THREE.Mesh(new THREE.BoxGeometry(x, y, z), material);
    piece.position.set(px, py, pz);
    group.add(piece);
  }

  function createGlowMaterial(hex) {
    return new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: {
        time: { value: 0 },
        focus: { value: 0 },
        accent: { value: new THREE.Color(hex) }
      },
      vertexShader: "varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}",
      fragmentShader: [
        "uniform float time; uniform float focus; uniform vec3 accent; varying vec2 vUv;",
        "void main(){",
        "float wave=sin(vUv.x*16.0-vUv.y*7.0+time*.75)*.5+.5;",
        "float line=smoothstep(.94,1.0,wave)*focus;",
        "float sweep=smoothstep(.0,.11,1.0-abs(vUv.x-fract(time*.055))*2.0)*focus;",
        "float edge=pow(1.0-abs(vUv.y-.5)*2.0,3.0)*.13*focus;",
        "float alpha=(line*.22+sweep*.09+edge)*focus;",
        "gl_FragColor=vec4(accent*(line+sweep+edge),alpha);",
        "}"
      ].join("\n")
    });
  }

  function createPoster(chapter, index, pageIndex) {
    var canvas = document.createElement("canvas");
    canvas.width = 1200;
    canvas.height = 740;
    var ctx = canvas.getContext("2d");
    var colors = chapter.palette;
    var phase = typeof pageIndex === "number" ? pageIndex : 0;
    var gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, "#03070b");
    gradient.addColorStop(0.48, colors[2]);
    gradient.addColorStop(1, colors[1]);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.globalCompositeOperation = "screen";
    for (var i = 0; i < 8; i++) {
      var radial = ctx.createRadialGradient(120 + i * 155, 100 + ((i * 83) % 470), 4, 120 + i * 155, 100 + ((i * 83) % 470), 230);
      radial.addColorStop(0, hexToRgba(colors[0], 0.22));
      radial.addColorStop(1, hexToRgba(colors[0], 0));
      ctx.fillStyle = radial;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    ctx.globalCompositeOperation = "source-over";
    ctx.lineWidth = 2;
    ctx.strokeStyle = hexToRgba(colors[0], 0.55);
    if (chapter.motif === "electrodes") {
      drawElectrodeField(ctx, colors);
    } else if (chapter.motif === "decoding") {
      drawDecoderField(ctx, colors);
    } else if (chapter.motif === "feedback") {
      drawFeedbackField(ctx, colors);
    } else if (chapter.motif === "adapting") {
      drawAdaptingField(ctx, colors);
    } else {
      drawBoundaryField(ctx, colors);
    }

    drawPageOverlay(ctx, colors, phase);

    ctx.fillStyle = "rgba(235,250,255,.84)";
    ctx.font = "600 20px monospace";
    ctx.fillText("SYNAPSE / " + chapter.number, 54, 58);
    ctx.fillStyle = hexToRgba(colors[0], 0.82);
    ctx.fillRect(54, 76, 176, 3);
    ctx.fillStyle = "rgba(235,250,255,.54)";
    ctx.font = "500 14px monospace";
    ctx.fillText(chapter.metric.toUpperCase(), 54, 700);
    return canvas;
  }

  function drawPageOverlay(ctx, colors, phase) {
    if (!phase) return;
    var progress = phase / 4;
    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.strokeStyle = hexToRgba(colors[0], 0.2 + progress * 0.16);
    ctx.fillStyle = hexToRgba(colors[0], 0.72);
    ctx.lineWidth = 2;
    ctx.setLineDash([7, 11]);
    ctx.beginPath();
    ctx.moveTo(88, 132 + phase * 22);
    ctx.lineTo(1110, 132 + phase * 22);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.arc(600, 370, 112 + phase * 28, -Math.PI * 0.28, Math.PI * 0.78);
    ctx.stroke();
    ctx.font = "600 13px monospace";
    ctx.fillText("STATE / 0" + (phase + 1) + " OF 05", 930, 680);
    ctx.restore();
  }

  function drawElectrodeField(ctx, colors) {
    var left = 90;
    var top = 150;
    var colGap = 126;
    var rowGap = 82;
    ctx.strokeStyle = hexToRgba(colors[0], 0.18);
    ctx.lineWidth = 1;
    for (var c = 0; c < 8; c++) {
      for (var r = 0; r < 5; r++) {
        var x = left + c * colGap;
        var y = top + r * rowGap;
        if (c < 7) {
          ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + colGap, y); ctx.stroke();
        }
        if (r < 4) {
          ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + rowGap); ctx.stroke();
        }
        var active = (c * 3 + r * 5) % 7 === 0;
        drawSignalNode(ctx, x, y, active ? colors[1] : colors[0], active ? 9 : 5, active ? 0.95 : 0.55);
      }
    }
    ctx.strokeStyle = hexToRgba(colors[0], 0.8);
    ctx.lineWidth = 3;
    for (var w = 0; w < 3; w++) {
      ctx.beginPath();
      for (var px = 80; px <= 1110; px += 12) {
        var py = 555 + w * 33 + Math.sin(px * 0.018 + w * 1.8) * 18 + Math.sin(px * 0.057 + w) * 7;
        if (px === 80) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.stroke();
    }
    ctx.fillStyle = hexToRgba(colors[0], 0.7);
    ctx.font = "500 15px monospace";
    ctx.fillText("ELECTRODE ARRAY / 32 CHANNELS", 82, 118);
  }

  function drawDecoderField(ctx, colors) {
    var targets = [{ x: 965, y: 220, label: "MOVE", color: colors[0] }, { x: 965, y: 370, label: "SELECT", color: colors[1] }, { x: 965, y: 520, label: "REST", color: colors[2] }];
    ctx.lineWidth = 2;
    for (var t = 0; t < targets.length; t++) {
      var target = targets[t];
      ctx.strokeStyle = hexToRgba(target.color, 0.48);
      ctx.beginPath(); ctx.arc(target.x, target.y, 47, 0, Math.PI * 2); ctx.stroke();
      drawSignalNode(ctx, target.x, target.y, target.color, 9, 0.95);
      ctx.fillStyle = hexToRgba(target.color, 0.85);
      ctx.font = "600 15px monospace";
      ctx.fillText(target.label, target.x - 28, target.y + 78);
    }
    for (var p = 0; p < 46; p++) {
      var px = 110 + (p * 71) % 690;
      var py = 155 + (p * 97) % 400;
      var targetIndex = p % 3;
      var tx = targets[targetIndex].x;
      var ty = targets[targetIndex].y;
      var bend = 0.22 + (p % 4) * 0.04;
      ctx.strokeStyle = hexToRgba(targets[targetIndex].color, 0.24 + (p % 3) * 0.08);
      ctx.beginPath(); ctx.moveTo(px, py); ctx.bezierCurveTo(px + 80, py + (ty - py) * bend, tx - 170, ty, tx, ty); ctx.stroke();
      drawSignalNode(ctx, px, py, targets[targetIndex].color, p % 5 === 0 ? 6 : 3, 0.48);
    }
    ctx.fillStyle = hexToRgba(colors[0], 0.7);
    ctx.font = "500 15px monospace";
    ctx.fillText("DECODER / LATENT INTENT SPACE", 82, 118);
  }

  function drawFeedbackField(ctx, colors) {
    ctx.save();
    ctx.translate(600, 370);
    for (var i = 0; i < 11; i++) {
      ctx.strokeStyle = hexToRgba(colors[0], 0.12 + i * 0.03);
      ctx.lineWidth = i === 5 ? 4 : 2;
      ctx.beginPath(); ctx.arc(0, 0, 92 + i * 24, -Math.PI * 0.72, Math.PI * 1.18); ctx.stroke();
    }
    ctx.restore();
    ctx.strokeStyle = hexToRgba(colors[0], 0.9);
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(600, 370, 175, -Math.PI * 0.72, Math.PI * 1.18); ctx.stroke();
    ctx.fillStyle = colors[0];
    ctx.beginPath(); ctx.moveTo(768, 235); ctx.lineTo(735, 232); ctx.lineTo(758, 260); ctx.closePath(); ctx.fill();
    drawSignalNode(ctx, 425, 286, colors[0], 10, 1);
    drawSignalNode(ctx, 774, 471, colors[1], 10, 1);
    ctx.fillStyle = hexToRgba(colors[0], 0.72);
    ctx.font = "500 15px monospace";
    ctx.fillText("BIOFEEDBACK / CLOSED LIGHT LOOP", 82, 118);
    ctx.fillStyle = hexToRgba(colors[1], 0.85);
    ctx.fillText("LISTEN", 376, 263);
    ctx.fillText("RESPOND", 792, 502);
  }

  function drawAdaptingField(ctx, colors) {
    var x0 = 120;
    var y0 = 595;
    ctx.strokeStyle = "rgba(234,247,250,.22)";
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(x0, 150); ctx.lineTo(x0, y0); ctx.lineTo(1085, y0); ctx.stroke();
    ctx.fillStyle = "rgba(234,247,250,.48)";
    ctx.font = "500 14px monospace";
    ctx.fillText("SESSION ERROR", 80, 145);
    ctx.fillText("TIME", 1045, 628);
    var curves = [
      { color: colors[2], start: 0.88, bend: 0.34 },
      { color: colors[0], start: 0.63, bend: 0.22 },
      { color: colors[1], start: 0.42, bend: 0.13 }
    ];
    for (var c = 0; c < curves.length; c++) {
      ctx.strokeStyle = hexToRgba(curves[c].color, 0.72);
      ctx.lineWidth = c === 2 ? 4 : 2;
      ctx.beginPath();
      for (var i = 0; i <= 42; i++) {
        var t = i / 42;
        var x = x0 + t * 930;
        var y = y0 - 52 - (curves[c].start * 370) * Math.exp(-t * (2.7 + c * 0.8)) - Math.sin(t * 31 + c) * (10 - c * 2);
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.setLineDash([8, 8]);
    ctx.strokeStyle = hexToRgba(colors[1], 0.48);
    ctx.beginPath(); ctx.moveTo(x0, 242); ctx.lineTo(1085, 242); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = hexToRgba(colors[0], 0.72);
    ctx.font = "500 15px monospace";
    ctx.fillText("PERSONAL CALIBRATION / THREE SESSIONS", 82, 118);
    ctx.fillStyle = hexToRgba(colors[2], 0.78);
    ctx.fillText("REFERENCE", 935, 228);
  }

  function drawBoundaryField(ctx, colors) {
    var points = [];
    for (var p = 0; p < 38; p++) {
      var px = 105 + (p * 181) % 1010;
      var py = 150 + (p * 113) % 430;
      points.push({ x: px, y: py });
    }
    ctx.lineWidth = 1;
    for (var i = 0; i < points.length; i++) {
      for (var j = i + 1; j < points.length; j++) {
        var dx = points[i].x - points[j].x;
        var dy = points[i].y - points[j].y;
        if (dx * dx + dy * dy < 31000) {
          ctx.strokeStyle = hexToRgba(colors[0], 0.1);
          ctx.beginPath(); ctx.moveTo(points[i].x, points[i].y); ctx.lineTo(points[j].x, points[j].y); ctx.stroke();
        }
      }
    }
    for (var n = 0; n < points.length; n++) {
      drawSignalNode(ctx, points[n].x, points[n].y, n % 4 === 0 ? colors[1] : colors[0], n % 5 === 0 ? 7 : 3, n % 4 === 0 ? 0.92 : 0.5);
    }
    ctx.strokeStyle = hexToRgba(colors[1], 0.6);
    ctx.setLineDash([4, 10]);
    ctx.beginPath(); ctx.arc(600, 370, 154, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = hexToRgba(colors[0], 0.75);
    ctx.font = "500 15px monospace";
    ctx.fillText("OPEN FIELD / AGENCY AT THE CENTER", 82, 118);
  }

  function drawSignalNode(ctx, x, y, color, radius, alpha) {
    var glow = ctx.createRadialGradient(x, y, 0, x, y, radius * 3.8);
    glow.addColorStop(0, hexToRgba(color, alpha * 0.72));
    glow.addColorStop(1, hexToRgba(color, 0));
    ctx.fillStyle = glow;
    ctx.beginPath(); ctx.arc(x, y, radius * 3.8, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = hexToRgba(color, alpha);
    ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.fill();
  }

  function createLabel(value) {
    var canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 256;
    var ctx = canvas.getContext("2d");
    ctx.fillStyle = "rgba(4,8,13,.64)";
    ctx.beginPath();
    ctx.arc(128, 128, 94, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(178,247,255,.68)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(128, 128, 94, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "#eafaff";
    ctx.font = "600 82px Georgia";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(value, 128, 133);
    return canvas;
  }

  function animate() {
    requestAnimationFrame(animate);
    if (document.hidden) return;
    var delta = Math.min(clock.getDelta(), 0.05);
    var elapsed = clock.elapsedTime;
    updateTransitions(elapsed);
    updatePanels(delta, elapsed);
    updateCamera(elapsed);
    backdrop.material.uniforms.time.value = elapsed;
    renderer.render(scene, camera);
    lastTime = elapsed;
  }

  function updateTransitions(elapsed) {
    if (state.view === "opening") {
      var openingDuration = state.reducedMotion ? 0.28 : 1.55;
      var openingProgress = Math.min(1, (elapsed - state.transitionStartedAt) / openingDuration);
      if (openingProgress > 0.44) directoryUI.hidden = false;
      if (openingProgress >= 1) {
        state.view = "directory";
        document.body.className = "is-directory";
      }
    }
    if (state.view === "entering-chapter") {
      var enterDuration = state.reducedMotion ? 0.28 : 1.3;
      var enterProgress = Math.min(1, (elapsed - state.transitionStartedAt) / enterDuration);
      if (enterProgress > 0.42) directoryUI.style.opacity = String(1 - (enterProgress - 0.42) / 0.3);
      if (enterProgress >= 1) {
        state.view = "chapter";
        directoryUI.hidden = true;
        directoryUI.style.opacity = "";
        chapterScreen.hidden = false;
        document.body.className = "is-chapter";
      }
    }
    if (state.view === "returning-directory") {
      var returnDirectoryDuration = state.reducedMotion ? 0.28 : 1.3;
      var returnDirectoryProgress = Math.min(1, (elapsed - state.transitionStartedAt) / returnDirectoryDuration);
      chapterScreen.style.opacity = String(1 - returnDirectoryProgress);
      directoryUI.hidden = false;
      directoryUI.style.opacity = String(Math.min(1, Math.max(0, (returnDirectoryProgress - 0.28) / 0.72)));
      if (returnDirectoryProgress >= 1) {
        state.view = "directory";
        chapterScreen.hidden = true;
        chapterScreen.style.opacity = "";
        directoryUI.style.opacity = "";
        document.body.className = "is-directory";
      }
    }
    if (state.view === "ending") {
      var endingDuration = state.reducedMotion ? 0.28 : 1.3;
      var endingProgress = Math.min(1, (elapsed - state.transitionStartedAt) / endingDuration);
      var endingEased = easeInOutCubic(endingProgress);
      chapterScreen.style.opacity = String(1 - endingProgress);
      endingScreen.hidden = false;
      endingScreen.style.opacity = String(Math.min(1, Math.max(0, (endingProgress - 0.28) / 0.72)));
      endingScreen.style.transform = "scale(" + (1.035 - endingEased * 0.035) + ")";
      if (endingProgress >= 1) {
        state.view = "ending-hold";
        chapterScreen.hidden = true;
        chapterScreen.style.opacity = "";
        endingScreen.style.opacity = "";
        endingScreen.style.transform = "";
        document.body.className = "is-ending";
        state.endingTimer = window.setTimeout(returnToDirectoryFromEnding, 6500);
      }
    }
    if (state.view === "returning-ending") {
      var returnEndingDuration = state.reducedMotion ? 0.28 : 1.05;
      var returnEndingProgress = Math.min(1, (elapsed - state.transitionStartedAt) / returnEndingDuration);
      endingScreen.style.opacity = String(1 - returnEndingProgress);
      directoryUI.hidden = false;
      directoryUI.style.opacity = String(Math.min(1, Math.max(0, (returnEndingProgress - 0.24) / 0.76)));
      if (returnEndingProgress >= 1) {
        state.view = "directory";
        endingScreen.hidden = true;
        endingScreen.style.opacity = "";
        endingScreen.style.transform = "";
        directoryUI.style.opacity = "";
        document.body.className = "is-directory";
      }
    }
    if (state.view === "returning-title") {
      var returnTitleDuration = state.reducedMotion ? 0.28 : 1.15;
      var returnTitleProgress = Math.min(1, (elapsed - state.transitionStartedAt) / returnTitleDuration);
      directoryUI.style.opacity = String(1 - returnTitleProgress);
      titleScreen.style.opacity = String(returnTitleProgress);
      titleScreen.style.transform = "scale(" + (1.035 - returnTitleProgress * 0.035) + ")";
      if (returnTitleProgress >= 1) {
        state.view = "title";
        directoryUI.hidden = true;
        directoryUI.style.opacity = "";
        titleScreen.style.opacity = "";
        titleScreen.style.transform = "";
        titleScreen.setAttribute("aria-hidden", "false");
        document.body.className = "is-title";
      }
    }
  }

  function updatePanels(deltaTime, elapsed) {
    var target = state.selectedIndex;
    var easing = 1 - Math.exp(-deltaTime * 4.2);
    state.visualIndex += (target - state.visualIndex) * easing;
    var theme = config.themes[config.presentation.theme];
    panels.forEach(function (panel, index) {
      var offset = index - state.visualIndex;
      var angle = offset * theme.stepAngle;
      var depth = -theme.arcRadius * (1 - Math.cos(angle));
      var distance = Math.abs(offset);
      var focus = Math.max(0, 1 - distance * 1.9);
      var scale = 1 - Math.min(distance * 0.1, 0.22);
      panel.position.set(theme.arcRadius * Math.sin(angle), 0.06 + Math.sin(elapsed * 0.42 + index) * 0.028, depth);
      panel.rotation.set(0, -angle, 0);
      panel.scale.setScalar(scale);
      panel.userData.poster.material.opacity = Math.max(0.42, 1 - distance * 0.28);
      panel.userData.glass.material.opacity = 0.075 + focus * 0.14;
      panel.userData.glow.material.uniforms.time.value = elapsed;
      panel.userData.glow.material.uniforms.focus.value = focus;
      panel.userData.label.material.opacity = 0.28 + focus * 0.72;
      panel.renderOrder = Math.round((10 - distance) * 10);
    });
  }

  function updateCamera(elapsed) {
    var z = 11.2;
    var y = 0.15;
    if (state.view === "entering-chapter") {
      var duration = state.reducedMotion ? 0.28 : 1.3;
      var progress = Math.min(1, (elapsed - state.transitionStartedAt) / duration);
      var eased = easeInOutCubic(progress);
      z = 11.2 - eased * 13.1;
      y = 0.15 * (1 - eased);
    } else if (state.view === "chapter") {
      z = -1.9;
      y = 0;
    } else if (state.view === "returning-directory" || state.view === "ending") {
      var returnDuration = state.reducedMotion ? 0.28 : 1.3;
      var returnProgress = Math.min(1, (elapsed - state.transitionStartedAt) / returnDuration);
      var returnEased = easeInOutCubic(returnProgress);
      z = -1.9 + returnEased * 13.1;
      y = returnEased * 0.15;
    }
    camera.position.set(0, y, z);
    var lookTarget = -1.4;
    if (state.view === "chapter" || state.view === "returning-directory" || state.view === "ending") {
      var cameraProgress = state.view === "chapter" ? 1 : Math.min(1, (elapsed - state.transitionStartedAt) / (state.reducedMotion ? 0.28 : 1.3));
      lookTarget = -5 + easeInOutCubic(cameraProgress) * 3.6;
    }
    camera.lookAt(0, 0, lookTarget);
  }

  function onKeyDown(event) {
    var key = event.key;
    var lowerKey = key.toLowerCase();
    var handled = [" ", "ArrowDown", "ArrowUp", "ArrowLeft", "ArrowRight", "Home", "End", "Enter", "Escape", "Backspace", "f"].indexOf(lowerKey === "f" ? "f" : key) !== -1 || /^[1-8]$/.test(key);
    if (handled) event.preventDefault();
    if (event.repeat) return;

    if (lowerKey === "f") {
      toggleFullscreen();
      return;
    }
    if (key === "Escape") {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      }
      return;
    }
    if (state.view === "title" && (key === "Enter" || key === " " || key === "ArrowDown" || key === "ArrowRight")) {
      startOpening();
      return;
    }
    if (state.view === "chapter") {
      if (key === "ArrowUp" || key === "Backspace") {
        returnToDirectoryAnimated();
        return;
      }
      if (key === "ArrowLeft") {
        previousChapterPage();
        return;
      }
      if (key === "ArrowRight" || key === "ArrowDown" || key === "Enter" || key === " ") {
        nextChapterPage();
        return;
      }
    }
    if ((state.view === "ending" || state.view === "ending-hold") && (key === "ArrowRight" || key === "ArrowDown" || key === "Enter" || key === " " || key === "ArrowUp" || key === "Backspace")) {
      returnToDirectoryFromEnding();
      return;
    }
    if (state.view === "directory" && (key === "ArrowUp" || key === "Backspace")) {
      returnToTitleAnimated();
      return;
    }
    if (state.view !== "directory") return;
    if (key === "ArrowLeft") selectChapter(state.selectedIndex - 1);
    if (key === "ArrowRight") selectChapter(state.selectedIndex + 1);
    if (key === "Home") selectChapter(0);
    if (key === "End") selectChapter(config.chapters.length - 1);
    if (/^[1-8]$/.test(key)) selectChapter(Number(key) - 1);
    if (key === "Enter" || key === " ") enterChapter();
  }

  function startOpening() {
    state.view = "opening";
    state.transitionStartedAt = clock.elapsedTime;
    document.body.className = "is-opening";
    titleScreen.setAttribute("aria-hidden", "true");
  }

  function startTitleWordCycle() {
    var words = ["FIELD", "INTENT", "CHOICE", "TOUCH"];
    var wordIndex = 0;
    window.setInterval(function () {
      if (!titleResult || (state.view !== "title" && state.view !== "opening")) return;
      titleResult.classList.add("is-changing");
      window.setTimeout(function () {
        wordIndex = (wordIndex + 1) % words.length;
        titleResult.textContent = words[wordIndex];
        titleResult.classList.remove("is-changing");
      }, 320);
    }, 2800);
  }

  function selectChapter(next) {
    var bounded = Math.max(0, Math.min(config.chapters.length - 1, next));
    if (bounded === state.selectedIndex) return;
    state.selectedIndex = bounded;
    updateOverlay();
  }

  function enterChapter() {
    clearChapterEndTimer();
    state.chapterPageIndex = 0;
    state.pageAnimating = false;
    updateChapterPage(false);
    state.view = "entering-chapter";
    state.transitionStartedAt = clock.elapsedTime;
    document.body.className = "is-entering-chapter";
  }

  function nextChapterPage() {
    if (state.pageAnimating) return;
    var pages = getChapterPages(config.chapters[state.selectedIndex]);
    if (state.chapterPageIndex >= pages.length - 1) {
      clearChapterEndTimer();
      finishChapter();
      return;
    }
    setChapterPage(state.chapterPageIndex + 1);
  }

  function previousChapterPage() {
    if (state.pageAnimating || state.chapterPageIndex <= 0) return;
    setChapterPage(state.chapterPageIndex - 1);
  }

  function setChapterPage(nextIndex) {
    var pages = getChapterPages(config.chapters[state.selectedIndex]);
    var bounded = Math.max(0, Math.min(pages.length - 1, nextIndex));
    if (bounded === state.chapterPageIndex) return;
    state.chapterPageIndex = bounded;
    state.pageAnimating = true;
    chapterContent.classList.add("is-page-changing");
    window.setTimeout(function () {
      updateChapterPage(true);
    }, 190);
    window.setTimeout(function () {
      chapterContent.classList.remove("is-page-changing");
      state.pageAnimating = false;
    }, 250);
  }

  function returnToDirectoryAnimated() {
    clearChapterEndTimer();
    state.view = "returning-directory";
    state.transitionStartedAt = clock.elapsedTime;
    chapterScreen.hidden = false;
    chapterScreen.style.opacity = "1";
    directoryUI.hidden = false;
    directoryUI.style.opacity = "0";
    document.body.className = "is-returning-directory";
  }

  function finishChapter() {
    if (state.selectedIndex === config.chapters.length - 1) {
      showEndingAnimated();
    } else {
      returnToDirectoryAnimated();
    }
  }

  function showEndingAnimated() {
    clearChapterEndTimer();
    clearEndingTimer();
    state.view = "ending";
    state.transitionStartedAt = clock.elapsedTime;
    chapterScreen.hidden = false;
    chapterScreen.style.opacity = "1";
    endingScreen.hidden = false;
    endingScreen.style.opacity = "0";
    endingScreen.style.transform = "scale(1.035)";
    directoryUI.hidden = true;
    document.body.className = "is-ending";
  }

  function returnToDirectoryFromEnding() {
    clearEndingTimer();
    state.view = "returning-ending";
    state.transitionStartedAt = clock.elapsedTime;
    chapterScreen.hidden = true;
    chapterScreen.style.opacity = "";
    endingScreen.hidden = false;
    endingScreen.style.opacity = "1";
    endingScreen.style.transform = "scale(1)";
    directoryUI.hidden = false;
    directoryUI.style.opacity = "0";
    document.body.className = "is-returning-ending";
  }

  function returnToTitleAnimated() {
    state.view = "returning-title";
    state.transitionStartedAt = clock.elapsedTime;
    directoryUI.hidden = false;
    directoryUI.style.opacity = "1";
    titleScreen.style.opacity = "0";
    titleScreen.style.transform = "scale(1.035)";
    titleScreen.setAttribute("aria-hidden", "false");
    document.body.className = "is-returning-title";
  }

  function updateOverlay() {
    var chapter = config.chapters[state.selectedIndex];
    state.chapterPageIndex = 0;
    chapterNumber.textContent = chapter.number;
    chapterKicker.textContent = chapter.kicker;
    chapterTitle.textContent = chapter.title;
    chapterSummary.textContent = chapter.summary;
    chapterProgress.textContent = chapter.number + " / " + String(config.chapters.length).padStart(2, "0");
    updateChapterPage(false);
  }

  function updateChapterPage() {
    var chapter = config.chapters[state.selectedIndex];
    var pages = getChapterPages(chapter);
    var page = pages[state.chapterPageIndex] || pages[0];
    chapterPageProgress.textContent = String(state.chapterPageIndex + 1).padStart(2, "0") + " / " + String(pages.length).padStart(2, "0");
    chapterPageType.textContent = "FIELD NOTE / " + chapter.number;
    chapterScreenNumber.textContent = page.label;
    chapterScreenTitle.textContent = page.title;
    chapterScreenSummary.textContent = page.body;
    chapterReadoutLabel.textContent = page.readout;
    chapterReadoutValue.textContent = page.metric.toUpperCase();
    chapterScreenNote.textContent = page.note;
    chapterVisual.style.backgroundImage = "url('" + createPoster(chapter, state.selectedIndex, state.chapterPageIndex).toDataURL("image/png") + "')";
    if (state.chapterPageIndex === pages.length - 1 && state.view === "chapter") {
      clearChapterEndTimer();
      state.chapterEndTimer = window.setTimeout(function () {
        if (state.view === "chapter" && state.chapterPageIndex === pages.length - 1) {
          finishChapter();
        }
      }, 3200);
    }
  }

  function clearChapterEndTimer() {
    if (state.chapterEndTimer !== null) {
      window.clearTimeout(state.chapterEndTimer);
      state.chapterEndTimer = null;
    }
  }

  function clearEndingTimer() {
    if (state.endingTimer !== null) {
      window.clearTimeout(state.endingTimer);
      state.endingTimer = null;
    }
  }

  function getChapterPages(chapter) {
    if (chapter.pages && chapter.pages.length) return chapter.pages;
    return [{
      label: chapter.kicker,
      title: chapter.title,
      body: chapter.summary,
      readout: chapter.readout,
      metric: chapter.metric,
      note: "Illustrative chapter note."
    }];
  }

  function toggleFullscreen() {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(function () {
        fullscreenState.textContent = "FULLSCREEN UNAVAILABLE";
      });
    }
  }

  function updateFullscreenState() {
    fullscreenState.textContent = document.fullscreenElement ? "FULLSCREEN STAGE" : "DESKTOP STAGE";
  }

  function resize() {
    if (!camera || !renderer) return;
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
  }

  function showFallback(message) {
    fallback.hidden = false;
    fallbackMessage.textContent = message;
  }

  function easeInOutCubic(value) {
    return value < 0.5 ? 4 * value * value * value : 1 - Math.pow(-2 * value + 2, 3) / 2;
  }

  function hexToRgba(hex, alpha) {
    var color = new THREE.Color(hex);
    return "rgba(" + Math.round(color.r * 255) + "," + Math.round(color.g * 255) + "," + Math.round(color.b * 255) + "," + alpha + ")";
  }
})();
