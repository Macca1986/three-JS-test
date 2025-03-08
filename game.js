import * as THREE from 'three';

class PowerUp {
    constructor(type, position) {
        const geometries = {
            health: new THREE.BoxGeometry(0.6, 0.6, 0.6),
            speed: new THREE.CylinderGeometry(0.3, 0.3, 0.6, 8),
            weapon: new THREE.SphereGeometry(0.3, 8, 8),
            invincibility: new THREE.OctahedronGeometry(0.3)
        };

        const materials = {
            health: new THREE.MeshStandardMaterial({ 
                color: 0x00ff00,
                emissive: 0x00ff00,
                emissiveIntensity: 0.5
            }),
            speed: new THREE.MeshStandardMaterial({ 
                color: 0x00ffff,
                emissive: 0x00ffff,
                emissiveIntensity: 0.5
            }),
            weapon: new THREE.MeshStandardMaterial({ 
                color: 0xff00ff,
                emissive: 0xff00ff,
                emissiveIntensity: 0.5
            }),
            invincibility: new THREE.MeshStandardMaterial({ 
                color: 0xffff00,
                emissive: 0xffff00,
                emissiveIntensity: 0.5
            })
        };

        this.type = type;
        this.mesh = new THREE.Mesh(geometries[type], materials[type]);
        this.mesh.position.copy(position);
        this.mesh.position.y = 0.3;
        this.mesh.castShadow = true;
        this.mesh.isPowerUp = true;
        this.mesh.powerUpType = type;
        
        // Add floating animation
        this.initialY = this.mesh.position.y;
        this.animationOffset = Math.random() * Math.PI * 2;
    }

    update(time) {
        // Floating animation
        this.mesh.position.y = this.initialY + Math.sin(time * 2 + this.animationOffset) * 0.1;
        this.mesh.rotation.y += 0.02;
    }
}

class Target extends THREE.Mesh {
    constructor(type, position) {
        const geometries = {
            basic: new THREE.BoxGeometry(1, 1, 0.1),
            armored: new THREE.BoxGeometry(1.2, 1.2, 0.2),
            splitter: new THREE.OctahedronGeometry(0.6),
            shooter: new THREE.ConeGeometry(0.5, 1, 8),
            fast: new THREE.TorusGeometry(0.5, 0.2, 8, 16)
        };

        const materials = {
            basic: new THREE.MeshStandardMaterial({ 
                color: 0xff0000,
                metalness: 0.5,
                roughness: 0.5,
                emissive: 0xff0000,
                emissiveIntensity: 1
            }),
            armored: new THREE.MeshStandardMaterial({ 
                color: 0x888888,
                metalness: 0.8,
                roughness: 0.2,
                emissive: 0x444444,
                emissiveIntensity: 0.5
            }),
            splitter: new THREE.MeshStandardMaterial({ 
                color: 0xff6600,
                metalness: 0.3,
                roughness: 0.7,
                emissive: 0xff6600,
                emissiveIntensity: 0.8
            }),
            shooter: new THREE.MeshStandardMaterial({ 
                color: 0xff0066,
                metalness: 0.6,
                roughness: 0.4,
                emissive: 0xff0066,
                emissiveIntensity: 0.7
            }),
            fast: new THREE.MeshStandardMaterial({ 
                color: 0x00ffff,
                metalness: 0.4,
                roughness: 0.6,
                emissive: 0x00ffff,
                emissiveIntensity: 0.9
            })
        };

        super(geometries[type], materials[type]);
        
        this.type = type;
        this.position.copy(position);
        this.position.y = 0.1;
        this.castShadow = true;
        this.isTarget = true;

        // Type-specific properties
        switch(type) {
            case 'basic':
                this.maxHealth = 100;
                this.pointValue = 100;
                this.speed = 0.1;
                break;
            case 'armored':
                this.maxHealth = 300;
                this.pointValue = 250;
                this.speed = 0.05;
                break;
            case 'splitter':
                this.maxHealth = 150;
                this.pointValue = 150;
                this.speed = 0.08;
                this.splitCount = 2;
                break;
            case 'shooter':
                this.maxHealth = 200;
                this.pointValue = 200;
                this.speed = 0.06;
                this.lastShotTime = 0;
                this.fireRate = 2000; // ms
                break;
            case 'fast':
                this.maxHealth = 75;
                this.pointValue = 300;
                this.speed = 0.2;
                break;
        }

        this.health = this.maxHealth;
        this.velocity = new THREE.Vector3(
            (Math.random() - 0.5) * this.speed,
            0,
            (Math.random() - 0.5) * this.speed
        );
        this.movementTimer = Math.random() * Math.PI * 2;
    }

    update(time, game) {
        // Type-specific behavior
        switch(this.type) {
            case 'shooter':
                if (time - this.lastShotTime >= this.fireRate) {
                    this.shoot(game);
                    this.lastShotTime = time;
                }
                break;
            case 'fast':
                // Fast targets move more erratically
                if (Math.random() < 0.03) {
                    this.velocity.set(
                        (Math.random() - 0.5) * this.speed * 2,
                        0,
                        (Math.random() - 0.5) * this.speed * 2
                    );
                }
                break;
        }
    }

