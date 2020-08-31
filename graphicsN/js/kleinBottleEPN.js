/***********
 * kleinBottleEN.js
 * Klein bottle cross-sections with balls
 * M. Laszlo
 * August 2020
 ***********/


import * as THREE from '../build/three.module.js';
import { OrbitControls } from './jsm/controls/OrbitControls.js';
import { MyUtils } from '../lib/utilities.js';
import * as dat from '../lib/dat.gui.module.js';


let camera, scene, renderer;
let cameraControls;
let clock = new THREE.Clock();

let subject = new MyUtils.Subject();

let heightSegments = 50; 
let nbrSegments = 200;
let ball;
let ballRadius = 0.5;
let mepsilon = 0.001;

let mats;
let klein = null;

function createScene() {
    ball = makeBall(ballRadius);
    ball.update = makeMoveBall();
    updateKlein();
    let light = new THREE.PointLight(0xFFFFFF, 0.5, 1000 );
    light.position.set(20, 20, 20);
    let light2 = new THREE.PointLight(0xFFFFFF, 0.5, 1000 );
    light2.position.set(20, -20, 20);
    let light3 = new THREE.PointLight(0xFFFFFF, 0.5, 1000 );
    light3.position.set(-20, 20, -20);
    let light4 = new THREE.PointLight(0xFFFFFF, 0.5, 1000 );
    light4.position.set(-20, -20, -20);
    let ambientLight = new THREE.AmbientLight(0x222222);
    scene.add(light);
    scene.add(light2); 
    scene.add(light3);
    scene.add(light4);
    scene.add(ambientLight);

    // let axes = new THREE.AxesHelper(10);
    // scene.add(axes);
}


function makeKleinBottleParametricSurface6(startAngle, section) {
    // Dickson bottle: See The Klein Bottle: Variations on a Theme' by Gregorio Franzoni
    // similar to makeKleinBottleParametricSurface3
    function f(u, v, res) {
        v = startAngle + v * section;
        let up = u * 2 * Math.PI; // around nonorientable loop
        let vp = v * 2 * Math.PI; // around orientable loop
        let cosu = Math.cos(up), sinu = Math.sin(up);
        let cosv = Math.cos(vp), sinv = Math.sin(vp);
        let a = 6, b = 4, c = 16;
        let ru = b * (1 - cosu / 2);
        let x, y, z;
        if (up < Math.PI) {
            x = a * cosu * (1 + sinu) + ru * cosu * cosv;
            y = c * sinu + ru * sinu * cosv;
        } else {
            x = a * cosu * (1 + sinu) + ru * Math.cos(vp + Math.PI);
            y = c * sinu;
        }
        z = ru * sinv;
        res.set(x, y, z);
    }
    return f;
}


function makeKleinBottleGeometry(radialSegs, heightSegs, startAngle=0, section=1) {
    let f = makeKleinBottleParametricSurface6(startAngle, section);
    return new THREE.ParametricGeometry(f, radialSegs, heightSegs);
}

function makeBall(radius=0.5) {
    let geom = new THREE.SphereGeometry(radius, 24, 24);
    let matArgs = {color: 0xff0000};
    let mat = new THREE.MeshPhongMaterial(matArgs);
    let ball = new THREE.Mesh(geom, mat);
    // ball properties for motion
    ball.userData.pps = 0.07;
    ball.userData.pos = new THREE.Vector2(0, 0.5);
    ball.userData.dir = new THREE.Vector2(1, 0);
    return ball;
}



let controls = new function() {
    this.color1 = '#008080';
    this.color2 = '#8A2BE2';
    this.opacity2 = 1;
    this.ball = false;
    this.v = 0.5;
}

function initGui() {
    let gui = new dat.GUI();
    gui.addColor(controls, 'color1').onChange(function (v) {mats[0].color = mats[1].color = new THREE.Color(v);});
    gui.addColor(controls, 'color2').onChange(function (v) {mats[2].color = mats[3].color = new THREE.Color(v);});
    gui.add(controls, 'opacity2', 0, 1).onChange(function (v) {mats[2].opacity = mats[3].opacity = v});
    gui.add(controls, 'ball').onChange(updateBall).listen();
    gui.add(controls, 'v', 0, 0.9).step(0.1).onChange(updateBall);
}


function updateBall() {
    let v = controls.v;
    let u = ball.userData.pos.x;
    ball.userData.pos.set(u, v);
    if (controls.ball) {
        subject.register(ball);
        scene.add(ball);
    } else {
        scene.remove(ball);
        subject.unregister(ball);
    }
}

let normalSign = 1;

