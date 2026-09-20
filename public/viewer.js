class Model3DViewer {
  constructor(containerElement) {
    this.container = containerElement;
    this.currentMesh = null;
    this.materialColor = 0xf97316; // Vibrant PLA Orange default
    this.isWireframe = false;
    this.init();
  }

  init() {
    const width = this.container.clientWidth || 600;
    const height = this.container.clientHeight || 450;

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.container.appendChild(this.renderer.domElement);

    // Scene
    this.scene = new THREE.Scene();

    // Camera
    this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 5000);
    this.camera.position.set(100, 100, 100);

    // Orbit Controls
    this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.maxPolarAngle = Math.PI / 2 + 0.1; // allow slight under-bed tilt

    // Studio Lights
    const ambient = new THREE.AmbientLight(0xffffff, 0.7);
    this.scene.add(ambient);

    this.dirLight1 = new THREE.DirectionalLight(0xffffff, 0.85);
    this.dirLight1.position.set(150, 250, 150);
    this.dirLight1.castShadow = true;
    this.dirLight1.shadow.mapSize.width = 2048;
    this.dirLight1.shadow.mapSize.height = 2048;
    this.scene.add(this.dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x93c5fd, 0.45);
    dirLight2.position.set(-150, -50, -150);
    this.scene.add(dirLight2);

    // Print Bed Grid & Plate
    this.gridHelper = new THREE.GridHelper(200, 20, 0x4f46e5, 0x27272a);
    this.gridHelper.position.y = 0;
    this.scene.add(this.gridHelper);

    // Material
    this.material = new THREE.MeshStandardMaterial({
      color: this.materialColor,
      roughness: 0.35,
      metalness: 0.15,
      side: THREE.DoubleSide,
      wireframe: this.isWireframe
    });

    // Resize handling
    this.resizeObserver = new ResizeObserver(() => this.onResize());
    this.resizeObserver.observe(this.container);

    // Render loop
    this.animate = this.animate.bind(this);
    this.isAnimating = true;
    this.animate();
  }

  onResize() {
    if (!this.container) return;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    if (width === 0 || height === 0) return;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  animate() {
    if (!this.isAnimating) return;
    requestAnimationFrame(this.animate);
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  clearModel() {
    if (this.currentMesh) {
      this.scene.remove(this.currentMesh);
      if (this.currentMesh.geometry) this.currentMesh.geometry.dispose();
      this.currentMesh = null;
    }
  }

  async loadModel(url, ext) {
    this.clearModel();
    const cleanExt = ext.toLowerCase().replace('.', '');

    return new Promise((resolve, reject) => {
      const onLoad = (object) => {
        let root;
        if (cleanExt === 'stl') {
          object.computeVertexNormals();
          object.center();
          root = new THREE.Mesh(object, this.material);
          root.castShadow = true;
          root.receiveShadow = true;
        } else if (cleanExt === 'obj') {
          object.traverse((child) => {
            if (child.isMesh) {
              child.material = this.material;
              child.castShadow = true;
              child.receiveShadow = true;
            }
          });
          // Center OBJ
          const box = new THREE.Box3().setFromObject(object);
          const center = new THREE.Vector3();
          box.getCenter(center);
          object.position.sub(center);
          root = object;
        }

        this.currentMesh = root;
        this.scene.add(this.currentMesh);

        // Frame and sit on grid
        const bbox = new THREE.Box3().setFromObject(root);
        const size = new THREE.Vector3();
        bbox.getSize(size);
        const maxDim = Math.max(size.x, size.y, size.z) || 50;

        // Position on bed
        root.position.y -= bbox.min.y;

        // Adjust bed grid size to match model scale
        const bedSize = Math.max(200, Math.ceil((maxDim * 2) / 50) * 50);
        this.scene.remove(this.gridHelper);
        this.gridHelper = new THREE.GridHelper(bedSize, 20, 0x4f46e5, 0x27272a);
        this.scene.add(this.gridHelper);

        this.fitCameraToSize(maxDim);
        resolve({ size, maxDim });
      };

      if (cleanExt === 'stl') {
        const loader = new THREE.STLLoader();
        loader.load(url, onLoad, undefined, reject);
      } else if (cleanExt === 'obj') {
        const loader = new THREE.OBJLoader();
        loader.load(url, onLoad, undefined, reject);
      } else {
        reject(new Error('Unsupported file extension: ' + cleanExt));
      }
    });
  }

  fitCameraToSize(maxDim) {
    const dist = maxDim * 2.2;
    this.camera.position.set(dist * 0.9, dist * 0.8, dist * 0.9);
    this.camera.lookAt(0, maxDim * 0.35, 0);
    this.controls.target.set(0, maxDim * 0.35, 0);
    this.controls.update();
  }

  setColor(hex) {
    this.materialColor = hex;
    this.material.color.setHex(hex);
  }

  toggleWireframe() {
    this.isWireframe = !this.isWireframe;
    this.material.wireframe = this.isWireframe;
    return this.isWireframe;
  }

  resetCamera() {
    if (this.currentMesh) {
      const bbox = new THREE.Box3().setFromObject(this.currentMesh);
      const size = new THREE.Vector3();
      bbox.getSize(size);
      const maxDim = Math.max(size.x, size.y, size.z) || 50;
      this.fitCameraToSize(maxDim);
    } else {
      this.camera.position.set(100, 100, 100);
      this.camera.lookAt(0, 0, 0);
      this.controls.target.set(0, 0, 0);
      this.controls.update();
    }
  }

  destroy() {
    this.isAnimating = false;
    if (this.resizeObserver) this.resizeObserver.disconnect();
    this.clearModel();
    if (this.renderer && this.renderer.domElement) {
      this.renderer.dispose();
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