    shoot(game) {
        const bulletGeometry = new THREE.SphereGeometry(0.15, 8, 8);
        const bulletMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xff0000,
            emissive: 0xff0000,
            emissiveIntensity: 1
        });
        const bullet = new THREE.Mesh(bulletGeometry, bulletMaterial);
        
        bullet.position.copy(this.position);
        
        // Aim at player
        const toPlayer = game.player.position.clone().sub(this.position);
        bullet.velocity = toPlayer.normalize().multiplyScalar(0.3);
        bullet.isEnemyBullet = true;
        
        game.scene.add(bullet);
        game.enemyBullets.push(bullet);
    }

    onHit(game) {
        if (this.type === 'splitter' && this.splitCount > 0) {
            // Create smaller splitter targets
            for (let i = 0; i < 2; i++) {
                const offset = new THREE.Vector3(
                    (Math.random() - 0.5) * 0.5,
                    0,
                    (Math.random() - 0.5) * 0.5
                );
                const newPosition = this.position.clone().add(offset);
                
                const smallerTarget = new Target('splitter', newPosition);
                smallerTarget.scale.multiplyScalar(0.7);
                smallerTarget.maxHealth = this.maxHealth * 0.6;
                smallerTarget.health = smallerTarget.maxHealth;
                smallerTarget.pointValue = this.pointValue * 0.7;
                smallerTarget.splitCount = this.splitCount - 1;
                
                game.scene.add(smallerTarget);
                game.targets.push(smallerTarget);
            }
        }
    }
}

class Game {
    constructor() {
        console.log('Game constructor called');
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87CEEB); // Sky blue background
        
        // Set up camera for top-down view
        const frustumSize = 20; // Size of the visible area
        const aspect = window.innerWidth / window.innerHeight;
        this.camera = new THREE.OrthographicCamera(
            frustumSize * aspect / -2,  // left
            frustumSize * aspect / 2,   // right
            frustumSize / 2,            // top
            frustumSize / -2,           // bottom
            1,                          // near
            1000                        // far
        );
        this.camera.position.set(0, 20, 0);
        this.camera.lookAt(0, 0, 0);
        this.camera.up.set(0, 0, -1);
        
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.shadowMap.enabled = true;
        document.getElementById('game-container').appendChild(this.renderer.domElement);
        console.log('Renderer initialized');

        // Game properties
        this.player = null;
        this.targets = [];
        this.bullets = [];
        this.score = 0;
        this.playerSpeed = 0.1;
        this.bulletSpeed = 5;
        this.isShooting = false;
        this.lastShotTime = 0;
        this.fireRate = 100;
        this.gameStarted = false;
        this.mousePosition = new THREE.Vector3();
        this.aimDirection = new THREE.Vector3();
        this.walls = [];
        this.powerUps = [];
        this.enemyBullets = [];
        this.combo = 0;
        this.lastKillTime = 0;
        this.comboTimer = 2000; // 2 seconds to maintain combo
        this.playerHealth = 100;
        this.maxPlayerHealth = 100;
        this.powerUpEffects = {
            speed: { active: false, endTime: 0 },
            weapon: { active: false, endTime: 0 },
            invincibility: { active: false, endTime: 0 }
        };

        // Add audio context and sound effects
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.sounds = {};
        this.loadSounds();
        
        // Screen shake properties
        this.screenShake = {
            active: false,
            intensity: 0,
            decay: 0.9,
            offset: new THREE.Vector3()
        };

        // Create instructions overlay
        this.createInstructions();
        
        // Create HUD
        this.createHUD();

