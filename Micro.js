import * as CubeShader from './Micro_CubeShader.js'
import * as PhysicsPositionShader from './Micro_PhysicsPositionShader.js'
import * as PhysicsVelocityShader from './Micro_PhysicsVelocityShader.js'

import DesktopXr from './DesktopXr.js'

let TickCount = 0;
function GetTime(){	return (TickCount==0) ? 0 : Math.floor(performance.now());	}

let rc;
let gl;

const OLD=0;
const NEW=1;
let PositionTextures=[];
let VelocityTextures=[];
let SpriteTextures=[];	//	only using one but reusing code
let TextureTarget;

const Sprites = [
	"a13b1a1b1a1b1a1b1a1b1a2b1a1b1a1b1a1b1a1b1a1b10a1b10a1b4a1b1a1b16a3b2a3b3a3b2a3b3a2b3a2b2a1b9a3b7a2", //	Ghost
	"a15b3a8b3a8b3a8b3a8b3a8b3a4b22a4b3a8b3a4", //	Cross
	"a11b36a1b3a1b7a1b1a1b9a1b9a1b1a1b7a1b3a1b3a1b9a3b7a5b5a3", //	Grave
	"a16b1a9b3a5b2a1b1a1b2a6b1a1b2a1b2a3b1a2b1a1b1a5b1a2b1a2b2a6b1a16", //	Grass
	"a12b1a3b1a3b1a1b11a1b1a3b1a3b1a2b1a3b1a3b1a2b1a3b1a3b1a2b1a3b1a3b1a2b1a3b1a3b1a2b9a2b1a3b1a3b1a1b3a1b3a1b3a1b1a3b1a3b1a12", //	Fence
	"a12b4a6b2a2b2a5b2a2b2a5b2a2b2a6b4a6", //	Num0
	"a11b6a7b2a9b2a7b4a9b2a7", //	Num1
	"a12b5a6b2a11b2a10b2a6b4a6", //	Num2
	"a12b4a10b2a7b3a10b2a6b4a6", //	Num3
	"a15b1a6b6a6b1a2b1a8b1a1b1a9b2a6", //	Num4
	"a12b4a10b2a6b3a8b1a10b5a5", //	Num5
	"a12b4a6b2a2b2a5b5a7b2a10b3a6", //	Num6
	"a12b2a10b2a10b2a10b2a5b6a5", //	Num7
	"a12b4a6b2a2b2a6b4a6b2a2b2a6b4a6", //	Num8
	"a12b3a10b2a7b5a5b2a2b2a6b4a6", //	Num9
];


const Macros =
{
	INTROY:0.1,
	FLOORSIZE:200.001,
	LIGHTRAD:30.01,
	WORLDSIZE:13.01,
	PI:3.1415926538,
	SPRITEWIDTH:11,
	SPRITECOUNT:Sprites.length,
	DATAWIDTH:128,
	DATAHEIGHT:128,
	DATALAST:127*127,
	MAX_PROJECTILES:50,
	TIMESTEP:0.016666,
	FLOORY:0.0,
	NEARFLOORY:0.05,
	CUBESIZE:0.06,
	HALFCUBESIZE:0.03,
	STATIC:0,
	DEBRIS:1,
	SPRITE0:2,
	CROSS:1,
	GRAVE:2,
	GRASS:3,
};
const MacroSource = Object.entries(Macros).map(kv=>`#define ${kv[0]} ${kv[1]}`).join('\n');
Object.assign(window,Macros);

function PadArray(a,Length,Fill)
{
	while(a.length<Length)	a.push(Fill);
	return a;
}

function PadPixels(a)
{
	while(a.length<DATAWIDTH)	a.push(...a);
	return a.slice(0,DATAWIDTH);
}

//	set w to 1 when new data
let ProjectileIndex = 0;
let ProjectilePos = new Array(MAX_PROJECTILES).fill().map(x=>[0,0,0,0]);
let ProjectileVel = new Array(MAX_PROJECTILES).fill().map(x=>[0,0,0,0]);
let WorldNear = 0;


let Desktop;
let FireRepeatMs = 40;


//	lerp is random if no time provided
function lerp(Min=0,Max=1,Time=Math.random())
{
	return Min + (Max-Min)*Time;
}


function CompileShader(Type,Source)
{
	const Shader = gl.createShader(Type);
	Source = `#version 300 es\nprecision highp float;\n${MacroSource}\n${Source}`;
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
			const Error = gl.getProgramInfoLog(Program);
			throw `Failed to link shader ${Error}`;
		}
		return Program;
	}
	
}

