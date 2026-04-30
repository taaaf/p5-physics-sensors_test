# `sensor-permissions.js` (drop-in)

Drop this file into any project to handle **motion/orientation sensor permissions**, especially **iOS Safari** (which requires a user gesture/tap).

## Install (copy/paste)

### 1) Copy the file

Copy `sensor-permissions.js` into your project (any folder is fine).

### 2) Include it BEFORE your app code

```html
<script src="sensor-permissions.js"></script>
<script src="your-app.js"></script>
```

## p5.js (plug-and-play)

### Add this in `setup()`

```js
SensorPermissions.ensureSensorPermissionP5({
  buttonText: "Tap to allow access to sensors",
});
```

### Add this guard in `draw()` (before using sensors)

```js
if (!SensorPermissions.state.granted) {
  SensorPermissions.renderStatusP5(); // optional status text
  return;
}

// Now it's safe to use rotationX / rotationY / rotationZ (and similar)
```

### Variables you need to add to your sketch

None.

Read permission state via:

- `SensorPermissions.state.granted` (boolean)
- `SensorPermissions.state.status` (string)

## Plain JS (no p5)

Call this once on startup:

```js
SensorPermissions.ensureSensorPermission({
  buttonText: "Tap to enable sensors",
});
```

On iOS, it will create a DOM button if needed and retry on tap.

## API

- `SensorPermissions.state` → `{ granted, status, lastResult }`
- `SensorPermissions.needsSensorPermission()` → `boolean`
- `SensorPermissions.requestSensorPermissionOnce()` → `Promise<{ granted, state, error? }>`
- `SensorPermissions.ensureSensorPermission(options)` → `Promise<{ granted, state, error? }>`
- `SensorPermissions.ensureSensorPermissionP5(options)` → p5 wrapper (updates `state`)
- `SensorPermissions.renderStatusP5(options)` → optional p5 status drawing

## Gotchas

- On iOS Safari, permission only works after a **tap** (user gesture).
