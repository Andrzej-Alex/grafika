/***********
 * inversionE.js
 * M. Laszlo
 * February 2021
 ***********/

import * as THREE from '../build/three.module.js';
import { OrbitControls } from './jsm/controls/OrbitControls.js';
import { MyUtils } from '../lib/utilities.js';
import * as dat from '../lib/dat.gui.module.js';

 

let camera, scene, renderer;
let cameraControls;
let clock = new THREE.Clock();


// invert circle centered at Vector2 v and radius r
// with respect to inversion circle with center v0 and radius r0
// Returns [center, radius] of new circle
// function invertOneCircle(v, r, v0, r0) {
//     let vd = v.clone().sub(v0);
//     let s = (r0 * r0) / (vd.x * vd.x + vd.y * vd.y - r * r);
//     let vp = new THREE.Vector2().addVectors(v0, vd.multiplyScalar(s));
//     let rp = Math.abs(s) * r;
//     return [vp, rp];
// }

function invertOneCircle(v, r, v0, r0) {
    let vd = v.clone().sub(v0);
    let d = (vd.x * vd.x + vd.y * vd.y - r * r);
    if (d === 0) { // reflection is a line through point v3 and perpendicular to vector v3
        let v2 = v.clone().multiplyScalar(2);
        let [v3, rr] = invertOneCircle(v2, 1, v0, vr);
        return [v3, Infinity];
    }
    let s = (r0 * r0) / d;
    let vp = new THREE.Vector2().addVectors(v0, vd.multiplyScalar(s));
    let rp = Math.abs(s) * r;
    return [vp, rp];
}



// compute five inversion circles. I come up with this.
// unit circle [(0,0), 1]
// four additional circles [(x,y),a] where
// a = sqrt(2)+1 and
// x, y = plus/minus(a)

// Ley: five blue circles
function makeInversionCircles() {
    let a = Math.sqrt(2) + 1;
    let vrs = [];
    vrs.push([new THREE.Vector2(0, 0), 1]);
    for (let i of [-a, a]) {
        for (let j of [-a, a]) {
            vrs.push([new THREE.Vector2(i, j), a]);
        }
    }
    return vrs;
}

// Ley: five green circles
function makeSeedCircles() {
    let vrs = [];
    let a = Math.sqrt(2) + 1;
    vrs.push([new THREE.Vector2(0, 0), a]); 
    let am1 = a - 1;
    vrs.push([new THREE.Vector2(am1, 0), 1]);
    vrs.push([new THREE.Vector2(-am1, 0), 1]);
    vrs.push([new THREE.Vector2(0, am1), 1]);
    vrs.push([new THREE.Vector2(0, -am1), 1]);
    return vrs;
}

// takes a circle [v,r] centered at Vector2 v and radius v
// and performs DFS n levels through the inversion circles
// vrs = [[v01,r01], [v02,r02], ..., [v0k,r0k]]. 
// Accumulates [v1,r1,l1,c1], ..., [vm,rm,l1,cm] in dict res where
// the i'th circle, centered at vi of radius ri, has been hit ci times
// and first appears at level li.
// Here dictionary dict maps the integral center of each
// circle to its count; dict is updated by the call to invertCircles.
function invertCircle(n, circle, vrs, dict={}, scale=1000) {

    let toKey = function(x, y, r) {
        if (r > radiusThresh)  // treat big seed circle separate
            return "A";        // since it has same center as its inversion
        let xn = Math.round(x * scale);
        let yn = Math.round(y * scale);
        return [xn, yn]
    }
    const [v, r] = circle;

    // add circle to dictionary
    let circleKey = toKey(v.x, v.y, r);
    let count = 1;
    if (dictHas(dict, circleKey)) {
        let thisCircle = dict[circleKey];
        thisCircle[3] += 1;
        if (n > thisCircle[2])
            thisCircle[2] = n;   // keep highest level for this circle
    } else {
        dict[circleKey] = [v, r, n, 1];
    }
    // invert resulting inverted circles
    if (n > 0) {
        for (let [v0,r0] of vrs) {
            let nextCircle = invertOneCircle(v, r, v0, r0);
            invertCircle(n-1, nextCircle, vrs, dict, scale);
        }
    }
}