function makeMoveOnParametricSurface(f, offset, eps=0.01, isKlein=true) {
    // f(u,v,p) defines parametric surface; sets p = f(u,v)
    // offset amount from surface along normal
    // Specialized for use with makeKleinBottleParametricSurface6.
    return function(delta) {
        let pps = this.userData.pps; // positions/sec
        let pos = this.userData.pos.clone(); // uv coordinates
        let dir = this.userData.dir.clone(); // unit direction of ball in uv coordinates
        dir.multiplyScalar(delta * pps);
        pos.add(dir);
        // torus wraparound
        if (pos.y >= 1) {
            pos.y = pos.y - 1;
        } 
        if (pos.x >= 1) {
            pos.x = pos.x - 1;
            if (isKlein) {
                // Stitch at u=0
                // Require v such that cos(vp + pi) = cosvp' and sinvp == sinvp'
                // where vp = 2pi*v
                pos.y = 0.5 - pos.y;
                if (pos.y <= 0) pos.y += 1;
                normalSign *= -1;
            }
        } 

        let p = new THREE.Vector3(),
            px = new THREE.Vector3(),
            py = new THREE.Vector3();
        f(pos.x, pos.y, p); // p is current point on surface
        let posx = Math.min(1, pos.x + eps);
        f(posx, pos.y, px);
        px.sub(p); 
        let posy = Math.min(1, pos.y + eps);
        f(pos.x, posy, py);
        py.sub(p);
        let normal = new THREE.Vector3().crossVectors(px, py);
        normal.normalize();
        normal.multiplyScalar(normalSign * offset);
        // save current position (u,v)
        this.userData.pos.set(pos.x, pos.y);
        // update position above surface
        p.add(normal);
        this.position.set(p.x, p.y, p.z);
    }
}


function makeMoveBall() {
    let startAngle = 0, section = 1;
    let parametricSurfaceFunction = makeKleinBottleParametricSurface6(startAngle, section);
    return makeMoveOnParametricSurface(parametricSurfaceFunction, ballRadius, mepsilon, true);
}




function updateKlein() {
    let color1 = new THREE.Color(controls.color1);
    let color2 = new THREE.Color(controls.color2);
    if (klein)
        scene.remove(klein);
    klein = new THREE.Object3D();
    // first Mobius band
    let startAngle = 0;
    let section = 0.5;
    let geom = makeKleinBottleGeometry(nbrSegments, heightSegments, startAngle, section);
    let matArgs = {side: THREE.FrontSide, shininess:40, transparent: false, color: color1, opacity: 1};
    mats = [];
    mats.push(new THREE.MeshPhongMaterial(matArgs));
    let front = new THREE.Mesh(geom, mats[0]);
    matArgs.side = THREE.BackSide;
    mats.push(new THREE.MeshPhongMaterial(matArgs));
    let back = new THREE.Mesh(geom, mats[1]);
    // second Mobius band
    startAngle = 0.5;
    let geom2 = makeKleinBottleGeometry(nbrSegments, heightSegments, startAngle, section);
    matArgs.side = THREE.FrontSide;
    matArgs.transparent = true;
    matArgs.color = color2;
    mats.push(new THREE.MeshPhongMaterial(matArgs));
    let front2 = new THREE.Mesh(geom2, mats[2]);
    matArgs.side = THREE.BackSide;
    mats.push(new THREE.MeshPhongMaterial(matArgs));
    let back2 = new THREE.Mesh(geom2, mats[3]);
    klein.add(front, back, front2, back2);
    scene.add(klein);
    ball.update = makeMoveBall();
    updateBall();
}


function init() {
    scene = new THREE.Scene();

    renderer = new THREE.WebGLRenderer( { antialias: true } );
    renderer.setPixelRatio( window.devicePixelRatio );
    renderer.setSize( window.innerWidth, window.innerHeight );
    document.body.appendChild( renderer.domElement );
    window.addEventListener( 'resize', onWindowResize, false );
    renderer.setAnimationLoop(function () {
        let delta = clock.getDelta();
        subject.notify(delta);
        cameraControls.update();
        renderer.render(scene, camera);
    });
    let canvasRatio = window.innerWidth / window.innerHeight;
    camera = new THREE.PerspectiveCamera( 40, canvasRatio, 1, 1000);
    camera.position.set(0, 0, 64);
    camera.lookAt(new THREE.Vector3(0, 0, 0));

    cameraControls = new OrbitControls(camera, renderer.domElement);
    cameraControls.enableDamping = true; 
    cameraControls.dampingFactor = 0.03;
}


function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize( window.innerWidth, window.innerHeight );
}



init();
createScene();
initGui();


