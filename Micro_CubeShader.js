import {NmeMeta} from './Micro_PhysicsPositionShader.js'
export const Vert =
`out float FragCubeIndex;
out vec3 FragWorldPosition;
out vec4 Velocity;
out float Rand1;
uniform mat4 WorldToCameraTransform;
uniform mat4 CameraProjectionTransform;
uniform float Time;
uniform sampler2D PositionsTexture;
uniform sampler2D OldPositionsTexture;
uniform sampler2D NewVelocitys;

vec3 GetLocalPosition(int v)
{
	int x = ivec4(915775499,923195439,642272978,49129)[v/30]>>v%30;
	return sign(vec3(x&1,x&2,x&4));
}

#define FloorCubeSize (FLOORSIZE/CUBESIZE)
#define FloorTransform	mat4( vec4(FloorCubeSize,0,0,0),	vec4(0,1,0,0),	vec4(0,0,FloorCubeSize,0),	vec4(0,float(FLOORY)-CUBESIZE,0,1) )

mat4 GetLocalToWorldTransform(int CubeIndex,vec3 LocalPosition)
{
	if ( CubeIndex == DATALAST )	return FloorTransform;

	int u = CubeIndex % textureSize(PositionsTexture,0).x;
	int v = (CubeIndex/ textureSize(PositionsTexture,0).y);

	vec4 OldPosition4 = texelFetch( OldPositionsTexture, ivec2(u,v), 0 );
	vec4 Position4 = texelFetch( PositionsTexture, ivec2(u,v), 0 );
	Rand1 = Position4.w;
	vec3 WorldPosition = Position4.xyz;

	mat4 Transform = mat4( 1,0,0,0,
							0,1,0,0,
							0,0,1,0,
							WorldPosition,1 );
	return Transform;
}

float VelocityStretch = 4.0;
#define ENABLE_STRETCH	(CubeIndex != DATALAST)
//#define ENABLE_STRETCH	false

vec3 GetWorldPosition(int CubeIndex,mat4 LocalToWorldTransform,vec3 LocalPosition)
{
	//	stretching relies on cube being -1...1
	//	gr: or does it? cubes stretch better, but always double size
	LocalPosition = mix( vec3(-HALFCUBESIZE),vec3(HALFCUBESIZE), LocalPosition);

	int u = CubeIndex % textureSize(PositionsTexture,0).x;
	int v = (CubeIndex/ textureSize(PositionsTexture,0).y);
	Velocity = texelFetch( NewVelocitys, ivec2(u,v), 0 );

	vec4 WorldPos = LocalToWorldTransform * vec4(LocalPosition,1.0);
	WorldPos.xyz *= WorldPos.www;
	//WorldPos.y = max( WorldPos.y, float(FLOORY) );
	WorldPos.w = 1.0;

	//	stretch world pos along velocity
	vec3 TailDelta = -Velocity.xyz * VelocityStretch * TIMESTEP;
	if ( !ENABLE_STRETCH || length(TailDelta)<CUBESIZE)
		return WorldPos.xyz;

	vec4 OriginWorldPos = LocalToWorldTransform * vec4(0,0,0,1);
	OriginWorldPos.xyz *= OriginWorldPos.www;
	OriginWorldPos.w = 1.0;
	

	
	vec3 LocalPosInWorld = WorldPos.xyz - OriginWorldPos.xyz;
	
	//	this is the opposite of what it should be and shows the future
	//	but better than flashes of past that wasnt there (better if we just stored prev pos)
	vec3 NextPos = WorldPos.xyz - (TailDelta*0.9);
	vec3 PrevPos = WorldPos.xyz + (TailDelta*0.1);
	
	//	gr; this nvidia object space motion blur stretches if the [current]normal
	//		is inline(dot(next-prev,velocity)>0) with the motion vector(velocity)... in EYESPACE
	//	https://www.nvidia.com/docs/io/8230/gdc2003_openglshadertricks.pdf
	float Scale = dot( normalize(LocalPosInWorld), normalize(-TailDelta) );
	float Lerp = Scale > 0.0 ? 1.0 : 0.0;
	
	WorldPos.xyz = mix( PrevPos, NextPos, Lerp );
	return WorldPos.xyz;
}


void main()
{
	int CubeIndex = gl_VertexID / (3*2*6);
	int VertexOfCube = gl_VertexID % (3*2*6);
	vec3 LocalPosition = GetLocalPosition( VertexOfCube*3 );
	mat4 LocalToWorldTransform = GetLocalToWorldTransform( CubeIndex, LocalPosition );
	vec3 WorldPosition = GetWorldPosition( CubeIndex, LocalToWorldTransform, LocalPosition );
	vec4 CameraPos = WorldToCameraTransform * vec4(WorldPosition,1);	//	world to camera space
	vec4 ProjectionPos = CameraProjectionTransform * CameraPos;
	gl_Position = ProjectionPos;
	FragCubeIndex = float(CubeIndex);
	FragWorldPosition = WorldPosition.xyz;
}
`;

export const Frag =
`out vec4 FragColor;
in float FragCubeIndex;
in vec3 FragWorldPosition;
in vec4 Velocity;
in float Rand1;
vec4 Light = vec4(0,0,0,LIGHTRAD);

#define DEBUG_COLOURS		true
#define FLOOR_TILE_SIZE		0.4
#define FLOOR_COLOUR(Odd)	vec3(Odd?0.2:0.1)
#define PROJECTILE_COLOUR	vec3(0.06,0.8,0.06)
${NmeMeta}



void main()
{
	vec4 Vel4 = Velocity;
	vec3 rgb = vec3(1,0,1);

	ivec3 xz = ivec3(mod(FragWorldPosition/FLOOR_TILE_SIZE,vec3(2)));
	vec3 SpookyColour = mod( vec3(FragCubeIndex), vec3(1234,100,7777) ) / vec3(1000,100,7777);

	if ( Type_IsStatic )	rgb = vec3(1);
	if ( Type_IsNull )		discard;
	if ( Type_IsDebris )	rgb = SpookyColour;//vec3(1,0,0);
	if ( Type_IsSprite )	rgb = SpookyColour;
	//if ( Type_IsSprite )	rgb = vec3(0,1,0);
	if ( IsFloor )			rgb = FLOOR_COLOUR(xz.x==xz.z);
	
 	if ( int(FragCubeIndex) < MAX_PROJECTILES )
		rgb = PROJECTILE_COLOUR;

	if ( IsFloor )
		Vel4 = vec4(0);

	rgb *= mix(0.7,1.0,Rand1);

	float Lit = 1.0 - min(1.0,length(FragWorldPosition-Light.xyz)/Light.w);
	//float Lit=1.0;
	/*
	//Lit *= Lit;
	Lit*=4.0;
	Lit = Lit < 1.0 ? 0.2 : 1.0;
*/
	Lit += min(9.9,length(Vel4.xyz)/4.0);

	rgb *= vec3(Lit);
	FragColor = vec4(rgb,1);
}
`;


