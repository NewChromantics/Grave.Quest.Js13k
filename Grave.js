const CubeShader={};
const PosShader={};
const VelShader={};
const NmeMeta =
`
#define Range(mn,mx,v)		((v-mn)/(mx-mn))
#define Range01(mn,mx,v)	clamp(Range(mn,mx,v),0.0,1.1)
#define Lerp(mn,mx,v)	( mn + ((mx-mn)*v) )
#define ENTROPY_MIN4	vec4(ENTROPY_MIN,ENTROPY_MIN,ENTROPY_MIN,0)
#define ENTROPY_MAX4	vec4(ENTROPY_MAX,ENTROPY_MAX,ENTROPY_MAX,1)
#define dataFetch(t)	Lerp( ENTROPY_MIN4, ENTROPY_MAX4, texelFetch(t,ivec2(Cubexy),0) )
#define dataWrite(v)	Range( ENTROPY_MIN4.xyz,ENTROPY_MAX4.xyz,v)

#define SpriteMat(t)		mat4(CUBESIZE,oooo,CUBESIZE,oooo,CUBESIZE,0,t,1)

uniform vec4 WavePositions[WAVEPOSITIONCOUNT];

#define SPRITEDIM	vec3(SPRITEW,0,0)
#define CHARDIM		vec3(CHARW,CHARH,0)

//	sprite local pos centered
#define SpriteXyzw(si,wh)	vec4(texelFetch(SpritePositions,ivec2(Cubexy.x,si),0).xyz-(wh/2.0),1)

#define WaveXyz(wv)	(WavePositions[wv].xyz*vec3(5,4,0)+vec3(0,4,-10))

//	on death stay still
//#define Nmexyz		(SpriteMat(WaveXyz(NmeIndex))*SpriteXyzw(SpriteIndex,SPRITEDIM)).xyz
//#define NmePos		mix(Nmexyz,HeartPos0,WavePositions[NmeIndex].w*sign(Livesf))

//	on death move to heart
#define Nmexyz		(SpriteMat(Dead?HeartPos0:WaveXyz(NmeIndex))*SpriteXyzw(SpriteIndex,SPRITEDIM)).xyz
#define NmePos		mix(Nmexyz,HeartPos0,WavePositions[NmeIndex].w)


#define NmeIndex		int(Sloti)
#define NmeIndexf		float(NmeIndex)

//	voxel slots are frag y (should pack these into index, but we use .x for sprite index)
//	only to be used in blits
#ifndef Cubexy
#define Cubexy			gl_FragCoord
#endif
#define					FragIndex	(int(Cubexy.x) + (int(Cubexy.y)*DATAWIDTH))

#define						ActorCount	MAX_ACTORS
#define ProjectileRow		(ActorCount+0)				//100
#define HeartRow			(ActorCount+1)				//101
#define CharRow				(Sloti-(ActorCount+2))		//102 103
#define WeaponRow			(ActorCount+6)			//	104
#define Sloti				int(Cubexy.y)
#define Slot_IsActor		(Sloti<ActorCount)
#define Slot_IsProjectile	(Sloti==ProjectileRow)
#define Slot_IsHeart		(Sloti==HeartRow)
#define Slot_IsChar			(CharRow>=0&&CharRow<=2)
#define Slot_IsFloor		(FragIndex==DATALAST)
#define Projectilei			int(Cubexy.x)
#define FetchProjectile(t,p)	texelFetch(t,ivec2(p,ProjectileRow),0)
#define Slot_IsWeapon		(Sloti==WeaponRow )//&& Weaponi < MAX_WEAPONS)
#define Weaponi				int(Cubexy.x)

//	type changes, so is velocity w
#define Type			Vel4.w
#define Typei			int(Type)
#define Type_IsStatic	(Typei<=STATIC)
#define Type_IsNull		(Typei==NULL)
#define Type_IsDebris	(Typei==DEBRIS||Typei==DEBRISHEART||Typei==DEBRISBLOOD)
#define Type_IsDebrisHeart	(Typei==DEBRISHEART)
#define Type_IsDebrisBlood	(Typei==DEBRISBLOOD)
#define Type_IsSprite	(Typei>=SPRITE0)
#define Type_IsAsleep	(Typei<0)
//#define SpriteIndex		((abs(Typei)-SPRITE0)%SPRITECOUNT)
#define SpriteIndex		(Typei>0?0 : abs(Typei)-SPRITE0 )

#define PPerChar		20
#define CharBuffer		(STRINGCOUNT*16)
#define Chari			(int(Cubexy.x)+(CharRow*DATAWIDTH))
#define CharP			(Chari%PPerChar)
#define CharN			int(Chari/PPerChar)

uniform mat4 String[STRINGCOUNT];
#define CharLineW		10
#define CharOrigin		vec3(-float(CharLineW)*0.5*0.4,1,-8)
#define CharKern		vec3(0.45,-0.4,1)
#define CharPos(n)		CharOrigin+vec3(n%CharLineW,int(n/CharLineW),0)*CharKern

#define Charxyz(n,s)	(CameraToWorld * SpriteMat(CharPos(n)) * texelFetch( SpritePositions, ivec2(CharP,s), 0 )).xyz
#define CharS			int(String[CharN/16][CharN%16/4][CharN%4])
#define CharXyz			(Charxyz(CharN,CharS))
#define Charw			int(texelFetch( SpritePositions, ivec2(CharP,CharS), 0 ).w)
#define CharNull		(Charw==0)

#define HeartPos(sxyz)	(CameraToWorld * SpriteMat(vec3(0,-0.6,-1.5)) * sxyz ).xyz
#define HeartPos0		HeartPos(vec4(ooo1))
#define HeartXyz		HeartPos(SpriteXyzw(SPRITEHEART,CHARDIM))

uniform vec3 Heart;
#define HeartCooldown	int(Heart.y)
#define Livesf			max(0.0,Heart.x)
#define Dead			(Livesf<1.0)
#define FirstFrame		(Heart.z<=0.0)

uniform mat4 CameraToWorld;

uniform vec4 ProjectileVel[MAX_PROJECTILES];
uniform vec4 ProjectilePos[MAX_PROJECTILES];
uniform mat4 WeaponPoses[MAX_WEAPONS];
uniform vec4	Random4;
uniform sampler2D OldVelocitys;
uniform sampler2D NewVelocitys;
uniform sampler2D OldPositions;
uniform sampler2D NewPositions;
uniform sampler2D SpritePositions;

#define RAND1			(Pos4.w)
#define UP				vec3(0,1,0)
`;

