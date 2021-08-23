/***********
 * schottkyFractalsExpandJApollonian.js
 * based on Indra's Pearls, Chapter 7
 * use run6.html
 * M. Laszlo
 * July 2021
 ***********/



import * as THREE from '../build/three.module.js';
import { OrbitControls } from './jsm/controls/OrbitControls.js';
import * as dat from '../lib/dat.gui.module.js';
import { Mobius } from '../lib/complexUtilities.js';
import { MyUtils } from '../lib/utilities.js';

let camera, scene, renderer;
let cameraControls, transformControls;
let clock = new THREE.Clock();
let fractal = null;
let materials, materialsSpherical;
let materialsByDisk, materialsByDiskSpherical;
let maxLevels = 7;
let currentHighestLevel = maxLevels;
let circleSequence = null;  // current circle sequence
let matSphere = new THREE.MeshLambertMaterial();
let matDisk = new THREE.ShaderMaterial(makeShaderMaterialArgs());
let line;

// picking
const pointer = new THREE.Vector2();
const raycaster = new THREE.Raycaster();


function createSchottkySceneGraph(circleSeq, model, colorModel) {
    let root = new THREE.Object3D();
    let mesh;
    if (model == 'disks') {
        let zOffset = 0.01;
        let diskGeom = new THREE.CircleGeometry(1, 40);
        for (let c of circleSeq) {
            let circle = c.circle;
            let [center, radius] = circle;
            if (colorModel == 'uniform')
                mesh = new THREE.Mesh(diskGeom, matDisk);
            else if (colorModel == 'by level')
                mesh = new THREE.Mesh(diskGeom, materials[c.level]);
            else // colorModel == 'by disk'
                mesh = new THREE.Mesh(diskGeom, materialsByDisk[c.circleIndex]);
            mesh.position.set(center.re, center.im, zOffset * c.level);
            mesh.scale.set(radius, radius, 1);
            mesh.userData.circle = c;
            root.add(mesh);
        }
    } else { // model == 'spheres'
        let sphereGeom = new THREE.SphereGeometry(1, 24, 24);
        for (let c of circleSeq) {
            let circle = c.circle;
            let isLimit = c.isLimit;
            let [center, radius]= circle;
            if (isLimit) {
                if (colorModel == 'uniform')
                    mesh = new THREE.Mesh(sphereGeom, matSphere);
                else if (colorModel == 'by level')
                    mesh = new THREE.Mesh(sphereGeom, materialsSpherical[c.level]);
                else // colorModel == 'by disk'
                    mesh = new THREE.Mesh(sphereGeom, materialsByDiskSpherical[c.circleIndex]);
                mesh.userData.circle = circle;
                mesh.position.set(center.re, center.im, 0);
                mesh.scale.set(radius, radius, radius);
                mesh.userData.circle = c;
                root.add(mesh);
            }
        }
    }
    return root;
}


/**
 * Schottky functions
 **/


/***
 * Called with:
 *   list of four transforms and circles.
 *   initial level, and last level to expand to (level < lastLevel)
 *   prefix transform and circle index such that
 *     prefixTransform.evalCircle(...circles[circleIndex]) yields the level circle
 * 
 * Returns list of circle code objects with these properties:
 *   circle: current circle [center, radius]
 *   level: level of this circle
 *   prefixTransform
 *   circleIndex: index of rightmost transform in prefixTransform (as composition)
 *   isLimit: true iff this circle belongs to the current limit set
 ***/

function createSchottkyFractal(transforms, circles, level, lastLevel, prefixTransform=null, circleIndex=null) {
    let circlesAcc = [];
    if (!prefixTransform) {
        for (let i = 0; i < 4; i++) {
            createSchottkyFractalRec(Mobius.identity(), i, 0, lastLevel, transforms, circles, circlesAcc);
        }
    } else {
        for (let i of childrenOfCircleIndex[circleIndex]) {
            createSchottkyFractalRec(prefixTransform, i, level+1, lastLevel, transforms, circles, circlesAcc);
        }
    }
    return circlesAcc;
}

// circle 0 is Ca, 1 is CA, 2 is Cb, 3 is CB
const childrenOfCircleIndex = [
    [0, 2, 3],
    [1, 2, 3],
    [0, 1, 2],
    [0, 1, 3]
];



function createSchottkyFractalRec(prefixTransform, circleIndex, level, lastLevel, transforms, circles, circlesAcc) {
    let curCircle = circles[circleIndex];
    curCircle = prefixTransform.evalCircle(...curCircle);
    let nextTransform = prefixTransform.compose(transforms[circleIndex]);
    let circleCode = {circle: curCircle, level: level, prefixTransform: nextTransform, circleIndex: circleIndex};
    circleCode.isLimit = (level == lastLevel);
    if (curCircle[1] < radiusCa) // don't generate the infinite circle
        circlesAcc.push(circleCode);
    if (level < lastLevel) {
        for (let c of childrenOfCircleIndex[circleIndex]) {
            createSchottkyFractalRec(nextTransform, c, level+1, lastLevel, transforms, circles, circlesAcc);
        }
    }
}

