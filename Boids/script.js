let boids = [];
let mousePressed = false;
let mouseX;
let mouseY;

let canvasWidth;
let canvasHeight; 

//Settings
let maxSpeed = 15;
let minSpeed = 3;
let margin = 200;

let visibility = 50;
let protectedRange = 10;
let avoidfactor = 0.05;
let centeringFactor = 0.005;
let matchingFactor = 0.05;

let quadtreeVisibility = false;
let viewfieldVisibility = false;
let protectedRangeVisibility = false;

const numberOfBoidsAtStart = 100;



//---------Input--------------
function changeVisibility (){
    visibility = document.getElementById("visibility").value
}

function changeProtectedRange (){
    protectedRange = document.getElementById("protectedRange").value
}

function changeAvoidfactor (){
    avoidfactor = document.getElementById("avoidfactor").value / 1000
}

function changeCenteringFactor (){
    centeringFactor = document.getElementById("centeringFactor").value / 10000
}

function changeMatchingFactor (){
    matchingFactor = document.getElementById("matchingFactor").value / 1000
}

function toggleQuadtreeVisibility (){
    quadtreeVisibility = document.getElementById("quadtreeVisibility").checked 
}

function toggleViewfieldVisibility (){
    viewfieldVisibility = document.getElementById("viewfieldVisibility").checked 
}

function toggleProtectedRangeVisibility (){
    protectedRangeVisibility = document.getElementById("protectedRangeVisibility").checked 
}

function spawnOneHundredBoids (){
    for(let i = 0; i <= 99; i++){
        boids.push(new createBoid())
    }
}

//-------Classes------------
class Quadtree {
    constructor(boundary, n) {
      this.boundary = boundary;
      this.capacity = n;
      this.points = [];
      this.divided = false;
    }
    
    subdivide() {
      const { x, y, w, h } = this.boundary,
        halfWidth = w/2,
        halfHeight = h/2;
      let neBoundary = new Rectangle(x + halfWidth, y, halfWidth, halfHeight);
      this.northeast = new Quadtree(neBoundary, this.capacity)
      let seBoundary = new Rectangle(x + halfWidth, y + halfHeight, halfWidth, halfHeight);
      this.southeast = new Quadtree(seBoundary, this.capacity);
      let swBoundary = new Rectangle(x, y + halfHeight, halfWidth, halfHeight)
      this.southwest = new Quadtree(swBoundary, this.capacity)
      let nwBoundary = new Rectangle(x, y, halfWidth, halfHeight)
      this.northwest = new Quadtree(nwBoundary, this.capacity)
      
      this.divided = true;
    }
    
    insertBoid(boid) {
      if (!this.boundary.contains(boid)) {
          return false;
      }
  
      if (this.divided) {
          if (this.northeast.insertBoid(boid)) return true;
          if (this.northwest.insertBoid(boid)) return true;
          if (this.southeast.insertBoid(boid)) return true;
          if (this.southwest.insertBoid(boid)) return true;
      } else {
          this.points.push(boid);
          if (this.points.length > this.capacity) {
              this.subdivide();
              for (let i = this.points.length - 1; i >= 0; i--) {
                  const b = this.points[i];
                  if (this.northeast.insertBoid(b)) this.points.splice(i, 1);
                  else if (this.northwest.insertBoid(b)) this.points.splice(i, 1);
                  else if (this.southeast.insertBoid(b)) this.points.splice(i, 1);
                  else if (this.southwest.insertBoid(b)) this.points.splice(i, 1);
              }
          }
      }
      return true;
    }


    queryRange(boid) {
        let circle = new Circle(boid.x, boid.y, visibility)
        let neighbors = [];

        if (!this.boundary.containsCircle(circle)) {
            return neighbors;
        }

        if (this.divided) {
            neighbors.push(...this.northwest.queryRange(boid));
            neighbors.push(...this.northeast.queryRange(boid));
            neighbors.push(...this.southwest.queryRange(boid));
            neighbors.push(...this.southeast.queryRange(boid));
        }
    
        for (let boid of this.points) {
            if (circle.contains(boid)) {
                neighbors.push(boid);
            }
        }
    
        return neighbors;
    }
    
    

  draw() {
    if (this.divided) {
        this.northeast.draw();
        this.southeast.draw();
        this.southwest.draw();
        this.northwest.draw();
    } else {
        ctx = myGameArea.context;
        ctx.strokeStyle = 'green';
        ctx.lineWidth = 1 ; 
        ctx.strokeRect(this.boundary.x, this.boundary.y, this.boundary.w, this.boundary.h);
    }
  }
  }


