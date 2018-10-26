import {EventDispatcher, SphereGeometry, ShaderMaterial, Mesh, TextureLoader, BackSide, Color, DoubleSide} from 'three';

export class Skybox extends EventDispatcher
{
	constructor(scene)
	{
		super();
		
		this.defaultEnvironment = 'rooms/textures/envs/Garden.png';
		this.useEnvironment = false;
		this.topColor = 0xffffff;//0xD8ECF9
		this.bottomColor = 0xe9e9e9; //0xf9f9f9;//0x565e63
		this.verticalOffset = 500;
		
		var uniforms = {topColor: {type: 'c',value: new Color(this.topColor)},bottomColor: {type: 'c',value: new Color(this.bottomColor)},offset: {type: 'f',value: this.verticalOffset}};
		
		this.scene = scene;
		
		this.sphereRadius = 4000;
		this.widthSegments = 32;
		this.heightSegments = 15;
		this.sky = null;

		this.plainVertexShader = ['varying vec3 vWorldPosition;','void main() {','  vec4 worldPosition = modelMatrix * vec4( position, 1.0 );','  vWorldPosition = worldPosition.xyz;','  gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );','}'].join('\n');
		this.plainFragmentShader = ['uniform vec3 topColor;','uniform vec3 bottomColor;','uniform float offset;','varying vec3 vWorldPosition;','void main() {','  float h = normalize( vWorldPosition + offset ).y;','  gl_FragColor = vec4( mix( bottomColor, topColor, (h + 1.0) / 2.0), 1.0 );','}'].join('\n');
		
		this.vertexShader = ['varying vec2 vUV;','void main() {','  vUV=uv;','  vec4 pos = vec4(position, 1.0);', '   gl_Position = projectionMatrix * modelViewMatrix * pos;','}'].join('\n');
		this.fragmentShader = ['uniform sampler2D texture;', 'varying vec2 vUV;', 'void main() {  ', 'vec4 sample = texture2D(texture, vUV);', 'gl_FragColor = vec4(sample.xyz, sample.w);' ,'}'].join('\n');
		
		this.texture = new TextureLoader();
		this.plainSkyMat = new ShaderMaterial({vertexShader: this.plainvertexShader,fragmentShader: this.plainfragmentShader,uniforms: uniforms, side: BackSide});
		this.skyMat = undefined;
		
		this.skyGeo = new SphereGeometry(this.sphereRadius, this.widthSegments, this.heightSegments);
		this.sky = new Mesh(this.skyGeo, this.skyMat);
		this.sky.position.x += this.sphereRadius*0.5;
		this.scene.add(this.sky);
		this.init();
	}
	
	toggleEnvironment(flag)
	{
		this.useEnvironment = flag;
		if(!flag)
		{
			this.sky.material = this.plainSkyMat;
			this.sky.material.needsUpdate = true;
		}
		else
		{
			if(!this.skyMat)
			{
				this.setEnvironmentMap(this.defaultEnvironment);
			}
			else
			{
				this.sky.material = this.skyMat;
			}
			
		}
		console.log('NOW UPDATE THE SCENE');
		this.scene.needsUpdate = true;
	}
	
	setEnvironmentMap(url)
	{
		var scope = this;
		scope.texture.load(url, function (t)
		{
			var textureUniform = {type: 't', value: t};
			var uniforms = {texture: textureUniform};
			scope.skyMat = new ShaderMaterial({vertexShader: scope.vertexShader, fragmentShader: scope.fragmentShader, uniforms: uniforms, side: DoubleSide});
			scope.toggleEnvironment(scope.useEnvironment);
		}, undefined, function()
		{
			console.log('ERROR LOADEING FILE');
		});
	}
	
	init() 
	{		
		this.toggleEnvironment(false);
	}
}
