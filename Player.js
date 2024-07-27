import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { GLTFLoader } from 'https://unpkg.com/three/examples/jsm/loaders/GLTFLoader.js';

class Player extends THREE.EventDispatcher {
    constructor(options) {
        super();

        this.name = options.name;
        this.position = options.position;
        this.camera = options.camera;
        this.scene = options.scene;
        this.world = options.world;

        this.meshMap = options.meshMap;

        this.gltfLoader = new GLTFLoader();

        this.canJump = false;
        this.isJumping = false;
        this.jumpPreload = false;
        this.jumpVelocity = options.jumpVelocity || 10;

        this.boostCapacity = options.boostCapacity || 10000;
        this.burnRate = options.burnRate || 0;

        this.spaceDown = false;

        this.createBody();
    }

    createBody() {
        this.body = new CANNON.Body({
            mass: 1,
            position: this.position,
            shape: new CANNON.Box(new CANNON.Vec3(0.1, .2, 0.1)),
            fixedRotation: true
        });

        this.world.addBody(this.body);

        this.body.gravityForce = new CANNON.Vec3(0, 0, 0);

        this.gltfLoader.load('./ship.glb', (gltf) => {
            this.mesh = gltf.scene.children[0];
            this.mesh.scale.set(.1, .1, .1);
            // this.mesh.rotation.set(Math.PI / 2, 0, 0);
            this.mesh.castShadow = true;
            this.mesh.receiveShadow = true;
            this.mesh.position.set(this.body.position.x, this.body.position.y, this.body.position.z);
            this.scene.add(this.mesh);

            this.mesh.add(this.camera);
            this.camera.position.set(0, 1, 0);
            this.camera.lookAt(this.mesh.position);

            this.meshMap.set(this.body, this.mesh);
        });


        this.initialCameraRotation = this.camera.rotation.clone();

        this.connect();

        const contactNormal = new CANNON.Vec3() // Normal in the contact, pointing *out* of whatever the player touched
        const upAxis = new CANNON.Vec3(0, 1, 0)
        this.body.addEventListener('collide', (event) => {
            const { contact } = event
      
            // contact.bi and contact.bj are the colliding bodies, and contact.ni is the collision normal.
            // We do not yet know which one is which! Let's check.
            if (contact.bi.id === this.body.id) {
              // bi is the player body, flip the contact normal
              contact.ni.negate(contactNormal)
            } else {
              // bi is something else. Keep the normal as it is
              contactNormal.copy(contact.ni)
            }
      
            // If contactNormal.dot(upAxis) is between 0 and 1, we know that the contact normal is somewhat in the up direction.
            if (contactNormal.dot(upAxis) > 0.5) {
              // Use a "good" threshold value between 0 and 1 here!
              this.canJump = true
              this.isJumping = false
              if(this.jumpPreload) {
                this.body.velocity.y = this.jumpVelocity
                this.jumpPreload = false
                this.isJumping = true
                this.canJump = false
              } 
              
      
            }
          })
    }

    connect() {
        document.addEventListener('mousedown', this.onMouseDown)
        document.addEventListener('mouseup', this.onMouseUp)
        document.addEventListener('mousemove', this.onMouseMove)
        document.addEventListener('pointerlockchange', this.onPointerlockChange)
        document.addEventListener('pointerlockerror', this.onPointerlockError)
        document.addEventListener('keydown', this.onKeyDown)
        document.addEventListener('keyup', this.onKeyUp)
    }

    disconnect() {
        document.removeEventListener('mousedown', this.onMouseDown)
        document.removeEventListener('mouseup', this.onMouseUp)
        document.removeEventListener('mousemove', this.onMouseMove)
        document.removeEventListener('pointerlockchange', this.onPointerlockChange)
        document.removeEventListener('pointerlockerror', this.onPointerlockError)
        // document.removeEventListener('keydown', this.onKeyDown)
        // document.removeEventListener('keyup', this.onKeyUp)
    }

    onMouseDown = (event) => {
        if (!this.enabled) {
            return
        }

        if (event.button === 0) {
            this.isMouseDown = true
        }
    }

    onMouseUp = (event) => {
        if (!this.enabled) {
            return
        }

        if (event.button === 0) {
            this.isMouseDown = false
        }
    }


