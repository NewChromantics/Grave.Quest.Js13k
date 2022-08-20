
import * as CubeShader from './Micro_CubeShader.js'
import * as PhysicsPositionShader from './Micro_PhysicsPositionShader.js'
import * as PhysicsVelocityShader from './Micro_PhysicsVelocityShader.js'

import DesktopXr from './DesktopXr.js'

function GetTime(){	return Math.floor(performance.now());	}

let rc;
let gl;

const OLD=0;
const NEW=1;
let PositionTextures=[];
let VelocityTextures=[];
let TextureTarget;

//	set w to 1 when new data
let MAX_PROJECTILES	= 50;
let ProjectileIndex = 0;
let ProjectilePos = new Array(MAX_PROJECTILES).fill(0).map(x=>[0,0,0,0]);
let ProjectileVel = new Array(MAX_PROJECTILES).fill(0).map(x=>[0,0,0,0]);
let WorldSize = 200;
let WorldNear = -20;

let Desktop;
let FireRepeatMs = 40;



function CompileShader(Type,Source)
{
	const Shader = gl.createShader(Type);
	gl.shaderSource( Shader, Source );
	gl.compileShader( Shader );
	const CompileStatus = gl.getShaderParameter( Shader, gl.COMPILE_STATUS);
	if ( !CompileStatus )
	{
		let Error = gl.getShaderInfoLog(Shader);
		throw `Failed to compile: ${Error}`;
	}
	return Shader;
}


class RenderContext_t
{
	constructor(Canvas)
	{
		const Options = {};
		Options.antialias = true;
		Options.xrCompatible = true;
		Options.premultipliedAlpha = false;
		Options.alpha = true;
		gl = Canvas.getContext('webgl2', Options );
		//this.OnResize();
		
		const RenderToFloat = gl.getExtension('EXT_color_buffer_float');
		
		this.CubeShader = this.CreateShader(CubeShader);
		this.PhysicsPositionShader = this.CreateShader(PhysicsPositionShader);
		this.PhysicsVelocityShader = this.CreateShader(PhysicsVelocityShader);

		TextureTarget = gl.createFramebuffer();
	}
	
	CreateShader(Source)
	{
		const FragShader = CompileShader( gl.FRAGMENT_SHADER, Source.Frag);
		const VertShader = CompileShader( gl.VERTEX_SHADER, Source.Vert);
		let Program = gl.createProgram();
		gl.attachShader( Program, VertShader );
		gl.attachShader( Program, FragShader );
		gl.linkProgram( Program );
		let LinkStatus = gl.getProgramParameter( Program, gl.LINK_STATUS );
		if ( !LinkStatus )
		{
			//	gr: list cases when no error "" occurs here;
			//	- too many varyings > MAX_VARYING_VECTORS
			const Error = gl.getProgramInfoLog(Program);
			throw `Failed to link shader ${Error}`;
		}
		return Program;
	}
	
}


export default async function Bootup(Canvas,XrOnWaitForCallback)
{
	rc = new RenderContext_t(Canvas);
	Desktop = new DesktopXr(Canvas);
	
	AllocTextures(PositionTextures,[-WorldSize,30,WorldSize-WorldSize,0],[WorldSize,30,-WorldNear-WorldSize-WorldSize,1]);
	AllocTextures(VelocityTextures,[0,0,0,0],[0,0,0,0]);
	function Tick()
	{
		window.requestAnimationFrame(Tick);
		//setTimeout( Tick, 500 );
		
		Update();
		
		Canvas.width = Canvas.getBoundingClientRect().width;
		Canvas.height = Canvas.getBoundingClientRect().height;
		Render(Canvas.width,Canvas.height);
		//	debug to screen
		RenderPhysics();
		
		//RenderPhysics([Canvas.width,Canvas.height]);
		PostFrame();
	}
	Tick();
	return 'Bootup finished';
}



let WeaponLastFired = {};	//	[Input] = FiredTime

function TransformPoint(Transform,x,y,z)
{
	let xyz = Transform.transformPoint(new DOMPoint(x,y,z));
	return [xyz.x,xyz.y,xyz.z];
}

