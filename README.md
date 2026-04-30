# `sensor-permissions.js` — plug-and-play (Copilot-friendly)

Goal: drop **one JS file**, add **two script tags in the right order**, and optionally paste a **tiny `draw()` branch** — no sensor-permission boilerplate inside `setup()`.

## Files

Copy into your repo (same folder works):

- **`sensor-permissions.js`** — this readme’s companion script.

## Include in HTML (**order matters for p5 global mode**)

1. Leave your usual libs + sketch scripts as they are **except**:
2. Add **`sensor-permissions.js` immediately after your sketch** so `window.setup` already exists when the helper runs. p5 still starts later, so the wrapper is in place before `setup()` is called.

```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/p5.js/1.11.8/p5.min.js"></script>
<script src="sketch.js"></script>
<script src="sensor-permissions.js"></script>
```

**Do not load `sensor-permissions.js` *before* the script that defines `setup`** — otherwise there is nothing to wrap.

## Sketch: what you actually need (**no duplicate variables**)

Permission state lives on **`SensorPermissions`** — **you do not** need `permissionGranted`, `sensorStatus`, or anything in **`setup()`** for the default p5-global flow.

Paste this pattern wherever you gate sensor logic (e.g. **`draw()`**):

```javascript
if (!SensorPermissions.granted) {
  const msg = SensorPermissions.statusMessage;
  if (msg) {
    fill(40);
    textAlign(CENTER, CENTER);
    textSize(18);
    text(msg, width / 2, height / 2 + 50);
  }
  return;
}

// Sensor usage (example)
// accelerationX … or rotationX / rotationY …
```

- **`SensorPermissions.granted`** — `true` once motion/orientation is allowed (or not required on desktop/Android).
- **`SensorPermissions.statusMessage`** — short string for overlays while waiting or after denial/error; empty when granted.

Nothing else is **required** in the sketch for permissions.

## What runs automatically (**default**)

By default (`SENSOR_PERMISSIONS_AUTO_BOOTSTRAP` **not** set to `false`):

The script wraps **`setup()`** once, then after **your** `setup()` body finishes it starts permission flow (shows the tap button on iOS when needed). You **do not** call `ensureSensorPermission` in `setup()` for this path.

### Optional globals (defaults are fine)

Set **before** `sensor-permissions.js` loads (e.g. in HTML right above the `<script src="sensor-permissions.js">` tag):

```html
<script>
  window.SENSOR_PERMISSIONS_OPTIONS = {
    buttonText: "Tap to allow access to sensors",
    preferP5Button: true,
  };
</script>
<script src="sensor-permissions.js"></script>
```

- **`preferP5Button`** — try `createButton()` when p5 exists; falls back to a DOM button if not.

Disable auto-bootstrap (p5 instance mode, or manual control):

```html
<script>
  window.SENSOR_PERMISSIONS_AUTO_BOOTSTRAP = false;
</script>
<script src="sensor-permissions.js"></script>
```

Then in **`setup()`** (once):

```javascript
SensorPermissions.ensureSensorPermission();
```

## Manual / advanced API

- **`SensorPermissions.needsSensorPermission()`** → `boolean`
- **`SensorPermissions.requestSensorPermissionOnce()`** → `Promise<{ granted, state, error? }>` (also refreshes **`granted` / `statusMessage`**)
- **`SensorPermissions.ensureSensorPermission(options?)`** — same as before: runs the full “try + button on iOS” flow; safe to call once; repeated calls return a snapshot (flow is not started twice).
- **`SensorPermissions.lastResult`** — last permission result object (debugging).
- **`SensorPermissions.bootstrapAfterUserSetup()`** — used internally after `setup()`; you normally do not call it.

## Notes

- On **iOS Safari**, permission must be triggered from a **user tap**; the script shows a button when needed.
- Serve over **HTTPS** for reliable device sensors on phones.
