export {Vert} from './Micro_PhysicsPositionShader.js'

export const Frag =
`out vec4 Colour;
in vec2 uv;
uniform sampler2D OldVelocitys;
uniform sampler2D OldPositions;
uniform sampler2D NewPositions;
uniform vec4 ProjectileVel[MAX_PROJECTILES];
uniform vec4 ProjectilePos[MAX_PROJECTILES];

#define			FragIndex	(int(gl_FragCoord.x) + (int(gl_FragCoord.y)*DATAWIDTH))
#define			Type		Vel4.w
uniform vec4	Random4;

const float AirDrag = 0.01;
const float FloorDragMin = 0.2;	//	less = more bounce
const float FloorDragMax = 0.6;	//	less = more bounce
const float GravityY = 16.0;
#define FloorDrag	mix(FloorDragMin,FloorDragMax,Random4.x)


//	gr: make this bigger based on velocity so sliding projectiles dont hit so much
#define PROJECTILE_MAX_SIZE	(CUBESIZE*4.0)
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

#define UP	vec3(0,1,0)

void main()
{
	vec4 Vel4 = texelFetch( OldVelocitys, ivec2(gl_FragCoord), 0 );
	vec3 Vel = Vel4.xyz;
	vec3 oldxyz = texelFetch( OldPositions, ivec2(gl_FragCoord), 0 ).xyz;
	vec3 xyz = texelFetch( NewPositions, ivec2(gl_FragCoord), 0 ).xyz;
	float RandomVoxel = texelFetch( NewPositions, ivec2(gl_FragCoord), 0 ).w;

	if ( FragIndex < MAX_PROJECTILES )
	{
		//Type = 1.0;
	}

	//	new projectile data
	if ( FragIndex < MAX_PROJECTILES && ProjectileVel[FragIndex].w > 0.0 )
	{
		Vel = ProjectileVel[FragIndex].xyz;
		oldxyz = xyz = ProjectilePos[FragIndex].xyz;
		Type = 1.0;
	}

	Vel *= 1.0 - AirDrag;
	Vel.y += Type * -GravityY * TIMESTEP;


	if ( xyz.y <= float(FLOORY) )
	{
		Vel = reflect( Vel*(1.0-FloorDrag), UP );
		Vel.y = abs(Vel.y);

		//	stop if tiny bounce
		if ( length(Vel) < GravityY*1.9*TIMESTEP )
		{
			Vel = vec3(0);
			Type = 0.0;
		}
	}

	Colour = vec4(Vel,Type);
}
`;



/*
 
 if ( xyz.y <= float(FLOORY) )
 {
	 vec3 Bounce = reflect( Vel, vec3(0,1,0) );
	 Bounce.xyz *= 1.0 - FloorDrag;
	 xyz = vec3(0);
	 Vel = Bounce * TIMESTEP;

	 if ( length(Bounce) < 0.0000001*60.0 )
	 {
		 Type = 0.0;	//	settle
		 Vel = vec3(0);
	 }
	 else
	 {
		 Type = 1.0;
	 }
 }
 else
 {
	 Vel *= 1.0 - AirDrag;
	 Vel.y += TIMESTEP * GravityY * Type;
 }


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

	 float Randomness = 0.9;
	 vec3 RandDir = normalize(mix( vec3(-Randomness), vec3(Randomness), hash32(uv*777.777) ));
	 //Vel = ppv;
	 Vel = pplen*RandDir;

	 float Randomness = 0.9;
	 float Strength = length(ppv) * 10.0;
	 vec3 Dir = normalize(ppv) + normalize(mix( vec3(-Randomness), vec3(Randomness), hash32(uv*777.777) ));
	 Dir = normalize(Dir);
	 Force += Dir * vec3(Strength);
	 GravityForce = vec3(0);
	 //float nexty = xyz.y + ((Force.y+GravityForce.y) * TIMESTEP);
	 //if ( nexty <= float(FLOORY) )
	 //	Force.y = abs(Force.y);
	 if ( xyz.y <= float(NEARFLOORY) )

	 Type = 1.0;
 }

 */
