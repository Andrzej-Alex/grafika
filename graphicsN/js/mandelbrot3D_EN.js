/***********
 * mandelbrot3D_EN.js
 * Uses mandelbrotIN.js to set window on complex plane
 * Uses fractional escape values for 3D landscape height values and colors:
 *   See https://linas.org/art-gallery/escape/escape.html
 * M. Laszlo
 * January 2022
 ***********/

import * as THREE from '../build/three.module.js';
import { OrbitControls } from './jsm/controls/OrbitControls.js';
import { MyUtils } from '../lib/utilities.js';
import * as dat from '../lib/dat.gui.module.js';
import { DragControls } from './jsm/controls/DragControls.js';
import { TransformControls } from './jsm/controls/TransformControls.js';

 
let camera, scene, renderer;
let cameraControls;
let clock = new THREE.Clock();
let landscape;
let frameSquare, transformControls;
let frameIsActive = false;
let upperMesh;  // 3D landscape
let resolution = 300;  // 3D landscape is res x res

// frame = [minr, mini, width, height] 
let frame = [-2.1, -1.5, 3.1, 3.001];


function createScene() {
    let limit = 16;
    landscape = makeMandelbrotLandscape(limit, resolution, 0.01);
    scene.add(landscape);

    frameSquare = makeFrameSquare();
    let light = new THREE.PointLight(0xFFFFFF, 1.0, 1000);
    light.position.set(1, 1, -3);
    let light2 = new THREE.PointLight(0xAAAAAA, 1.0, 1000);
    light2.position.set(-1, -1, 3);
    let ambientLight = new THREE.AmbientLight(0x111111);
    scene.add(light);
    scene.add(light2);
    scene.add(ambientLight);
}

function setupTransformControls(object) {
    transformControls = new TransformControls(camera, renderer.domElement);
    transformControls.attach(object);
    transformControls.setMode("translate")
    transformControls.showZ = false;
    transformControls.addEventListener('dragging-changed', function (event) {
        cameraControls.enabled = !event.value;
    });
    scene.add(transformControls);
}

function makeFrameSquare(r=1) {
    let geom = new THREE.PlaneGeometry(2, 2);
    let matArgs = {transparent: true, opacity: 0.5, side: THREE.DoubleSide}
    let mat = new THREE.MeshLambertMaterial(matArgs);
    let square = new THREE.Mesh(geom, mat);
    square.scale.set(r, r, 1);
    square.position.z = 0.01;
    return square;
}

function makeMandelbrotLandscape(limit, res, zscale=1.0) {
    let root = new THREE.Object3D();
    let colors = updateColors();
    let lowerPlane = new THREE.PlaneGeometry(2, 2, 1, 1);
    let lowerMat = new THREE.ShaderMaterial(makeShaderMaterialArgs(frame, colors, limit));
    let lowerMesh = new THREE.Mesh(lowerPlane, lowerMat);
    upperMesh = make3DLandscape(frame, 2, res, colors, limit);
    if (controls.invert)
        invertMandelbrotLandscape();
    upperMesh.position.z = -0.001;
    upperMesh.rotateZ(Math.PI / 2);
    upperMesh.scale.set(1.0, 1.0, controls.zscale);
    root.add(lowerMesh, upperMesh);
    return root;
}

function make3DLandscape(frame, size, res, colors, limit) {
    let plane = mandelbrotLandscapeGeom(frame, size, res, colors, limit);
    let matArgs = {side: THREE.DoubleSide, shininess: 20, vertexColors: true};
    let mat = new THREE.MeshPhongMaterial(matArgs);
    let mesh = new THREE.Mesh(plane, mat);
    return mesh;
}

let heightOf3DLandscape = 1.0;

