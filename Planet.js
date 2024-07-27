import * as THREE from 'three';
import * as CANNON from 'cannon-es';

class Planet {
  constructor(options) {
    this.name = options.name;
    this.position = options.position;
    this.simSpeed = options.simSpeed;
    this.color = options.color;

    this.maxOrbitDistance = options.maxOrbitDistance;

    this.initialVelocity = options.initialVelocity || new CANNON.Vec3(0, 0, 0);

    this.initialVelocity = this.initialVelocity.scale(this.simSpeed);
    this.initialAngularVelocity = options.initialAngularVelocity || new CANNON.Vec3(0, 0, 0);
    this.initialAngularVelocity = this.initialAngularVelocity.scale(this.simSpeed);
    this.scene = options.scene;
    this.world = options.world;
    this.meshMap = options.meshMap;
    this.radius = options.radius;
    this.gravityScale = options.gravityScale;;
    this.gravityRadius = options.gravityRadius;
    this.mass = options.mass;
    this.fixed = options.fixed;

    this.createBody();
  }

    createBody() {
        this.body = new CANNON.Body({
            mass: this.mass,
            position: this.position,
            shape: new CANNON.Sphere(this.radius),
            fixedRotation: false,
            type: CANNON.Body.KINEMATIC
        });

    
        this.world.addBody(this.body);

        this.body.radius = this.radius;
        this.body.gravityScale = this.gravityScale;
        this.body.gravityRadius = this.gravityRadius;

        this.body.maxOrbitDistance = this.maxOrbitDistance;

        console.log(this.body);

    
        this.mesh = new THREE.Mesh(
            new THREE.IcosahedronGeometry(this.radius, 16),
            new THREE.MeshStandardMaterial({ color: this.color, metalness: 0.5, roughness: .5 })
        );
        this.mesh.castShadow = true;
        this.mesh.receiveShadow = true;

        let planetNormal = new THREE.TextureLoader().load('./planet_normal.jpg');
        planetNormal.wrapS = planetNormal.wrapT = THREE.RepeatWrapping;
        planetNormal.repeat.set(8, 8);
        this.mesh.material.normalMap = planetNormal;
        let planetDisplacement = new THREE.TextureLoader().load('./planet_disp.jpg');
        planetDisplacement.wrapS = planetDisplacement.wrapT = THREE.RepeatWrapping;
        planetDisplacement.repeat.set(8, 8);
        this.mesh.material.displacementMap = planetDisplacement;
        this.mesh.material.displacementScale = 0.01;
        this.mesh.material.displacementBias = -0.01;
        let planetRoughness = new THREE.TextureLoader().load('./planet_rough.jpg');
        planetRoughness.wrapS = planetRoughness.wrapT = THREE.RepeatWrapping;
        planetRoughness.repeat.set(8, 8);
        this.mesh.material.roughnessMap = planetRoughness;
    
        this.mesh.position.set(this.position.x, this.position.y, this.position.z);
        this.scene.add(this.mesh);

        this.meshMap.set(this.body, this.mesh);

        this.createGravityField();
    }

    createGravityField() {

        let randomColor = '0x' + Math.floor(Math.random()*16777215).toString(16);
        randomColor = parseInt(randomColor, 16);
        this.gravityField = new THREE.Mesh(
            new THREE.SphereGeometry(this.gravityRadius + this.radius, 64, 64),
            new THREE.MeshBasicMaterial({ color: randomColor, opacity: .1, transparent: true, wireframe: false, depthWrite: false })
        );

        this.gravityRadius = this.radius + this.gravityRadius;
    
        // this.gravityField.position.set(this.position.x, this.position.y, this.position.z);
        this.mesh.add(this.gravityField);

        this.setInitialVelocity();
    }

    setInitialVelocity() {
        if (this.initialVelocity) {
            this.body.velocity.set(this.initialVelocity.x, this.initialVelocity.y, this.initialVelocity.z);
        }
        if (this.initialAngularVelocity) {
            this.body.angularVelocity.set(this.initialAngularVelocity.x, this.initialAngularVelocity.y, this.initialAngularVelocity.z);
        }
    }

    // getClosestPlanet(body) {
    //     let origin = new CANNON.Vec3(0, 0, 0);
    //     let closestPlanet = origin;
    //     let closestDistance = body.position.distanceTo(closestPlanet);
    //     let closestBody = null;
    //     this.scene.planets.forEach(planet => {
    //         let distance = new CANNON.Vec3().copy(planet.body.position).vsub(body.position).length() - planet.radius;
    //         if (distance < closestDistance && distance < (planet.gravityRadius - planet.radius)) {
    //             closestDistance = distance;
    //             closestPlanet = planet.body.position;
    //             closestBody = planet.body;
    //         }
    //     });
    //     if(closestPlanet === origin) {
    //         closestPlanet = null;
    //     }
    //     // console.log(closestPlanet); 
    //     return closestBody;
    // }

