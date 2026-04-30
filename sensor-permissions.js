// Motion/orientation permission helpers (iOS Safari requires a user gesture).
// Exposes `window.SensorPermissions`.
// In p5 global mode: set `window.SENSOR_PERMISSIONS_AUTO_BOOTSTRAP = false` before this
// script to disable auto-hook; then call `SensorPermissions.ensureSensorPermission()`.
(function () {
  "use strict";

  var _granted = false;
  var _statusMessage = "";
  var _lastResult = null;
  var _ensurePromise = null;
  var _flowStartedOnce = false;

  function applyState(granted, result) {
    _granted = !!granted;
    _lastResult = result || null;
    if (_granted) {
      _statusMessage = "";
      return;
    }
    if (result && result.state === "denied") _statusMessage = "Sensor access denied in Safari";
    else if (result && result.state === "error") _statusMessage = "Tap to allow sensor access";
    else if (result && result.state === "not_needed") _statusMessage = "";
    else _statusMessage = "Sensor permission needed";
  }

  function getOptionsFromWindow() {
    var w = typeof window !== "undefined" ? window : {};
    return w.SENSOR_PERMISSIONS_OPTIONS && typeof w.SENSOR_PERMISSIONS_OPTIONS === "object"
      ? w.SENSOR_PERMISSIONS_OPTIONS
      : {};
  }

  function hasPermissionAPI(EventCtor) {
    return typeof EventCtor !== "undefined" && typeof EventCtor.requestPermission === "function";
  }

  function needsSensorPermission() {
    return hasPermissionAPI(window.DeviceOrientationEvent) || hasPermissionAPI(window.DeviceMotionEvent);
  }

  async function requestSensorPermissionOnce() {
    if (!needsSensorPermission()) {
      var ok = { granted: true, state: "not_needed" };
      applyState(true, ok);
      return ok;
    }

    try {
      var requests = [];

      if (hasPermissionAPI(window.DeviceOrientationEvent)) {
        requests.push(window.DeviceOrientationEvent.requestPermission());
      }
      if (hasPermissionAPI(window.DeviceMotionEvent)) {
        requests.push(window.DeviceMotionEvent.requestPermission());
      }

      var results = await Promise.all(requests);
      var granted = results.length === 0 ? true : results.every(function (r) {
        return r === "granted";
      });
      var result = { granted: granted, state: granted ? "granted" : "denied" };
      applyState(granted, result);
      return result;
    } catch (error) {
      var errResult = { granted: false, state: "error", error: error };
      applyState(false, errResult);
      return errResult;
    }
  }

  function defaultDeniedMessage(result) {
    if (result && result.state === "denied") return "Sensor access denied in Safari";
    return "Tap to allow sensor access";
  }

  function removeExistingButton(btn) {
    if (!btn) return;
    try {
      if (typeof btn.remove === "function") btn.remove();
      else if (btn.elt && typeof btn.elt.remove === "function") btn.elt.remove();
    } catch (_) {
      // ignore
    }
  }

  function createP5Button(label, onPress) {
    var btn = window.createButton(label);
    btn.style("font-size", "24px");
    btn.style("padding", "12px 16px");
    btn.style("border-radius", "12px");
    btn.style("border", "1px solid rgba(0,0,0,0.2)");
    btn.style("background", "white");
    btn.style("color", "#111");
    btn.center();
    btn.mousePressed(onPress);
    btn.elt.addEventListener("touchend", function (e) {
      e.preventDefault();
      onPress();
    });
    return btn;
  }

  function createDomButton(label, onPress) {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = label;
    btn.style.position = "fixed";
    btn.style.left = "50%";
    btn.style.top = "50%";
    btn.style.transform = "translate(-50%, -50%)";
    btn.style.zIndex = "9999";
    btn.style.fontSize = "18px";
    btn.style.padding = "14px 18px";
    btn.style.borderRadius = "12px";
    btn.style.border = "1px solid rgba(0,0,0,0.2)";
    btn.style.background = "white";
    btn.style.color = "#111";
    btn.style.boxShadow = "0 10px 30px rgba(0,0,0,0.15)";
    btn.addEventListener("click", onPress, { passive: false });
    btn.addEventListener(
      "touchend",
      function (e) {
        e.preventDefault();
        onPress();
      },
      { passive: false }
    );
    document.body.appendChild(btn);
    return btn;
  }

  function snapshotResult() {
    return _lastResult
      ? { granted: !!_lastResult.granted, state: _lastResult.state, error: _lastResult.error }
      : { granted: _granted, state: _granted ? "not_needed" : "pending" };
  }

  async function ensureSensorPermissionImpl(options) {
    var opts = options || {};
    var winOpts = getOptionsFromWindow();
    var onChange = typeof opts.onChange === "function" ? opts.onChange : null;
    var buttonText =
      typeof opts.buttonText === "string"
        ? opts.buttonText
        : typeof winOpts.buttonText === "string"
          ? winOpts.buttonText
          : "Tap to allow access to sensors";
    var preferP5Button =
      opts.preferP5Button !== undefined
        ? opts.preferP5Button !== false
        : winOpts.preferP5Button !== false;

    // Sync path: no permission API — avoid `await`-microtask so first `draw()` sees `granted === true`.
    if (!needsSensorPermission()) {
      var instant = { granted: true, state: "not_needed" };
      applyState(true, instant);
      if (onChange) onChange(true, instant);
      return instant;
    }

    var button = null;

    var tryRequest = async function () {
      var result = await requestSensorPermissionOnce();
      if (onChange) onChange(!!result.granted, result);
      if (result.granted) removeExistingButton(button);
      return result;
    };

    var first = await tryRequest();
    if (first.granted) return first;

    if (!needsSensorPermission()) return first;

    var label = buttonText || defaultDeniedMessage(first);
    var useP5 = preferP5Button && typeof window.createButton === "function";
    button = useP5 ? createP5Button(label, tryRequest) : createDomButton(label, tryRequest);

    return first;
  }

  /**
   * Repeated calls resolve to the latest snapshot — the flow runs once until permission is resolved.
   * State is exposed on `SensorPermissions.granted` / `SensorPermissions.statusMessage` after each tap/attempt.
   */
  function ensureSensorPermission(options) {
    if (_flowStartedOnce) return Promise.resolve(snapshotResult());
    _flowStartedOnce = true;
    if (!_ensurePromise) {
      _ensurePromise = ensureSensorPermissionImpl(options).then(function (r) {
        return r;
      });
    }
    return _ensurePromise;
  }

  function bootstrapAfterUserSetup() {
    var winOpts = getOptionsFromWindow();
    return ensureSensorPermission({
      buttonText: winOpts.buttonText,
      preferP5Button: winOpts.preferP5Button,
    });
  }

  /** Run after sketch.js assigns `setup` — wrap before p5 calls it on DOM/load. */
  function installP5GlobalAutoBootstrap() {
    var userSetup = window.setup;
    if (typeof userSetup !== "function" || userSetup.__sensorPermissionsWrapped) return;

    function wrappedSetup() {
      var ret = userSetup.apply(this, arguments);
      bootstrapAfterUserSetup();
      return ret;
    }
    wrappedSetup.__sensorPermissionsWrapped = true;
    window.setup = wrappedSetup;
  }

  var api = {
    needsSensorPermission: needsSensorPermission,
    requestSensorPermissionOnce: requestSensorPermissionOnce,
    ensureSensorPermission: ensureSensorPermission,
    bootstrapAfterUserSetup: bootstrapAfterUserSetup,
  };

  Object.defineProperty(api, "granted", {
    get: function () {
      return _granted;
    },
    enumerable: true,
  });
  Object.defineProperty(api, "statusMessage", {
    get: function () {
      return _statusMessage;
    },
    enumerable: true,
  });
  Object.defineProperty(api, "lastResult", {
    get: function () {
      return _lastResult;
    },
    enumerable: true,
  });

  window.SensorPermissions = api;

  if (typeof window !== "undefined" && window.SENSOR_PERMISSIONS_AUTO_BOOTSTRAP !== false) {
    installP5GlobalAutoBootstrap();
  }
})();