// pair circles based on Indra's Pearls, Apollonian gasket, Chapter 7
// also see deriving transformations for paired circles, Chapter 3, page 89
// We shift circles to lose the extra tangency (page 201).
// aGap (vertical) is distance between the real axis (im = 0) and the top
// of the a circle Ca.
// bGap (horizontal) is horizontal distance between Cb and CB.
// We have aGap = bGap = 0 when all tangencies are in force.
// Let g = aGap and d = bGap/2. Trig gives us the radius r of the small circle CA:
//   r = [(d+1)^2 - g(2-g)] / 2(2-g)
// To construct the Mobius transformation from C = (P,r) to C' = (Q,s),
// we use   (Q, rs-QP)
//          (1, -P   )
//

const radiusCa = 1e12;


function pairCircles(aGap=0, bGap=0) {
    // compute radius of CA
    const g = aGap;
    const d = bGap / 2;
    const r = ((d+1) * (d+1) - g * (2-g)) / (2 * (2-g));
    let Ca = [new Complex(0, radiusCa), radiusCa];
    let CA = [new Complex(0, -(r+g)), r]
    let Cb = [new Complex((1+d), -1), 1];
    let CB = [new Complex(-(1+d), -1), 1];

    let b = Mobius.toW1W2W3(-(1+d), new Complex(-d, -1), new Complex(-(1+d), -2), 1+d, new Complex(d, -1), new Complex(1+d, -2));
    let B = b.inverse();

    // v is vector from center of Cb to center of cA
    let v = new Complex(-1-d, 1-(r+g));
    // vp is point where Cb and cA kiss
    let vp = v.div(v.abs()).add(new Complex(1+d, -1));
    let a = Mobius.toW1W2W3(new Complex(0, -g), vp, new Complex(-vp.re, vp.im),
                            0, 1+d, -1-d);
    let A = a.inverse();


    let transforms = [a, A, b, B];
    let circles = [Ca, CA, Cb, CB];
    return [transforms, circles];
}

/**
 * end Schottky functions
 **/


function createScene() {
    materials = [];
    materialsSpherical = [];
    for (let i = 0; i <= maxLevels; i++) {
        materials.push(new THREE.ShaderMaterial(makeShaderMaterialArgs()));
        materialsSpherical.push(new THREE.MeshLambertMaterial());
    }
    materialsByDisk = [];
    materialsByDiskSpherical = [];
    for (let i = 0; i <4; i++) {
        materialsByDisk.push(new THREE.ShaderMaterial(makeShaderMaterialArgs()));
        materialsByDiskSpherical.push(new THREE.MeshLambertMaterial());
    }
    let lineMat = new THREE.LineBasicMaterial({color: 0xff0000, linewidth: 4});
    let linePoints = [new THREE.Vector3(-20, 0, 0), new THREE.Vector3(20, 0, 0)];
    let lineGeom = new THREE.BufferGeometry().setFromPoints(linePoints);
    line = new THREE.Line(lineGeom, lineMat); 
    scene.add(line);
    updateSceneGraph();
    updateRandomColors();
    matSphere.color = new THREE.Color(controls.color);
    matDisk.color = new THREE.Color(controls.color);
    let light = new THREE.PointLight(0xFFFFFF, 1.0, 1000);
    light.position.set(10, 10, 40);
    let light2 = new THREE.PointLight(0xFFFFFF, 1.0, 1000);
    light2.position.set(-10, 10, -40);
    let ambientLight = new THREE.AmbientLight(0x777777);
    scene.add(light);
    scene.add(light2);
    scene.add(ambientLight);
}