// top level call
function invertCircles(n, circles, vrs) {
    let dict = {};
    for (let circle of circles) {
        invertCircle(n, circle, vrs, dict);
    }
    // normalize levels
    let res = dictValues(dict);
    res.map(v => v[2] = n - v[2]);
    return res;
}

// dictionary abstraction
function dictKeys(dict) {
    return Object.keys(dict);
}

function dictHas(dict, key) {
    return dict.hasOwnProperty(key);
}

function dictValues(dict) {
    return dictKeys(dict).map(k => dict[k]);
}


let maxLevels = 5;
let materials = [];
let materialLightGray;
let bubbles = [];
let circlesInversionRoot;
let inversionCircles = makeInversionCircles();
let seedCircles = makeSeedCircles();


let sphereGeom = new THREE.SphereGeometry(1, 24, 24);
let hemisphereGeom = new THREE.SphereGeometry(1, 24, 24, 0, Math.PI);
let diskGeom = new THREE.CylinderGeometry(1, 1, 0.1, 32);

function createScene() {
    initMaterials();
    circlesInversionRoot = makeCirclesInversion(controls.n, controls.model);
    scene.add(circlesInversionRoot);

    let light = new THREE.PointLight(0xFFFFFF, 1.0, 1000);
    light.position.set(10, 20, 20);
    let light2 = new THREE.PointLight(0xFFFFFF, 0.6, 1000);
    light2.position.set(-20, -20, -20);
    let ambientLight = new THREE.AmbientLight(0x111111);
    scene.add(light);
    scene.add(light2);
    scene.add(ambientLight);
}


let radiusThresh = Math.sqrt(2) + 0.5;

function makeCirclesInversion(n, model) {
    let circles = invertCircles(n, seedCircles, inversionCircles);
    switch (model) {
        case 'disks':
            return disksModel(circles);
            break;
        case 'spheres':
            return spheresModel(circles);
            break;
        case 'hemispheres':
            return hemispheresModel(circles);
            break;

    }
}

function disksModel(circles) {
    let root = new THREE.Object3D();
    for (let aCircle of circles) {
        const [v, r, l] = aCircle;
        let mesh = new THREE.Mesh(diskGeom, materials[l]);
        mesh.position.set(v.x, 0, v.y);
        if (r > radiusThresh) {
            mesh.position.y = -0.1;
            mesh.material = materialLightGray;
        }
        mesh.scale.set(r, 1, r);
        root.add(mesh);
    }
    return root;
}


function spheresModel(circles) {
    let root = new THREE.Object3D();
    for (let aCircle of circles) {
        const [v, r, l] = aCircle;
        if (r < radiusThresh) {
            let mesh = new THREE.Mesh(sphereGeom, materials[l]);
            mesh.position.set(v.x, 0, v.y);
            mesh.scale.set(r, r, r);
            root.add(mesh);
        }
    }
    return root;
}

function hemispheresModel(circles) {
    let root = new THREE.Object3D();
    for (let aCircle of circles) {
        const [v, r, l] = aCircle;
        let mesh;
        if (r < radiusThresh) {
            mesh = new THREE.Mesh(hemisphereGeom, materials[l]);
            mesh.position.set(v.x, 0, v.y);
            mesh.scale.set(r, r, r);
            mesh.rotation.x = -Math.PI / 2;
        } else {
            mesh = new THREE.Mesh(diskGeom, materialLightGray);
            mesh.position.y = -0.05;
            mesh.scale.set(r, 1, r);
        }
        root.add(mesh);
    }
    return root;
}



function initMaterials() {
    for (let i = 0; i <= maxLevels; i++) {
        let matArgs = {shininess: 80, transparent: false, side: THREE.FrontSide};
        materials.push(new THREE.MeshPhongMaterial(matArgs));
    }
    materialLightGray = new THREE.MeshPhongMaterial({shininess: 80});
    materialLightGray.color = new THREE.Color(0.8, 0.8, 0.8);
    genRandomColors();
}



