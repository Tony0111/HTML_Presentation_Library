/*
 * tweaks-shim — minimal replacement for the `tweaks` GUI package.
 *
 * The four text examples in this folder only use `tweaks` to render a live
 * control panel. Their animations run on their own with default values, so
 * this shim resolves every tweak descriptor to its default value and makes
 * the panel API a no-op. That lets the pages run as plain classic scripts,
 * offline, with no node_modules.
 *
 * This is not a general-purpose replacement for `tweaks`.
 */
(function () {
  function pass(v, fallback) { return v === undefined ? fallback : v; }

  window.Str    = function (v) { return pass(v, ''); };
  window.Int    = function (v) { return pass(v, 0); };
  window.Float  = function (v) { return pass(v, 0); };
  window.Bool   = function (v) { return pass(v, false); };
  window.Select = function (list, index) {
    if (!Array.isArray(list)) return list;
    return list[index || 0] !== undefined ? list[index || 0] : list[0];
  };

  window.registerType = function (name, def) {
    return function (v) { return pass(v, def); };
  };
  window.registerTypeGUI = function () {};
  window.syncTweaks = function () {};

  window.createTweaks = function (name, schema) {
    var walk = function (node) {
      if (node && typeof node === 'object' && !Array.isArray(node)) {
        var out = {};
        for (var k in node) out[k] = walk(node[k]);
        return out;
      }
      return node;
    };
    return walk(schema);
  };

  window.GUI = {
    // deferred so it runs after the rest of the script has been evaluated
    render: function (fn) {
      requestAnimationFrame(function () {
        try { fn(); } catch (e) { /* panel only */ }
      });
    },
    BeginPanel: function () { return true; },
    EndPanel: function () {},
    BeginGroup: function () {},
    EndGroup: function () {},
    Tweaks: function () {},
    Ref: function (name, value) { return function () { return value; }; },
    ButtonInput: function () { return false; },
    ToggleButtonInput: function () { return false; },
    Checkbox: function () { return false; },
    Select: function () { return false; },
    Text: function () { return false; }
  };

  window.showGUI = function () {};
})();