class Rectangle {
    constructor(x, y, w, h) {
      this.x = x;
      this.y = y;
      this.w = w;
      this.h = h;
    }
  
    contains(point) {
      return (
        point.x >= this.x &&
        point.x <= this.x + this.w &&
        point.y >= this.y &&
        point.y <= this.y + this.h
      );
    }
    
    containsCircle(circle) {
        var circleDistanceX = Math.abs(circle.x - this.x - this.w / 2);
        var circleDistanceY = Math.abs(circle.y - this.y - this.h / 2);

        if (circleDistanceX > (this.w / 2 + circle.r)) { return false; }
        if (circleDistanceY > (this.h / 2 + circle.r)) { return false; }

        if (circleDistanceX <= (this.w / 2)) { return true; } 
        if (circleDistanceY <= (this.h / 2)) { return true; }

        var cornerDistanceSquared = Math.pow(circleDistanceX - this.w / 2, 2) +
                                     Math.pow(circleDistanceY - this.h / 2, 2);

        return cornerDistanceSquared <= Math.pow(circle.r, 2);
    }
  }


class Circle {
    constructor(x, y, r, anchor) {
      this.x = x;
      this.y = y;
      this.r = r;
      this.anchor = anchor;
    }
    
    contains(boid) {
      if (boid === this.anchor)
        return false
      const dist = Math.sqrt(((boid.x - this.x)**2) + Math.abs((boid.y - this.y)**2));
      return (dist < this.r)
    }
  
    intersects(other) {
      return !(
        (this.x + this.r < other.x) || (this.x - this.r > other.x + other.w) ||
        (this.y + this.r < other.y) || (this.y - this.r > other.y + other.h)
      )
    }
    
    draw(color) {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2, false);
      ctx.closePath();
      ctx.strokeStyle = color || 'blue';
      ctx.lineDashOffset = 4;
      ctx.setLineDash([10,20])
      ctx.stroke();
      ctx.setLineDash([0])
    }
  }
//------------------------------------







function startGame() {
    myGameArea.start();
    let quadtree = new Quadtree(new Rectangle(0, 0, canvasWidth, canvasHeight), 10)
    for(let i = 0; i <= numberOfBoidsAtStart; i++){
        boids.push(new createBoid())
    }
}

//create canvas and eventlistener
let myGameArea = {
  canvas: document.createElement("canvas"),
  context: null,
  start: function () {
    fitCanvas()
    this.context = this.canvas.getContext("2d");
    document.body.insertBefore(this.canvas, document.body.childNodes[0]);
    this.interval = setInterval(updateGameArea, 20);
    this.canvas.addEventListener('mousedown', function () { mousePressed = true; }); // Add mousedown event listener
    this.canvas.addEventListener('mouseup', function () { mousePressed = false; }); // Add mouseup event listener
    this.canvas.addEventListener('mousemove', updateMousePosition);
    window.addEventListener('resize', fitCanvas)
  },
  clear: function () {
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }
}

//change canvas size based on browser size
function fitCanvas() {
    myGameArea.canvas.width = window.innerWidth -500;
    myGameArea.canvas.height = window.innerHeight ;
    canvasHeight = window.innerHeight ;
    canvasWidth = window.innerWidth -500;
}

function addBoidOnClick() {
    boids.push(new createBoid(mouseX, mouseY));
}

function updateMousePosition(event) {
    const rect = myGameArea.canvas.getBoundingClientRect();
    mouseX = event.clientX - rect.left;
    mouseY = event.clientY - rect.top;
}

