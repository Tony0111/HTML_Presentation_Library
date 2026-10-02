(function () {
  "use strict";

  var config = window.PRESENTATION_CONFIG;
  var stage = document.getElementById("stage");
  var titleScreen = document.getElementById("title-screen");
  var directoryUI = document.getElementById("directory-ui");
  var chapterScreen = document.getElementById("chapter-screen");
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
  var fullscreenState = document.getElementById("fullscreen-state");

  var state = {
    view: "title",
    selectedIndex: 2,
    visualIndex: 2,
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
    scene.fog = new THREE.FogExp2(0x05070b, 0.055);

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
    var ambient = new THREE.HemisphereLight(0x76ebff, 0x030407, 1.35);
    scene.add(ambient);

    var keyLight = new THREE.PointLight(0x00e5ff, 14, 25, 2);
    keyLight.position.set(-4, 5, 6);
    scene.add(keyLight);

    var rimLight = new THREE.PointLight(0xb7ff3c, 5, 20, 2);
    rimLight.position.set(7, -1, -2);
    scene.add(rimLight);

    var floorGeometry = new THREE.PlaneGeometry(45, 40);
    var floorMaterial = new THREE.MeshStandardMaterial({
      color: 0x07131a,
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
        "vec3 col=mix(vec3(.008,.018,.03),vec3(.015,.075,.09),uv.y+band);",
        "float stars=step(.993,hash(floor(uv*vec2(220.,120.))));",
        "col += stars*vec3(.18,.75,.85)*(0.35+0.65*sin(time*0.6+uv.x*40.));",
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

  function createPoster(chapter, index) {
    var canvas = document.createElement("canvas");
    canvas.width = 1200;
    canvas.height = 740;
    var ctx = canvas.getContext("2d");
    var colors = chapter.palette;
    var gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, "#03070b");
    gradient.addColorStop(0.52, colors[1]);
    gradient.addColorStop(1, colors[2]);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.globalCompositeOperation = "screen";
    for (var i = 0; i < 7; i++) {
      var radial = ctx.createRadialGradient(170 + i * 170, 90 + ((i * 97) % 480), 4, 170 + i * 170, 90 + ((i * 97) % 480), 250);
      radial.addColorStop(0, hexToRgba(colors[0], 0.22));
      radial.addColorStop(1, hexToRgba(colors[0], 0));
      ctx.fillStyle = radial;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    ctx.lineWidth = 2;
    ctx.strokeStyle = hexToRgba(colors[0], 0.58);
    if (chapter.motif === "rings") {
      ctx.translate(790, 365);
      for (var r = 70; r < 610; r += 62) {
        ctx.beginPath();
        ctx.arc(0, 0, r, Math.PI * 0.12, Math.PI * 1.76);
        ctx.stroke();
      }
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    } else if (chapter.motif === "rays") {
      ctx.translate(180, 690);
      for (var ray = -1.24; ray < 0.3; ray += 0.1) {
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(Math.cos(ray) * 1500, Math.sin(ray) * 1500);
        ctx.stroke();
      }
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    } else if (chapter.motif === "arc") {
      for (var a = 0; a < 12; a++) {
        ctx.beginPath();
        ctx.arc(600, 372, 92 + a * 52, Math.PI * 1.05, Math.PI * 1.84);
        ctx.stroke();
      }
    } else if (chapter.motif === "flow") {
      for (var f = 0; f < 20; f++) {
        ctx.beginPath();
        for (var x = -40; x <= 1240; x += 26) {
          var y = 95 + f * 30 + Math.sin(x * 0.012 + f * 0.78) * 46;
          if (x === -40) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
    } else {
      for (var gx = 40; gx < 1200; gx += 76) {
        ctx.beginPath();
        ctx.moveTo(gx, 0);
        ctx.lineTo(gx - 220, 740);
        ctx.stroke();
      }
      for (var gy = 50; gy < 740; gy += 68) {
        ctx.beginPath();
        ctx.moveTo(0, gy);
        ctx.lineTo(1200, gy - 130);
        ctx.stroke();
      }
    }

    ctx.globalCompositeOperation = "source-over";
    ctx.fillStyle = "rgba(235,250,255,.84)";
    ctx.font = "600 22px monospace";
    ctx.fillText("PRISM / " + chapter.number, 54, 64);
    ctx.fillStyle = hexToRgba(colors[0], 0.82);
    ctx.fillRect(54, 82, 138, 3);
    return canvas;
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
    } else if (state.view === "returning-directory") {
      var returnDuration = state.reducedMotion ? 0.28 : 1.3;
      var returnProgress = Math.min(1, (elapsed - state.transitionStartedAt) / returnDuration);
      var returnEased = easeInOutCubic(returnProgress);
      z = -1.9 + returnEased * 13.1;
      y = returnEased * 0.15;
    }
    camera.position.set(0, y, z);
    var lookTarget = -1.4;
    if (state.view === "chapter" || state.view === "returning-directory") {
      var cameraProgress = state.view === "returning-directory" ? Math.min(1, (elapsed - state.transitionStartedAt) / (state.reducedMotion ? 0.28 : 1.3)) : 1;
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
    if (state.view === "title" && (key === "Enter" || key === " " || key === "ArrowDown")) {
      startOpening();
      return;
    }
    if (state.view === "chapter" && (key === "ArrowUp" || key === "Backspace")) {
      returnToDirectoryAnimated();
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

  function selectChapter(next) {
    var bounded = Math.max(0, Math.min(config.chapters.length - 1, next));
    if (bounded === state.selectedIndex) return;
    state.selectedIndex = bounded;
    updateOverlay();
  }

  function enterChapter() {
    state.view = "entering-chapter";
    state.transitionStartedAt = clock.elapsedTime;
    document.body.className = "is-entering-chapter";
  }

  function returnToDirectoryAnimated() {
    state.view = "returning-directory";
    state.transitionStartedAt = clock.elapsedTime;
    chapterScreen.hidden = false;
    chapterScreen.style.opacity = "1";
    directoryUI.hidden = false;
    directoryUI.style.opacity = "0";
    document.body.className = "is-returning-directory";
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
    chapterNumber.textContent = chapter.number;
    chapterKicker.textContent = chapter.kicker;
    chapterTitle.textContent = chapter.title;
    chapterSummary.textContent = chapter.summary;
    chapterProgress.textContent = chapter.number + " / " + String(config.chapters.length).padStart(2, "0");
    chapterScreenNumber.textContent = chapter.kicker;
    chapterScreenTitle.textContent = chapter.title;
    chapterScreenSummary.textContent = chapter.summary;
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