PosShader.Vert =
`
out vec2 uv;
void main()
{
#define c(n,u,v)	case n:uv=vec2(u,v);break;
	switch(gl_VertexID)
	{
c(0,0,0)
c(1,1,0)
c(2,1,1)
c(3,0,1)
	}
	gl_Position=vec4(uv*2.0-1.0,0,1);
}
`;

PosShader.Frag =
`out vec4 xyzw;
in vec2 uv;

${NmeMeta}

#define xyz	xyzw.xyz
void main()
{
	vec4 Vel4 = dataFetch(OldVelocitys);
	xyzw = dataFetch(OldPositions);
	
	if ( FirstFrame )
	{
		xyz = (SpriteMat(xyz)*SpriteXyzw(SpriteIndex,SPRITEDIM)).xyz;
		if ( !Type_IsStatic )
			xyz = NmePos;	//	if is actor
		if ( Slot_IsHeart )
			xyz = HeartXyz;
		if ( Slot_IsChar )
			xyz = CharXyz;
	}
	else
	{
		xyz += Vel4.xyz * TIMESTEP;
	}

	//	new projectile data
	if ( Slot_IsProjectile && ProjectilePos[Projectilei].w > 0.0 )
		xyz = ProjectilePos[Projectilei].xyz;

	//	stick to floor
	xyz.y = max( xyz.y, float(FLOORY) );
	xyz = dataWrite(xyz);
}
`;


