# `sensor-permissions.js`

Reusable helper to request **motion/orientation sensor permissions** in browsers.

On **iOS Safari**, motion/orientation access is blocked until you request permission from a **user gesture** (tap). This helper handles that by optionally showing a tap button and retrying the request.

## How to include it (script tag)

Load `sensor-permissions.js` before the script that uses sensors:

```html
<script src="sensor-permissions.js"></script>
<script src="your-sketch-or-app.js"></script>
```

## How to use it (recommended)

Call `SensorPermissions.ensureSensorPermission(...)` once from a place that runs on startup (e.g. `setup()` in p5):

```js
SensorPermissions.ensureSensorPermission({
  buttonText: "Tap to allow access to sensors",
  preferP5Button: true,
  onChange: (granted, result) => {
    permissionGranted = granted;
    sensorStatus = granted ? "" : "Sensor permission needed";
  },
});
```

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

- On iOS, permissions only work after a **tap**; calling in `draw()` won’t help.
