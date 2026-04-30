// Sensor permission helpers (iOS Safari requires a user gesture).
// Exposes `window.SensorPermissions`.
(function () {
  "use strict";

  function hasPermissionAPI(EventCtor) {
    return typeof EventCtor !== "undefined" && typeof EventCtor.requestPermission === "function";
  }

  function needsSensorPermission() {
    return hasPermissionAPI(window.DeviceOrientationEvent) || hasPermissionAPI(window.DeviceMotionEvent);
  }

  async function requestSensorPermissionOnce() {
    // If no permission API exists, assume permission is implicitly granted (Android/desktop).
    if (!needsSensorPermission()) return { granted: true, state: "not_needed" };

    try {
      const requests = [];

      if (hasPermissionAPI(window.DeviceOrientationEvent)) {
        requests.push(window.DeviceOrientationEvent.requestPermission());
      }
      if (hasPermissionAPI(window.DeviceMotionEvent)) {
        requests.push(window.DeviceMotionEvent.requestPermission());
      }

      const results = await Promise.all(requests);
      const granted = results.length === 0 ? true : results.every((r) => r === "granted");
      return { granted, state: granted ? "granted" : "denied" };
    } catch (error) {
      // Common case on iOS: calling without a user gesture rejects.
      return { granted: false, state: "error", error };
    }
  }

  function defaultDeniedMessage(result) {
    if (result.state === "denied") return "Sensor access denied in Safari";
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
    // p5's createButton exists only after p5 is loaded; in sketches it will exist in setup().
    const btn = window.createButton(label);
    btn.style("font-size", "24px");
    btn.style("padding", "12px 16px");
    btn.style("border-radius", "12px");
    btn.style("border", "1px solid rgba(0,0,0,0.2)");
    btn.style("background", "white");
    btn.style("color", "#111");
    btn.center();
    btn.mousePressed(onPress);
    // iOS sometimes prefers touchend over click.
    btn.elt.addEventListener("touchend", (e) => {
      e.preventDefault();
      onPress();
    });
    return btn;
  }

  function createDomButton(label, onPress) {
    const btn = document.createElement("button");
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
      (e) => {
        e.preventDefault();
        onPress();
      },
      { passive: false }
    );
    document.body.appendChild(btn);
    return btn;
  }

  /**
   * Ensures sensors are usable by requesting permissions where required.
   * On iOS Safari, permission must be requested from a user gesture, so this
   * will create a button when needed.
   *
   * @param {object} options
   * @param {(granted: boolean, result: any) => void} [options.onChange]
   * @param {string} [options.buttonText]
   * @param {boolean} [options.preferP5Button]
   * @returns {Promise<{granted: boolean, state: string, error?: any}>}
   */
  async function ensureSensorPermission(options) {
    const opts = options || {};
    const onChange = typeof opts.onChange === "function" ? opts.onChange : null;
    const buttonText = typeof opts.buttonText === "string" ? opts.buttonText : "Tap to enable sensors";
    const preferP5Button = opts.preferP5Button !== false; // default true

    let button = null;

    const tryRequest = async () => {
      const result = await requestSensorPermissionOnce();
      if (onChange) onChange(!!result.granted, result);
      if (result.granted) removeExistingButton(button);
      return result;
    };

    // Try immediately first (works on most platforms; on iOS it often rejects without a gesture).
    const first = await tryRequest();
    if (first.granted) return first;

    // If permission is required, show a button and retry on user gesture.
    if (!needsSensorPermission()) return first;

    const label = buttonText || defaultDeniedMessage(first);
    const useP5 = preferP5Button && typeof window.createButton === "function";
    button = useP5 ? createP5Button(label, tryRequest) : createDomButton(label, tryRequest);

    return first;
  }

  window.SensorPermissions = {
    needsSensorPermission,
    requestSensorPermissionOnce,
    ensureSensorPermission,
  };
})();

