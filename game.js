import * as THREE from 'three';

class Game {
    constructor() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        document.getElementById('game-container').appendChild(this.renderer.domElement);

        // Player properties
        this.player = new THREE.Group();
        this.playerSpeed = 0.1;
        this.playerRotationSpeed = 0.02;
        this.cameraOffset = new THREE.Vector3(0, 2, 5);
        
        // Mouse control
        this.mouseX = 0;
        this.mouseY = 0;
        this.isPointerLocked = false;

        // Game objects
        this.obstacles = [];
        this.bullets = [];

        this.setupScene();
        this.setupPlayer();
        this.setupControls();
        this.setupEventListeners();
        this.animate();
    }

    setupScene() {
        // Add ambient light
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
        this.scene.add(ambientLight);

        // Add directional light
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(5, 5, 5);
        this.scene.add(directionalLight);

        // Add ground
        const groundGeometry = new THREE.PlaneGeometry(100, 100);
        const groundMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x808080,
            side: THREE.DoubleSide
        });
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        this.scene.add(ground);

        // Add some obstacles
        for (let i = 0; i < 10; i++) {
            const boxGeometry = new THREE.BoxGeometry(1, 2, 1);
            const boxMaterial = new THREE.MeshStandardMaterial({ color: 0x8b4513 });
            const box = new THREE.Mesh(boxGeometry, boxMaterial);
            box.position.x = (Math.random() - 0.5) * 20;
            box.position.z = (Math.random() - 0.5) * 20;
            box.position.y = 1;
            this.scene.add(box);
            this.obstacles.push(box);
        }
    }

    setupPlayer() {
        // Create player body
        const bodyGeometry = new THREE.CylinderGeometry(0.5, 0.5, 2, 8);
        const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = 1;
        this.player.add(body);

        // Create player head
        const headGeometry = new THREE.SphereGeometry(0.3, 8, 8);
        const headMaterial = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
        const head = new THREE.Mesh(headGeometry, headMaterial);
        head.position.y = 2;
        this.player.add(head);

        this.scene.add(this.player);
        this.camera.position.copy(this.player.position).add(this.cameraOffset);
    }

    setupControls() {
        this.keys = {
            w: false,
            a: false,
            s: false,
            d: false
        };
    }

    setupEventListeners() {
        // Mouse movement
        document.addEventListener('mousemove', (event) => {
            if (this.isPointerLocked) {
                this.mouseX += event.movementX * this.playerRotationSpeed;
                this.mouseY += event.movementY * this.playerRotationSpeed;
                this.mouseY = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.mouseY));
            }
        });

        // Pointer lock
        document.addEventListener('click', () => {
            if (!this.isPointerLocked) {
                document.body.requestPointerLock();
            }
        });

        document.addEventListener('pointerlockchange', () => {
            this.isPointerLocked = document.pointerLockElement !== null;
        });

        // Keyboard controls
        document.addEventListener('keydown', (event) => {
            if (this.keys.hasOwnProperty(event.key)) {
                this.keys[event.key] = true;
            }
        });

        document.addEventListener('keyup', (event) => {
            if (this.keys.hasOwnProperty(event.key)) {
                this.keys[event.key] = false;
            }
        });

        // Shooting
        document.addEventListener('mousedown', () => {
            if (this.isPointerLocked) {
                this.shoot();
            }
        });

        // Window resize
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });
    }

    shoot() {
        // Create bullet
        const bulletGeometry = new THREE.SphereGeometry(0.1, 8, 8);
        const bulletMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 });
        const bullet = new THREE.Mesh(bulletGeometry, bulletMaterial);
        bullet.position.copy(this.player.position);
        
        // Set bullet direction
        const direction = new THREE.Vector3();
        this.camera.getWorldDirection(direction);
        bullet.velocity = direction.multiplyScalar(2);
        
        this.scene.add(bullet);
        this.bullets.push(bullet);
    }

    updatePlayer() {
        // Update player rotation based on mouse movement
        this.player.rotation.y = this.mouseX;
        this.camera.rotation.x = this.mouseY;

        // Update player position based on keyboard input
        const moveDirection = new THREE.Vector3();
        if (this.keys.w) moveDirection.z -= 1;
        if (this.keys.s) moveDirection.z += 1;
        if (this.keys.a) moveDirection.x -= 1;
        if (this.keys.d) moveDirection.x += 1;
        moveDirection.normalize();

        // Apply movement relative to player rotation
        moveDirection.applyQuaternion(this.player.quaternion);
        this.player.position.add(moveDirection.multiplyScalar(this.playerSpeed));

        // Update camera position
        this.camera.position.copy(this.player.position).add(this.cameraOffset);
    }

    updateBullets() {
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const bullet = this.bullets[i];
            bullet.position.add(bullet.velocity);

            // Remove bullets that have traveled too far
            if (bullet.position.length() > 100) {
                this.scene.remove(bullet);
                this.bullets.splice(i, 1);
            }
        }
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        this.updatePlayer();
        this.updateBullets();
        this.renderer.render(this.scene, this.camera);
    }
}

// Initialize game
const game = new Game(); 