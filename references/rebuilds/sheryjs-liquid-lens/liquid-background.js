/* liquid-background.js - Shery.js liquid refraction as a page background.
 * No dependencies, works from file://. Static background; hovering bulges the picture under the pointer (lens only, no wobble).
 *
 *   const bg = LiquidBackground({ colors: ["#05070b", "#12304a", "#2e7c6b"] });
 *   bg.set({ strength: 0.6 });  bg.pause();  bg.resume();  bg.destroy();
 *
 * image: a canvas, <img>, ImageBitmap or blob URL. From file://, a plain relative
 * image URL taints the WebGL texture, so pass a canvas or data URI instead.
 */
(function (global) {
  var VERT = "attribute vec2 p;varying vec2 u;void main(){gl_Position=vec4(p,0.,1.);u=p*.5+.5;}";
  var FRAG = [
    "precision highp float;varying vec2 u;",
    "uniform sampler2D tex;uniform float gate,strength,radius,asp;uniform vec2 m;",
    "void main(){vec2 pos=vec2(u.x,u.y/asp),mp=vec2(m.x,m.y/asp);",
    "float k=1.-smoothstep(0.,radius,distance(pos,mp));k=k*k*(3.-2.*k)*gate;",
    "vec2 uv=m+(u-m)*(1.-strength*k);",
    "gl_FragColor=texture2D(tex,uv);}"
  ].join("");

  function gradientCanvas(colors) {
    var c = document.createElement("canvas"); c.width = 1024; c.height = 576;
    var x = c.getContext("2d"), g = x.createLinearGradient(0, 0, 1024, 576);
    colors.forEach(function (col, i) { g.addColorStop(i / Math.max(colors.length - 1, 1), col); });
    x.fillStyle = g; x.fillRect(0, 0, 1024, 576);
    x.strokeStyle = "rgba(255,255,255,.08)";   /* faint grid: refraction needs structure to show */
    for (var i = 0; i <= 32; i++) { x.beginPath(); x.moveTo(i * 32, 0); x.lineTo(i * 32, 576); x.stroke(); }
    for (var j = 0; j <= 18; j++) { x.beginPath(); x.moveTo(0, j * 32); x.lineTo(1024, j * 32); x.stroke(); }
    return c;
  }

  function LiquidBackground(opts) {
    opts = opts || {};
    var P = { strength: 0.5, radius: 0.28, dpr: 1.5 };
    ["strength", "radius", "dpr"].forEach(function (k) { if (opts[k] != null) P[k] = opts[k]; });

    var host = opts.container || document.body;
    var canvas = document.createElement("canvas");
    canvas.setAttribute("aria-hidden", "true");
    canvas.style.cssText = "position:fixed;inset:0;width:100%;height:100%;z-index:" +
      (opts.zIndex != null ? opts.zIndex : 0) + ";pointer-events:none;display:block";
    host.insertBefore(canvas, host.firstChild);

    var gl = canvas.getContext("webgl", { premultipliedAlpha: false });
    if (!gl) { canvas.style.background = (opts.colors || ["#05070b"])[0]; return { set() {}, pause() {}, resume() {}, destroy() { canvas.remove(); } }; }

    function sh(type, src) { var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; }
    var prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog); gl.useProgram(prog);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    var L = {}; ["gate", "strength", "radius", "asp", "m"].forEach(function (n) { L[n] = gl.getUniformLocation(prog, n); });

    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.bindTexture(gl.TEXTURE_2D, gl.createTexture());
    [[gl.TEXTURE_MIN_FILTER, gl.LINEAR], [gl.TEXTURE_MAG_FILTER, gl.LINEAR],
     [gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE], [gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE]]
      .forEach(function (a) { gl.texParameteri(gl.TEXTURE_2D, a[0], a[1]); });
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE,
      opts.image || gradientCanvas(opts.colors || ["#05070b", "#12304a", "#2e7c6b"]));

    function resize() {
      var d = Math.min(global.devicePixelRatio || 1, P.dpr);
      canvas.width = Math.max(1, Math.round(canvas.clientWidth * d));
      canvas.height = Math.max(1, Math.round(canvas.clientHeight * d));
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform1f(L.asp, canvas.width / canvas.height);
    }
    global.addEventListener("resize", resize); resize();

    var reduced = global.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var hover = false, gate = 0, last = performance.now(), paused = false, raf = 0, alive = true;
    var mx = 0.5, my = 0.5, tx = 0.5, ty = 0.5, seen = false;
    function enter(e) {
      hover = true; tx = e.clientX / global.innerWidth; ty = 1 - e.clientY / global.innerHeight;
      if (!seen) { mx = tx; my = ty; seen = true; }   /* first move: start under the pointer, do not glide from centre */
    }
    function leave() { hover = false; }
    function vis() { last = performance.now(); }
    global.addEventListener("pointermove", enter);
    document.documentElement.addEventListener("pointerleave", leave);
    document.addEventListener("visibilitychange", vis);

    function frame(now) {
      if (!alive) return;
      raf = requestAnimationFrame(frame);
      if (document.hidden) { last = now; return; }
      var dt = Math.min((now - last) / 1000, 0.05); last = now;
      gate += ((hover && !reduced && !paused ? 1 : 0) - gate) * 0.06;
      if (gate < 0.001 && !hover) gate = 0;
      gl.uniform1f(L.gate, gate);
      gl.uniform1f(L.strength, P.strength); gl.uniform1f(L.radius, P.radius);
      mx += (tx - mx) * 0.08; my += (ty - my) * 0.08;
      gl.uniform2f(L.m, mx, my);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }
    raf = requestAnimationFrame(frame);

    return {
      set: function (o) { Object.keys(o).forEach(function (k) { if (k in P) P[k] = o[k]; }); },
      pause: function () { paused = true; },
      resume: function () { paused = false; },
      destroy: function () {
        alive = false; cancelAnimationFrame(raf);
        global.removeEventListener("resize", resize);
        global.removeEventListener("pointermove", enter);
        document.documentElement.removeEventListener("pointerleave", leave);
        document.removeEventListener("visibilitychange", vis);
        canvas.remove();
      }
    };
  }
  global.LiquidBackground = LiquidBackground;
})(window);
