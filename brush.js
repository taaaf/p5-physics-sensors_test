class Brush {
  constructor(x, y, radius) {
    this.body = Matter.Bodies.circle(x, y, radius);
    this.radius = radius;
    this.body.restitution = 1.5; // Aggiungi un po' di rimbalzo
    // Palette fissa di blu (da più scuro a più chiaro)
    this.palette = [
      color(10, 25, 74),   // Blu notte
      color(0, 51, 153),   // Blu intenso
      color(0, 102, 204),  // Blu medio
      color(51, 153, 255), // Blu brillante
      color(153, 204, 255) // Azzurro chiaro
    ];

    // scegli un colore iniziale dalla palette (indice casuale)
    this.paletteIndex = floor(random(0, this.palette.length));
    this.color = this.palette[this.paletteIndex];

    // keep a back-reference from Matter body to this wrapper
    this.body._ref = this;
    this.type = 'brush';
    // shape cycling: 0=circle,1=rect,2=triangle,3=square
    this.shapeIndex = 0;
    this.shapes = ['circle','rect','triangle','square'];
    this.shape = this.shapes[this.shapeIndex];
  }

  setPaletteIndex(i) {
    this.paletteIndex = ((i % this.palette.length) + this.palette.length) % this.palette.length;
    this.color = this.palette[this.paletteIndex];
  }

  setColor(newColor) {
    this.color = newColor;
  }

  setColor(newColor) {
    this.color = newColor;
  }

  getPaletteIndex() {
    return this.paletteIndex;
  }


  draw() {
    const position = this.body.position;

    this.keepInBounds();
    noStroke();
    fill(this.color);
    if (this.shape === 'rect') {
      push();
      translate(position.x, position.y);
      rotate(this.body.angle);
      rectMode(CENTER);
      rect(0, 0, this.radius * 2, this.radius * 1.2);
      pop();
    } else if (this.shape === 'triangle') {
      push();
      translate(position.x, position.y);
      rotate(this.body.angle);
      beginShape();
      vertex(-this.radius, this.radius);
      vertex(this.radius, this.radius);
      vertex(0, -this.radius);
      endShape(CLOSE);
      pop();
    } else if (this.shape === 'square') {
      push();
      translate(position.x, position.y);
      rotate(this.body.angle);
      rectMode(CENTER);
      rect(0, 0, this.radius * 2, this.radius * 2);
      pop();
    } else {
      circle(position.x, position.y, this.radius * 2);
    }
  }

  onCollision() {
    // Gestito centralmente in sketch.js; lasciare vuoto per evitare conflitti
  }

  nextShape() {
    this.shapeIndex = (this.shapeIndex + 1) % this.shapes.length;
    this.shape = this.shapes[this.shapeIndex];
  }

  setShape(shapeName) {
    if (this.shapes.includes(shapeName)) {
      this.shape = shapeName;
      this.shapeIndex = this.shapes.indexOf(shapeName);
    }
  }

  keepInBounds() {
    let pos = this.body.position;
    let r = this.body.circleRadius;

    if (pos.x > width - r) {
        Body.setPosition (this.body, { x: width - r, y: pos.y });
        Body.setVelocity (this.body, { x: 0, y: this.body.velocity.y });
    }

    if (pos.x < r) {
        Body.setPosition (this.body, { x: r, y: pos.y });
        Body.setVelocity (this.body, { x: 0, y: this.body.velocity.y });
        }

    if (pos.y > height -r) {
        Body.setPosition (this.body, { x: pos.x, y: height - r });
        Body.setVelocity (this.body, { x: this.body.velocity.x, y: 0 });
    }   

    if (pos.y < r) {
        Body.setPosition (this.body, { x: pos.x, y: r });
        Body.setVelocity (this.body, { x: this.body.velocity.x, y: 0 });
    }
    }
}