    getClosestPlanet(body) {
        let closestPlanet = this.scene.planets[0];
        let closestDistance = body.position.distanceTo(closestPlanet.body.position);
        let closestBody = closestPlanet.body;
        this.scene.planets.forEach(planet => {
            let distance = body.position.distanceTo(planet.body.position) - planet.radius;
            if (distance < closestDistance && distance < (planet.gravityRadius - planet.radius)) {
                closestDistance = distance;
                closestPlanet = planet;
                closestBody = planet.body;
            }
        });
        return closestBody;
    }

    applyGravity(delta) {

        const bodies = this.world.bodies;
        for (let i = 0; i < bodies.length; i++) {
            const body = bodies[i];
            if (body === this.body || body.mass === 0) continue;

            const distance = this.body.position.distanceTo(body.position);
            const surfaceDist = Math.max((distance - this.radius), 0);
            const epsilon = 1;
            let surfaceDistInverse = 1 / Math.max(surfaceDist, epsilon);
            // console.log(surfaceDistInverse);
            // console.log(distance, this.gravityRadius, body.position);

            // if(body.orbitBody !== this.body && body.orbitBody !== null) {
            //     // console.log(body.orbitBody);
            //     continue;
            // }

            if (distance <= this.gravityRadius) {

                    // let closestPlanet = this.getClosestPlanet(body);
                    // if (closestPlanet !== this.body) {
                    //     // return;
                    //}
                    if(body.orbitBody !== this.body && body.orbitBody !== null || body.isSpaceShip) {
                        continue;
                    }

                    body.inOrbit = true;

                    const forceDirection = new CANNON.Vec3().copy(body.position).vsub(this.body.position).unit();

                    const t = (distance - this.radius) / (this.gravityRadius - this.radius);
                    const interpolatedGravityScale = 1.5 - t * 0.5;

                    let scaledGravityScale = Math.min(this.gravityScale / (body.mass), this.gravityScale);
                    
                    const velocityMagnitude = body.velocity.length();
                    const velocityFactor = 1 + (velocityMagnitude / 100); // Adjust the divisor as needed
                    // console.log(velocityFactor);

                    // console.log(scaledGravityScale);
                    const massFactor = (1 / body.mass)
                    // console.log(massFactor);

                    const scaledForce = forceDirection.scale( ((((-this.gravityScale * this.simSpeed)))*Math.min(surfaceDist, 1 ) * interpolatedGravityScale )* massFactor );
                    // console.log(scaledForce);
                    
                if(body.type !== 4) {
                    //the body inherits the velocity of the planet
                    body.velocity.set(this.body.velocity.x, this.body.velocity.y, this.body.velocity.z);
                    body.angularVelocity.set(this.body.angularVelocity.x, this.body.angularVelocity.y, this.body.angularVelocity.z);

                    // console.log(this.body.velocity, body.velocity);

                    //instead of applying the angular velocity to the body, we copy the quaternion
                    // body.quaternion.copy(this.body.quaternion);
                    
                    body.gravityForce = scaledForce;
                    body.applyImpulse(scaledForce, body.position);

                    //if body is kinematic, we know it must be another planet
                } else {
                    if(body.mass > this.mass) {
                        return;
                    }

                    // console.log(this.radius + body.radius, this.body.position.distanceTo(body.position));
                    // since kinematic bodies dont collide, we have to manually make sure they are not inside the planet
                    let combinedRadius = this.radius + body.radius;
                    let distance = this.body.position.distanceTo(body.position);
                    // console.log(distance)

                    let surfaceDist = Math.max((distance - combinedRadius), 0);
                    // console.log(surfaceDist);

                    if(surfaceDist <= 0) {
                        let direction = new CANNON.Vec3().copy(body.position).vsub(this.body.position).unit();
                        let correction = direction.scale(combinedRadius - distance);
                        body.position.set(body.position.x + correction.x, body.position.y + correction.y, body.position.z + correction.z);
                    }

                    let maxDistDiff = (body.maxOrbitDistance - surfaceDist) /10
                    let diff = Math.min(Math.max(maxDistDiff, 0), 1);
                    if(surfaceDist > body.maxOrbitDistance) {
                        body.velocity = body.velocity.vadd(scaledForce);
                    } else {
                        
                        body.velocity = body.velocity.vsub(scaledForce.scale(diff));
                    }
                }

                // const oppositeForce = scaledForce.scale(-1);
                // this.body.applyImpulse(oppositeForce, this.body.position);    
            }
        }

    }

    update(delta) {

        // this.gravityField.lookAt(this.scene.player.body.position.x, this.scene.player.body.position.y, this.scene.player.body.position.z);
        // console.log(this.scene.player.position);

        // console.log(this.body.quaternion);

        this.applyGravity(delta);
    }
}

export default Planet;