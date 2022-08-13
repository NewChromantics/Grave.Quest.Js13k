#version 300 es
precision highp float;
out vec4 FragColor;

in vec2 Uv;
uniform sampler2D PreviousVelocitysTexture;
uniform sampler2D PreviousPositionsTexture;		//	previous positions
uniform sampler2D PositionsTexture;				//	current positions
uniform sampler2D ShapePositionsTexture;		//	where we're aiming to be + shape origin

uniform vec2 TexelSize;
#define SampleUv	Uv//( Uv + TexelSize * 0.5 )

const float AirDrag = 0.04;
const float FloorDragMin = 0.4;	//	less = more bounce
const float FloorDragMax = 0.8;	//	less = more bounce
const float GravityY = -16.0;

#define MAX_PROJECTILES	100
//	projectile should probably be oldpos newpos to get force, pos, and not miss a fast projectile
uniform vec4 ProjectilePrevPos[MAX_PROJECTILES];
uniform vec4 ProjectileNextPos[MAX_PROJECTILES];
uniform float CubeSize;//	radius
#define ProjectileRadius	(CubeSize*7.0)	//	scale to make it a bit easier to hit stuff

#define PROJECTILE_HIT_RANDOMNESS	(0.9)
#define SPRING_FORCE_MINMAX			vec2(2.0,6.0)
#define SPRING_NOISE_FACTOR			(0.1)
#define PROJECTILE_HIT_FORCE		(10.0)

const float Timestep = 1.0/60.0;
uniform vec4 Random4;	//	a random number per frame (not per voxel!)
const float FloorY = 0.0;
#define NearFloorY	(FloorY+0.02)

uniform float DropAll;
#define DROP_ALL	(DropAll>0.5)

#define mat_identity	mat4(1,0,0,0,	0,1,0,0,	0,0,1,0,	0,0,0,1 )



uniform sampler2D OccupancyMapTexture;
uniform vec2 OccupancyMapTextureSize;
uniform vec3 OccupancyMapWorldMin;
uniform vec3 OccupancyMapWorldMax;
const int YSectionsPerComponent = 7;
const float YSectionsPerComponentf = float(YSectionsPerComponent);
const int YSectionComponents = 4;
#define YSectionCount	(YSectionsPerComponent*YSectionComponents)
#define YSectionCountf	float(YSectionCount)


float GetSectionValue(float Section)
{
	//	pow(10,0)==1 ??
	//	pow is more expensive, but maybe we can avoid the if's
	//return pow( 10.0, Section );
	if ( Section == 0.0 )		return 1.0;
	if ( Section == 1.0 )		return 10.0;
	if ( Section == 2.0 )		return 100.0;
	if ( Section == 3.0 )		return 1000.0;
	if ( Section == 4.0 )		return 10000.0;
	if ( Section == 5.0 )		return 100000.0;
	if ( Section == 6.0 )		return 1000000.0;
	if ( Section == 7.0 )		return 10000000.0;
	if ( Section == 8.0 )		return 100000000.0;
	if ( Section == 9.0 )		return 1000000000.0;
	if ( Section == 10.0 )	return 10000000000.0;
	if ( Section == 11.0 )	return 100000000000.0;
	return 0.0;
}



struct Behaviour_t
{
	int		Type;
	float	GravityForce;
	vec2	SpringForceMinMax;
	float	SpringNoiseFactor;
	mat4	ShapeLocalToWorldTransform;
};

//	behaviour types
#define BEHAVIOUR_STATIC	0
#define BEHAVIOUR_DEBRIS	1
#define BEHAVIOUR_SHAPE		2
Behaviour_t Behaviour_Debris = Behaviour_t( BEHAVIOUR_DEBRIS,	GravityY,	vec2(0),			0.0,		mat_identity );
Behaviour_t Behaviour_Static = Behaviour_t( BEHAVIOUR_STATIC,	0.0,		vec2(0),			0.0,		mat_identity );
Behaviour_t Behaviour_Shape = Behaviour_t( BEHAVIOUR_SHAPE,		0.0,		SPRING_FORCE_MINMAX,	SPRING_NOISE_FACTOR,	mat_identity );