CubeShader.Vert =
`out vec2 FragCubexy;
out vec3 FragWorldPosition;
out vec4 Velocity;
out float Rand1;
uniform mat4 WorldToCameraTransform;
uniform mat4 CameraProjectionTransform;

#define Cubexy	FragCubexy
${NmeMeta}

vec3 GetLocalPosition(int v)
{
	int x = ivec4(915775499,923195439,642272978,49129)[v/30]>>v%30;
	return sign(vec3(x&1,x&2,x&4));
}

#define FloorCubeSize (FLOORSIZE/CUBESIZE)
#define FloorTransform	mat4(FloorCubeSize,0,ooo1,oooo,FloorCubeSize,0,0,float(FLOORY)-CUBESIZE,0,1)

mat4 GetLocalToWorldTransform()
{
	if ( Slot_IsFloor )	return FloorTransform;
	if ( Slot_IsWeapon )	return WeaponPoses[Weaponi];


	vec4 OldPosition4 = dataFetch(OldPositions);
	vec4 Position4 = dataFetch(NewPositions);
	Rand1 = Position4.w;
	vec3 WorldPosition = Position4.xyz;

	mat4 Transform = mat4( 1,0,ooo1,0,ooo1,0,WorldPosition,1 );
	return Transform;
}

float VelocityStretch = 3.0;
#define ENABLE_STRETCH	(FLOAT_TARGET && !Slot_IsFloor)
//#define ENABLE_STRETCH	false


vec3 GetWorldPosition(mat4 LocalToWorldTransform,vec3 LocalPosition)
{
	LocalPosition *= CUBESIZE;

	Velocity = dataFetch(NewVelocitys);

	vec3 WorldPos = (LocalToWorldTransform * vec4(LocalPosition,1.0)).xyz;

	//	stretch world pos along velocity
	vec3 TailDelta = -Velocity.xyz * VelocityStretch * TIMESTEP;
	if ( !ENABLE_STRETCH || length(TailDelta)<CUBESIZE)
		return WorldPos;

	vec3 OriginWorldPos = (LocalToWorldTransform * vec4(ooo1)).xyz;
	vec3 LocalPosInWorld = WorldPos - OriginWorldPos;
	
	vec3 NextPos = WorldPos - (TailDelta*0.9);
	vec3 PrevPos = WorldPos + (TailDelta*0.1);
	float Scale = dot( normalize(LocalPosInWorld), normalize(-TailDelta) );
	Scale=Scale>0.0?1.0:0.0;
	WorldPos = mix(PrevPos,NextPos,Scale);
	return WorldPos;
}


void main()
{
	int CubeIndex = gl_VertexID / (3*2*6);
	FragCubexy = vec2( CubeIndex%DATAWIDTH, (CubeIndex/DATAWIDTH) );
	int VertexOfCube = gl_VertexID % (3*2*6);
	vec3 LocalPosition = GetLocalPosition( VertexOfCube*3 );
	mat4 LocalToWorldTransform = GetLocalToWorldTransform();
	vec3 WorldPosition = GetWorldPosition(LocalToWorldTransform,LocalPosition-0.5);
	vec4 CameraPos = WorldToCameraTransform * vec4(WorldPosition,1);	//	world to camera space
	vec4 ProjectionPos = CameraProjectionTransform * CameraPos;
	gl_Position = ProjectionPos;
	FragWorldPosition = WorldPosition.xyz;
}
`;

CubeShader.Frag =
`out vec4 FragColor;
in vec2 FragCubexy;
in vec3 FragWorldPosition;
in vec4 Velocity;
in float Rand1;
vec4 Light = vec4(ooo,LIGHTRAD);

#define DEBUG_COLOURS		true
#define FLOOR_TILE_SIZE		0.4
#define FLOOR_COLOUR(Odd)	vec3(Odd?0.2:0.1)
#define PROJECTILE_COLOUR	vec3(0.8,0.06,0.26)
#define WEAPON_COLOUR		vec3(0,1,1)
#define HEART_COLOUR		vec3(1,0,0)
#define Cubexy	FragCubexy
${NmeMeta}



void main()
{
	//if ( FLOAT_TARGET )
	{
		FragColor = vec4(0,1,0,1);
//		return;
	}
	vec4 Vel4 = Velocity;
	vec3 rgb = vec3(1,0,1);

	ivec3 xz = ivec3(mod(FragWorldPosition/FLOOR_TILE_SIZE,vec3(2)));
	vec3 SpookyColour = mod( vec3(FragIndex), vec3(1234,100,7777) ) / vec3(1000,100,7777) * vec3(0.1,1,0.3);

	if ( Type_IsStatic )	rgb = vec3(1);
	if ( Type_IsDebris )	rgb = SpookyColour;//vec3(1,0,0);
	if ( Type_IsDebrisBlood )
	{
		rgb = vec3(1,0,0);
		Vel4=vec4(0);
	}
	if ( Type_IsSprite )	rgb = SpookyColour;
	//if ( Type_IsSprite )	rgb = vec3(0,1,0);
	if ( Slot_IsFloor )
	{
		rgb = FLOOR_COLOUR(xz.x==xz.z);
		Vel4*=0.0;
	}
	else if ( Type_IsNull )		discard;

	if (Slot_IsProjectile)
	{
		rgb = PROJECTILE_COLOUR;
		Vel4*=0.2;
	}
	if (Slot_IsWeapon)
	{
		rgb = WEAPON_COLOUR;
		Vel4*=0.2;
	}
	if ( Slot_IsHeart )
	{
		rgb = HEART_COLOUR;
		Vel4*=0.2;

		if ( Dead )discard;
		if ( HeartCooldown >= HEARTCOOLDOWNFRAMES )
			discard;//rgb = vec3(0,0,1);
		else
			if ( (HeartCooldown%8) >= 4 )
				discard;
	}

	rgb *= mix(0.7,1.0,Rand1);

	float Lit = 1.0 - min(1.0,length(FragWorldPosition-Light.xyz)/Light.w);
	//float Lit=1.0;
	/*
	//Lit *= Lit;
	Lit*=4.0;
	Lit = Lit < 1.0 ? 0.2 : 1.0;
*/
	rgb += vec3(Lit)*0.2;
	Lit += min(9.9,length(Vel4.xyz)/4.0);

	rgb *= vec3(Lit);
	FragColor = vec4(rgb,1);
}
`;

