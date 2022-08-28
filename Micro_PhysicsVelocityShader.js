export {Vert,NmeMeta} from './Micro_PhysicsPositionShader.js'
import {NmeMeta} from './Micro_PhysicsPositionShader.js'

export const Frag =
`out vec4 Colour;
in vec2 uv;
uniform sampler2D OldVelocitys;
uniform sampler2D OldPositions;
uniform sampler2D NewPositions;
uniform sampler2D SpritePositions;
uniform vec4 ProjectileVel[MAX_PROJECTILES];
uniform vec4 ProjectilePos[MAX_PROJECTILES];

uniform vec4	Random4;

const float FloorDragMin = 0.3;	//	less = more bounce
const float FloorDragMax = 0.8;	//	less = more bounce
const float GravityY = 16.0;
#define FloorDrag	mix(FloorDragMin,FloorDragMax,RAND1*Random4.x)


//	gr: make this bigger based on velocity so sliding projectiles dont hit so much
#define PROJECTILE_MAX_SIZE	(CUBESIZE*5.0)
#define PROJECTILE_MIN_SIZE	(CUBESIZE*1.0)
#define PROJECTILE_MIN_VEL	10.0
#define PROJECTILE_MAX_VEL	40.0

float Range(float Min,float Max,float Value)
{
	return (Value-Min)/(Max-Min);
}

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


//	from https://www.shadertoy.com/view/4djSRW
//  1 out, 2 in...
float hash12(vec2 p)
{
	vec3 p3  = fract(vec3(p.xyx) * .1031);
	p3 += dot(p3, p3.yzx + 33.33);
	return fract((p3.x + p3.y) * p3.z);
}
vec3 hash31(float p)
{
	vec3 p3 = fract(vec3(p) * vec3(.1031, .1030, .0973));
	p3 += dot(p3, p3.yzx+33.33);
	return fract((p3.xxy+p3.yzz)*p3.zyx);
}
vec3 hash32(vec2 p)
{
	vec3 p3 = fract(p.xyx * vec3(.1031, .1030, .0973));
	p3 += dot(p3, p3.yzx+33.33);
	return fract((p3.xxy+p3.yzz)*p3.zyx);
}

#define MOVINGf	(Type_IsDebris?1.0:0.0)
//#define MOVINGf	(Type_IsStatic?0.0:1.0)

${NmeMeta}

void main()
{
	vec4 Vel4 = dataFetch(OldVelocitys);
	vec4 Pos4 = dataFetch(NewPositions);
	vec3 Vel = Vel4.xyz;
	vec3 xyz = Pos4.xyz;

	//if ( FirstFrame )	Vel = vec3(0);

	vec4 NmePos = NmeTrans * texelFetch( SpritePositions, Spriteuv, 0 );

	//	new projectile data
	if ( FragIndex < MAX_PROJECTILES && ProjectileVel[FragIndex].w > 0.0 )
	{
		Vel = ProjectileVel[FragIndex].xyz;
		Type = float(DEBRIS);
	}

	float AirDrag = 0.01;

	//	convert from static to nme
	int MinNme = int(Time/1000.0);
	if ( NmeIndex < MinNme && Type < 0.0 )
		Type = float(SPRITE0);


	//	spring to sprite position
	if ( !IsProjectile && Type_IsSprite )
	{
		Vel *= 0.95;
		float Speed = 1.1;
		vec3 Delta = NmePos.xyz - xyz;
		if ( length(Delta) > 0.0 )
			Delta = normalize(Delta) * min( length(Delta), Speed );
		Vel += Delta;
	}

	Vel *= 1.0 - AirDrag;
	Vel.y += MOVINGf * -GravityY * TIMESTEP;

	//	collisions
	if ( FragIndex>=MAX_PROJECTILES )
	for ( int p=0;	p<MAX_PROJECTILES;	p++ )
	{
		ivec2 ppuv = ivec2(p,0);
		vec3 ppp_old = texelFetch( OldPositions, ppuv, 0 ).xyz;
		vec3 ppp_new = texelFetch( NewPositions, ppuv, 0 ).xyz;

		//	need to invalidate, but not working, so sometimes projectiles can cut through randomly (old to new pos)
		if ( ProjectilePos[p].w == 1.0 )
			ppp_old = ppp_new = ProjectilePos[p].xyz;

		vec3 ppp = NearestToLine3( xyz, ppp_old, ppp_new );
		vec3 ppv = texelFetch( OldVelocitys, ppuv, 0 ).xyz;
		float pplen = min( PROJECTILE_MAX_VEL,length(ppv) );
		float SizeScale = mix( PROJECTILE_MIN_SIZE, PROJECTILE_MAX_SIZE, Range(PROJECTILE_MIN_VEL,PROJECTILE_MAX_VEL,pplen) );
		bool Hit = length(ppp-xyz) < SizeScale;
		if ( !Hit )
			continue;

		float Randomness = 0.6;
		vec3 RandDir = (hash32(uv*777.777)-0.5) * Randomness;
		Vel = normalize( normalize(ppv) + normalize(RandDir) );
		Vel *= pplen * 0.4;

		Type = float(DEBRIS);
	}

	if ( xyz.y <= float(FLOORY) )
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

	Colour = vec4(Vel,Type);
}
`;
