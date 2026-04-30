# `sensor-permissions.js`

Reusable helper to request **motion/orientation sensor permissions** in browsers.

On **iOS Safari**, motion/orientation access is blocked until you request permission from a **user gesture** (tap). This helper handles that by optionally showing a tap button and retrying the request.

## How to include it (script tag)

Load `sensor-permissions.js` before the script that uses sensors:

```html
<script src="sensor-permissions.js"></script>
<script src="your-sketch-or-app.js"></script>
```

## What you must do vs what is optional

- **Required for iOS Safari**: call `SensorPermissions.ensureSensorPermission(...)` **once** when your app starts (e.g. p5 `setup()`, or `DOMContentLoaded`). Do **not** put this in `draw()` or any per-frame loop — it will spam requests and can behave badly.
- **Optional**: any variables you use to remember permission and show messages. A common p5 pattern is two globals plus a short branch in `draw()` if you read `rotationX` / `rotationY` only after permission is granted.

## Minimal example (no extra state)

If you do not need to block any code until permission is ready:

```js
SensorPermissions.ensureSensorPermission({
  buttonText: "Tap to allow access to sensors",
  preferP5Button: true,
});
```

## Recommended p5 example (state + one call in `setup()`)

**1. At the top of your sketch** (or wherever you keep globals):

```js
let permissionGranted = false;
let sensorStatus = "";
```

**2. Inside `setup()`** — call **once** (same idea as the end of your `setup()`, not inside `draw()`):

```js
SensorPermissions.ensureSensorPermission({
  buttonText: "Tap to allow access to sensors",
  preferP5Button: true,
  onChange: (granted, result) => {
    permissionGranted = granted;
    if (granted) {
      sensorStatus = "";
      return;
    }
    if (result && result.state === "denied") {
      sensorStatus = "Sensor access denied in Safari";
    } else if (result && result.state === "error") {
      sensorStatus = "Tap to allow sensor access";
    } else {
      sensorStatus = "Sensor permission needed";
    }
  },
});
```

**3. In `draw()`** (optional but useful): skip device-tilt logic until `permissionGranted` is true, and optionally show `sensorStatus`:

```js
if (!permissionGranted) {
  if (sensorStatus) {
    fill(40);
    textAlign(CENTER, CENTER);
    textSize(18);
    text(sensorStatus, width / 2, height / 2 + 50);
  }
  return; // or continue without using rotationX / rotationY
}

// use rotationX, rotationY, etc. only after permission is granted
```

If you still want physics or other drawing while waiting for permission (like Matter.js stepping every frame), **do not** `return` from all of `draw()` — only skip the blocks that read device rotation until `permissionGranted` is true.

## What it does

- **Non‑iOS browsers**: permission APIs don’t exist, so it immediately reports `granted: true`.
- **iOS Safari**:
  - it tries once (may fail without a user gesture),
  - then it shows a button,
  - on tap it retries and removes the button once granted.

## API (quick)

- `SensorPermissions.needsSensorPermission()` → `boolean`
- `SensorPermissions.requestSensorPermissionOnce()` → `Promise<{ granted, state, error? }>`
- `SensorPermissions.ensureSensorPermission(options)` → `Promise<{ granted, state, error? }>`
  - `options.buttonText` (string)
  - `options.preferP5Button` (boolean, default `true`)
  - `options.onChange(granted, result)` (callback)

## Notes

- **HTTPS** (or `localhost`) improves mobile sensor reliability; avoid `file://` when testing.
- On iOS, permissions only work after a **tap**; calling in `draw()` won’t help.