function mandelbrotLandscapeGeom(frame, size, res, colors, limit) {
    let [minr, mini, width, height] = frame;
    let plane = new THREE.PlaneBufferGeometry(size, size, res, res);
    let res1 = res + 1;
    let pos = plane.getAttribute('position');
    let colorsArray = new Float32Array(res1 * res1 * 3);
    plane.setAttribute('color', new THREE.BufferAttribute(colorsArray, 3, true));
    let pa = pos.array;
    for (let i = 0; i < res1; i++) { // width (x)
        for (let j = 0; j < res1; j++) { // height (y)
            let posr = width * (i / res1) + minr;
            let posi = height * (j / res1) + mini;
            let z = mandelbrotFrac(posr, posi, limit);
            let base = 3 * (i * res1 + j);
            pa[base + 2] = -(z / limit) * heightOf3DLandscape;
            // set color
            let zs = Math.trunc(z);
            let zf = z - zs;
            let c = new THREE.Color(colors[zs]);
            c.lerp(colors[zs+1], zf);
            colorsArray[base] = c.r;
            colorsArray[base + 1] = c.g;
            colorsArray[base + 2] = c.b;
        }
    }
    pos.needsUpdate = true;
    return plane;
}

function invertMandelbrotLandscape() {
    let geom = upperMesh.geometry;
    let pos = upperMesh.geometry.getAttribute('position');
    let pa = pos.array;
    for (let i = 2; i < pa.length; i += 3) {
        pa[i] = -(1 + pa[i]);       
    }
    pos.needsUpdate = true;
}

let R = 16;
let R2 = R * R;
let Rp = Math.log2(Math.log(R));

function mandelbrotFrac(cr, ci, limit) {
    let zr = 0.0;
    let zi = 0.0;
    let zr2, zi2;
    let i;
    for (i = 0; i < limit; i++) {
        zr2 = zr * zr;
        zi2 = zi * zi;
        zi = 2.0 * zr * zi + ci;
        zr = zr2 - zi2 + cr;
        // has (zr,zi) escaped?
        if (zr2 + zi2 > R2)
            break;
    }
    if (i < limit) {
        let modulus = Math.sqrt(zr2 + zi2);
        return i + Rp - Math.log2(Math.log(modulus));
    } else {
        return limit;
    }
}




function updateColors() {
    let levels = controls.levels;
    let colors = [];
    if (controls.colorModel == 'rainbow') {
        for (let i = 0; i <= levels; i++) {
            let c = new THREE.Color();
            c.setHSL(i/levels, 1.0, 0.5);
            colors.push(c);
        }
    } else if (controls.colorModel == 'binary') {
        let color1 = new THREE.Color(controls.color1);
        let color2 = new THREE.Color(controls.color2);
        if ((levels%2) == 0)
            [color1, color2] = [color2, color1];
        for (let i = 0; i <= levels; i++) {
            colors.push((i%2 == 0) ? color1 : color2);
        }
    } else {  // colorModel == 'gradient'
        let color1 = new THREE.Color(controls.color1);
        let color2 = new THREE.Color(controls.color2);
        let inc = 1.0 / levels;
        for (let i = 0, f = 0.0; i <= levels; i++, f += inc) {
            let color = new THREE.Color(color1);
            color.lerp(color2, f*f);
            colors.push(color);
        }
    }
    // push last color for color interpolation of 3D landscape
    colors.push(colors[levels]);
    return colors;
}



function makeShaderMaterialArgs(frame, colors, limit) {
    // map uv coordinates to complex plane coordinates
    let [minr, mini, width, height] = frame;
    return {
      uniforms: {
        colors: {
            value: colors
        }
      },
      vertexShader: `
        varying vec2 vUv;

        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0);
        }
      `,
      fragmentShader: `
      precision highp float;
        uniform vec3 colors[${limit+1}];
        varying vec2 vUv;

        vec4 mandelbrot(vec2 c) {
            float cr = c.x;
            float ci = c.y;
            float zr = 0.0;
            float zi = 0.0;
            for (int i = 0; i < ${limit}; i++) {
                // (zr,zi) = (zr,zi)**2 + c
                float zr2 = zr * zr;
                float zi2 = zi * zi;
                zi = 2.0 * zr * zi + ci;
                zr = zr2 - zi2 + cr;
                // has (zr,zi) escaped?
                if (zr2 + zi2 > 4.0)
                    return vec4(colors[i], 1.0);
            }
            return vec4(colors[${limit}], 1.0);
        }
        
        void main() {
            float posr = ${width} * vUv.x + ${minr};
            float posi = ${height} * vUv.y + ${mini};
            vec2 pos = vec2(posr, posi);
            gl_FragColor = mandelbrot(pos);
        }
      `,
      side: THREE.DoubleSide
    }
};