function Set(Target,x,y,z,w)
{
	Target[0] = x;
	Target[1] = y;
	Target[2] = z;
	Target[3] = w;
}


function FireWeapon(Name,Transform)
{
	WeaponLastFired[Name] = GetTime();
	
	let Pos = TransformPoint(Transform,0,0,0);
	let Fwd = TransformPoint(Transform,0,0,20);
	let Vel = Fwd.map( (v,i) => v-Pos[i] );
	Vel[1] += 6;
	
	Set( ProjectilePos[ProjectileIndex], ...Pos, 1 );
	Set( ProjectileVel[ProjectileIndex], ...Vel, 1 );
	ProjectileIndex = (ProjectileIndex+1) % MAX_PROJECTILES;
}

function UpdateWeapon(Name,State)
{
	//	update gun pos
	//	update firing
	if ( !State.Down )
		return;
	let TimeDiff = GetTime() - (WeaponLastFired[Name]||0);
	console.log(`TimeDiff=${TimeDiff}`);
	while ( TimeDiff > FireRepeatMs )
	{
		TimeDiff -= FireRepeatMs;
		FireWeapon( Name, State.Transform );
		console.log("Fire");
		break;
	}
}

function Update()
{
	let Input = Desktop.GetInput();
	//	update all the weapons
	Object.entries(Input).forEach( e=>UpdateWeapon(...e) );
	
}

function PostFrame()
{
	//	unset new projectile flags
	for ( let i=0;	i<MAX_PROJECTILES;	i++ )
	{
		ProjectilePos[i][3] = 0;
		ProjectileVel[i][3] = 0;
	}
}

function InitTextureParams()
{
	//const Filter = gl.LINEAR;
	const Filter = gl.NEAREST;
	//	non-power of 2 must be clamp to edge
	const RepeatMode = gl.CLAMP_TO_EDGE;
	
	//	wont render without setting min&mag on float (min on u8)
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER,Filter);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER,Filter);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, RepeatMode);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, RepeatMode);

	//gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
	//gl.generateMipmap(gl.TEXTURE_2D);
	//gl.texSubImage2D( gl.TEXTURE_2D, MipLevel, ...Rect, SourceFormat, SourceType, SubDataValues );
}

function mix(Min,Max,Time)
{
	return Min + (Max-Min)*Time;
}

function AllocTextures(Textures,InitMin,InitMax)
{
	Textures.push(null,null);
	
	//	todo: this will move to shader for init and maybe then dont need any texture initialisation code
	function InitPosition(x,Index)
	{
		return InitMin.map( (Min,i) => mix(Min,InitMax[i],Math.random()) );
	}
	const Width = 128;
	const Height = 128;
	let PixelData = new Float32Array(new Array(Width*Height).fill(0).map(InitPosition).flat(2));
	
	Textures[NEW] = gl.createTexture();
	Textures[NEW].Size = [Width,Height];

	const SourceFormat = gl.RGBA;
	
	const SourceType = gl.FLOAT;
	const InternalFormat = gl.RGBA32F;	//	webgl2
	const MipLevel = 0;
	const Border = 0;
	const Rect = [0,0,Width,Height];

	//	subimage for later partial updating
	gl.activeTexture( gl.TEXTURE0 );
	gl.bindTexture( gl.TEXTURE_2D, Textures[NEW] );
	gl.texImage2D( gl.TEXTURE_2D, MipLevel, InternalFormat, Width, Height, Border, SourceFormat, SourceType, PixelData );
	InitTextureParams();

	Textures[OLD] = gl.createTexture();
	Textures[OLD].Size = [Width,Height];
	gl.activeTexture( gl.TEXTURE0 );
	gl.bindTexture( gl.TEXTURE_2D, Textures[OLD] );
	gl.texImage2D( gl.TEXTURE_2D, MipLevel, InternalFormat, Width, Height, Border, SourceFormat, SourceType, null );
	InitTextureParams();
}

