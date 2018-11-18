import * as THREE from 'three';

/**
 * @author mrdoob / http://mrdoob.com/
 * @author Mugen87 / https://github.com/Mugen87
 */

function PointerLockControls( camera, domElement ) {

	var scope = this;

	this.domElement = domElement || document.body;
	this.enabled = false;
	this.isLocked = true;
	this.walkspeed = 3000;
	this.lookspeed = 0.002;
	this.characterHeight = 125;

	camera.rotation.set( 0, 0, 0 );

	var pitchObject = new THREE.Object3D();
	pitchObject.add( camera );

	var yawObject = new THREE.Object3D();
	yawObject.position.y = this.characterHeight;
	yawObject.add( pitchObject );

	var PI_2 = Math.PI / 2;
	
	var moveForward = false;
	var moveBackward = false;
	var moveLeft = false;
	var moveRight = false;
	var canJump = false;
	
	var velocity = new THREE.Vector3();
	var direction = new THREE.Vector3();
	
	function onMouseDown( ) 
	{
		if(scope.enabled && !scope.isLocked)
		{
//			scope.lock();
		}
	}
	
	function onMouseMove( event ) 
	{

		if ( scope.enabled === false ) return;

		var movementX = event.movementX || event.mozMovementX || event.webkitMovementX || 0;
		var movementY = event.movementY || event.mozMovementY || event.webkitMovementY || 0;

		yawObject.rotation.y -= movementX * scope.lookspeed;
		pitchObject.rotation.x -= movementY * scope.lookspeed;

		pitchObject.rotation.x = Math.max( - PI_2, Math.min( PI_2, pitchObject.rotation.x ) );

	}	
	
	function onKeyDown( event ) {
		if ( scope.enabled === false ) return;
		switch ( event.keyCode ) {

		case 38: // up
		case 87: // w
			moveForward = true;
			break;

		case 37: // left
		case 65: // a
			moveLeft = true; break;

		case 40: // down
		case 83: // s
			moveBackward = true;
			break;

		case 39: // right
		case 68: // d
			moveRight = true;
			break;

		case 32: // space
			if ( canJump === true )
			{
				velocity.y += 350;
			}
			canJump = false;
			break;

		}

	}

	function onKeyUp( event ) {
		if ( scope.enabled === false ) return;
		switch( event.keyCode ) {

		case 38: // up
		case 87: // w
			moveForward = false;
			break;

		case 37: // left
		case 65: // a
			moveLeft = false;
			break;

		case 40: // down
		case 83: // s
			moveBackward = false;
			break;

		case 39: // right
		case 68: // d
			moveRight = false;
			break;

		}
	}
	
	this.update = function(delta2)
	{
		var delta = delta2;
		
		velocity.x -= velocity.x * 10.0 * delta;
		velocity.z -= velocity.z * 10.0 * delta;

		velocity.y -= 9.8 * 100.0 * delta; // 100.0 = mass

		direction.z = Number( moveForward ) - Number( moveBackward );
		direction.x = Number( moveLeft ) - Number( moveRight );
		direction.normalize(); // this ensures consistent movements in all directions

		if ( moveForward || moveBackward ) velocity.z -= direction.z * this.walkspeed * delta;
		if ( moveLeft || moveRight ) velocity.x -= direction.x * this.walkspeed * delta;

		scope.getObject().translateX( velocity.x * delta );
		scope.getObject().translateY( (velocity.y * delta));
		scope.getObject().translateZ( velocity.z * delta );

		if ( scope.getObject().position.y <  scope.characterHeight ) 
		{
			velocity.y = 0;
			scope.getObject().position.y = scope.characterHeight; 
			canJump = true;
		}
	};
	
	function onPointerlockChange() {

		if ( document.pointerLockElement === scope.domElement ) {

			scope.dispatchEvent( { type: 'lock' } );
			scope.isLocked = true;

		} else {

			scope.dispatchEvent( { type: 'unlock' } );

			scope.isLocked = false;

		}

	}

	function onPointerlockError() {

		console.error( 'THREE.PointerLockControls: Unable to use Pointer Lock API' );

	}

	this.connect = function () {
		
		document.addEventListener( 'keydown', onKeyDown, false );
		document.addEventListener( 'keyup', onKeyUp, false );
		document.addEventListener( 'mousedown', onMouseDown, false );
		document.addEventListener( 'mousemove', onMouseMove, false );
		document.addEventListener( 'pointerlockchange', onPointerlockChange, false );
		document.addEventListener( 'pointerlockerror', onPointerlockError, false );

	};

	this.disconnect = function () {
		document.addEventListener( 'keydown', onKeyDown, false );
		document.addEventListener( 'keyup', onKeyUp, false );
		document.removeEventListener( 'mousedown', onMouseDown, false );
		document.removeEventListener( 'mousemove', onMouseMove, false );
		document.removeEventListener( 'pointerlockchange', onPointerlockChange, false );
		document.removeEventListener( 'pointerlockerror', onPointerlockError, false );

	};

	this.dispose = function () {

		this.disconnect();

	};

	this.getObject = function () {

		return yawObject;

	};

	this.getDirection = function () {

		// assumes the camera itself is not rotated

		var direction = new THREE.Vector3( 0, 0, - 1 );
		var rotation = new THREE.Euler( 0, 0, 0, 'YXZ' );

		return function ( v ) {

			rotation.set( pitchObject.rotation.x, yawObject.rotation.y, 0 );

			v.copy( direction ).applyEuler( rotation );

			return v;

		};

	}();
	this.lock = function () {
		this.domElement.requestPointerLock();
		var i = this.domElement;
		if (i.requestFullscreen) {
			i.requestFullscreen();
		} else if (i.webkitRequestFullscreen) {
			i.webkitRequestFullscreen();
		} else if (i.mozRequestFullScreen) {
			i.mozRequestFullScreen();
		} else if (i.msRequestFullscreen) {
			i.msRequestFullscreen();
		}

	};

	this.unlock = function () {
		if(document.exitPointerLock)
		{
			document.exitPointerLock();
		}
		

	};
	
	this.connect();

}
PointerLockControls.prototype = Object.create( THREE.EventDispatcher.prototype );
PointerLockControls.prototype.constructor = PointerLockControls;

export {PointerLockControls};