float GetBehaviourTypef(Behaviour_t Behaviour)
{
	//return float(Behaviour.Type) / 255.0;
	return float(Behaviour.Type);
}

Behaviour_t GetBehaviour(float Typef)
{
	//int Type = int( Typef * 255.0 );
	int Type = int( Typef );
	
	if ( Type == Behaviour_Static.Type )
		return Behaviour_Static;
		
	if ( Type == Behaviour_Shape.Type )
		return Behaviour_Shape;
		
	return Behaviour_Debris;
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

float Sign(float x)
{
	return ( x < 0.0 ) ? -1.0 : 1.0;
}

vec3 Sign3(vec3 xyz)
{
	return vec3( Sign(xyz.x), Sign(xyz.y), Sign(xyz.z) );
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


//	w=hit
//	todo: use prevposition + position so we can hit flying objects
vec4 GetProjectileForce(vec3 Position,vec4 ProjectilePrevPos,vec4 ProjectileNextPos)
{
	//	.w = is valid
	float Hit = ProjectilePrevPos.w;
	
	//	get distance to projectile line
	vec3 NearestToLine = NearestToLine3( Position, ProjectilePrevPos.xyz, ProjectileNextPos.xyz );
	vec3 ProjectileDelta = ProjectileNextPos.xyz - ProjectilePrevPos.xyz;
	float Distance = length(NearestToLine-Position);
	
	float MinDistance = CubeSize + ProjectileRadius;
	if ( Distance > MinDistance )
		Hit = 0.0;
	
	//	if the delta is 1/60th, the velocity must be 60*?
	float ProjectileForce = length(ProjectileDelta) * 60.0;
	
	//	normalise delta vector so we can add some randomness
	ProjectileDelta = normalize(ProjectileDelta);
	//	make it random mostly in the direction of the existing vector
	//	subtract some so it could bounce forward
	float RandomScale = PROJECTILE_HIT_RANDOMNESS;
	vec3 Random = Random4.xyz;
	//	random is same every frame, so try and modify with uv which is more unique
	Random *= hash12(Uv);
	
	ProjectileDelta += -Sign3(ProjectileDelta) * Random * RandomScale;
	ProjectileDelta = normalize(ProjectileDelta);
	
	//	if the voxel is "on the floor", lets do a little hack to make sure it goes upward not down
	if ( Position.y >= NearFloorY )
		ProjectileDelta.y = abs(ProjectileDelta.y);
	
	vec3 Force = (ProjectileDelta * ProjectileForce) * PROJECTILE_HIT_FORCE;
	
	//	zero out if not hit
	//	gr: if force is Nan this stays nan
	if ( Hit == 0.0 )
		Force = vec3(0,0,0);
	//Force *= Hit;
	
	return vec4( Force, Hit );
}

//	w=hit
vec4 GetFloorBounceForce(vec3 Position,vec3 Velocity)
{
	if ( Position.y > FloorY )
	{
		return vec4(0,0,0,0);
	}
	
	//	under floor, reflect
	vec3 Bounce = reflect( Velocity, vec3(0,1,0) );
	//Bounce.y = max( Bounce.y, 0.0 );
	//	this bounce should just be the same length as velocity
	//	but the force we add is multiplied by timestep (maybe it shouldnt be)
	//	so for a true reflection, multiply by inverse timestep
	Bounce *= 1.0/Timestep;
	Bounce *= 1.0 - mix(FloorDragMin,FloorDragMax,Random4.x);
	return vec4(Bounce,1.0);
}

vec3 GetSpringForce(vec3 Position,float Random,vec3 ShapePosition,Behaviour_t Behaviour)
{
	vec3 Spring = ShapePosition - Position;
	
	float SpringForce = length(Spring);
	SpringForce *= mix( Behaviour.SpringForceMinMax.x, Behaviour.SpringForceMinMax.y, Random );
	
	//	add some noise to spring's direction
	vec3 Noise = hash31(Random);
	Spring = normalize(Spring);
	Spring += Noise * Behaviour.SpringNoiseFactor;
	Spring = normalize(Spring) * SpringForce;
	
	return Spring;
}

float Range(float Min,float Max,float Value)
{
	return (Value-Min) / (Max-Min);
}

float Range01(float Min,float Max,float Value)
{
	return clamp( Range( Min, Max, Value ), 0.0, 1.0 );
}

vec3 GetOccupancyMapPosition(vec3 WorldPosition)
{
	vec3 WorldUv;
	WorldUv.x = Range01( OccupancyMapWorldMin.x, OccupancyMapWorldMax.x, WorldPosition.x );
	WorldUv.y = Range01( OccupancyMapWorldMin.y, OccupancyMapWorldMax.y, WorldPosition.y );
	WorldUv.z = Range01( OccupancyMapWorldMin.z, OccupancyMapWorldMax.z, WorldPosition.z );
	return WorldUv;
}

vec3 OccupancyPositionToWorld(vec2 MapPx,float Section)
{
	MapPx /= OccupancyMapTextureSize;
	Section /= YSectionCountf;
	vec3 WorldPosition;
	WorldPosition.x = mix( OccupancyMapWorldMin.x, OccupancyMapWorldMax.x, MapPx.x );
	WorldPosition.y = mix( OccupancyMapWorldMin.y, OccupancyMapWorldMax.y, Section );
	WorldPosition.z = mix( OccupancyMapWorldMin.z, OccupancyMapWorldMax.z, MapPx.y );
	return WorldPosition;
}

//	x,y,sectionmult
vec3 GetOccupancyMapPx(vec3 WorldPosition)
{
	vec3 MapUv = GetOccupancyMapPosition(WorldPosition);
	vec2 MapPx = floor( MapUv.xz * OccupancyMapTextureSize );
	float Section = floor(MapUv.y * YSectionCountf);
	//float SectionValue = GetSectionValue(Section);
	return vec3( MapPx, Section );
}

bool IsOccupied(vec2 MapPx,float Section)
{
	vec4 OccupancyData = texelFetch( OccupancyMapTexture, ivec2(MapPx), 0 );
	
	float Component = floor( Section / YSectionsPerComponentf );
	float CompSection = mod( Section, YSectionsPerComponentf );
	float CompSectionValue = GetSectionValue( CompSection );
	
	float DataValue = OccupancyData[int(Component)];
	DataValue = floor( DataValue / CompSectionValue );
	DataValue = mod( DataValue, 10.0 );
	return DataValue > 1.0;
}

//	intersection.xyz + valid
vec4 GetOccupancyHit(vec3 Position,vec3 Velocity,out vec3 HitNormal)
{
	//	find where we are now
	HitNormal = vec3(0,1,0);
	vec3 NextPosition = Position + (Velocity *Timestep);
	vec3 OldPos = GetOccupancyMapPx(Position);
	vec3 NewPos = GetOccupancyMapPx(NextPosition);
	if ( OldPos == NewPos )
		return vec4(0);
	
	//	walk over map
	//	steps = hypotenuse
	float CellSteps = length(OldPos-NewPos);
	#define MAX_MAP_STEPS	5
	vec3 PrevStepPos = OldPos;
	for ( int s=1;	s<MAX_MAP_STEPS;	s++ )
	{
		//	lerp from old pos to new pos, and snap to cell indexes
		vec3 StepPos = mix( OldPos, NewPos, float(s)/float(MAX_MAP_STEPS-1) );
		StepPos = ceil(StepPos);
		if ( StepPos == OldPos )
			continue;
		if ( IsOccupied( StepPos.xy, StepPos.z ) )
		{
			//vec3 WorldPos = OccupancyPositionToWorld( StepPos.xy, StepPos.z );
			vec3 WorldPos = OccupancyPositionToWorld( PrevStepPos.xy, PrevStepPos.z );
			return vec4(WorldPos,1.0);
		}
		PrevStepPos = StepPos;
	}
	return vec4(0);
}
		

void main()
{
	vec4 Velocity = texture( PreviousVelocitysTexture, SampleUv );
	vec4 PositionAndRandom = texture( PositionsTexture, SampleUv );
	vec3 Position = PositionAndRandom.xyz;
	float Random = PositionAndRandom.w;

	//	apply drag
	vec3 Damping = vec3( 1.0 - AirDrag );
	Velocity.xyz *= Damping;

	//	gr: we could store this type in velocity or position...
	//		we want to modify it here though, so leave in velocity
	Behaviour_t Behaviour = GetBehaviour( Velocity.w );

	//	accumulate forces
	vec3 GravityForce = vec3(0,Behaviour.GravityForce,0);
	vec3 Force = vec3(0,0,0);
    
    /*gr: this has stopped working... producing NAN
	//	spring to shape position
	if ( Behaviour.SpringForceMinMax.x != 0.0 )
	{
		vec4 ShapePosition = texture( ShapePositionsTexture, SampleUv );
		//float Random = ShapePosition.w;
		ShapePosition = Behaviour.ShapeLocalToWorldTransform * vec4(ShapePosition.xyz,1.0);
		vec3 SpringForce = GetSpringForce( Position, Random, ShapePosition.xyz, Behaviour );
		Force += SpringForce;
	}
     */
	
	//	do collisions with projectiles (add to force)
	//	and enable graivty
	for ( int p=0;	p<MAX_PROJECTILES;	p++ )
	{
		vec4 ProjectileHit = GetProjectileForce( Position, ProjectilePrevPos[p], ProjectileNextPos[p] );
		Force += ProjectileHit.xyz;
		if ( ProjectileHit.w > 0.0 )
		{
			Behaviour.Type = Behaviour_Debris.Type;
		}
	}
	
	//	hit with floor
	if ( Behaviour.GravityForce != 0.0 )
	{
		vec4 FloorForce = GetFloorBounceForce(Position.xyz,Velocity.xyz);
		//	hit floor
		if ( FloorForce.w > 0.0 )
		{
			GravityForce = vec3(0);
			//GravityMult = 0.0;
			Force += FloorForce.xyz;
			Position.y = FloorY;
			Velocity = vec4(0);
		}
	}

	Force += GravityForce;

	//	do collisions with world
	vec3 NewVelocity = Velocity.xyz + (Force*Timestep);
	if ( length(NewVelocity) > 0.0 )
	{
		//	get next occupancy position
		vec3 HitNormal;
		vec4 OccupancyHit = GetOccupancyHit( Position, NewVelocity, HitNormal );
		if ( OccupancyHit.w > 0.0 )
		{
			//	act like floor
			//	reflect off... something
			vec3 Bounce = reflect( Velocity.xyz, HitNormal );
			//	this causes infinite bouncing back and forth
			//vec3 Bounce = -Velocity.xyz;
			
			vec3 Random3 = (hash31(Random) - vec3(0.5))*2.0;
			//Bounce += Random4.xyz * 0.001;
			Bounce += Random3 * 0.501;
			//Bounce += sign(Bounce)*(Random4.xyz) * 0.3;
			//Bounce += sign(Bounce)*(Random3) * 0.3;
			Bounce *= 1.0/Timestep;
			//Bounce *= 1.0 - mix(FloorDragMin,FloorDragMax,Random4.x);
			Bounce *= 1.0 - FloorDragMax;
			
			//	stop
			Force = vec3(0);
			Velocity.xyz = vec3(0);
			Force = Bounce.xyz;
			
			//	like with the floor, if we're going downwards, we want to stick, not keep bouncing back up
			if ( dot(normalize(NewVelocity),vec3(0,-1,0)) > 0.99 )
			{
				Force = vec3(0);
			}
			//	stick!
			//Behaviour.Type = Behaviour_Static.Type;

			Position = OccupancyHit.xyz;
		}
	}


	if ( DROP_ALL )
	{
		Behaviour.Type = Behaviour_Debris.Type;
	}
	
	
	
	//	apply forces
	Velocity.xyz += Force * Timestep;
	Velocity.w = GetBehaviourTypef(Behaviour);
	
	FragColor = Velocity;
}

