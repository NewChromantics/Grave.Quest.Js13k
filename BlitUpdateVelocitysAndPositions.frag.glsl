#extension GL_EXT_draw_buffers : require

precision highp float;
varying vec2 Uv;

#define Output_Position	gl_FragData[1]
#define Output_Velocity	gl_FragData[0]

uniform sampler2D PreviousVelocitysTexture;
uniform sampler2D PreviousPositionsTexture;		//	previous positions
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

#define mat_identity	mat4(1,0,0,0,	0,1,0,0,	0,0,1,0,	0,0,0,1 )

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

void main()
{
	vec4 Velocity = texture2D( PreviousVelocitysTexture, SampleUv );
	vec4 Position = texture2D( PreviousPositionsTexture, SampleUv );

	//	apply drag
	vec3 Damping = vec3( 1.0 - AirDrag );
	Velocity.xyz *= Damping;

	//	gr: we could store this type in velocity or position...
	//		we want to modify it here though, so leave in velocity
	Behaviour_t Behaviour = GetBehaviour( Velocity.w );

	//	accumulate forces
	vec3 GravityForce = vec3(0,Behaviour.GravityForce,0);
	vec3 Force = vec3(0,0,0);

	//	spring to shape position
	if ( Behaviour.SpringForceMinMax.x != 0.0 )
	{
		vec4 ShapePosition = texture2D( ShapePositionsTexture, SampleUv );
		float Random = ShapePosition.w;
		ShapePosition = Behaviour.ShapeLocalToWorldTransform * vec4(ShapePosition.xyz,1.0);
		vec3 SpringForce = GetSpringForce( Position.xyz, Random, ShapePosition.xyz, Behaviour );
		Force += SpringForce;
	}

	//	do collisions with projectiles (add to force)
	//	and enable graivty
	for ( int p=0;	p<MAX_PROJECTILES;	p++ )
	{
		vec4 ProjectileHit = GetProjectileForce( Position.xyz, ProjectilePrevPos[p], ProjectileNextPos[p] );
		Force += ProjectileHit.xyz;
		if ( ProjectileHit.w > 0.0 )
		{
			Behaviour.Type = Behaviour_Debris.Type;
		}
	}
	
	//	hit with floor
	bool LockToFloorY = false;
	if ( Behaviour.GravityForce != 0.0 )
	{
		vec4 FloorForce = GetFloorBounceForce(Position.xyz,Velocity.xyz);
		//	hit floor
		if ( FloorForce.w > 0.0 )
		{
			GravityForce = vec3(0,0,0);
			//GravityMult = 0.0;
			Force += FloorForce.xyz;
			LockToFloorY = true;
			Velocity = vec4(0,0,0,0);
		}
	}

	Force += GravityForce;
	
	
	//	apply forces
	Velocity.xyz += Force * Timestep;
	Velocity.w = GetBehaviourTypef(Behaviour);

	Position.xyz += Velocity.xyz * Timestep;
	if ( LockToFloorY )
		Position.y = FloorY;


	Output_Velocity = Velocity;
	Output_Position = Position;
}