function makeShaderMaterialArgs() {
    return {
      uniforms: {
        color1: {
          value: new THREE.Color("red")
        },
        color2: {
          value: new THREE.Color("white")
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
        uniform vec3 color1;
        uniform vec3 color2;
      
        varying vec2 vUv;
        
        void main() {
          float x = 1.5 * (vUv.x - 0.5);
          float y = 1.5 * (vUv.y - 0.5);
          gl_FragColor = vec4(mix(color1, color2, x * x + y * y), 1.0);
        }
      `,
      wireframe: false
    };
}



let controls = new function() {
    this.nbrLevels = 2;
    this.aGap = 0;
    this.bGap = 0;
    this.model = 'disks';
    this.colorModel = 'by level';
    this.color = '#EB005D';
    this.wireframe = false;
    this.redline = true;
    this.Randomize = updateRandomColors;
}

function initGui() {
    let gui = new dat.GUI();
    gui.add(controls, 'nbrLevels', 0, maxLevels).step(1).onChange(updateSceneGraph);
    gui.add(controls, 'bGap', 0.0, 0.5).step(0.1).name('B gap (hor)').onChange(updateSceneGraph);
    gui.add(controls, 'aGap', 0.0, 0.5).step(0.1).name('A gap (vert)').onChange(updateSceneGraph);
    let modelTypes = ['disks', 'spheres'];
    gui.add(controls, 'model', modelTypes).onChange(updateSceneGraphUseCircleSequence);
    let colorModelTypes = ['uniform', 'by level', 'by disk'];
    gui.add(controls, 'colorModel', colorModelTypes).name('color model').onChange(updateSceneGraphUseCircleSequence);
    gui.addColor(controls, 'color').onChange(function () {
        matSphere.color = new THREE.Color(controls.color);
        matDisk.uniforms.color1.value = matSphere.color;
    });
    gui.add(controls, 'wireframe').onChange(updateWireframe);
    gui.add(controls, 'redline').onChange(function (flag) {
        if (flag) scene.add(line);
        else scene.remove(line);
    });
    gui.add(controls, 'Randomize');
}


const pairCirclesX = 1.1;

function updateSceneGraphUseCircleSequence() {
    scene.remove(fractal);
    fractal = createSchottkySceneGraph(circleSequence, controls.model, controls.colorModel);
    scene.add(fractal);
}

function updateSceneGraph() {
    scene.remove(fractal);
    let [transforms, circles] = pairCircles(controls.aGap, controls.bGap);
    circleSequence = createSchottkyFractal(transforms, circles, 0, controls.nbrLevels);
    fractal = createSchottkySceneGraph(circleSequence, controls.model, controls.colorModel);
    scene.add(fractal);
}

function updateRandomColors() {
    for (let i = 0; i < materials.length; i++) {
        let color = MyUtils.getRandomColor(0.3, 0.4, 0.6);
        materials[i].uniforms.color1.value = color;
        materialsSpherical[i].color = color;
    }
    for (let i = 0; i < 4; i++) {
        let color = MyUtils.getRandomColor(0.3, 0.4, 0.6);
        materialsByDisk[i].uniforms.color1.value = color;
        materialsByDiskSpherical[i].color = color;
    }
}

function updateWireframe() {
    let flag = controls.wireframe;
    for (let mat of materials)
        mat.wireframe = flag;
    for (let mat of materialsByDisk)
        mat.wireframe = flag;
    matDisk.wireframe = flag;
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
    // picking
    window.addEventListener( 'pointerdown', onPointerDown );
    renderer.setAnimationLoop(function () {
        render();
    });
    let canvasRatio = window.innerWidth / window.innerHeight;
    camera = new THREE.PerspectiveCamera( 40, canvasRatio, 1, 100000);
    camera.position.set(0, 0, 10);
    camera.lookAt(new THREE.Vector3(0, 0, 0));

    cameraControls = new OrbitControls(camera, renderer.domElement);
    cameraControls.enableDamping = true; 
    cameraControls.dampingFactor = 0.02;
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize( window.innerWidth, window.innerHeight );
}

// clicking only on sphere model for now
function onPointerDown( event ) {
    pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
    pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
    camera.updateMatrixWorld();
    raycaster.setFromCamera(pointer, camera);
    let intersects = raycaster.intersectObjects(fractal.children);
    if (intersects.length > 0) {
        let picked = intersects[0].object;
        let circle = picked.userData.circle;
        if (controls.model == 'spheres') {
            fractal.remove(picked);
        } else {  // model == 'disks'
            if (!circle.isLimit)
                return;
        }
        circle.isLimit = false;
        let level = circle.level;
        if (level == currentHighestLevel) {
            let color =  MyUtils.getRandomColor(0.3, 0.4, 0.6);
            materialsSpherical.push(new THREE.MeshLambertMaterial({color: color}));
            let mat = new THREE.ShaderMaterial(makeShaderMaterialArgs());
            mat.uniforms.color1.value = color;
            mat.wireframe = controls.wireframe;
            materials.push(mat);          
            currentHighestLevel = level+1;
        }
        let prefixTransform = circle.prefixTransform;
        let circleIndex = circle.circleIndex;
        let [transforms, circles] = pairCircles(controls.aGap, controls.bGap);
        let newCircleSeq = createSchottkyFractal(transforms, circles, level, level+1, prefixTransform, circleIndex);
        let newFractal = createSchottkySceneGraph(newCircleSeq, controls.model, controls.colorModel);
        fractal.add(...newFractal.children);
        circleSequence.push(...newCircleSeq);    
    }
}


init();
createScene();
initGui();