const maxLevels = 64;
let controls = new function() {
    this.levels = 16;
    this.colorModel = 'rainbow';
    this.color1 = '#1562c9';
    this.color2 = '#e22e2a';
    this.frame = 1;
    this.zoom = 'in';
    this.zscale = 0.2;
    this.invert = false;
    this.Go = recomputeFrame;
}
 
function initGui() {
    let gui = new dat.GUI();
    gui.add(controls, 'levels', 2, maxLevels).step(1).onChange(updateShader);
    let colorModels = ['rainbow', 'binary', 'gradient'];
    gui.add(controls, 'colorModel', colorModels).onChange(updateShader);
    gui.addColor(controls, 'color1').onChange(updateShader);
    gui.addColor(controls, 'color2').onChange(updateShader);
    gui.add(controls, 'frame', 1, 4).step(1).onChange(updateFrame);
    gui.add(controls, 'zoom', ['in', 'out']);
    gui.add(controls, 'zscale', 0.05, 0.5).step(0.01).onChange(function(val) {
        upperMesh.scale.set(1.0, 1.0, val);
    });
    gui.add(controls, 'invert').onChange(function () { invertMandelbrotLandscape(); });
    gui.add(controls, 'Go');
}

// frame = [minr, mini, width, height] 
function recomputeFrame() {
    if (controls.frame == 1)
        return;
    let [minr, mini, width, height] = frame;
    let [posr, posi] = [frameSquare.position.x, frameSquare.position.y];
    let scale = controls.frame;
    if (controls.zoom == 'in')
        scale = 1.0 / scale;
    let newWidth = width * scale;
    let newHeight = height * scale;
    let framePosr = minr + ((posr + 1.0) / 2.0) * width;
    let framePosi = mini + ((posi + 1.0) / 2.0) * height;
    let newMinr = framePosr - (0.5 * newWidth);
    let newMini = framePosi - (0.5 * newHeight);
    frame = [newMinr, newMini, newWidth, newHeight];
    frameSquare.position.setX(0.0);
    frameSquare.position.setY(0.0);
    updateShader();
}

function updateFrame() {
    let frameval = controls.frame;
    if (frameIsActive) {
        transformControls.detach();
        scene.remove(frameSquare);
        frameIsActive = false;
    }
    if (frameval > 1) {
        let scale = 1.0 / frameval;
        frameSquare.scale.set(scale, scale, 1);
        scene.add(frameSquare);
        setupTransformControls(frameSquare);
        frameIsActive = true;
    }
}

function updateShader() {
    scene.remove(landscape);
    landscape = makeMandelbrotLandscape(controls.levels, resolution, 0.01);
    scene.add(landscape);
}


function render() {
    let delta = clock.getDelta();
    cameraControls.update(delta);
    renderer.render(scene, camera);
}


function init() {
    scene = new THREE.Scene();

    renderer = new THREE.WebGLRenderer( { antialias: true } );
    renderer.setPixelRatio( window.devicePixelRatio );
    renderer.setSize( window.innerWidth, window.innerHeight );
    document.body.appendChild( renderer.domElement );
    window.addEventListener( 'resize', onWindowResize, false );
    renderer.setAnimationLoop(function () {
        render();
    });
    let canvasRatio = window.innerWidth / window.innerHeight;
    camera = new THREE.PerspectiveCamera( 40, canvasRatio, 1, 1000);
    camera.position.set(0, 0, 3);
    camera.lookAt(new THREE.Vector3(0, 0, 0));
    camera.near = 0.001;

    cameraControls = new OrbitControls(camera, renderer.domElement);
    cameraControls.enableDamping = true; 
    cameraControls.dampingFactor = 0.02;
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize( window.innerWidth, window.innerHeight );
}


init();
createScene();
initGui();
