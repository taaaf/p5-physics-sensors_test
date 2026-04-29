class Obstacle {
  constructor(x, y, width, height, angle = 0) {
    this.body = Matter.Bodies.rectangle(x, y, width, height, { isStatic: true });
    this.width = width;
    this.height = height;

    // keep a back-reference from Matter body to this wrapper
    this.body._ref = this;
    this.type = 'obstacle';

    Matter.Body.setAngle(this.body, angle);
  }

  draw() {
    const position = this.body.position;
    const angle = this.body.angle;

    push();
    translate(position.x, position.y);
    rotate(angle);
    rectMode(CENTER);
    noStroke();
    // usa una tonalità di blu per l'ostacolo per mantenere la palette coerente
    fill(30, 90, 200);
    rect(0, 0, this.width, this.height);
    pop();
  }
}