function SetUniformMat4(Program,Name,Value)
{
	let UniformLocation = gl.getUniformLocation( Program, Name );
	const Transpose = false;
	gl.uniformMatrix4fv( UniformLocation, Transpose, Value );
}

function SetUniformVector(Program,Name,Value)
{
	let UniformLocation = gl.getUniformLocation( Program, Name );
	let Length = Math.min( 4, Value.length );
	let f = `uniform${Length}fv`;
	gl[f]( UniformLocation, Value );
}

function SetUniformTexture(Program,Name,TextureIndex,Texture)
{
	let UniformLocation = gl.getUniformLocation( Program, Name );
	let TextureValue = gl.TEXTURE0+TextureIndex;
	gl.activeTexture( TextureValue );
	gl.bindTexture( gl.TEXTURE_2D, Texture );
	gl.uniform1iv( UniformLocation, [TextureIndex] );
}


function Render(w,h)
{
	let Camera = Desktop.Camera;
	
	gl.bindFramebuffer( gl.FRAMEBUFFER, null );
	const Viewport=[0,0,w/h,h/h];
	gl.viewport(0,0,w,h);
	gl.clearColor( 0, 0.1, 0.3, 1.0 );
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	gl.disable(gl.CULL_FACE);
	gl.enable(gl.DEPTH_TEST);
	
	const Shader = rc.CubeShader;
	//	bind shader
	gl.useProgram( Shader );
	let Instances = PositionTextures[NEW].Size[0] * PositionTextures[NEW].Size[1];

	//	set uniforms
	//const Viewport=[0,0,1,1];
	SetUniformMat4(Shader,'WorldToCameraTransform',Camera.GetWorldToCameraMatrix());
	SetUniformMat4(Shader,'CameraProjectionTransform',Camera.GetProjectionMatrix(Viewport));
	SetUniformVector(Shader,'Time',[GetTime()]);
	
	//	hardcoded texture slots
	SetUniformTexture(Shader,'PositionsTexture',0,PositionTextures[NEW]);
	SetUniformTexture(Shader,'OldPositionsTexture',1,PositionTextures[OLD]);
	SetUniformTexture(Shader,'VelocitiesTexture',2,VelocityTextures[OLD]);

	
	let TriangleCount = 6*2*3;
	let IndexCount = TriangleCount;//*3;
	gl.drawArrays( gl.TRIANGLES, 0, IndexCount*Instances );
}


function Blit(ScreenSize,Textures,Shader)
{
	//	swap
	Textures.reverse();
	
	const Target = ScreenSize ? null : Textures[NEW];
	ScreenSize = ScreenSize || Target.Size;
	
	if ( Target )
	{
		//	render to texture
		gl.bindFramebuffer( gl.FRAMEBUFFER, TextureTarget );
		gl.bindTexture( gl.TEXTURE_2D, null );
		gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, Target, 0 );
	}
	else
	{
		gl.bindFramebuffer( gl.FRAMEBUFFER, null );
	}
	
	gl.viewport(0,0,...ScreenSize);
	gl.clearColor(1,0,0,1);
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	gl.disable(gl.CULL_FACE);

	//	bind shader
	gl.useProgram( Shader );

	SetUniformVector( Shader,'Time',[GetTime()]);
	if ( Target )
	{
		SetUniformTexture( Shader,'OldPositions',0,PositionTextures[OLD]);
		SetUniformTexture( Shader,'OldVelocitys',1,VelocityTextures[OLD]);
	}
	else
	{
		SetUniformTexture( Shader,'OldPositions',0,PositionTextures[NEW]);
		SetUniformTexture( Shader,'OldVelocitys',1,VelocityTextures[NEW]);
	}
	SetUniformVector(Shader,'ProjectilePos',ProjectilePos.flat(4));
	SetUniformVector(Shader,'ProjectileVel',ProjectileVel.flat(4));

	gl.drawArrays( gl.TRIANGLE_FAN, 0, 4 );
}


function RenderPhysics(ScreenSize)
{
	Blit(ScreenSize,PositionTextures,rc.PhysicsPositionShader);
	Blit(ScreenSize,VelocityTextures,rc.PhysicsVelocityShader);
}
