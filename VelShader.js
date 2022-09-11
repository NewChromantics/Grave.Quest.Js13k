export {Vert,NmeMeta} from './PosShader.js'
import {NmeMeta} from './PosShader.js'

export const Frag =
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