VelShader.Vert = PosShader.Vert;
VelShader.Frag =
`out vec4 Vel4;
in vec2 uv;
${NmeMeta}

#define GravityY	16.0
#define FloorDrag	mix(0.3,0.8,RAND1*Random4.x)

//	gr: make this bigger based on velocity so sliding projectiles dont hit so much
#define PROJECTILE_MAX_SIZE	(CUBESIZE*5.0)
#define PROJECTILE_MIN_SIZE	(CUBESIZE*1.0)
#define PROJECTILE_MIN_VEL	10.0
#define PROJECTILE_MAX_VEL	40.0


float TimeAlongLine3(vec3 Position,vec3 Start,vec3 End)
{
	vec3 Direction = End - Start;
	float DirectionLength = length(Direction);
	if ( DirectionLength < 0.0001 )
		return 0.0;
	float Projection = dot( Position - Start, Direction) / (DirectionLength*DirectionLength);
	
	return Projection;
}

vec3 NearestToLine3(vec3 Position,vec3 Start,vec3 End)
{
	float Projection = TimeAlongLine3( Position, Start, End );
	
	//	clip to start & end of line
	Projection = clamp( Projection, 0.0, 1.0 );

	vec3 Near = mix( Start, End, Projection );
	return Near;
}

vec3 hash32(vec2 p)
{
	vec3 p3 = fract(p.xyx * vec3(.1031, .1030, .0973));
	p3 += dot(p3, p3.yzx+33.33);
	return fract((p3.xxy+p3.yzz)*p3.zyx);
}

#define MOVINGf	(Type_IsDebris?1.0:0.0)

uniform float NmeLiveCount;
#define Vel Vel4.xyz

void main()
{
	Vel4 = dataFetch(OldVelocitys);
	vec4 Pos4 = dataFetch(NewPositions);
	vec3 xyz = Pos4.xyz;

	//	new projectile data
	if ( Slot_IsProjectile && ProjectileVel[Projectilei].w > 0.0 )
	{
		Vel = ProjectileVel[Projectilei].xyz;
		Type = float(DEBRIS);
	}

	if ( FirstFrame && Slot_IsHeart )
		Type = float(SPRITEHEART);

	//	unset heartdebris'
	if ( Type_IsDebrisHeart )
		Type = float(DEBRISBLOOD);

	float AirDrag = 0.01;

	//	convert from static to nme
	if ( NmeIndex < int(NmeLiveCount) && Type_IsAsleep )
		Type = float(SPRITE0+NmeIndex);


	//	spring to sprite position
	if ( Slot_IsChar )
	{
		float Speed = 10.0;
		AirDrag = 0.0;
		vec3 Delta = CharXyz - xyz;
		
		if ( CharNull || Typei!=STATIC )	Delta=vec3(0,0,0);
		Type = float(CharNull?NULL:STATIC);

		//if ( length(Delta) > 0.0 )
		//	Delta = normalize(Delta) * min( length(Delta), Speed );
		Vel = Delta/TIMESTEP*0.2;
	}
	else if ( Slot_IsHeart )
	{
		AirDrag = 0.12;
		float Speed = 1.2;
		vec3 Target = HeartXyz;
		vec3 Delta = Target - xyz;
		if ( length(Delta) > 0.0 )
			Delta = normalize(Delta) * min( length(Delta), Speed );
		Vel += Delta;
	}
	else if ( !Slot_IsProjectile && Type_IsSprite )
	{
		Vel *= 0.95;
		float Speed = 1.1;
		vec3 Target = NmePos;
		vec3 Delta = Target - xyz;
		if ( length(Delta) > 0.0 )
			Delta = normalize(Delta) * min( length(Delta), Speed );
		Vel += Delta;
	}


	Vel *= 1.0 - AirDrag;
	Vel.y += MOVINGf * -GravityY * TIMESTEP;

	//	collisions
	if ( !Slot_IsProjectile && !Slot_IsHeart && !Type_IsDebris )
	for ( int p=Dead?0:-1;	p<MAX_PROJECTILES;	p++ )
	{
		vec3 ppp_old = FetchProjectile(OldPositions,p).xyz;
		vec3 ppp_new = FetchProjectile(NewPositions,p).xyz;
		vec3 ppv = FetchProjectile(OldVelocitys,p).xyz;

		//	need to invalidate, but not working, so sometimes projectiles can cut through randomly (old to new pos)
		if ( ProjectilePos[p].w == 1.0 )
			ppp_old = ppp_new = ProjectilePos[p].xyz;

		float Randomness = 0.6;
		float pplen = min( PROJECTILE_MAX_VEL,length(ppv) );
		float SizeScale = mix( PROJECTILE_MIN_SIZE, PROJECTILE_MAX_SIZE, Range01(PROJECTILE_MIN_VEL,PROJECTILE_MAX_VEL,pplen) );

		if ( p==-1 )
		{
			ppp_old = ppp_new = HeartPos0;
			ppv = vec3(0,0,-1);
			pplen = 42.0;
			Randomness = 0.35;
			SizeScale = PROJECTILE_MAX_SIZE;
		}

		vec3 ppp = NearestToLine3( xyz, ppp_old, ppp_new );
		bool Hit = length(ppp-xyz) < SizeScale;
		if ( !Hit )
			continue;
		
		vec3 RandDir = (hash32(uv*777.777)-0.5);
		Vel = normalize( mix(normalize(ppv),normalize(RandDir),Randomness) );
		Vel *= pplen * 0.4;

		Type = float(p==-1&&HeartCooldown==0?DEBRISHEART:DEBRIS);
	}

	if ( xyz.y <= float(FLOORY) && !Slot_IsChar && !Slot_IsHeart )
	{
		Vel = reflect( Vel*(1.0-FloorDrag), UP );
		Vel.y = abs(Vel.y);

		//	stop if tiny bounce
		if ( length(Vel) < GravityY*6.0*TIMESTEP )
		{
			Vel = vec3(0);
			Type = float(STATIC);
		}
	}

	Vel = dataWrite(Vel);
}
`;