        this.setupScene();
        this.setupPlayer();
        this.setupControls();
        this.setupEventListeners();
        console.log('Game setup complete');
        this.animate();
    }

    createInstructions() {
        // First, remove any existing instruction elements
        const existingInstructions = document.getElementById('instructions');
        if (existingInstructions) {
            existingInstructions.remove();
        }

        const instructions = document.createElement('div');
        instructions.id = 'instructions';
        instructions.style.position = 'absolute';
        instructions.style.top = '50%';
        instructions.style.left = '50%';
        instructions.style.transform = 'translate(-50%, -50%)';
        instructions.style.color = 'white';
        instructions.style.fontSize = '24px';
        instructions.style.fontFamily = 'Arial, sans-serif';
        instructions.style.textAlign = 'center';
        instructions.style.textShadow = '2px 2px 4px black';
        instructions.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        instructions.style.padding = '20px';
        instructions.style.borderRadius = '10px';
        instructions.style.zIndex = '1000';
        instructions.style.transition = 'opacity 0.3s ease-in-out, visibility 0.3s ease-in-out';
        instructions.style.visibility = 'visible';
        
        instructions.innerHTML = `
            <h2>Game Instructions</h2>
            <p>WASD - Move</p>
            <p>Mouse - Aim</p>
            <p>Click - Shoot</p>
            <p>Collect power-ups to enhance your abilities!</p>
            <p>Click anywhere to start</p>
        `;
        
        document.body.appendChild(instructions);
    }

    setupScene() {
        console.log('Setting up scene');
        // Add ambient light
        const ambientLight = new THREE.AmbientLight(0xffffff, 2);
        this.scene.add(ambientLight);

        // Add directional light
        const directionalLight = new THREE.DirectionalLight(0xffffff, 2);
        directionalLight.position.set(5, 5, 5);
        directionalLight.castShadow = true;
        this.scene.add(directionalLight);

        // Add ground with tilemap
        const groundGeometry = new THREE.PlaneGeometry(40, 40);
        const groundMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x808080,
            side: THREE.DoubleSide,
            metalness: 0.2,
            roughness: 0.8
        });
        const ground = new THREE.Mesh(groundGeometry, groundMaterial);
        ground.rotation.x = -Math.PI / 2;
        ground.receiveShadow = true;
        this.scene.add(ground);

        // Add grid lines
        const gridHelper = new THREE.GridHelper(40, 40, 0x444444, 0x444444);
        gridHelper.position.y = 0.01;
        this.scene.add(gridHelper);

        // Create building layout
        this.createWalls();

        // Add targets (reduced to 5)
        for (let i = 0; i < 5; i++) {
            this.createTarget();
        }
        console.log('Scene setup complete');
    }

    setupPlayer() {
        // Create player group to hold all parts
        this.player = new THREE.Group();
        this.player.position.set(7, 0.1, -7);
        
        // Create body (slightly rounded rectangle)
        const bodyGeometry = new THREE.BoxGeometry(0.6, 0.1, 0.4);
        const bodyMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x3366cc,  // Blue color for the "uniform"
            metalness: 0.3,
            roughness: 0.7
        });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        this.player.add(body);

        // Create head (circle)
        const headGeometry = new THREE.CylinderGeometry(0.15, 0.15, 0.1, 16);
        const headMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xffdbac,  // Skin tone
            metalness: 0.3,
            roughness: 0.7
        });
        const head = new THREE.Mesh(headGeometry, headMaterial);
        head.position.z = -0.25; // Place head at the "top" of the body
        this.player.add(head);

        // Create arms (two rectangles)
        const armGeometry = new THREE.BoxGeometry(0.2, 0.1, 0.15);
        const armMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x3366cc,  // Same as body
            metalness: 0.3,
            roughness: 0.7
        });
        
        // Left arm
        const leftArm = new THREE.Mesh(armGeometry, armMaterial);
        leftArm.position.set(-0.4, 0, 0);
        this.player.add(leftArm);
        
        // Right arm (this will hold the weapon)
        const rightArm = new THREE.Mesh(armGeometry, armMaterial);
        rightArm.position.set(0.4, 0, 0);
        this.player.add(rightArm);

        // Create weapon
        const weaponGeometry = new THREE.BoxGeometry(0.1, 0.1, 0.5);
        const weaponMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x444444,
            metalness: 0.8,
            roughness: 0.2
        });
        this.weapon = new THREE.Mesh(weaponGeometry, weaponMaterial);
        this.weapon.position.set(0.15, 0, 0.2); // Position relative to right arm
        rightArm.add(this.weapon);

        // Add shadow casting to all parts
        this.player.traverse((object) => {
            if (object.isMesh) {
                object.castShadow = true;
            }
        });
        
        this.scene.add(this.player);

        // Create laser pointer
        const laserGeometry = new THREE.BufferGeometry();
        const laserMaterial = new THREE.LineBasicMaterial({ 
            color: 0xff0000,
            linewidth: 2,
            transparent: true,
            opacity: 0.7
        });
        this.laser = new THREE.Line(laserGeometry, laserMaterial);
        this.laser.position.y = 0.1;
        this.scene.add(this.laser);
    }

    createTarget() {
        const types = ['basic', 'armored', 'splitter', 'shooter', 'fast'];
        const weights = [0.4, 0.2, 0.15, 0.15, 0.1]; // Probability weights
        
        // Weighted random selection
        const rand = Math.random();
        let sum = 0;
        let selectedType = types[0];
        for (let i = 0; i < types.length; i++) {
            sum += weights[i];
            if (rand < sum) {
                selectedType = types[i];
                break;
            }
        }
        
        // Define possible spawn rooms (center points of rooms)
        const spawnPoints = [
            { x: -7.5, z: -6.5 },  // Bottom left room
            { x: -7.5, z: 0 },     // Middle left room
            { x: -7.5, z: 6.5 },   // Top left room
            { x: 5, z: 5 },        // Top right room
            { x: 5, z: -5 }        // Bottom right room
        ];
        
        // Choose random spawn point
        const spawn = spawnPoints[Math.floor(Math.random() * spawnPoints.length)];
        const position = new THREE.Vector3(
            spawn.x + (Math.random() - 0.5) * 3,
            0.1,
            spawn.z + (Math.random() - 0.5) * 3
        );
        
        const target = new Target(selectedType, position);
        this.scene.add(target);
        this.targets.push(target);
    }

    setupControls() {
        this.keys = {
            w: false,
            a: false,
            s: false,
            d: false,
            Escape: false
        };
    }

    setupEventListeners() {
        console.log('Setting up event listeners');
        
        // Start game on click
        const startGame = () => {
            if (!this.gameStarted) {
                console.log('Starting game');
                this.gameStarted = true;
                this.audioContext.resume(); // Resume audio context
                const instructions = document.getElementById('instructions');
                if (instructions) {
                    instructions.style.opacity = '0';
                    instructions.style.visibility = 'hidden';
                    instructions.style.pointerEvents = 'none';
                }
            }
        };

        // Handle both click and touch events for starting the game
        document.addEventListener('click', startGame);
        document.addEventListener('touchstart', startGame);

        // Keyboard controls
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                this.gameStarted = false;
                const instructions = document.getElementById('instructions');
                if (instructions) {
                    instructions.style.opacity = '1';
                    instructions.style.visibility = 'visible';
                    instructions.style.pointerEvents = 'auto';
                }
            } else if (this.gameStarted && this.keys.hasOwnProperty(event.key)) {
                this.keys[event.key] = true;
            }
        });

        document.addEventListener('keyup', (event) => {
            if (this.gameStarted && this.keys.hasOwnProperty(event.key)) {
                this.keys[event.key] = false;
            }
        });

        // Mouse movement for rotation
        document.addEventListener('mousemove', (event) => {
            if (this.gameStarted) {
                // Get mouse position in screen space
                const rect = this.renderer.domElement.getBoundingClientRect();
                const x = event.clientX - rect.left;
                const y = event.clientY - rect.top;

                // Create vectors for raycasting
                const mouse = new THREE.Vector2(
                    (x / rect.width) * 2 - 1,
                    -(y / rect.height) * 2 + 1
                );

                // Create a raycaster
                const raycaster = new THREE.Raycaster();
                raycaster.setFromCamera(mouse, this.camera);

                // Calculate the point where the ray intersects the game plane (y = 0.1)
                const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.1);
                const targetPoint = new THREE.Vector3();
                raycaster.ray.intersectPlane(plane, targetPoint);

                // Update mouse position
                this.mousePosition.copy(targetPoint);
            }
        });

        // Shooting
        document.addEventListener('mousedown', () => {
            if (this.gameStarted) {
                console.log('Shooting started');
                this.isShooting = true;
            }
        });

        document.addEventListener('mouseup', () => {
            this.isShooting = false;
        });

        // Touch events for mobile
        let touchStartPos = null;
        document.addEventListener('touchstart', (event) => {
            if (this.gameStarted && event.touches.length === 1) {
                touchStartPos = { x: event.touches[0].clientX, y: event.touches[0].clientY };
                this.isShooting = true;
            }
        });

        document.addEventListener('touchmove', (event) => {
            if (this.gameStarted && event.touches.length === 1) {
                const touch = event.touches[0];
                const rect = this.renderer.domElement.getBoundingClientRect();
                const x = touch.clientX - rect.left;
                const y = touch.clientY - rect.top;

                const mouse = new THREE.Vector2(
                    (x / rect.width) * 2 - 1,
                    -(y / rect.height) * 2 + 1
                );

                const raycaster = new THREE.Raycaster();
                raycaster.setFromCamera(mouse, this.camera);

                const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.1);
                const targetPoint = new THREE.Vector3();
                raycaster.ray.intersectPlane(plane, targetPoint);

                this.mousePosition.copy(targetPoint);

                // Virtual joystick movement
                if (touchStartPos) {
                    const dx = touch.clientX - touchStartPos.x;
                    const dy = touch.clientY - touchStartPos.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    if (distance > 20) { // Minimum distance for movement
                        this.keys.a = dx < -10;
                        this.keys.d = dx > 10;
                        this.keys.w = dy < -10;
                        this.keys.s = dy > 10;
                    }
                }
            }
        });

        document.addEventListener('touchend', () => {
            this.isShooting = false;
            touchStartPos = null;
            // Reset movement keys
            this.keys.w = false;
            this.keys.a = false;
            this.keys.s = false;
            this.keys.d = false;
        });

        // Update window resize handler
        window.addEventListener('resize', () => {
            const width = window.innerWidth;
            const height = window.innerHeight;
            const frustumSize = 20;
            const aspect = width / height;
            
            this.camera.left = frustumSize * aspect / -2;
            this.camera.right = frustumSize * aspect / 2;
            this.camera.top = frustumSize / 2;
            this.camera.bottom = frustumSize / -2;
            this.camera.updateProjectionMatrix();
            
            this.renderer.setSize(width, height);
        });
        console.log('Event listeners setup complete');
    }

    loadSounds() {
        const sounds = {
            shoot: 'data:audio/wav;base64,UklGRqRnAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YYBnAACA',
            hit: 'data:audio/wav;base64,UklGRqRnAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YYBnAACA',
            powerup: 'data:audio/wav;base64,UklGRqRnAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YYBnAACA',
            explosion: 'data:audio/wav;base64,UklGRqRnAABXQVZFZm10IBAAAAABAAEAQB8AAIA+AAACABAAZGF0YYBnAACA'
        };

        for (const [name, base64] of Object.entries(sounds)) {
            fetch(base64)
                .then(response => response.arrayBuffer())
                .then(buffer => this.audioContext.decodeAudioData(buffer))
                .then(audioBuffer => {
                    this.sounds[name] = audioBuffer;
                });
        }
    }

    playSound(name) {
        if (this.sounds[name]) {
            const source = this.audioContext.createBufferSource();
            source.buffer = this.sounds[name];
            source.connect(this.audioContext.destination);
            source.start();
        }
    }

    addScreenShake(intensity = 0.5) {
        this.screenShake.active = true;
        this.screenShake.intensity = intensity;
    }

    updateScreenShake() {
        if (this.screenShake.active) {
            if (this.screenShake.intensity > 0.01) {
                this.screenShake.offset.set(
                    (Math.random() - 0.5) * this.screenShake.intensity,
                    (Math.random() - 0.5) * this.screenShake.intensity,
                    (Math.random() - 0.5) * this.screenShake.intensity
                );
                this.screenShake.intensity *= this.screenShake.decay;
            } else {
                this.screenShake.active = false;
                this.screenShake.offset.set(0, 0, 0);
            }
        }
    }

    createParticleEffect(position, color, count = 20, size = 0.05, speed = 0.1) {
        const particles = [];
        const particleGeometry = new THREE.SphereGeometry(size, 4, 4);
        const particleMaterial = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 1
        });

        for (let i = 0; i < count; i++) {
            const particle = new THREE.Mesh(particleGeometry, particleMaterial.clone());
            particle.position.copy(position);
            
            const angle = Math.random() * Math.PI * 2;
            const elevation = Math.random() * Math.PI * 2;
            particle.velocity = new THREE.Vector3(
                Math.cos(angle) * Math.cos(elevation) * speed,
                Math.sin(elevation) * speed,
                Math.sin(angle) * Math.cos(elevation) * speed
            );
            
            this.scene.add(particle);
            particles.push(particle);
        }

        const animateParticles = () => {
            let alive = false;
            particles.forEach(particle => {
                if (particle.material.opacity > 0) {
                    particle.position.add(particle.velocity);
                    particle.velocity.y -= 0.01; // Gravity
                    particle.material.opacity -= 0.02;
                    alive = true;
                }
            });

            if (alive) {
                requestAnimationFrame(animateParticles);
            } else {
                particles.forEach(particle => this.scene.remove(particle));
            }
        };

        animateParticles();
    }

    shoot() {
        // Create bullet with larger size and brighter appearance
        const bulletGeometry = new THREE.SphereGeometry(0.2, 16, 16);
        const bulletMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xffff00,
            emissive: 0xffff00,
            emissiveIntensity: 2,
            metalness: 0.3,
            roughness: 0.4
        });
        const bullet = new THREE.Mesh(bulletGeometry, bulletMaterial);
        
        // Position bullet at weapon position
        bullet.position.copy(this.weapon.getWorldPosition(new THREE.Vector3()));
        bullet.position.y = 0.1;
        
        // Set bullet velocity using stored aim direction
        bullet.velocity = this.aimDirection.clone().multiplyScalar(this.bulletSpeed);
        
        this.scene.add(bullet);
        this.bullets.push(bullet);

        // Add muzzle flash effect
        this.createParticleEffect(
            bullet.position,
            0xffff00,
            10,
            0.1,
            0.2
        );

        // Add screen shake
        this.addScreenShake(0.1);

        // Play sound
        this.playSound('shoot');
    }

    updatePlayer() {
        if (!this.gameStarted) return;

        // Calculate movement direction
        const moveDirection = new THREE.Vector3();
        if (this.keys.w) moveDirection.z -= 1;
        if (this.keys.s) moveDirection.z += 1;
        if (this.keys.a) moveDirection.x -= 1;
        if (this.keys.d) moveDirection.x += 1;
        
        if (moveDirection.length() > 0) {
            moveDirection.normalize();
            // Calculate new position
            const newPosition = this.player.position.clone().add(moveDirection.multiplyScalar(this.playerSpeed));
            
            // Only update if no wall collision
            if (!this.checkWallCollision(newPosition)) {
                this.player.position.copy(newPosition);
            }
        }
    }

    updateTargets() {
        const currentTime = Date.now();
        const playArea = 15;

        for (const target of this.targets) {
            const oldPosition = target.position.clone();
            
            // Update target position based on velocity
            target.position.add(target.velocity);
            
            // Add some circular motion
            target.movementTimer += 0.02;
            target.position.x += Math.sin(target.movementTimer) * 0.02;
            target.position.z += Math.cos(target.movementTimer) * 0.02;
            
            // Check for wall collisions
            if (this.checkWallCollision(target.position)) {
                // Restore position and reverse velocity
                target.position.copy(oldPosition);
                target.velocity.multiplyScalar(-1);
                target.movementTimer += Math.PI; // Reverse circular motion
            }
            
            // Keep within play area
            if (Math.abs(target.position.x) > playArea || Math.abs(target.position.z) > playArea) {
                target.position.copy(oldPosition);
                target.velocity.multiplyScalar(-1);
            }

            // Update target-specific behavior
            target.update(currentTime, this);
        }

        // Spawn new targets if needed
        if (this.targets.length < 5) {
            this.createTarget();
        }
    }

    updateBullets() {
        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const bullet = this.bullets[i];
            
            // Store previous position for collision detection
            const previousPosition = bullet.position.clone();
            
            // Calculate new position
            const newPosition = bullet.position.clone().add(bullet.velocity);
            
            // Check for wall collisions first
            if (this.checkWallCollision(newPosition)) {
                // Remove bullet if it hits a wall
                this.scene.remove(bullet);
                this.bullets.splice(i, 1);
                
                // Create impact effect
                this.createParticleEffect(
                    previousPosition,
                    0xffff00,
                    15,
                    0.05,
                    0.15
                );
                
                // Add screen shake
                this.addScreenShake(0.2);
                
                // Play sound
                this.playSound('hit');
                continue;
            }
            
            // Update bullet position if no wall collision
            bullet.position.copy(newPosition);

            // Check for collisions with targets
            for (let j = this.targets.length - 1; j >= 0; j--) {
                const target = this.targets[j];
                if (this.checkCollision(previousPosition, bullet.position, target)) {
                    // Create hit effect
                    this.createParticleEffect(
                        target.position,
                        0xff0000,
                        20,
                        0.08,
                        0.2
                    );
                    
                    // Add screen shake
                    this.addScreenShake(0.3);
                    
                    // Play sound
                    this.playSound('hit');

                    // Apply damage and check for power-up weapon bonus
                    const damage = this.powerUpEffects.weapon.active ? 50 : 25;
                    target.health -= damage;
                    
                    if (target.health <= 0) {
                        // Create explosion effect
                        this.createParticleEffect(
                            target.position,
                            0xff6600,
                            30,
                            0.1,
                            0.3
                        );
                        
                        // Add major screen shake
                        this.addScreenShake(0.5);
                        
                        // Play explosion sound
                        this.playSound('explosion');

                        // Handle target death
                        target.onHit(this);
                        this.scene.remove(target);
                        this.targets.splice(j, 1);
                        
                        // Update score and combo
                        this.combo++;
                        const comboMultiplier = Math.min(this.combo, 10);
                        this.score += target.pointValue * comboMultiplier;
                        this.lastKillTime = Date.now();
                        
                        document.getElementById('score').textContent = `Score: ${this.score}`;
                        
                        // Chance to spawn power-up
                        if (Math.random() < 0.3) {
                            this.spawnPowerUp(target.position);
                        }
                    } else {
                        // Visual feedback for hit
                        target.material.color.setHex(0x00ff00);
                        setTimeout(() => {
                            target.material.color.setHex(0xff0000);
                        }, 100);
                    }
                    
                    this.scene.remove(bullet);
                    this.bullets.splice(i, 1);
                    break;
                }
            }

            // Check for power-up collisions
            for (let j = this.powerUps.length - 1; j >= 0; j--) {
                const powerUp = this.powerUps[j];
                const distance = bullet.position.distanceTo(powerUp.mesh.position);
                if (distance < 0.5) {
                    this.collectPowerUp(powerUp);
                    this.scene.remove(powerUp.mesh);
                    this.powerUps.splice(j, 1);
                    this.scene.remove(bullet);
                    this.bullets.splice(i, 1);
                    
                    // Play power-up sound
                    this.playSound('powerup');
                    break;
                }
            }

            // Remove bullets that have traveled too far
            if (bullet.position.length() > 50) {
                this.scene.remove(bullet);
                this.bullets.splice(i, 1);
            }
        }
    }

    checkCollision(start, end, target) {
        // First check if there's a wall between the bullet and the target
        const toTarget = target.position.clone().sub(start);
        const bulletPath = end.clone().sub(start);
        const bulletLength = bulletPath.length();
        
        // Check for wall intersections along the bullet path
        const rayStart = new THREE.Vector2(start.x, start.z);
        const rayEnd = new THREE.Vector2(end.x, end.z);
        const rayDir = rayEnd.clone().sub(rayStart).normalize();
        
        for (const wall of this.walls) {
            const wallStart = wall.userData.start;
            const wallEnd = wall.userData.end;
            
            // Check line segment intersection between bullet path and wall
            const intersection = this.lineIntersection(
                rayStart, rayEnd,
                wallStart, wallEnd
            );
            
            if (intersection) {
                // If there's a wall intersection, no hit possible
                return false;
            }
        }

        // If no walls are in the way, proceed with normal collision check
        const direction = bulletPath.normalize();
        const toTargetLength = toTarget.length();
        
        // Project the vector to target onto the bullet's direction
        const projection = toTarget.dot(direction);
        
        // If the projection is negative or greater than the bullet's path length,
        // the target is not in the bullet's path
        if (projection < 0 || projection > bulletLength) {
            return false;
        }

        // Calculate the closest point on the bullet's path to the target
        const closestPoint = start.clone().add(direction.multiplyScalar(projection));
        
        // Calculate the distance from the closest point to the target
        const distance = closestPoint.distanceTo(target.position);
        
        // Check if the distance is within the target's hitbox (0.5 units radius)
        return distance < 0.5;
    }

    // Helper function to check if two line segments intersect
    lineIntersection(p1, p2, p3, p4) {
        const denominator = (p4.y - p3.y) * (p2.x - p1.x) - (p4.x - p3.x) * (p2.y - p1.y);
        
        // Lines are parallel
        if (denominator === 0) {
            return false;
        }
        
        const ua = ((p4.x - p3.x) * (p1.y - p3.y) - (p4.y - p3.y) * (p1.x - p3.x)) / denominator;
        const ub = ((p2.x - p1.x) * (p1.y - p3.y) - (p2.y - p1.y) * (p1.x - p3.x)) / denominator;
        
        // Check if intersection point lies within both line segments
        return ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1;
    }

    updateShooting() {
        if (this.isShooting) {
            const currentTime = Date.now();
            if (currentTime - this.lastShotTime >= this.fireRate) {
                this.shoot();
                this.lastShotTime = currentTime;
            }
        }
    }

    updateAiming() {
        if (!this.gameStarted) return;

        // Calculate direction from player to mouse
        const toMouse = this.mousePosition.clone().sub(this.player.position);
        
        // Update aim direction (used for shooting)
        this.aimDirection.copy(toMouse).normalize();
        
        // Calculate angle for player rotation
        const angle = Math.atan2(toMouse.x, toMouse.z);
        this.player.rotation.y = angle;
        
        // Update laser pointer
        const laserStart = this.player.position.clone();
        const laserDirection = toMouse.normalize();
        
        // Find the closest wall intersection
        let closestIntersection = null;
        let minDistance = Infinity;
        const rayStart = new THREE.Vector2(laserStart.x, laserStart.z);
        
        // Extend the ray in the correct direction
        const rayEnd = new THREE.Vector2(
            rayStart.x + laserDirection.x * 100,
            rayStart.z + laserDirection.z * 100  // Fixed: using z component instead of y
        );
        
        for (const wall of this.walls) {
            const wallStart = wall.userData.start;
            const wallEnd = wall.userData.end;
            
            const intersection = this.lineIntersection(
                rayStart, rayEnd,
                wallStart, wallEnd
            );
            
            if (intersection) {
                // Calculate actual intersection point
                const t = ((wallStart.x - rayStart.x) * (wallStart.y - wallEnd.y) - 
                          (wallStart.y - rayStart.y) * (wallStart.x - wallEnd.x)) /
                         ((rayStart.x - rayEnd.x) * (wallStart.y - wallEnd.y) - 
                          (rayStart.y - rayEnd.y) * (wallStart.x - wallEnd.x));
                
                const intersectionPoint = new THREE.Vector2(
                    rayStart.x + t * (rayEnd.x - rayStart.x),
                    rayStart.y + t * (rayEnd.y - rayStart.y)
                );
                
                const distance = rayStart.distanceTo(intersectionPoint);
                if (distance < minDistance) {
                    minDistance = distance;
                    closestIntersection = intersectionPoint;
                }
            }
        }
        
        // Create laser points array
        let laserPoints;
        if (closestIntersection) {
            // If there's a wall intersection, stop the laser there
            laserPoints = new Float32Array([
                laserStart.x, 0.1, laserStart.z,
                closestIntersection.x, 0.1, closestIntersection.y
            ]);
        } else {
            // If no wall intersection, extend laser far in the aim direction
            const laserEnd = new THREE.Vector3(
                laserStart.x + laserDirection.x * 100,
                0.1,
                laserStart.z + laserDirection.z * 100  // Fixed: using z component instead of y
            );
            laserPoints = new Float32Array([
                laserStart.x, 0.1, laserStart.z,
                laserEnd.x, 0.1, laserEnd.z
            ]);
        }
        
        // Update laser geometry
        this.laser.geometry.setAttribute('position', new THREE.BufferAttribute(laserPoints, 3));
        this.laser.geometry.attributes.position.needsUpdate = true;
    }

    createWalls() {
        const wallHeight = 2;
        const wallThickness = 0.2;
        const wallMaterial = new THREE.MeshStandardMaterial({
            color: 0x8b4513,
            metalness: 0.2,
            roughness: 0.8
        });

        // Define wall segments [startX, startZ, endX, endZ]
        const wallSegments = [
            // Outer walls
            [-10, -10, 10, -10],  // Bottom
            [-10, 10, 10, 10],    // Top
            [-10, -10, -10, 10],  // Left
            [10, -10, 10, 10],    // Right

            // Inner walls - Bottom section
            [-10, -3, -6, -3],    // Bottom room divider left
            [-2, -3, 0, -3],      // Bottom room divider right
            
            // Inner walls - Top section
            [-10, 3, -6, 3],      // Top room divider left
            [-2, 3, 0, 3],        // Top room divider right
            
            // Vertical dividers
            [0, -10, 0, -5],      // Middle vertical wall bottom
            [0, -1, 0, 1],        // Middle doorway walls
            [0, 5, 0, 10],        // Middle vertical wall top
            
            // Left section divider with doorway
            [-5, -3, -5, -1],     // Bottom part
            [-5, 1, -5, 3],       // Top part
            
            // Right section divider with doorway
            [0, 0, 3, 0],         // Left part
            [7, 0, 10, 0],        // Right part
        ];

        wallSegments.forEach(([x1, z1, x2, z2]) => {
            const length = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(z2 - z1, 2));
            const wallGeometry = new THREE.BoxGeometry(length, wallHeight, wallThickness);
            const wall = new THREE.Mesh(wallGeometry, wallMaterial);
            
            // Position wall at midpoint
            wall.position.set((x1 + x2) / 2, wallHeight / 2, (z1 + z2) / 2);
            
            // Rotate wall to align with segment
            const angle = Math.atan2(z2 - z1, x2 - x1);
            wall.rotation.y = angle;
            
            wall.castShadow = true;
            wall.receiveShadow = true;
            
            // Store wall data for collision detection
            wall.userData.start = new THREE.Vector2(x1, z1);
            wall.userData.end = new THREE.Vector2(x2, z2);
            
            this.scene.add(wall);
            this.walls.push(wall);
        });
    }

    checkWallCollision(position, radius = 0.5) {
        const wallThickness = 0.2; // Define wallThickness here
        for (const wall of this.walls) {
            const start = wall.userData.start;
            const end = wall.userData.end;
            
            // Calculate closest point on wall segment to position
            const wallVector = end.clone().sub(start);
            const wallLength = wallVector.length();
            const wallDirection = wallVector.normalize();
            
            const toPosition = new THREE.Vector2(position.x, position.z).sub(start);
            const projection = toPosition.dot(wallDirection);
            
            if (projection >= 0 && projection <= wallLength) {
                const closestPoint = start.clone().add(wallDirection.multiplyScalar(projection));
                const distance = new THREE.Vector2(position.x, position.z).distanceTo(closestPoint);
                
                if (distance < radius + wallThickness / 2) {
                    return true; // Collision detected
                }
            }
        }
        return false;
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        if (this.gameStarted) {
            const currentTime = Date.now();
            
            // Update screen shake
            this.updateScreenShake();
            if (this.screenShake.active) {
                this.camera.position.add(this.screenShake.offset);
            }
            
            this.updateAiming();
            this.updatePlayer();
            this.updateTargets();
            this.updateBullets();
            this.updateEnemyBullets();
            this.updateShooting();
            this.updatePowerUps(currentTime);
            this.updateCombo();
            this.updateHUD();
            
            // Reset camera position after screen shake
            if (this.screenShake.active) {
                this.camera.position.sub(this.screenShake.offset);
            }
        }
        this.renderer.render(this.scene, this.camera);
    }

    createHUD() {
        const hud = document.createElement('div');
        hud.style.position = 'absolute';
        hud.style.top = '20px';
        hud.style.left = '20px';
        hud.style.color = 'white';
        hud.style.fontFamily = 'Arial, sans-serif';
        hud.style.fontSize = '20px';
        hud.style.textShadow = '2px 2px 2px black';
        
        const healthBar = document.createElement('div');
        healthBar.id = 'health-bar';
        healthBar.style.width = '200px';
        healthBar.style.height = '20px';
        healthBar.style.border = '2px solid white';
        healthBar.style.marginBottom = '10px';
        
        const healthFill = document.createElement('div');
        healthFill.id = 'health-fill';
        healthFill.style.width = '100%';
        healthFill.style.height = '100%';
        healthFill.style.backgroundColor = '#00ff00';
        healthFill.style.transition = 'width 0.3s';
        
        const comboText = document.createElement('div');
        comboText.id = 'combo-text';
        
        healthBar.appendChild(healthFill);
        hud.appendChild(healthBar);
        hud.appendChild(comboText);
        document.body.appendChild(hud);
    }

    updateHUD() {
        const healthFill = document.getElementById('health-fill');
        const comboText = document.getElementById('combo-text');
        
        healthFill.style.width = `${(this.playerHealth / this.maxPlayerHealth) * 100}%`;
        healthFill.style.backgroundColor = this.powerUpEffects.invincibility.active ? '#ffff00' : '#00ff00';
        
        if (this.combo > 1) {
            comboText.textContent = `Combo x${this.combo}!`;
            comboText.style.color = '#ff00ff';
        } else {
            comboText.textContent = '';
        }
    }

    spawnPowerUp(position) {
        const types = ['health', 'speed', 'weapon', 'invincibility'];
        const type = types[Math.floor(Math.random() * types.length)];
        const powerUp = new PowerUp(type, position);
        this.scene.add(powerUp.mesh);
        this.powerUps.push(powerUp);
    }

    updatePowerUps(time) {
        // Update existing power-ups
        for (let i = this.powerUps.length - 1; i >= 0; i--) {
            const powerUp = this.powerUps[i];
            powerUp.update(time);
        }

        // Check for power-up effects expiration
        const currentTime = Date.now();
        for (const [effect, data] of Object.entries(this.powerUpEffects)) {
            if (data.active && currentTime > data.endTime) {
                data.active = false;
                
                // Reset affected properties
                switch(effect) {
                    case 'speed':
                        this.playerSpeed = 0.1;
                        break;
                    case 'weapon':
                        this.fireRate = 100;
                        break;
                }
            }
        }

        // Randomly spawn new power-ups
        if (Math.random() < 0.001) { // 0.1% chance per frame
            const position = this.getRandomSpawnPosition();
            this.spawnPowerUp(position);
        }
    }

    collectPowerUp(powerUp) {
        const currentTime = Date.now();
        const duration = 10000; // 10 seconds
        
        switch(powerUp.type) {
            case 'health':
                this.playerHealth = Math.min(this.maxPlayerHealth, this.playerHealth + 50);
                break;
            case 'speed':
                this.powerUpEffects.speed.active = true;
                this.powerUpEffects.speed.endTime = currentTime + duration;
                this.playerSpeed = 0.2;
                break;
            case 'weapon':
                this.powerUpEffects.weapon.active = true;
                this.powerUpEffects.weapon.endTime = currentTime + duration;
                this.fireRate = 50;
                break;
            case 'invincibility':
                this.powerUpEffects.invincibility.active = true;
                this.powerUpEffects.invincibility.endTime = currentTime + duration;
                break;
        }
        
        // Create collection effect
        this.createPowerUpEffect(powerUp.mesh.position);
    }

    createPowerUpEffect(position) {
        const particles = [];
        const particleCount = 20;
        const particleGeometry = new THREE.SphereGeometry(0.05, 4, 4);
        const particleMaterial = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 1
        });

        for (let i = 0; i < particleCount; i++) {
            const particle = new THREE.Mesh(particleGeometry, particleMaterial.clone());
            particle.position.copy(position);
            
            const angle = (i / particleCount) * Math.PI * 2;
            const speed = 0.1;
            particle.velocity = new THREE.Vector3(
                Math.cos(angle) * speed,
                0.1,
                Math.sin(angle) * speed
            );
            
            this.scene.add(particle);
            particles.push(particle);
        }

        const animateParticles = () => {
            let alive = false;
            particles.forEach(particle => {
                if (particle.material.opacity > 0) {
                    particle.position.add(particle.velocity);
                    particle.material.opacity -= 0.02;
                    alive = true;
                }
            });

            if (alive) {
                requestAnimationFrame(animateParticles);
            } else {
                particles.forEach(particle => this.scene.remove(particle));
            }
        };

        animateParticles();
    }

    updateCombo() {
        const currentTime = Date.now();
        if (currentTime - this.lastKillTime > this.comboTimer) {
            this.combo = 0;
        }
    }

    updateEnemyBullets() {
        for (let i = this.enemyBullets.length - 1; i >= 0; i--) {
            const bullet = this.enemyBullets[i];
            
            // Store previous position for collision detection
            const previousPosition = bullet.position.clone();
            
            // Update position
            bullet.position.add(bullet.velocity);
            
            // Check for wall collisions
            if (this.checkWallCollision(bullet.position)) {
                this.scene.remove(bullet);
                this.enemyBullets.splice(i, 1);
                continue;
            }
            
            // Check for collision with player
            const distanceToPlayer = bullet.position.distanceTo(this.player.position);
            if (distanceToPlayer < 0.5) {
                if (!this.powerUpEffects.invincibility.active) {
                    this.playerHealth -= 10;
                    if (this.playerHealth <= 0) {
                        this.gameOver();
                    }
                }
                this.scene.remove(bullet);
                this.enemyBullets.splice(i, 1);
                continue;
            }
            
            // Remove bullets that have traveled too far
            if (bullet.position.length() > 50) {
                this.scene.remove(bullet);
                this.enemyBullets.splice(i, 1);
            }
        }
    }

    gameOver() {
        this.gameStarted = false;
        
        // Create game over screen
        const gameOverDiv = document.createElement('div');
        gameOverDiv.style.position = 'absolute';
        gameOverDiv.style.top = '50%';
        gameOverDiv.style.left = '50%';
        gameOverDiv.style.transform = 'translate(-50%, -50%)';
        gameOverDiv.style.color = 'white';
        gameOverDiv.style.fontSize = '48px';
        gameOverDiv.style.fontFamily = 'Arial, sans-serif';
        gameOverDiv.style.textAlign = 'center';
        gameOverDiv.style.textShadow = '2px 2px 4px black';
        
        gameOverDiv.innerHTML = `
            <h1>Game Over</h1>
            <p>Final Score: ${this.score}</p>
            <button onclick="location.reload()" style="
                font-size: 24px;
                padding: 10px 20px;
                background-color: #ff4444;
                color: white;
                border: none;
                border-radius: 5px;
                cursor: pointer;
                margin-top: 20px;
            ">Play Again</button>
        `;
        
        document.body.appendChild(gameOverDiv);
    }

    getRandomSpawnPosition() {
        const spawnPoints = [
            { x: -7.5, z: -6.5 },  // Bottom left room
            { x: -7.5, z: 0 },     // Middle left room
            { x: -7.5, z: 6.5 },   // Top left room
            { x: 5, z: 5 },        // Top right room
            { x: 5, z: -5 }        // Bottom right room
        ];
        
        const spawn = spawnPoints[Math.floor(Math.random() * spawnPoints.length)];
        return new THREE.Vector3(
            spawn.x + (Math.random() - 0.5) * 3,
            0.1,
            spawn.z + (Math.random() - 0.5) * 3
        );
    }
}

// Initialize game
const game = new Game(); 