function RleToRgba(rle,i,a,w=SPRITEWIDTH)
{
	rle = rle.replace(/(\w)(\d+)/g, (_,char,count)=>char.repeat(count));
	return rle.split``.map((v,i)=>[i%w,i/w>>0,0,parseInt(v,36)-10]).filter(p=>!!p[3]);
}

function IsMap(Row)
{
	return true;
	return Row > 4;
}

function ArrayFromTo(s,e)
{
	let a=[];
	for (;s!=e;s+=Math.sign(e-s) )
		a.push(s);
	return a;
}

function InitVelocityPixel(_,i)
{
	//let MapSprites = [CROSS,GRAVE,GRASS];
	//let MapSprites = [-3,-4,-5,-6, -7,-8];
	let MapSprites = ArrayFromTo(-3,-17);
	//let MapSprite = MapSprites[lerp(0,MapSprites.length)>>0];
	let MapSprite = MapSprites[Math.floor(Math.random()*MapSprites.length)];
	
	let x = i % DATAWIDTH;
	let y = (i/DATAWIDTH)>>0;
	//let Type = IsMap(y) ? -(SPRITE0+MapSprite) : SPRITE0;
	//let Type = IsMap(y) ? MapSprite : SPRITE0;
	//	gr: something about MapSprite from random is breaking things
	//let Type = IsMap(y) ? -SPRITE0-1-(y%3) : SPRITE0;
	let Type = IsMap(y) ? MapSprites[y%MapSprites.length] : SPRITE0;
	return [0,0,0,Type];
}

let WORLDW = WORLDSIZE*0.7;
let WorldMin = [-WORLDW,FLOORY,-WORLDSIZE*3,0];
let WorldMax = [WORLDW,FLOORY,WORLDSIZE*0.4,1];
let MapPositions = new Array(DATAHEIGHT).fill().map(RandomWorldPos);

function RandomWorldPos()
{
	return WorldMin.map( (Min,i) => lerp(Min,WorldMax[i]) );
}

function InitPositionPixel(_,i)
{
	let x = i % DATAWIDTH;
	let y = (i/DATAWIDTH)>>0;
	if ( IsMap(y) )
		return MapPositions[y].slice(0,3).concat([Math.random()]);
	return RandomWorldPos(_,i);
}



export default async function Bootup(Canvas,XrOnWaitForCallback)
{
	rc = new RenderContext_t(Canvas);
	Desktop = new DesktopXr(Canvas);
	
	//	load sprites into pixels
	let PixelRows = PadArray(Sprites,DATAHEIGHT,`b1`).map(RleToRgba).map(PadPixels);
	PixelRows = new Float32Array( PixelRows.flat(2) );
	
	AllocTextures(PositionTextures,InitPositionPixel);
	AllocTextures(VelocityTextures,InitVelocityPixel);
	AllocTextures(SpriteTextures,PixelRows);

	function Tick()
	{
		window.requestAnimationFrame(Tick);
		Update();
		let Rect = Canvas.getBoundingClientRect();
		Canvas.width = Rect.width;
		Canvas.height = Rect.height;

		//	first frame needs to bake positions before velocity pass
		//if ( TickCount == 0 )
			//Blit(PositionTextures,rc.PhysicsPositionShader);
		if ( TickCount != 0 )
			Blit(VelocityTextures,rc.PhysicsVelocityShader);
		Blit(PositionTextures,rc.PhysicsPositionShader);
		Render(Canvas.width,Canvas.height);
		PostFrame();
		TickCount++;
	}
	Tick();
}



let WeaponLastFired = {};	//	[Input] = FiredTime

function TransformPoint(Transform,x,y,z,w=1)
{
	return Transform.transformPoint(new DOMPoint(x,y,z,w));
}

function Set(Target,v)
{
	Target[0] = v.x;
	Target[1] = v.y;
	Target[2] = v.z;
	Target[3] = 1;
}

function FireWeapon(Name,Transform)
{
	WeaponLastFired[Name] = GetTime();
	
	let Pos = TransformPoint( Transform, 0, 0, lerp(0,1) );
	let Vel = TransformPoint( Transform, lerp(-1,1), lerp(0,0), lerp(50,60), 0 );
	//Vel.y += lerp(6,8);
	
	Set( ProjectilePos[ProjectileIndex], Pos );
	Set( ProjectileVel[ProjectileIndex], Vel );
	ProjectileIndex = (ProjectileIndex+1) % MAX_PROJECTILES;
}

function UpdateWeapon(Name,State)
{
	//	update gun pos
	//	update firing
	if ( !State.Down )
		return;

	let TimeDiff = GetTime() - (WeaponLastFired[Name]||0);
	if ( TimeDiff > FireRepeatMs )
		FireWeapon( Name, State.Transform );
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

function InitTexture()
{
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER,gl.NEAREST);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER,gl.NEAREST);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
}