function Subtract3(a,b)
{
	return a.map( (v,i) => v-b[i] );
}

function Inc3(Vec,Delta)
{
	[0,1,2].map(i=>Vec[i]+=Delta[i]);
}

function Normalise3(a,NewLength=1)
{
	let Length = Math.hypot( ...a );
	return a.map( x => x/Length*NewLength );
}

function Cross3(a0,a1,a2,b0,b1,b2)
{
	return [
		a1 * b2 - a2 * b1,
		a2 * b0 - a0 * b2,
		a0 * b1 - a1 * b0
		];
}

const DegToRad = Math.PI / 180;
const RadToDeg = 1/DegToRad;
const Near = 0.01;
const Far = 10000;
const FovV = 40;
const Up = [0,1,0];

class Camera_t
{
	constructor()
	{
		this.Position = [ 0,2,20 ];
		this.LookAt = [ 0,0,0 ];
	}
		
	//GetProjectionMatrix(ViewRect)
	GetProjectionMatrix(Viewport)
	{
		//	gr: match quest projection;
		//	0.9172857999801636, 0, 0, 0,
		//	0, 0.8686715364456177, 0, 0,
		//	0.17407210171222687, -0.035242434591054916, -1.0001999139785767, -1,
		//	0, 0, -0.2000199854373932, 0
		
		let ViewRect = [0,0,Viewport[2]/Viewport[3],1];
			
		//	overriding user-provided matrix
		if ( this.ProjectionMatrix )
			return this.ProjectionMatrix;
		
		const Aspect = ViewRect[2] / ViewRect[3];
		let fy = 1.0 / Math.tan( DegToRad*FovV / 2);
		let fx = fy / Aspect;
		
		let Depth = (Near+Far) / (Near-Far);
		let DepthTrans = (2*Far*Near) / (Near-Far);
		let s=0,cx=0,cy=0;
		return [
			fx,s,cx,0,
			0,fy,cy,0,
			0,0,Depth,-1,
			0,0,DepthTrans,0
		];
	}
	
	get LocalRotation4x4()
	{
		if ( this.Rotation4x4 )
			return this.Rotation4x4;
		
		const Matrix = this.GetProjectionMatrix([0,0,1,1]);
		//	gr [10] AND [11] are always negative?
		//	we should be able to do the math and work out the z multiplication
		const ZForwardIsNegative = Matrix[11] < 0;
		let eye = ZForwardIsNegative ? this.LookAt : this.Position;
		let center = ZForwardIsNegative ? this.Position : this.LookAt;
		//	CreateLookAtRotationMatrix(eye,up,center)
		let z = Normalise3( Subtract3( center, eye ) );
		let x = Normalise3( Cross3( ...Up, ...z ) );
		let y = Normalise3( Cross3( ...z,...x ) );
		return [
			x[0],	y[0],	z[0],	0,
			x[1],	y[1],	z[1],	0,
			x[2],	y[2],	z[2],	0,
			0,	0,	0,	1,
		];
	}

