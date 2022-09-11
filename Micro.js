import * as CubeShader from './Micro_CubeShader.js'
import * as PhysicsPositionShader from './Micro_PhysicsPositionShader.js'
import * as PhysicsVelocityShader from './Micro_PhysicsVelocityShader.js'

import DesktopXr from './DesktopXr.js'

let NmePixelCount = 0;
let NmeLiveCount = 0;
let NmeCount = 0;
let NmeDeadCount = 0;
let HeartHitCooldown;
let MAXLIVES=3;
let Lives;
let DRAWFLOOR=1;
function GetTime(){	return Math.floor(performance.now());	}

function ResetGame()
{
	Lives = MAXLIVES;
	HeartHitCooldown = 0;
	NmeLiveCount = 0;
	NmeCount = 0;
	NmeDeadCount = 0;
}

let rc;
let gl;
let FloatTarget;

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
	"a12b4a10b2a6b4a7b1a10b5a5", //	Num5
	"a12b4a6b2a2b2a5b5a7b2a10b3a6", //	Num6
	"a12b2a10b2a10b2a10b2a5b6a5", //	Num7
	"a12b4a6b2a2b2a6b4a6b2a2b2a6b4a6", //	Num8
	"a12b3a10b2a7b5a5b2a2b2a6b4a6", //	Num9
	"a22", //
	"a13b1a21b2a9b2a10b2a6", //	!
	"a14b1a9b3a7b5a5b7a5b2a1b2a5", //	@
	"a13b2a9b2a40", //	.
	"a12b5a16b1a1b1a1b1a1b1a5b1a3b1a5b1a1b1a1b1a1b1a4", //	~
	"a12b4a10b2a7b3a7b2a10b4a5", //	S
	"a13b2a9b2a9b2a9b2a7b6a5", //	T
	"a11b2a2b1a6b5a6b2a2b1a6b2a2b1a7b3a7", //	A
	"a11b2a2b1a6b4a7b2a2b1a6b2a2b1a6b4a7", //	R
	"a11b2a9b4a7b2a2b1a6b2a2b1a6b4a7", //	P
	"a11b5a6b2a9b4a7b2a10b4a6", //	E
	"a11b2a2b1a6b2a1b2a6b3a1b1a6b2a2b1a6b2a2b1a6", //	N
	"a11b2a10b2a10b2a8b2a1b1a6b2a3b1a5", //	Y
	"a11b2a2b1a6b2a1b1a7b3a8b2a1b1a7b2a2b1a6", //	K
	"a12b4a6b2a2b1a6b2a1b2a6b2a10b4a6", //	G
	"a11b2a3b1a5b2a1b1a1b1a5b2a1b1a1b1a5b2a1b1a1b1a5b5a6", //	M
	"a12b4a6b2a2b2a5b2a2b2a5b2a2b2a6b4a6", //	O
	"a13b2a8b2a1b1a7b2a1b1a6b2a3b1a5b2a3b1a5", //	V
];
const SpriteMap = {
	" ":15,
	"!":16,
	"@":17,
	".":18,
	"~":19,
	"S":20,
	"T":21,
	"A":22,
	"R":23,
	"P":24,
	"E":25,
	"N":26,
	"Y":27,
	"K":28,
	"G":29,
	"M":30,
	"O":31,
	"V":32
};

function CharToSprite(c)
{
	return SpriteMap[c]||(parseInt(c,36)+SPRITEZERO);
}

const Alphabet=`_abcdefghijklmnopqrstuvwzyz0123456789ABCDEFGHIJKLKMNOPQRSTUVWXYZ!@£$%^&*()-=+#~?`;
function CharToInt(c){return Alphabet.indexOf(c)}
function IntToChar(i){return Alphabet.charAt(i)}
function DecodeCoord(c)
{
	return c.split``.map(CharToInt);
}
function DecodeWave(Wave)
{
	Wave=Wave.match(/.{3}/g).map(DecodeCoord);
	Wave[-1]=Wave[0];
	return Wave;
}