let controls = new function() {
    this.n = 3;
    this.model = 'disks';
    this.color = '#3366ff';
    this.randomColors = true;
    this.Randomize = genRandomColors;
}

function initGui() {
    let gui = new dat.GUI();
    gui.add(controls, 'n', 0, maxLevels).step(1).onChange(updateN);
    let modelTypes = ['disks', 'spheres', 'hemispheres'];
    gui.add(controls, 'model', modelTypes).onChange(updateN);
    gui.addColor(controls, 'color');
    gui.add(controls, 'randomColors').onChange(genColors);
    gui.add(controls, 'Randomize');
}

function genRandomColors() {
    if (controls.randomColors) {
        for (let mat of materials) {
            mat.color = MyUtils.getRandomColor(0.5, 0.4, 0.6);
        }
    }
}

function genColors(flag) {
    if (flag) {
        genRandomColors();
    } else {
        let color = new THREE.Color(controls.color);
        for (let mat of materials) {
            mat.color = color;
        }
    }
}



function updateN() {
    let n = controls.n;
    let model = controls.model;
    if (circlesInversionRoot) scene.remove(circlesInversionRoot);
    circlesInversionRoot = makeCirclesInversion(n, model);
    scene.add(circlesInversionRoot);
}

// let controls = new function() {
//     this.n = lastN;
//     this.an = lastAN;
//     this.root = true;
//     this.color = '#3366ff';
//     this.randomColors = false;
//     this.Randomize = genRandomColors;
// }

// function initGui() {
//     let gui = new dat.GUI();
//     gui.add(controls, 'n', 0, maxN).step(1).onChange(updateN);
//     gui.add(controls, 'an', 0.5, 5).name('shell').step(0.05).onChange(update);
//     gui.add(controls, 'root').name('show root').onChange(function (flag) {
//         if (flag) materials[0].opacity = 1.0;
//         else materials[0].opacity = 0.4;
//     });
//     gui.addColor(controls, 'color');
//     gui.add(controls, 'randomColors').onChange(genColors);
//     gui.add(controls, 'Randomize');
// }

// function updateN() {
//     let newN = controls.n;
//     let an = controls.an;
//     if (newN > lastN) {
//         let delta = newN - lastN;
//         for (let i = 0; i < delta; i++) {
//             let bubble = makeOneBubble(an, bubbles);
//             bubblesRoot.add(bubble);
//             bubbles.push(bubble);
//         }
//     } else if (newN < lastN) {
//         let delta = lastN - newN;
//         for (let i = 0; i < delta; i++) {
//             bubblesRoot.remove(bubbles.pop());
//         }
//     }
//     lastN = newN;
// }

// function update() {
//     let n = controls.n;
//     let an = controls.an;
//     if (an == lastAN) return;
//     if (an == 1) an = 1.01;
//     if (bubblesRoot)
//         scene.remove(bubblesRoot);
//     bubbles = [];
//     bubblesRoot = makeBubbles(n, an);
//     scene.add(bubblesRoot);
// }

// function genColors(flag) {
//     if (flag) {
//         genRandomColors();
//     } else {
//         let color = new THREE.Color(controls.color);
//         // let opacity = controls.opacity;
//         for (let mat of materials) {
//             mat.color = color;
//             // mat.opacity = opacity
//         }
//     }
// }

// let lightGray = new THREE.Color(0.8, 0.8, 0.8);

// function genRandomColors() {
//     if (controls.randomColors) {
//         for (let mat of materials) 
//             mat.color = MyUtils.getRandomColor(0.5, 0.4, 0.6);
//         materials[0].color = lightGray;
//     }
// }

// // last color assigned by color controller
// let lastColor = null;


let lastColor = null;

function render() {
    let delta = clock.getDelta();
    cameraControls.update(delta);
    if ((lastColor !== controls.color) && !controls.randomColors) {
        let color = new THREE.Color(controls.color);
        for (let mat of materials)
            mat.color = color;
        lastColor = controls.color;
    }
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
    camera.position.set(0, 8, 0);
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




init();
createScene();
initGui();