	get WorldToLocal()
	{
		//	to move from world space to camera space, we should take away the camera origin
		//	so this should always be -pos
		let Trans = this.Position.map( x=>-x );
		let Translation = new DOMMatrix().translate(...Trans);
		let WorldToCamera = new DOMMatrix(this.LocalRotation4x4).multiply(Translation);
		return WorldToCamera;
	}
	
	get LocalToWorld()
	{
		return this.WorldToLocal.inverse();
	}
	
	GetWorldTransform(LocalOffset)
	{
		return this.LocalToWorld.translate(...LocalOffset);
	}
	
	//	get forward vector in world space
	GetForward(Normalised=1)
	{
		let LookAt = this.LookAt;

		//	external transform, so need to calc the real lookat
		if ( this.Rotation4x4 )
		{
			//let LookAtTrans = this.GetWorldTransform([0,0,-1]);
			//	gr: why is this backwards...
			LookAt = this.LocalToWorld.transformPoint(new DOMPoint(0,0,-1));
		}
			
		let z = Subtract3( LookAt, this.Position );
		return Normalised ? Normalise3( z, Normalised ) : z;
	}
		
	MovePositionAndLookAt(Delta)
	{
		Inc3(this.Position,Delta);
		Inc3(this.LookAt,Delta);
	}
	
	
	GetLookAtRotation()
	{
		//	forward instead of backward
		let Dir = this.GetForward(false);
		let Distance = Math.hypot( ...Dir );
		Dir = Normalise3( Dir );
		
		let Yaw = RadToDeg * Math.atan2( Dir[0], Dir[2] );
		let Pitch = RadToDeg * Math.asin(-Dir[1]);
		return [Pitch,Yaw,0,Distance];
	}
	
	SetLookAtRotation(p,y,r,d)
	{
		p *= DegToRad;
		let cp = Math.cos(p);
		y *= DegToRad;
		let Delta =
		[
			Math.sin(y) * cp,
			-Math.sin(p),
			Math.cos(y) * cp
		];
		this.LookAt = this.Position.map( (p,i)=> p + Delta[i] * d );
	}
	
	OnCameraFirstPersonRotate(x,y,z,FirstClick)
	{
		let yrp = [y,x,z];
		
		if ( FirstClick || !this.LastyFpsPos )
		{
			this.StartPyrd = this.GetLookAtRotation();
			this.LastyFpsPos = yrp;
		}
		
		let Delta = this.LastyFpsPos.map( (x,i) => (x-yrp[i])*0.1 );
		Delta[3]=0;
		let pyrd = this.StartPyrd.map( (x,i) => x + Delta[i] );
		this.SetLookAtRotation( ...pyrd );
	}
}


function GetTime(){	return Math.floor(performance.now());	}

let Camera = new Camera_t();
Camera.Position = [ 0,1.8,8 ];
Camera.LookAt = [ 0,1.8,0 ];

let CameraButton = 2;
let InputState ={0:{},1:{},2:{}};
let WeaponOffset = [0,-0.5,-3.5];
let ButtonMasks = [ 1<<0, 1<<2, 1<<1 ];
let MouseLastPos = null;

function OnMouse(Event)
{
	if ( Event.button == CameraButton && Event.type=='mousedown' )
		MouseLastPos = null;

	if ( Event.buttons & ButtonMasks[CameraButton] || document.pointerLockElement )
	{
		let Rect = Event.currentTarget.getBoundingClientRect();
		let ClientX = Event.pageX || Event.clientX;
		let ClientY = Event.pageY || Event.clientY;
		let x = ClientX - Rect.left;
		let y = ClientY - Rect.top;
		
		let First = MouseLastPos==null;
		
		if ( MouseLastPos && Event.movementX !== undefined )
			[x,y]=MouseLastPos;
		x-=Event.movementX||0;
		y-=Event.movementY||0;

		Camera.OnCameraFirstPersonRotate( -x, y, 0, First );
		
		MouseLastPos = [x,y];
	}
	
	//ButtonMasks.forEach( (bm,i) => InputState[i].Down = (Event.buttons&bm) ? GetTime() : false );
	[1<<0].forEach( (bm,i) => InputState[i].Down = (Event.buttons&bm) ? GetTime() : false );
}


function OnMouseWheel(Event)
{
	let Delta = Event.deltaY * -0.06;
	let Forward3 = Camera.GetForward(Delta);
	Camera.MovePositionAndLookAt( Forward3 );
}