function findLastIndex(a,f)
{
	let i = [...a].reverse().findIndex(f);
	return i<0?i:a.length-1-i;
}
function GetWavexy(Seq,Time)
{
	Time/=1000;
	Time-=2;
	Time*=1.5;
	let Prev = findLastIndex(Seq,s=>s[0]<=Time);
	let fin = (Prev+1>=Seq.length)?1:0;
	let Next = Prev+(1-fin);
	let p = Seq[Prev];
	let n = Seq[Next];
	if ( !n )
		throw `out of sequence`;
	Time = Math.max(0,Time-p[0]);
	let xyzf = [1,2,0,0].map(c=>lerp(p[c],n[c],Time)).map(x=>lerp(1,-1,x/10));
	//	w = end of sequence
	xyzf[3] = fin;
	return xyzf;
}

const Macros =
{
	FLOORSIZE:200.001,
	LIGHTRAD:30.01,
	WORLDSIZE:13.01,
	PI:3.1415926538,
	SPRITEW:11,
	SPRITEH:10,
	CHARW:6,
	CHARH:5,
	SPRITECOUNT:Sprites.length,
	DATAWIDTH:128,
	DATAHEIGHT:128,
	DATALAST:127*127+1,
	MAX_PROJECTILES:25,
	MAX_WEAPONS:6,
	MAX_ACTORS:100,
	TIMESTEP:0.016666,
	FLOORY:0.0,
	NEARFLOORY:0.05,
	CUBESIZE:0.06,
	HALFCUBESIZE:0.03,
	STATIC:0,
	NULL:1,
	DEBRIS:2,
	DEBRISHEART:3,
	DEBRISBLOOD:3,
	SPRITE0:4,
	MAPSPRITE0:5,
	SPRITESPACE:SpriteMap[' '],
	SPRITEHEART:SpriteMap['@'],
	SPRITEZERO:5,
	STRINGCOUNT:2,
	WAVEPOSITIONCOUNT:128,
	HEARTCOOLDOWNFRAMES:4*60,
	ENTROPY_MIN:0.0,
	ENTROPY_MAX:1.0,
};
Object.assign(window,Macros);

function PadArray(a,Length,Fill)
{
	while(a.length<Length)	a.push(Fill);
	return a.slice(0,Length);
}

function PadPixels(a,i,_,w=DATAWIDTH)
{
	a=a||[[0,0,0,0]];
	while(a.length<w)	a.push(...a);
	return a.slice(0,w);
}

function InitArray(sz,init)
{
	return Array(sz).fill().map(init);
}

function Make04(sz=MAX_PROJECTILES)
{
	return InitArray(sz,x=>[0,0,0,0]);
}

let Waves = [
"__ia_dbdbciddifecffcdgfchfe",
"ciidieei_fhbgg_hfbie_jdbkc_lbbma_n_boda"
].map(DecodeWave);


let ProjectileIndex = 0;
//	set w to 1 when new data
let ProjectilePos = Make04();
let ProjectileVel = Make04();
let WeaponPoses = {}
let ClearColour=[0.05, 0.15, 0.05, 1.0];

let Desktop;
let FireRepeatMs = 40;




//	lerp is random if no time provided
function lerp(Min=0,Max=1,Time=Math.random())
{
	return Min + (Max-Min)*Time;
}
const plerp=()=>lerp();

