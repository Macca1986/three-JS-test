import * as THREE from 'three';

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

        this.setupScene();
        this.setupPlayer();
        this.setupControls();
        this.setupEventListeners();
        console.log('Game setup complete');
        this.animate();
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
        // Create player body
        const playerGeometry = new THREE.BoxGeometry(1, 1, 0.1);
        const playerMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x00ff00,
            emissive: 0x00ff00,
            emissiveIntensity: 1,
            metalness: 0.5,
            roughness: 0.5
        });
        this.player = new THREE.Mesh(playerGeometry, playerMaterial);
        // Set spawn position in the bottom-right room
        this.player.position.set(7, 0.1, -7);
        this.player.castShadow = true;
        this.scene.add(this.player);

        // Create weapon
        const weaponGeometry = new THREE.BoxGeometry(0.2, 0.8, 0.1);
        const weaponMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x444444,
            emissive: 0x222222,
            emissiveIntensity: 0.5
        });
        this.weapon = new THREE.Mesh(weaponGeometry, weaponMaterial);
        this.weapon.position.set(0, 0, 0);
        this.player.add(this.weapon);

        // Create laser pointer with two segments
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
        const targetGeometry = new THREE.BoxGeometry(1, 1, 0.1);
        const targetMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xff0000,
            metalness: 0.5,
            roughness: 0.5,
            emissive: 0xff0000,
            emissiveIntensity: 1
        });
        const target = new THREE.Mesh(targetGeometry, targetMaterial);
        
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
        
        // Add some randomness to the exact position within the room
        target.position.x = spawn.x + (Math.random() - 0.5) * 3;
        target.position.z = spawn.z + (Math.random() - 0.5) * 3;
        target.position.y = 0.1;
        
        // Add movement properties
        target.velocity = new THREE.Vector3(
            (Math.random() - 0.5) * 0.1,
            0,
            (Math.random() - 0.5) * 0.1
        );
        target.movementTimer = Math.random() * Math.PI * 2;
        
        target.castShadow = true;
        target.maxHealth = 100;
        target.health = target.maxHealth;
        target.isTarget = true;
        
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
        document.addEventListener('click', () => {
            console.log('Click detected');
            if (!this.gameStarted) {
                console.log('Starting game');
                this.gameStarted = true;
                document.getElementById('instructions').classList.add('hidden');
            }
        });

        // Keyboard controls
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                this.gameStarted = false;
                document.getElementById('instructions').classList.remove('hidden');
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

    shoot() {
        // Create bullet with larger size and brighter appearance
        const bulletGeometry = new THREE.SphereGeometry(0.2, 16, 16); // Increased size and segments
        const bulletMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xffff00,
            emissive: 0xffff00,
            emissiveIntensity: 2, // Increased brightness
            metalness: 0.3,
            roughness: 0.4
        });
        const bullet = new THREE.Mesh(bulletGeometry, bulletMaterial);
        
        // Position bullet at player position
        bullet.position.copy(this.player.position);
        bullet.position.y = 0.1; // Same height as player
        
        // Set bullet velocity using stored aim direction
        bullet.velocity = this.aimDirection.clone().multiplyScalar(this.bulletSpeed);
        
        this.scene.add(bullet);
        this.bullets.push(bullet);
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

            // Randomly change direction occasionally
            if (Math.random() < 0.01) {
                target.velocity.set(
                    (Math.random() - 0.5) * 0.1,
                    0,
                    (Math.random() - 0.5) * 0.1
                );
            }
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
                
                // Create impact effect (yellow flash)
                const impactGeometry = new THREE.SphereGeometry(0.3, 16, 16);
                const impactMaterial = new THREE.MeshBasicMaterial({
                    color: 0xffff00,
                    transparent: true,
                    opacity: 1
                });
                const impact = new THREE.Mesh(impactGeometry, impactMaterial);
                impact.position.copy(previousPosition);
                this.scene.add(impact);
                
                // Fade out and remove impact effect
                const fadeOut = () => {
                    impactMaterial.opacity -= 0.1;
                    if (impactMaterial.opacity <= 0) {
                        this.scene.remove(impact);
                    } else {
                        requestAnimationFrame(fadeOut);
                    }
                };
                fadeOut();
                continue;
            }
            
            // Update bullet position if no wall collision
            bullet.position.copy(newPosition);

            // Check for collisions with targets
            for (let j = this.targets.length - 1; j >= 0; j--) {
                const target = this.targets[j];
                if (this.checkCollision(previousPosition, bullet.position, target)) {
                    // Target hit! Create hit effect
                    const hitEffect = new THREE.Mesh(
                        new THREE.SphereGeometry(0.4, 16, 16),
                        new THREE.MeshBasicMaterial({
                            color: 0xff0000,
                            transparent: true,
                            opacity: 1
                        })
                    );
                    hitEffect.position.copy(target.position);
                    this.scene.add(hitEffect);
                    
                    // Fade out hit effect
                    const fadeOut = () => {
                        hitEffect.material.opacity -= 0.1;
                        if (hitEffect.material.opacity <= 0) {
                            this.scene.remove(hitEffect);
                        } else {
                            requestAnimationFrame(fadeOut);
                        }
                    };
                    fadeOut();

                    target.health -= 25;
                    if (target.health <= 0) {
                        this.scene.remove(target);
                        this.targets.splice(j, 1);
                        this.score += 100;
                        document.getElementById('score').textContent = `Score: ${this.score}`;
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
        
        // Calculate the laser end point by extending beyond the mouse position
        const laserDirection = toMouse.normalize();
        const laserEnd = laserStart.clone().add(laserDirection.multiplyScalar(40)); // Extend well beyond mouse position
        
        const laserPoints = new Float32Array([
            laserStart.x, 0.1, laserStart.z,
            this.mousePosition.x, 0.1, this.mousePosition.z,  // First segment ends at mouse position
            this.mousePosition.x, 0.1, this.mousePosition.z,  // Second segment starts at mouse position
            laserEnd.x, 0.1, laserEnd.z                      // Extend beyond mouse position
        ]);
        
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
            this.updateAiming();
            this.updatePlayer();
            this.updateTargets();
            this.updateBullets();
            this.updateShooting();
        }
        this.renderer.render(this.scene, this.camera);
    }
}

// Initialize game
const game = new Game(); 