function OnLockMouse()
{
	if ( !Canvas.requestPointerLock )
		return;
	MouseLastPos = null;
	Canvas.requestPointerLock();
}

class DesktopXr
{
	constructor(Canvas)
	{
		this.Camera = Camera;
		Canvas.addEventListener('mousedown',OnMouse,true);
		Canvas.addEventListener('mousemove',OnMouse,true);
		Canvas.addEventListener('mouseup',OnMouse,true);
		Canvas.addEventListener('wheel',OnMouseWheel,true);
		Canvas.addEventListener('contextmenu',e=>e.preventDefault(),true);
		Canvas.addEventListener('click',OnLockMouse);
	}
	
	GetInput()
	{
		//	update transform of buttons
		for ( let Button in InputState )
		{
			InputState[Button].Transform = Camera.GetWorldTransform(WeaponOffset);
		}
		return InputState;
	}
}

let MIN_GUI_SECS=3;
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
let xr = navigator.xr;
let XrSession;

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
	"a11b2a10b2a10b2a8b2a1b1a6b2a2b1a6", //	Y
	"a11b2a2b1a6b2a1b1a7b3a8b2a1b1a7b2a2b1a6", //	K
	"a12b4a6b2a2b1a6b2a1b2a6b2a10b4a6", //	G
	"a11b2a3b1a5b2a1b1a1b1a5b2a1b1a1b1a5b2a1b1a1b1a5b5a6", //	M
	"a12b3a7b2a2b1a6b2a2b1a6b2a2b1a7b3a7", //	O
	"a13b2a8b2a1b1a7b2a1b1a6b2a2b1a6b2a2b1a6", //	V
	"a11b4a7b2a2b1a6b4a7b2a2b1a7b3a7", //	B
	"a12b3a7b2a2b1a6b2a2b1a6b2a2b1a6b2a2b1a6", //	U
];
const SpriteMap={	" ":15,	"!":16,	"@":17,	".":18,	"~":19,	"S":20,	"T":21,	"A":22,	"R":23,	"P":24,	"E":25,	"N":26,	"Y":27,	"K":28,	"G":29,	"M":30,	"O":31,	"V":32,	"B":33,	"U":34};
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
	ooo:[0,0,0],
	oooo:[0,0,0,0],
	ooo1:[0,0,0,1],
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
	a=a||[oooo];
	while(a.length<w)	a.push(...a);
	return a.slice(0,w);
}

function InitArray(sz,init)
{
	return Array(sz).fill().map(init);
}

function Make04(sz=MAX_PROJECTILES)
{
	return InitArray(sz,x=>oooo);
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
let WeaponLastFired = {};	//	[Input] = FiredTime
let ClearColour=[0.03,0.13,0.03];
let Desktop;
let FireRepeatMs = 40;

let ForcedString;
let WORLDW = WORLDSIZE*0.7;
let WorldMin = [-WORLDW,FLOORY,-WORLDSIZE*3,0];
let WorldMax = [WORLDW,FLOORY,WORLDSIZE*0.4,1];
let MapPositions = InitArray(DATAHEIGHT,RandomWorldPos);



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
		let Options={
		antialias:true,
		xrCompatible:true,
		premultipliedAlpha:false,
		alpha:true
		}
		gl = Canvas.getContext('webgl2', Options );
		FloatTarget = gl.getExtension('EXT_color_buffer_float');
		Macros.FLOAT_TARGET=!!FloatTarget;
		
		this.CubeShader = this.CreateShader(CubeShader);
		this.PosShader = this.CreateShader(PosShader);
		this.VelShader = this.CreateShader(VelShader);

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



class State_Click
{
	constructor(NextState)
	{
		this.NextState=NextState;
		this.WasDown={};
	}
	async Update()
	{
		return this.Time>MIN_GUI_SECS&&this.Started?new this.NextState:this;
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
		ForcedString = 'PRESS ANY  BUTTON!';
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
		ForcedString = '  GAME      OVER!';
	}
}

let State;

function OnInput(Input)
{
	Object.entries(Input).forEach( e=>{UpdateWeapon(...e);State.UpdateInput(...e);} );
}


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
		Blit(VelocityTextures,rc.VelShader,CameraToWorld,ReadGpuState);
	}
	Blit(PositionTextures,rc.PosShader,CameraToWorld);
}

function OnPostRender()
{
	PostFrame();
	if ( State.Time == 0 )
		State.Time++;
}


function OnXrRender(Cameras)
{
	OnPreRender(Cameras[0].LocalToWorld);
	Render(Cameras[0]);
	Render(Cameras[1]);
	OnPostRender();
}