function CompileShader(Type,Source)
{
	const MacroSource = Object.entries(Macros).map(kv=>`#define ${kv[0]} ${kv[1]}`).join('\n');
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
		FloatTarget = gl.getExtension('EXT_color_buffer_float');
		Macros.FLOAT_TARGET=FloatTarget?true:false;
		
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


function RleToRgba(rle,i,a,w=SPRITEW)
{
	rle = rle.replace(/(\w)(\d+)/g, (_,c,n)=>c.repeat(n));
	rle = rle.split``.map((v,i)=>[i%w,i/w>>0,0,parseInt(v,36)-10]).filter(p=>!!p[3]);
	return rle.length?rle:null;
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
	let MapSprites = ArrayFromTo(-MAPSPRITE0,-MAPSPRITE0-4);
	//let MapSprite = MapSprites[lerp(0,MapSprites.length)>>0];
	let MapSprite = MapSprites[Math.floor(Math.random()*MapSprites.length)];
	let x = i % DATAWIDTH;
	let y = (i/DATAWIDTH)>>0;
	let Type = IsMap(y) ? MapSprites[y%MapSprites.length] : SPRITE0;
	return [0,0,0,Type];
}

let WORLDW = WORLDSIZE*0.7;
let WorldMin = [-WORLDW,FLOORY,-WORLDSIZE*3,0];
let WorldMax = [WORLDW,FLOORY,WORLDSIZE*0.4,1];
let MapPositions = InitArray(DATAHEIGHT,RandomWorldPos);


function RandomWorldPos()
{
	return WorldMin.map( (Min,i) => lerp(Min*ENTROPY_MAX,WorldMax[i]*ENTROPY_MAX) );
}

function InitPositionPixel(_,i)
{
	let x = i % DATAWIDTH;
	let y = (i/DATAWIDTH)>>0;
	if ( IsMap(y) )
		return MapPositions[y].slice(0,3).concat([Math.random()]);
	return RandomWorldPos(_,i);
}


let ForcedString;

class State_Click
{
	constructor(NextState)
	{
		this.NextState=NextState;
		this.WasDown={};
	}
	async Update()
	{
		return this.Started?new this.NextState:this;
	}
	UpdateInput(Name,State)
	{
		this.Started|=(this.WasDown[Name] && !State.Down);
		this.WasDown[Name]=State.Down;
	}
}

class State_Start extends State_Click
{
	constructor()
	{
		super(State_Game);
		this.Time=0;
		ForcedString = 'PRESS ANY KEY';
		ResetGame();
	}
}
class State_Game
{
	constructor()
	{
		this.Time=0;
		ForcedString = null;
		ResetGame();
	}
	async Update()
	{
		NmeLiveCount = Math.floor(this.Time/2000);
		return Lives>0?this:new State_End;
	}
	UpdateInput(Name,State)
	{
	}
}

class State_End extends State_Click
{
	constructor()
	{
		super(State_Start);
		this.Time=1;	//	dont have first frame
		ForcedString = 'GAME OVER';
	}
}

let State;


export default async function Bootup(Canvas,XrOnWaitForCallback)
{
	rc = new RenderContext_t(Canvas);
	Desktop = new DesktopXr(Canvas);
	
	//	load sprites into pixels
	let PixelRows = PadArray(Sprites,DATAHEIGHT,`b1`).map(RleToRgba).map(PadPixels);
	PixelRows = new Float32Array( PixelRows.flat(2) );
	
	//AllocTextures(PositionTextures,InitPositionPixel);
	//AllocTextures(VelocityTextures,InitVelocityPixel);
	AllocTextures(SpriteTextures,PixelRows);

	
	function OnPreRender(CameraToWorld)
	{
		Update();

		//	first frame needs to bake positions before velocity pass
		if ( State.Time == 0 )
		{
			//	reset positions of stuff
			AllocTextures(PositionTextures,InitPositionPixel);
			AllocTextures(VelocityTextures,InitVelocityPixel);
		}
		else
		{
			Blit(VelocityTextures,rc.PhysicsVelocityShader,CameraToWorld,ReadGpuState);
		}
		Blit(PositionTextures,rc.PhysicsPositionShader,CameraToWorld);
	}
	
	function OnPostRender()
	{
		//ReadGpuState();
		PostFrame();
		if ( State.Time == 0 )
			State.Time++;
	}
	
	
	function OnRender(Camera,CameraToWorld)
	{
		if ( !Camera )
			OnPreRender(CameraToWorld);
		else if ( Camera === true )
			OnPostRender();
		else
			Render(Camera);
	}
	function OnInput(Input)
	{
		Object.entries(Input).forEach( e=>{UpdateWeapon(...e);State.UpdateInput(...e);} );
	}
	
	async function XrThread()
	{
		while(XrOnWaitForCallback)
		{
			let XrDevice = await CreateXr(gl,OnRender,OnInput,XrOnWaitForCallback);
			await XrDevice.WaitForEnd;
		}
	}
	XrThread().catch(console.error)
	
	
	State=new State_Start()
	
	function Tick()
	{
		window.requestAnimationFrame(Tick);
		let Rect = Canvas.getBoundingClientRect();
		Canvas.width = Rect.width;
		Canvas.height = Rect.height;

		OnPreRender();
		
		
		const Camera = Desktop.Camera;
		Camera.Viewport = [0,0,Canvas.width,Canvas.height];
		Camera.Alpha = 1;
		Camera.FrameBuffer = null;
	
		Render(Camera);
		
		OnPostRender();
	}

	Tick();
	
	while(true)
	{
		State = (await Promise.all([State.Update(),Yield(30)]))[0];
		if ( State.Time>0 )
			State.Time+=30;
	}
}



let WeaponLastFired = {};	//	[Input] = FiredTime

function FireWeapon(Name,Transform)
{
	function TransformPoint(x,y,z,w=1)
	{
		let p = Transform.transformPoint(new DOMPoint(x,y,z,w));
		return [p.x,p.y,p.z,1];
	}
	WeaponLastFired[Name] = GetTime();
	ProjectilePos[ProjectileIndex%MAX_PROJECTILES] = TransformPoint( 0, 0, lerp(0,-1) );
	ProjectileVel[ProjectileIndex%MAX_PROJECTILES] = TransformPoint( lerp(-1,1), lerp(0,0), lerp(-80,-90), 0 );
	ProjectileIndex++;
}

function UpdateWeapon(Name,State)
{
	WeaponPoses[Name] = Array.from(State.Transform.toFloat32Array());
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
	Object.entries(Input).forEach( e=>{UpdateWeapon(...e);State.UpdateInput(...e);} );
	
	HeartHitCooldown=Math.max(0,HeartHitCooldown-1);
}

function PostFrame()
{
	ProjectilePos.forEach(p=>p[3]=0);
	ProjectileVel.forEach(p=>p[3]=0);
}

function InitTexture()
{
	let s=(p,v)=>gl.texParameteri(gl.TEXTURE_2D,p,v);
	s(gl.TEXTURE_MIN_FILTER,gl.NEAREST);
	s(gl.TEXTURE_MAG_FILTER,gl.NEAREST);
	s(gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
	s(gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
}


function AllocTextures(Textures,PixelData)
{
	if ( Textures.length==0 )
		Textures.push(null,null);
	
	const w = DATAWIDTH;
	const h = DATAHEIGHT;
	PixelData = typeof PixelData!='function' ? PixelData : new Float32Array(InitArray(w*h,PixelData).flat(2));
	
	const SourceFormat = gl.RGBA;
	
	const SourceType = FloatTarget ? gl.FLOAT : gl.UNSIGNED_BYTE;
	const InternalFormat = FloatTarget ? gl.RGBA32F : gl.RGBA;
	if ( !FloatTarget )
		PixelData = new Uint8Array(PixelData);

	for ( let t of [OLD,NEW] )
	{
		Textures[t] = Textures[t]||gl.createTexture();
		Textures[t].Size = [w,h];
		Textures[t].Type = SourceType;
		gl.activeTexture(gl.TEXTURE0);
		gl.bindTexture(gl.TEXTURE_2D,Textures[t]);
		gl.texImage2D(gl.TEXTURE_2D,0,InternalFormat,w,h,0,SourceFormat,SourceType,PixelData);
		InitTexture();
	}
}

let BoundShader;
function BindShader(Shader)
{
	gl.useProgram(BoundShader=Shader);
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
	//if ( Length < 1 || isNaN(Length)) throw `Bad uniform ${Name} length ${Length}`;
	//if ( (Value.length % Length)!=0 )	throw `Misaligned uniform ${Name} array`;
	let f = `uniform${Length}fv`;
	gl[f]( ul(Name), Value );
}

function SetUniformTexture(Name,TextureIndex,Texture)
{
	gl.activeTexture(gl.TEXTURE0+TextureIndex);
	gl.bindTexture( gl.TEXTURE_2D, Texture );
	gl.uniform1i(ul(Name),TextureIndex);
}


function Pass(Viewport)
{
	gl.viewport(...Viewport);
	gl.disable(gl.CULL_FACE);
	//	required for quest
	gl.scissor( ...Viewport );
	gl.enable(gl.SCISSOR_TEST);
}


function SetUniformStr(Name,Str)
{
	let Mat = Str.toString().split``.map(x=>CharToSprite(x));
	SetUniformMat4(Name,PadArray(Mat,STRINGCOUNT*16,SPRITESPACE));
}


function UpdateUniforms()
{
	let Killed = (NmeLiveCount-NmeCount);
	let Str = `@@@@@     `.substr(5-Lives).substr(0,5);
	Str += ` ~${Killed}`;
	if ( HeartHitCooldown>0 )
		Str =`~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~`;
	SetUniformStr('String',ForcedString||Str);
	
	SetUniformVector('Random4',[0,0,0,0].map(plerp));
	SetUniformVector('Heart',[Lives,HeartHitCooldown,State.Time]);

	SetUniformVector('ProjectilePos',ProjectilePos.flat(4));
	SetUniformVector('ProjectileVel',ProjectileVel.flat(4));
	SetUniformMat4('WeaponPoses',Object.values(WeaponPoses).flat(4));

	SetUniformTexture('OldPositions',0,PositionTextures[OLD]);
	SetUniformTexture('OldVelocitys',1,VelocityTextures[OLD]);
	SetUniformTexture('SpritePositions',2,SpriteTextures[0]);
	
	let WavePositions = Array(WAVEPOSITIONCOUNT).fill().map((x,i)=>GetWavexy(Waves[i%Waves.length],State.Time-(i*2000)));
	SetUniformVector('WavePositions',WavePositions.flat(2));
}

function Render(Camera)
{
	gl.bindFramebuffer( gl.FRAMEBUFFER, Camera.FrameBuffer );
	Pass(Camera.Viewport);
	gl.clearColor(...ClearColour,Camera.Alpha);
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	gl.enable(gl.DEPTH_TEST);
	
	BindShader(rc.CubeShader);

	UpdateUniforms();
	SetUniformMat4('WorldToCameraTransform',Camera.WorldToLocal.toFloat32Array());
	SetUniformMat4('CameraProjectionTransform',Camera.GetProjectionMatrix(Camera.Viewport));
	SetUniformTexture('NewPositions',3,PositionTextures[NEW]);
	SetUniformTexture('NewVelocitys',4,VelocityTextures[NEW]);
	
	let IndexCount = 6*2*3;
	gl.drawArrays(gl.TRIANGLES,0,IndexCount*(DATALAST+DRAWFLOOR));
}


function Blit(Textures,Shader,CameraToWorld,PostFunc)
{
	CameraToWorld = CameraToWorld||Desktop.Camera.LocalToWorld;

	//	swap
	Textures.reverse();
	
	const Target = Textures[NEW];
	
	gl.bindFramebuffer( gl.FRAMEBUFFER, TextureTarget );
	gl.bindTexture( gl.TEXTURE_2D, null );
	gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, Target, 0 );
/*
	const Target = {};
	Target.Size=[200,200];
	gl.bindFramebuffer( gl.FRAMEBUFFER, null );
*/
/*
	let Status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
	if ( Status != gl.FRAMEBUFFER_COMPLETE )
		console.log(`Framebuffer status ${Status}`);
	*/
	Pass([0,0,...Target.Size]);
	gl.disable( gl.BLEND );
	gl.disable(gl.SCISSOR_TEST);
	BindShader( Shader );

	UpdateUniforms();
	SetUniformVector('NmeLiveCount',[NmeLiveCount]);
	SetUniformTexture('NewPositions',3,PositionTextures[Target!=PositionTextures[NEW]?NEW:OLD]);
	SetUniformMat4('CameraToWorld',CameraToWorld.toFloat32Array());

	gl.drawArrays(gl.TRIANGLE_FAN,0,4);
	
	if ( PostFunc )PostFunc(Textures);
}


let ReadBuffer;


async function Yield(ms)
{
	let r,p=new Promise(rs=>r=rs);
	setTimeout(r,ms);
	await p;
}

async function WaitForSync(Sync,Context)
{
	const gl = Context;
	
	const RecheckMs = 1000/10;
	async function CheckSync()
	{
		const Flags = 0;
		const WaitNanoSecs = 0;
		while(true)
		{
			const Status = gl.clientWaitSync( Sync, Flags, WaitNanoSecs );
			if ( Status == gl.WAIT_FAILED )
				throw `clientWaitSync failed`;
			if ( Status == gl.TIMEOUT_EXPIRED )
			{
				await Yield( RecheckMs );
				continue;
			}
			//	ALREADY_SIGNALED
			//	CONDITION_SATISFIED
			break;
		}
	}
	return CheckSync();
}

async function ReadGpuState(Textures)
{
	const Velocities = await ReadTexture( Textures[NEW] );
	const Velw = Velocities.filter((v,i)=>(i%4)==3);
	
	const NmeMap = {};
	const Nmes = Velw.filter( w => w>=SPRITE0 ).forEach( w=>NmeMap[w]=(NmeMap[w]||0)+1 );
	NmePixelCount = Velw.filter( w => w>=SPRITE0 ).length;
	NmeCount = Object.keys(NmeMap).length;
	NmeDeadCount = Object.values(NmeMap).filter(c=>c==0).length;
	let HeartDebrisCount = Velw.filter( w => w==DEBRISHEART ).length;
	//	new heart debris
	if ( HeartDebrisCount>0 && HeartHitCooldown==0 )
	{
		Lives--;
		HeartHitCooldown = HEARTCOOLDOWNFRAMES+1;
	}
}

async function ReadTexture(Target)
{
	ReadBuffer = ReadBuffer || gl.createBuffer();
	
	const PixelBuffer = new (Target.Type==gl.FLOAT?Float32Array:Uint8Array)(DATAWIDTH*DATAHEIGHT*4);
	
	gl.readPixels( 0, 0, DATAWIDTH, DATAHEIGHT, gl.RGBA, Target.Type, PixelBuffer );
	return PixelBuffer;
	/*
	
	gl.bindBuffer(gl.PIXEL_PACK_BUFFER, ReadBuffer );
	gl.bufferData(gl.PIXEL_PACK_BUFFER, PixelBuffer.byteLength, gl.STREAM_READ );
	const Offset = 0;
	gl.readPixels( 0, 0, DATAWIDTH, DATAHEIGHT, gl.RGBA, gl.FLOAT, Offset );
	gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null );
	
	//	create a sync point so we know when readpixels commands above have completed
	const Sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
	
	async function DoRead()
	{
		await WaitForSync(Sync,gl);
		gl.deleteSync(Sync);
		gl.bindBuffer(gl.PIXEL_PACK_BUFFER, ReadBuffer);
		const SourceOffset = 0;
		const DestinationOffset = 0;
		const DestinationSize = DATAWIDTH*DATAHEIGHT*4;//PixelBuffer.byteLength;
		gl.getBufferSubData(gl.PIXEL_PACK_BUFFER, SourceOffset, PixelBuffer, DestinationOffset, DestinationSize );
		gl.bindBuffer(gl.PIXEL_PACK_BUFFER, null);
		return PixelBuffer;
	}
	
	return DoRead();
	//Image.ReadPixelsBufferPromise.finally(Cleanup);
	//gl.deleteBuffer(ReadPixelsBuffer);
	 */
}



let xr = navigator.xr;

async function GetSupportedSessionMode()
{
	if ( !xr )
		return false;
	
	//	mozilla XR emulator has supportsSession
	//	proper spec is isSessionSupported
	if ( !xr.isSessionSupported && !xr.supportsSession )
		throw "XR platform missing isSessionSupported and supportsSession";
	if ( !xr.isSessionSupported )
	{
		//	make a wrapper
		xr.isSessionSupported = async function(SessionType)
		{
			//	sessionSupported throws if not supported
			try
			{
				await xr.supportsSession( SessionType );
				return true;
			}
			catch(e)
			{
				return false;
			}
		}
	}
	
	//	gr: we may want to enumerate all the modes
	const SessionTypes =
	[
	'immersive-ar',
	'immersive-vr',
	'inline'
	];
	
	const Errors = [];
	for ( let SessionType of SessionTypes )
	{
		try
		{
			const Supported = await xr.isSessionSupported(SessionType);
			if (!Supported)
				throw `XR SessionType ${SessionType} not supported (${Supported})`;
			return SessionType;
		}
		catch(e)
		{
			console.warn(e);
		}
	}

	return false;
}

function CreatePromise()
{
	let r,x,p=new Promise((rs,rj)=>{r=rs;x=rj});
	p.Resolve=r;
	p.Reject=x;
	return p;
}

function GetXrAlpha(BlendMode)
{
	//	if undefined or invalid, assume opaque
	switch(BlendMode)
	{
	case 'additive':
	case 'alpha-blend':
		return 0;
	
	case 'opaque':
	default:
		return 1;
	}
}

class XrDev
{
	constructor(Session,ReferenceSpace,gl,OnRender,OnInput)
	{
		this.gl = gl;
		this.Session = Session;
		this.ReferenceSpace = ReferenceSpace;
		this.OnRender = OnRender;
		this.OnInput = OnInput;
		this.WaitForEnd = CreatePromise();
		this.Inputs={};
		Session.addEventListener('end',this.WaitForEnd.Resolve);
	}
	
	async InitLayer()
	{
		let gl=this.gl;
		this.EnableStencilBuffer = false;

		
		const Options = {};
		//	scale down frame buffer size to debug frag vs vert bound
		//	mentioned here: https://developer.oculus.com/documentation/web/webxr-perf-workflow/
		Options.framebufferScaleFactor = 1.0;
		Options.antialias = true;
		this.Layer = new XRWebGLLayer( this.Session, gl, Options );
		this.Session.updateRenderState({ baseLayer: this.Layer });
	
		//	https://developer.oculus.com/documentation/web/webxr-ffr/#to-set-and-adjust-ffr-dynamically
		//	set dynamic FFR...
		if ( this.Layer.fixedFoveation === undefined )
			console.warn(`WebXR layer doesn't support FixedFoveationRendering`,this.Layer);
		else
			this.Layer.fixedFoveation = 1;
		this.OnFrame(0,null);
	}
	
	OnFrame(TimeMs,Frame)
	{
		this.Session.requestAnimationFrame( this.OnFrame.bind(this) );
		let gl=this.gl;
		//	do browser anim step
		const Pose = Frame ? Frame.getViewerPose(this.ReferenceSpace) : null;
		
		//	don't know what to render?
		if ( !Pose )
		{
			console.log(`XR no pose`,Pose);
			return;
		}
		this.FrameUpdate_Input(Frame,Pose);
		this.OnRender(false,new DOMMatrix(Pose.transform.matrix));	//	prerender
		//	render
		//const DeviceFrameBuffer = gl.getParameter(gl.FRAMEBUFFER_BINDING);
		let DeviceFrameBuffer = this.Layer.framebuffer;
		for ( let View of Pose.views )
			this.OnFrameClassic( Frame, Pose, View, DeviceFrameBuffer );
		
		this.OnRender(true);	//	post render
	}
	
	OnFrameClassic(Frame,Pose,View,FrameBuffer)
	{
		let Viewport = this.Layer.getViewport(View);
		
		let Camera = {};
		Camera.Alpha = GetXrAlpha(Frame.session.environmentBlendMode);
		Camera.FrameBuffer = FrameBuffer;
		Camera.Viewport = [Viewport.x,Viewport.y,Viewport.width,Viewport.height];
		Camera.LocalToWorld = new DOMMatrix(Pose.transform.matrix);
		Camera.WorldToLocal = new DOMMatrix(Pose.transform.inverse.matrix);
		Camera.GetProjectionMatrix = function(Viewport)
		{
			return View.projectionMatrix;
		}
		this.OnRender(Camera);
	}
	
	FrameUpdate_Input(Frame,Pose)
	{
		let RefSpace = this.ReferenceSpace;
		function GetPose(XrSpace)
		{
			let Pose = XrSpace ? Frame.getPose(XrSpace,RefSpace) : null;
			return Pose ? new DOMMatrix(Pose.transform.matrix) : null;
		}

		//	de-activate prev states
		Object.entries(this.Inputs).forEach(e=>e[1].Active=false);
		
		let EnumInput = (Name,Down,XrSpace)=>
		{
			let Trans = GetPose(XrSpace);
			let In = this.Inputs[Name];
			if ( !Trans && !In )	return;
			In = In||{};
			In.Transform = Trans||In.Transform;
			In.Active = Trans!=null;
			In.Down = Down && In.Active;
			this.Inputs[Name] = In;
		}
		
		function IterateInput(Input,Index)
		{
			//	gr: this input name is not unique enough yet!
			const InputName = Input.handedness;
			//	treat joints as individual inputs as they all have their own pos
			/*if ( Input.hand )
			{
				const HandInputs = ExtractHandInputs( Input.hand, InputName, GetPose.bind(this) );
				for ( let Input of HandInputs )
				{
					UpdateInputNode( Input.PoseSpace, Input.Name, Input.Buttons, Input.ExtraData );
				}
			}
			else//	normal controller, but on quest, this is also the center of the hand with the finger-click button0
			 */
			//	so we should make use of these buttons for a "palm" finger
			if ( Input.gamepad )
			{
				if (!Input.gamepad.connected)
					return;
				
				const AnyDown = (Input.gamepad.buttons||[]).some(x=>x.pressed);
				EnumInput(InputName,AnyDown,Input.targetRaySpace);
			}
			else
			{
				console.warn(`Ignoring input ${InputName} #${Index}`);
			}
		}
		
		let Inputs = Array.from(Frame.session.inputSources);
		Inputs.forEach(IterateInput.bind(this));
		this.OnInput(this.Inputs);
	}
}

export async function CreateXr(gl,OnRender,OnInput,OnWaitForCallback)
{
	const SessionMode = await GetSupportedSessionMode();
	if ( SessionMode == false )
		throw "Browser doesn't support XR.";

	const SessionPromise = CreatePromise();
	const Callback = function()
	{
		//	gr: could use a generic callback like the audio system does
		//	this should be called from user interaction, so we start,
		//	and return that promise
		try
		{
			const Options = {};
			Options.optionalFeatures = [];
			Options.optionalFeatures.push('local');
			Options.optionalFeatures.push('local-floor');
			Options.optionalFeatures.push('bounded-floor');
			Options.optionalFeatures.push('hand-tracking');	//	for quest
			Options.optionalFeatures.push('high-fixed-foveation-level');
			const RequestSessionPromise = xr.requestSession(SessionMode,Options);
			RequestSessionPromise.then( Session => SessionPromise.Resolve(Session) ).catch( e => SessionPromise.Reject(e) );
		}
		catch(e)
		{
			SessionPromise.Reject(e);
		}
	}
	OnWaitForCallback(Callback);
	
	const Session = await SessionPromise;
	const ReferenceSpaceTypes =
	[
		'bounded-floor',	//	expecting player to not move out of this space. bounds geometry returned, y=0=floor
		'local-floor',		//	y=0=floor
		'local',			//	origin = view starting pos
		'unbounded',		//	gr: where is origin?
		'viewer',
	];
	async function GetReferenceSpace()
	{
		for ( let ReferenceSpaceType of ReferenceSpaceTypes )
		{
			try
			{
				const ReferenceSpace = await Session.requestReferenceSpace(ReferenceSpaceType);
				ReferenceSpace.Type = ReferenceSpaceType;
				return ReferenceSpace;
			}
			catch(e)
			{
				console.warn(`XR ReferenceSpace type ${ReferenceSpaceType} not supported. ${e}`);
			}
		}
		throw `Failed to find supported XR reference space`;
	}
	const ReferenceSpace = await GetReferenceSpace();
	console.log(`Got XR ReferenceSpace`,ReferenceSpace);
	
	const Device = new XrDev( Session, ReferenceSpace, gl, OnRender, OnInput );
	await Device.InitLayer();
	return Device;
}