function AllocTextures(Textures,PixelData)
{
	Textures.push(null,null);
	
	const Width = DATAWIDTH;
	const Height = DATAHEIGHT;
	PixelData = typeof PixelData!='function' ? PixelData : new Float32Array(new Array(Width*Height).fill().map(PixelData).flat(2));
	
	const SourceFormat = gl.RGBA;
	const SourceType = gl.FLOAT;
	const InternalFormat = gl.RGBA32F;	//	webgl2
	const Rect = [0,0,Width,Height];

	for ( let t of [OLD,NEW] )
	{
		Textures[t] = gl.createTexture();
		Textures[t].Size = [Width,Height];
		gl.activeTexture( gl.TEXTURE0 );
		gl.bindTexture( gl.TEXTURE_2D, Textures[t] );
		gl.texImage2D( gl.TEXTURE_2D, 0, InternalFormat, Width, Height, 0, SourceFormat, SourceType, PixelData );
		InitTexture();
	}
}

let BoundShader;
function BindShader(Shader)
{
	gl.useProgram( BoundShader=Shader );
}

function ul(Name)
{
	return BoundShader[Name] = BoundShader[Name] || gl.getUniformLocation(BoundShader,Name);
}

function SetUniformMat4(Name,Value)
{
	gl.uniformMatrix4fv( ul(Name),0,Value);
}

function SetUniformVector(Name,Value)
{
	let Length = Math.min( 4, Value.length );
	let f = `uniform${Length}fv`;
	gl[f]( ul(Name), Value );
}

function SetUniformTexture(Name,TextureIndex,Texture)
{
	let TextureValue = gl.TEXTURE0+TextureIndex;
	gl.activeTexture( TextureValue );
	gl.bindTexture( gl.TEXTURE_2D, Texture );
	gl.uniform1iv( ul(Name), [TextureIndex] );
}


function Render(w,h)
{
	let Camera = Desktop.Camera;
	
	gl.bindFramebuffer( gl.FRAMEBUFFER, null );
	const Viewport=[0,0,w/h,h/h];
	gl.viewport(0,0,w,h);
	gl.clearColor( 0.1, 0.05, 0.3, 1.0 );
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	gl.disable(gl.CULL_FACE);
	gl.enable(gl.DEPTH_TEST);
	
	BindShader(rc.CubeShader);

	//	set uniforms
	SetUniformMat4('WorldToCameraTransform',Camera.WorldToLocal.toFloat32Array());
	SetUniformMat4('CameraProjectionTransform',Camera.GetProjectionMatrix(Viewport));
	SetUniformVector('Time',[GetTime()]);
	
	//	hardcoded texture slots
	SetUniformTexture('PositionsTexture',0,PositionTextures[NEW]);
	SetUniformTexture('OldPositionsTexture',1,PositionTextures[OLD]);
	SetUniformTexture('NewVelocitys',2,VelocityTextures[NEW]);

	
	let Instances = PositionTextures[NEW].Size[0] * PositionTextures[NEW].Size[1];
	let TriangleCount = 6*2*3;
	gl.drawArrays( gl.TRIANGLES, 0, TriangleCount*Instances );
}


function Blit(Textures,Shader)
{
	//	swap
	Textures.reverse();
	
	const Target = Textures[NEW];
	let ScreenSize = Target.Size;
	
	gl.bindFramebuffer( gl.FRAMEBUFFER, TextureTarget );
	gl.bindTexture( gl.TEXTURE_2D, null );
	gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, Target, 0 );
	
	gl.viewport(0,0,...ScreenSize);
	gl.clearColor(1,0,0,1);
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	gl.disable(gl.CULL_FACE);
	gl.disable( gl.BLEND );

	BindShader( Shader );

	SetUniformVector('Time',[GetTime()]);

	SetUniformTexture('OldPositions',0,PositionTextures[OLD]);
	SetUniformTexture('OldVelocitys',1,VelocityTextures[OLD]);
	if ( Target != PositionTextures[NEW] )
		SetUniformTexture('NewPositions',2,PositionTextures[NEW]);
	else
		SetUniformTexture('NewPositions',2,PositionTextures[OLD]);
	SetUniformTexture('SpritePositions',3,SpriteTextures[0]);
	SetUniformVector('ProjectilePos',ProjectilePos.flat(4));
	SetUniformVector('ProjectileVel',ProjectileVel.flat(4));
	SetUniformVector('Random4',[lerp(),lerp(),lerp(),lerp()])

	gl.drawArrays( gl.TRIANGLE_FAN, 0, 4 );
}