async function Bootup(Canvas,XrOnWaitForCallback)
{
	rc = new RenderContext_t(Canvas);
	Desktop = new DesktopXr(Canvas);
	
	//	load sprites into pixels
	let PixelRows = PadArray(Sprites,DATAHEIGHT,`b1`).map(RleToRgba).map(PadPixels).flat(2);
	AllocTextures(SpriteTextures,new Float32Array(PixelRows));
	
	
	async function XrThread()
	{
		while(XrOnWaitForCallback)
		{
			let XrDevice = await CreateXr(XrOnWaitForCallback);
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
	OnInput(Input);
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
		Str =`~ ~ ~ ~ ~  ~ ~ ~ ~ `;
	SetUniformStr('String',ForcedString||Str);
	
	SetUniformVector('Random4',oooo.map(plerp));
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
let ReadPxBuffer;

async function Yield(ms)
{
	let r,p=new Promise(rs=>r=rs);
	setTimeout(r,ms);
	await p;
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
	ReadPxBuffer = ReadPxBuffer || new (Target.Type==gl.FLOAT?Float32Array:Uint8Array)(DATAWIDTH*DATAHEIGHT*4);
	gl.readPixels( 0, 0, DATAWIDTH, DATAHEIGHT, gl.RGBA, Target.Type, ReadPxBuffer );
	return ReadPxBuffer;
}




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
	const Errors = [];
	for ( let SessionType of `immersive-ar,immersive-vr,inline`.split`,` )
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
	constructor(ReferenceSpace)
	{
		this.ReferenceSpace = ReferenceSpace;
		this.WaitForEnd = CreatePromise();
		this.Inputs={};
		XrSession.addEventListener('end',this.WaitForEnd.Resolve);
	}
	
	async InitLayer()
	{
		this.EnableStencilBuffer = false;

		
		const Options = {};
		//	scale down frame buffer size to debug frag vs vert bound
		//	mentioned here: https://developer.oculus.com/documentation/web/webxr-perf-workflow/
		Options.framebufferScaleFactor = 1.0;
		Options.antialias = true;
		this.Layer = new XRWebGLLayer( XrSession, gl, Options );
		XrSession.updateRenderState({ baseLayer: this.Layer });
	
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
		XrSession.requestAnimationFrame( this.OnFrame.bind(this) );
		//	do browser anim step
		const Pose = Frame ? Frame.getViewerPose(this.ReferenceSpace) : null;
		if ( !Pose )
			return;
		this.FrameUpdate_Input(Frame,Pose);
		
		let Cameras = Pose.views.map(View=>this.GetViewCamera(Frame,Pose,View,this.Layer.framebuffer));
		OnXrRender(Cameras);
	}
	
	GetViewCamera(Frame,Pose,View,FrameBuffer)
	{
		let Viewport = this.Layer.getViewport(View);
		let Camera = {};
		Camera.Alpha = GetXrAlpha(Frame.session.environmentBlendMode);
		Camera.FrameBuffer = FrameBuffer;
		Camera.Viewport = [Viewport.x,Viewport.y,Viewport.width,Viewport.height];
		Camera.LocalToWorld = new DOMMatrix(Pose.transform.matrix);
		Camera.WorldToLocal = new DOMMatrix(Pose.transform.inverse.matrix);
		Camera.GetProjectionMatrix=()=>View.projectionMatrix;
		return Camera;
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
		OnInput(this.Inputs);
	}
}

async function CreateXr(OnWaitForCallback)
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
			let Options={
			optionalFeatures:`local,local-floor,bounded-floor,hand-tracking,high-fixed-foveation-level`.split`,`
			}
			const RequestSessionPromise = xr.requestSession(SessionMode,Options);
			RequestSessionPromise.then( Session => SessionPromise.Resolve(Session) ).catch( e => SessionPromise.Reject(e) );
		}
		catch(e)
		{
			SessionPromise.Reject(e);
		}
	}
	OnWaitForCallback(Callback);
	
	XrSession = await SessionPromise;
	let RSTypes=`bounded-floor,local-floor,local,unbounded,viewer`.split`,`;
	async function GetReferenceSpace()
	{
		for ( let RSType of RSTypes )
		{
			try
			{
				return await XrSession.requestReferenceSpace(RSType);
			}
			catch{}
		}
		throw `Failed to find supported XR reference space`;
	}
	let ReferenceSpace = await GetReferenceSpace();
	console.log(`Got XR ReferenceSpace`,ReferenceSpace);
	
	let Device = new XrDev(ReferenceSpace);
	await Device.InitLayer();
	return Device;
}
