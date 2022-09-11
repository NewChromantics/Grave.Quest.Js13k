import {NmeMeta} from './PosShader.js'
export const Vert =
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

mat4 GetLocalToWorldTransform(vec3 LocalPosition)
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

float VelocityStretch = 4.0;
#define ENABLE_STRETCH	(FLOAT_TARGET && !Slot_IsFloor)
//#define ENABLE_STRETCH	false

vec3 GetWorldPosition(mat4 LocalToWorldTransform,vec3 LocalPosition)
{
	//	stretching relies on cube being -1...1
	//	gr: or does it? cubes stretch better, but always double size
	LocalPosition = mix(-HCZ3,HCZ3,LocalPosition);

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
	float Lerp = Scale>0.0?1.0:0.0;

	WorldPos = mix( PrevPos, NextPos, Lerp );
	return WorldPos;
}


void main()
{
	int CubeIndex = gl_VertexID / (3*2*6);
	FragCubexy = vec2( CubeIndex%DATAWIDTH, (CubeIndex/DATAWIDTH) );
	int VertexOfCube = gl_VertexID % (3*2*6);
	vec3 LocalPosition = GetLocalPosition( VertexOfCube*3 );
	mat4 LocalToWorldTransform = GetLocalToWorldTransform(LocalPosition);
	vec3 WorldPosition = GetWorldPosition(LocalToWorldTransform, LocalPosition );
	vec4 CameraPos = WorldToCameraTransform * vec4(WorldPosition,1);	//	world to camera space
	vec4 ProjectionPos = CameraProjectionTransform * CameraPos;
	gl_Position = ProjectionPos;
	FragWorldPosition = WorldPosition.xyz;
}
`;

export const Frag =
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


