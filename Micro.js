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
function GetTime(){	return Math.floor(performance.now());	}

function ResetGame()
{
	Lives = MAXLIVES;
	HeartHitCooldown = 0;
	NmeLiveCount = 0;
	NmeCount = 0;
	NmeDeadCount = 0;
	//AllocTextures(PositionTextures,InitPositionPixel);
	//AllocTextures(VelocityTextures,InitVelocityPixel);
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
	"a11b2a9b2a9b4a7b2a2b1a6b4a7", //	P
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
	MAX_PROJECTILES:40,
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
};
const MacroSource = Object.entries(Macros).map(kv=>`#define ${kv[0]} ${kv[1]}`).join('\n');
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
		Macros.FLOAT_TARGET=FloatTarget?1:0;
		
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

	State=new State_Start()
	
	function Tick()
	{
		window.requestAnimationFrame(Tick);
		Update();
		let Rect = Canvas.getBoundingClientRect();
		Canvas.width = Rect.width;
		Canvas.height = Rect.height;

		//	first frame needs to bake positions before velocity pass
		if ( State.Time == 0 )
		{
			//	reset positions of stuff
			AllocTextures(PositionTextures,InitPositionPixel);
			AllocTextures(VelocityTextures,InitVelocityPixel);
		}
		else
		{
			Blit(VelocityTextures,rc.PhysicsVelocityShader,ReadGpuState);
		}
		Blit(PositionTextures,rc.PhysicsPositionShader);
		
		Render(Canvas.width,Canvas.height);
		//ReadGpuState();
		PostFrame();
		if ( State.Time == 0 )
			State.Time++;
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
	ProjectilePos[ProjectileIndex%MAX_PROJECTILES] = TransformPoint( 0, 0, lerp(0,1) );
	ProjectileVel[ProjectileIndex%MAX_PROJECTILES] = TransformPoint( lerp(-1,1), lerp(0,0), lerp(60,80), 0 );
	ProjectileIndex++;
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


function Pass(w,h)
{
	gl.viewport(0,0,w,h);
	gl.disable(gl.CULL_FACE);
}


function SetUniformStr(Name,Str)
{
	let Mat = Str.toString().split``.map(x=>CharToSprite(x));
	SetUniformMat4(Name,PadArray(Mat,STRINGCOUNT*16,SPRITESPACE));
}


function UpdateUniforms()
{
	//let s = `0123456748901234567890123456789`.split``;
	//let i = Number((GetTime()/100)%32);
	//s.splice(i,0,' ');
	//s = s.join('');
	
	{
		//SetUniformStr('String',s);
		//SetUniformStr('String',`@${ProjectileIndex} ${GetTime()/1000>>0}!`);
		let Killed = (NmeLiveCount-NmeCount);
		
		let Str = `@@@@@     `.substr(5-Lives).substr(0,5);
		Str += ` ~${Killed}`;
		if ( HeartHitCooldown>0 )
			Str =`~ ~ ~ ~ ~ ~ ~ ~ ~ ~ ~`;
		//SetUniformStr('String',`~${Killed} ${GetTime()/1000>>0}! @${ProjectileIndex}`);
		SetUniformStr('String',ForcedString||Str);
		//SetUniformStr('String',`012345678901234567890123456789`);
	}
	
	SetUniformVector('Random4',[0,0,0,0].map(plerp));
	SetUniformVector('Heart',[Lives,HeartHitCooldown,State.Time]);

	let WavePositions = Array(WAVEPOSITIONCOUNT).fill().map((x,i)=>GetWavexy(Waves[i%Waves.length],State.Time-(i*2000)));
	SetUniformVector('WavePositions',WavePositions.flat(2));
}

function Render(w,h)
{
	let Camera = Desktop.Camera;

	gl.bindFramebuffer( gl.FRAMEBUFFER, null );
	Pass(w,h);
	gl.clearColor(...ClearColour);
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	gl.enable(gl.DEPTH_TEST);
	
	BindShader(rc.CubeShader);

	UpdateUniforms();
	SetUniformMat4('WorldToCameraTransform',Camera.WorldToLocal.toFloat32Array());
	SetUniformMat4('CameraProjectionTransform',Camera.GetProjectionMatrix([0,0,w/h,1]));
	SetUniformTexture('PositionsTexture',0,PositionTextures[NEW]);
	SetUniformTexture('OldPositionsTexture',1,PositionTextures[OLD]);
	SetUniformTexture('NewVelocitys',2,VelocityTextures[NEW]);
	
	let IndexCount = 6*2*3;
	gl.drawArrays(gl.TRIANGLES,0,IndexCount*(DATALAST+1));
}


function Blit(Textures,Shader,PostFunc)
{
	let Camera = Desktop.Camera;

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

	let Status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
	if ( Status != gl.FRAMEBUFFER_COMPLETE )
		console.log(`Framebuffer status ${Status}`);
	
	Pass(...Target.Size);
	gl.disable( gl.BLEND );
	/*
	gl.disable(gl.SCISSOR_TEST);
	gl.disable(gl.CULL_FACE);
	gl.clearColor(1,0,0,1);
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	gl.enable(gl.DEPTH_TEST);
*/
	BindShader( Shader );

	UpdateUniforms();
	SetUniformVector('NmeLiveCount',[NmeLiveCount]);
	SetUniformTexture('OldPositions',0,PositionTextures[OLD]);
	SetUniformTexture('OldVelocitys',1,VelocityTextures[OLD]);
	SetUniformTexture('NewPositions',2,PositionTextures[Target!=PositionTextures[NEW]?NEW:OLD]);
	SetUniformTexture('SpritePositions',3,SpriteTextures[0]);
	SetUniformVector('ProjectilePos',ProjectilePos.flat(4));
	SetUniformVector('ProjectileVel',ProjectileVel.flat(4));
	SetUniformMat4('CameraToWorld',Camera.LocalToWorld.toFloat32Array());

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
