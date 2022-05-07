import * as THREE from 'three';
import metaversefile from 'metaversefile';
const {useApp, useFrame, useLoaders, usePhysics, useCleanup, useLocalPlayer} = metaversefile;

const baseUrl = import.meta.url.replace(/(\/)[^\/\\]*$/, '$1');

const localVector = new THREE.Vector3();
const localVector2 = new THREE.Vector3();
const localQuaternion = new THREE.Quaternion();
const localQuaternion2 = new THREE.Quaternion();
const localQuaternion3 = new THREE.Quaternion();
const localMatrix = new THREE.Matrix4();

export default () => {
  const app = useApp();
  const physics = usePhysics();

  let trackLine = null;
  let trackPlane = null;
  let train1 = null;
  let train2 = null;
  let trainParent = null;
  let pathArray = [];
  let currentPathPoint = 0;
  let speed = 0.4;
  let lastY = 0;
  let goingUp = false;

  let viewMode = false;
  let changedMode = false;
  let playerOrigin = new THREE.Vector3();

  app.name = 'roller';

  document.addEventListener("keydown", onDocumentKeyDown, false);
  function onDocumentKeyDown(event) {
      var keyCode = event.which;
      if (keyCode == 86) { // V
          viewMode = !viewMode;
          changedMode = true;
      }
  };


  const _handleViewMode = () => {
    const localPlayer = useLocalPlayer();
    if(viewMode && localPlayer && trainParent) {
      physics.setCharacterControllerPosition(localPlayer.characterController, 
        trainParent.position.clone().add(localVector.set(0,0.5,0)));
      
      if(changedMode) {
        changedMode = false;
        for (var i = 0; i < physicsIds.length; i++) {
          physics.disableGeometry(physicsIds[i]);
        }
      }
    }
    else if (!viewMode && localPlayer && trainParent) {
      if(changedMode) {
        changedMode = false;
        for (var i = 0; i < physicsIds.length; i++) {
          physics.enableGeometry(physicsIds[i]);
        }
      }
    }
  };

  useFrame(({timestamp}) => {

    if(trainParent && trackLine) {
      if(currentPathPoint < pathArray.length) {

        var dir = new THREE.Vector3();
        dir.subVectors(pathArray[currentPathPoint], trainParent.position);
        trainParent.lookAt(pathArray[currentPathPoint]);

        trainParent.position.add(dir.multiplyScalar(speed));

        var forward = new THREE.Vector3( 0, 0, -1 ).applyQuaternion( trainParent.quaternion );
        var up = new THREE.Vector3( 0, 1, 0 ).applyQuaternion( trainParent.quaternion );

        let slope = THREE.MathUtils.radToDeg(up.angleTo(new THREE.Vector3(0,1,0)));

        if(lastY > trainParent.position.y) {
          goingUp = false;
          if(speed < 0.4) {
            speed += 0.01;
          }
        }
        else {
          goingUp = true;
          if(speed > 0.1) {
            speed *= 0.99;
          }
        }

        let distance = trainParent.position.distanceTo(pathArray[currentPathPoint]);
        if(distance < 1) {
          currentPathPoint+=1;
        }
      } 
      else {
        currentPathPoint = 0;
        trainParent.position.copy(pathArray[currentPathPoint]);
      }
      lastY = trainParent.position.y;
      trainParent.updateMatrixWorld();
      _handleViewMode();
    }
  });

  let physicsIds = [];
  (async () => {
    const u = `${baseUrl}roller.glb`;
    let o = await new Promise((accept, reject) => {
      const {gltfLoader} = useLoaders();
      gltfLoader.load(u, accept, function onprogress() {}, reject);
    });
    o = o.scene;
    app.add(o);

    o.traverse(o => {
      if(o.name === "trackLine") {
        trackLine = o;
        trackLine.visible = false;
      }
      if(o.name === "trackPlane") {
        trackPlane = o;
        trackPlane.visible = false;
      }
      if(o.name === "train1") {
        o.visible = false;
      }
      if(o.name === "train2") {
        o.visible = false;
      }
      if(o.name === "trainParent") {
        o.visible = false;
      }
    });
    
    const physicsId = physics.addGeometry(o);
    physicsIds.push(physicsId);

    // Building path
    let positions = trackLine.geometry.attributes["position"].array;
    let ptCout = positions.length / 3;
    for (let i = 0; i < ptCout; i++)
    { 

        let p = new THREE.Vector3(positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2]);
        trackLine.localToWorld( p );
        pathArray.push(p);
    }

  })();
  (async () => {
    const u = `${baseUrl}cart.glb`;
    let o = await new Promise((accept, reject) => {
      const {gltfLoader} = useLoaders();
      gltfLoader.load(u, accept, function onprogress() {}, reject);
    });
    o = o.scene;
    app.add(o);

    app.traverse(o => {
      if(o.name === "train1") {
        train1 = o;
      }
      if(o.name === "train2") {
        train2 = o;
      }
      if(o.name === "trainParent") {
        trainParent = o;
      }
    });
    
    const physicsId = physics.addGeometry(o);
    physicsIds.push(physicsId);

  })();
  
  useCleanup(() => {
    for (const physicsId of physicsIds) {
      physics.removeGeometry(physicsId);
    }
    document.removeEventListener("keydown", onDocumentKeyDown, false);
  });

  return app;
};