function createBoid(x = Math.floor(Math.random() * canvasWidth), y = Math.floor(Math.random() * canvasHeight), vx = Math.random() * (maxSpeed-2) - maxSpeed / 2, vy = Math.random() * (maxSpeed-2) - maxSpeed / 2, color = "grey") {
    this.size = 5; // Size of the triangle
    this.x = x;
    this.vx = vx;
    this.y = y;
    this.vy = vy;
    this.rotation = Math.atan2(vy, vx) + 3/2*Math.PI; 
    document.getElementById("numberOfBoids").innerHTML = boids.length;
    this.update = function(){
        this.rotation = Math.atan2(this.vy, this.vx) + 3/2*Math.PI; 
        ctx = myGameArea.context;
        ctx.save(); 
        ctx.translate(this.x + this.size / 2, this.y + this.size / 2); 
        ctx.rotate(this.rotation); 
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(-this.size / 2, -this.size / 2); 
        ctx.lineTo(this.size / 2, -this.size / 2); 
        ctx.lineTo(0, this.size / 2 + 5); // 10 is height of triangle
        ctx.closePath(); 
        ctx.fill(); 
        ctx.restore(); 
        ctx.translate(0, 0); 
        if(viewfieldVisibility){
            ctx.lineWidth = 0.5;
            ctx.strokeStyle = "orange"
            ctx.beginPath();
            ctx.arc(this.x, this.y, visibility, 0, 2 * Math.PI);
            ctx.stroke();       
        }
        if(protectedRangeVisibility){
            ctx.lineWidth = 0.5;
            ctx.strokeStyle = "blue"
            ctx.beginPath();
            ctx.arc(this.x, this.y, protectedRange, 0, 2 * Math.PI);
            ctx.stroke();       
        }
    }   
}


function collisionDetection() {
    quadtree = new Quadtree(new Rectangle(0, 0, canvasWidth, canvasHeight), 10)
    for (let boid of boids) {
        quadtree.insertBoid(boid);
    }

    boids.forEach((boid) => {

        let xpos_avg = 0, ypos_avg = 0, xvel_avg = 0, yvel_avg = 0, neighboring_boids = 0, close_dx = 0, close_dy = 0;
        
        //get boids in visible quadrants
        let neighbors = quadtree.queryRange(boid);

        neighbors.forEach((otherBoid) => {
            
            //distance x/y to neighbor
            let dx = boid.x - otherBoid.x;
            let dy = boid.y - otherBoid.y;

            //check if boid is visible (not accurate but cheap computation)
            if (Math.abs(dx) < visibility && Math.abs(dy) < visibility) {
                //get exact distance
                const distance = Math.sqrt(Math.pow(boid.x - otherBoid.x, 2) + Math.pow(boid.y - otherBoid.y, 2));
                
                if (distance < protectedRange) {
                    //Seperation
                    close_dx += boid.x - otherBoid.x;
                    close_dy += boid.y - otherBoid.y;
                } else if (distance < visibility) {
                    //alignment + cohesion
                    xpos_avg += otherBoid.x;
                    ypos_avg += otherBoid.y;
                    xvel_avg += otherBoid.vx;
                    yvel_avg += otherBoid.vy;
                    neighboring_boids += 1;
                }
            }
        });
        

        if (neighboring_boids > 0) {
            //average 
            xpos_avg /= neighboring_boids;
            ypos_avg /= neighboring_boids;
            xvel_avg /= neighboring_boids;
            yvel_avg /= neighboring_boids;

            //add alignment + cohesion factor
            boid.vx += (xpos_avg - boid.x) * centeringFactor + (xvel_avg - boid.vx) * matchingFactor;
            boid.vy += (ypos_avg - boid.y) * centeringFactor + (yvel_avg - boid.vy) * matchingFactor;
        }

        //add seperation factor
        boid.vx += close_dx * avoidfactor;
        boid.vy += close_dy * avoidfactor;

        // Steer away from edges
        if (boid.x < margin) {
            boid.vx = Math.min(boid.vx + 0.2, maxSpeed);
        } else if (boid.x > canvasWidth - margin) {
            boid.vx = Math.max(boid.vx - 0.2, -maxSpeed);
        } 
        if (boid.y < margin) {
            boid.vy = Math.min(boid.vy + 0.2, maxSpeed);
        } else if (boid.y > canvasHeight - margin) {
            boid.vy = Math.max(boid.vy - 0.2, -maxSpeed);
        } 

        // Adjust speed to min/max speed
        const speed = Math.sqrt(Math.pow(boid.vx, 2) + Math.pow(boid.vy, 2));
        if (speed > maxSpeed) {
            boid.vx = (boid.vx / speed) * maxSpeed;
            boid.vy = (boid.vy / speed) * maxSpeed;
        }
        if (speed < minSpeed) {
            boid.vx = (boid.vx / speed) * minSpeed;
            boid.vy = (boid.vy / speed) * minSpeed;
        }
    });
}






//Game Loop
function updateGameArea() {
    myGameArea.clear();

    collisionDetection()
    
    if(mousePressed){
        addBoidOnClick()
    }

    boids.map((boid) => {
        boid.x += boid.vx;
        boid.y += boid.vy;
        boid.update(); 
    });
    
    if(quadtreeVisibility){
        quadtree.draw()
    }
    console.log(centeringFactor)
}