    onMouseMove = (event) => {
        if (!this.enabled) {
            return
        }

        const { movementX, movementY } = event

        const body = this.body
        body.mouseRotX = movementX;
        body.mouseRotY = movementY;
    }

    dispose() {
        this.disconnect()
    }

    lock() {
        document.body.requestPointerLock()
    }

    unlock() {
        document.exitPointerLock()
    }

    onPointerlockChange = () => {
        if (document.pointerLockElement) {
            this.dispatchEvent(this.lockEvent)

            this.isLocked = true
            this.enabled = true
        } else {
            this.dispatchEvent(this.unlockEvent)

            this.isLocked = false
            this.enabled = false
        }
    }

    onPointerlockError = () => {
        console.error('PointerLockControlsCannon: Unable to use Pointer Lock API')
        this.enabled = false
    }

    onKeyDown = (event) => {
        if (!this.enabled) {
            return
        }

        switch (event.key) {
            case 'w':
                this.moveForward = true
                break
            case 's':
                this.moveBackward = true
                break
            case 'a':
                this.moveLeft = true
                break
            case 'd':
                this.moveRight = true
                break
            case ' ':
                this.spaceDown = true
                if (this.canJump) {
                    this.body.velocity.y = this.jumpVelocity
                    this.isJumping = false
                }
                this.canJump = false
                this.isJumping = true
                break
            

        }
    }

    onKeyUp = (event) => {
        if (!this.enabled) {
            return
        }

        switch (event.key) {
            case 'w':
                this.moveForward = false
                break
            case 's':
                this.moveBackward = false
                break
            case 'a':
                this.moveLeft = false
                break
            case 'd':
                this.moveRight = false
                break
            case ' ':
                this.spaceDown = false
                this.jumpPreload = true
                break
            case 'Shift':
                this.boosting = false
                break

        }
    }

    toggleSpaceShip() {
        console.log('toggling spaceship');
        this.isSpaceShip = !this.isSpaceShip;
        this.body.isSpaceShip = this.isSpaceShip;
        if(this.isSpaceShip) {
            this.body.orbitBody = null;

            this.body.velocity.set(0, 0, 0);
            this.body.angularVelocity.set(0, 0, 0);

            this.body.quaternion = this.body.quaternion.slerp(new CANNON.Quaternion(0, 0, 0, 1), .01)

            this.camera.rotation.set(0, 0, 0);
            this.camera.position.set(0, 0.3, 1);
            // this.camera.lookAt(this.mesh.position);
        } else {
            this.body.orbitBody = null;
            this.body.velocity.set(0, 0, 0);
            this.body.angularVelocity.set(0, 0, 0);
            // this.body.quaternion.setFromAxisAngle(new CANNON.Vec3(0, 1, 0), 0);
            this.camera.position.set(0, 1, 0);
            // this.camera.lookAt(this.mesh.position);
        }
    }

    // update(delta) {
    //     if (this.enabled === false) {
    //         return
    //     }

    //     delta *= 1000
    //     delta *= 0.1

    //     this.inputVelocity.set(0, 0, 0)

    //     if (this.moveForward) {
    //         this.inputVelocity.z = -this.velocityFactor * delta
    //     }
    //     if (this.moveBackward) {
    //         this.inputVelocity.z = this.velocityFactor * delta
    //     }

    //     if (this.moveLeft) {
    //         this.inputVelocity.x = -this.velocityFactor * delta
    //     }
    //     if (this.moveRight) {
    //         this.inputVelocity.x = this.velocityFactor * delta
    //     }

    //     // this.clickTimeout <= 0 ? this.clickTimeout = 0 : this.clickTimeout -= delta;

    //     // if(this.clicking) {
    //     //     if(this.clickTimeout <= 0) {
    //     //         this.click()
    //     //         this.clickTimeout = 50;
    //     //     }
    //     // }

    //     // this.camera.position.x = this.cannonBody.position.x
    //     // this.camera.position.z = this.cannonBody.position.z

    //     // Add to the object
    //     this.velocity.x += this.inputVelocity.x
    //     this.velocity.z += this.inputVelocity.z

    // }
}

export default Player;
