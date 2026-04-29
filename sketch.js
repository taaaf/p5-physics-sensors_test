let Engine = Matter.Engine,
  Body = Matter.Body,
  Bodies = Matter.Bodies,
  Composite = Matter.Composite;

let engine;
let brush;
let brushes = [];
let persistentLayer;
let lockedBrushCount = 0;
let permissionGranted = false;
let sensorButton;

const warmLockPalette = [
  [255, 0, 0], // rosso acceso
  [255, 0, 120], // rosa acceso
  [255, 120, 0], // arancio acceso
  [200, 255, 0], // lime
  [0, 200, 0], // verde acceso
  [0, 200, 200], // ciano
  [120, 0, 255], // viola acceso
  [255, 0, 255], // magenta
];

let NUM_BRUSHES = 20;

function requestAccess() {
  let permissionRequests = [];

  if (
    typeof DeviceOrientationEvent !== "undefined" &&
    typeof DeviceOrientationEvent.requestPermission === "function"
  ) {
    permissionRequests.push(DeviceOrientationEvent.requestPermission());
  }

  if (
    typeof DeviceMotionEvent !== "undefined" &&
    typeof DeviceMotionEvent.requestPermission === "function"
  ) {
    permissionRequests.push(DeviceMotionEvent.requestPermission());
  }

  Promise.all(permissionRequests)
    .then((responses) => {
      permissionGranted = responses.every((response) => response === "granted");
      if (permissionGranted && sensorButton) {
        sensorButton.remove();
        sensorButton = null;
      }
    })
    .catch(console.error);
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  document.body.style.touchAction = "none";
  engine = Engine.create();
  persistentLayer = createGraphics(windowWidth, windowHeight);
  persistentLayer.clear();

  function getLockedBrushColor() {
    let paletteIndex = min(lockedBrushCount, warmLockPalette.length - 1);
    let rgb = warmLockPalette[paletteIndex];
    return color(rgb[0], rgb[1], rgb[2]);
  }

  function swapBrushShapes(firstBody, secondBody) {
    let firstShape = firstBody._ref.shape;
    let secondShape = secondBody._ref.shape;
    firstBody._ref.setShape(secondShape);
    secondBody._ref.setShape(firstShape);
  }

  function swapBrushColors(firstBody, secondBody) {
    let firstIndex = firstBody._ref.getPaletteIndex();
    let secondIndex = secondBody._ref.getPaletteIndex();
    firstBody._ref.setPaletteIndex(secondIndex);
    secondBody._ref.setPaletteIndex(firstIndex);
  }

  // central collision handler: quando due corpi collidono, il corpo più grande diventa un rombo
  Matter.Events.on(engine, "collisionStart", (event) => {
    let pairs = event.pairs;
    for (let pair of pairs) {
      let a = pair.bodyA;
      let b = pair.bodyB;

      function area(body) {
        if (body.circleRadius) return Math.PI * body.circleRadius * body.circleRadius;
        if (body._ref && body._ref.width && body._ref.height) return body._ref.width * body._ref.height;
        let w = body.bounds.max.x - body.bounds.min.x;
        let h = body.bounds.max.y - body.bounds.min.y;
        return w * h;
      }

      let areaA = area(a);
      let areaB = area(b);
      let larger = areaA >= areaB ? a : b;
      // Regole di collisione tra pennelli non bloccati
      if (a._ref && b._ref && a._ref.type === "brush" && b._ref.type === "brush" && !a._ref.locked && !b._ref.locked) {
        let shapeA = a._ref.shape;
        let shapeB = b._ref.shape;

        // rettangoli <-> cerchi: scambio di forma
        if ((shapeA === "rect" && shapeB === "circle") || (shapeA === "circle" && shapeB === "rect")) {
          swapBrushShapes(a, b);
          continue;
        }

        // quadrati <-> triangoli: scambio di forma
        if ((shapeA === "square" && shapeB === "triangle") || (shapeA === "triangle" && shapeB === "square")) {
          swapBrushShapes(a, b);
          continue;
        }

        // quadrati <-> cerchi: scambio di colore
        if ((shapeA === "square" && shapeB === "circle") || (shapeA === "circle" && shapeB === "square")) {
          swapBrushColors(a, b);
          continue;
        }

        // triangoli <-> rettangoli: scambio di colore
        if ((shapeA === "triangle" && shapeB === "rect") || (shapeA === "rect" && shapeB === "triangle")) {
          swapBrushColors(a, b);
          continue;
        }
      }

      // Se un corpo in movimento colpisce un corpo bloccato, eredita il colore del blocco
      if (a._ref && b._ref) {
        let aLocked = !!a._ref.locked;
        let bLocked = !!b._ref.locked;

        if (aLocked !== bLocked) {
          let movingBody = aLocked ? b : a;
          let lockedBody = aLocked ? a : b;

          if (movingBody._ref && movingBody._ref.type === "brush") {
            movingBody._ref.setColor(lockedBody._ref.color);
          }
        }
      }
    }
  });

  // crea pennelli: metà saranno "lente" impostando frictionAir maggiore
  const slowCount = Math.floor(NUM_BRUSHES / 2);
  for (let i = 0; i < NUM_BRUSHES; i++) {
    let size = random(14, 36);
    brush = new Brush(width / 2, height / 4, size); //creati i pennelli in alto al centro

    if (i < 5) {
      brush.setShape("circle");
    } else if (i < 10) {
      brush.setShape("rect");
    } else if (i < 15) {
      brush.setShape("triangle");
    } else {
      brush.setShape("square");
    }

    brushes.push(brush); //aggiunti i pennelli all'array
    Composite.add(engine.world, brush.body); //aggiunti i pennelli al mondo di Matter.js

    if (i < slowCount) {
      // pennelli lenti
      brush.body.frictionAir = 0.05;
      brush.slow = true;
    } else {
      // pennelli normali
      brush.body.frictionAir = 0.009;
      brush.slow = false;
    }
  }

  // crea muri statici ai bordi per far rimbalzare i pennelli
  const wallThickness = 50;
  const walls = [
    Bodies.rectangle(width / 2, -wallThickness / 2, width, wallThickness, { isStatic: true, restitution: 1 }),
    Bodies.rectangle(width / 2, height + wallThickness / 2, width, wallThickness, { isStatic: true, restitution: 1 }),
    Bodies.rectangle(-wallThickness / 2, height / 2, wallThickness, height, { isStatic: true, restitution: 1 }),
    Bodies.rectangle(width + wallThickness / 2, height / 2, wallThickness, height, { isStatic: true, restitution: 1 }),
  ];
  Composite.add(engine.world, walls);

  function lockBrushAtPoint(x, y) {
    let mousePoint = { x: x, y: y };
    // cerca corpi sotto il punto
    let bodies = Composite.allBodies(engine.world);
    let found = Matter.Query.point(bodies, mousePoint);
    if (found.length > 0) {
      for (let b of found) {
        if (b._ref && b._ref.type === "brush" && !b._ref.locked) {
          let lockedColor = getLockedBrushColor();

          b._ref.setColor(lockedColor);

          // rendi il corpo statico e marcato come locked
          Body.setStatic(b, true);
          b._ref.locked = true;
          b._ref.type = "obstacle";
          b._ref.lockedColor = lockedColor;
          lockedBrushCount++;

          // disegna permanentemente la forma corrente sul layer persistente
          persistentLayer.push();
          persistentLayer.noStroke();
          let c = lockedColor;
          persistentLayer.fill(red(c), green(c), blue(c));
          let pos = b.position;
          let shape = b._ref.shape;
          persistentLayer.translate(pos.x, pos.y);
          persistentLayer.rotate(b.angle);
          if (shape === "rect") {
            persistentLayer.rectMode(CENTER);
            persistentLayer.rect(0, 0, b._ref.radius * 2, b._ref.radius * 1.2);
          } else if (shape === "triangle") {
            persistentLayer.beginShape();
            persistentLayer.vertex(-b._ref.radius, b._ref.radius);
            persistentLayer.vertex(b._ref.radius, b._ref.radius);
            persistentLayer.vertex(0, -b._ref.radius);
            persistentLayer.endShape(CLOSE);
          } else if (shape === "square") {
            persistentLayer.rectMode(CENTER);
            persistentLayer.rect(0, 0, b._ref.radius * 2, b._ref.radius * 2);
          } else {
            persistentLayer.circle(0, 0, b._ref.radius * 2);
          }
          persistentLayer.pop();

          break;
        }
      }
    }
  }

  // mouse e touch fanno la stessa cosa
  window.mousePressed = function () {
    lockBrushAtPoint(mouseX, mouseY);
  };

  window.touchStarted = function () {
    lockBrushAtPoint(mouseX, mouseY);
    return false;
  };

  if (
    typeof DeviceOrientationEvent !== "undefined" &&
    typeof DeviceOrientationEvent.requestPermission === "function"
  ) {
    DeviceOrientationEvent.requestPermission()
      .catch(() => {
        sensorButton = createButton("click to allow access to sensors");
        sensorButton.style("font-size", "24px");
        sensorButton.center();
        sensorButton.mousePressed(requestAccess);
      })
      .then((permissionState) => {
        if (permissionState === "granted") {
          permissionGranted = true;
        }
      });
  } else {
    permissionGranted = true;
  }
}

function draw() {
  // disegno un overlay trasparente per far svanire gradualmente le scie
  noStroke();
  fill(255, 255, 255, 40);
  rectMode(CORNER);
  rect(0, 0, width, height);

  // disegna le forme permanenti bloccate
  image(persistentLayer, 0, 0);

  for (let i = 0; i < brushes.length; i++) {
    brushes[i].draw();
  }

  if (!permissionGranted) {
    Engine.update(engine);
    return;
  }

  console.log(rotationX, rotationY, rotationZ);

  let gravityY = map(rotationX, PI, -PI, 2, -2);
  engine.world.gravity.y = gravityY;

  let gravityX = map(rotationY, -PI, PI, -2, 2);
  engine.world.gravity.x = gravityX;

  Engine.update(engine);
}
