export const Vert =
`out float FragCubeIndex;
out vec3 FragWorldPosition;
out vec4 Velocity;
uniform mat4 WorldToCameraTransform;
uniform mat4 CameraProjectionTransform;
uniform float Time;
uniform sampler2D PositionsTexture;
uniform sampler2D OldPositionsTexture;
uniform sampler2D NewVelocitys;

#define ENABLE_SUPER_SMALL



#if defined(ENABLE_SUPER_SMALL)
vec3 GetLocalPosition(int v)
{
	v*=3;
	int x = ivec4(915775499,923195439,642272978,49129)[v/30]>>v%30;
	return sign(vec3(x&1,x&2,x&4));
}
#else

//	get 0..1 cube model position
vec3 GetLocalPosition(int CubeVertexIndex)
{
	int CubeVertexIndexComponent = CubeVertexIndex*3;
	//	gr: integers are shorter than hex! https://twitter.com/SN74HC00/status/1559481497349914624
	ivec4 VertexPositions30s = ivec4(0x3695a00b,0x3706d82f,0x26484ed2,0xbfe9);
	int ChunkIndex = int( CubeVertexIndexComponent / 30 );
	int BitIndex = CubeVertexIndexComponent % 30;
	int Value32 = VertexPositions30s[ChunkIndex];
	int xyz = Value32 >> BitIndex;
	//	gr: this would be shorter, but div executed first!
	//return vec3(xyz&1,xyz&2/2,xyz&4/4);
	return sign(vec3(xyz&1,xyz&2,xyz&4));	//	sign turns 1,2,4 into 1,1,1
/*
	Value32 >>= BitIndex;
	int x = Value32 & 1;
	int y = Value32 & 2;
	int z = Value32 & 4;
	return vec3(x,y,z)/vec3(1,2,4);
*/
/*
	int x = (Value32>>BitIndex) & 1;
	int y = (Value32>>BitIndex+1) & 1;
	int z = (Value32>>BitIndex+2) & 1;
	return vec3(x,y,z);
*/
}
#endif

#define FloorSize (50.0)
#define FloorCubeSize (FloorSize/CUBESIZE)
#define FloorTransform	mat4( vec4(FloorCubeSize,0,0,0),	vec4(0,1,0,0),	vec4(0,0,FloorCubeSize,0),	vec4(0,float(FLOORY)-CUBESIZE,0,1) )

mat4 GetLocalToWorldTransform(int CubeIndex,vec3 LocalPosition)
{
	if ( CubeIndex == 127*127 )	return FloorTransform;

	int u = CubeIndex % textureSize(PositionsTexture,0).x;
	int v = (CubeIndex/ textureSize(PositionsTexture,0).y);

	vec4 OldPosition4 = texelFetch( OldPositionsTexture, ivec2(u,v), 0 );
	vec4 Position4 = texelFetch( PositionsTexture, ivec2(u,v), 0 );
	vec3 WorldPosition = Position4.xyz;

	mat4 Transform = mat4( 1,0,0,0,
							0,1,0,0,
							0,0,1,0,
							WorldPosition,1 );
	return Transform;
}

float VelocityStretch = 4.0;
#define ENABLE_STRETCH	(CubeIndex < 127*127)
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
	vec3 LocalPosition = GetLocalPosition( VertexOfCube );
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
`out vec4 OutFragColor;
in float FragCubeIndex;
in vec3 FragWorldPosition;
in vec4 Velocity;
vec4 Light = vec4(0,0,0,10);

void main()
{
	int Type = int(Velocity.w);
	float r = mod(FragCubeIndex,1234.0)/1000.0;
	float g = mod(FragCubeIndex,100.0)/100.0;
	float b = mod(FragCubeIndex,7777.0)/7777.0;
	OutFragColor = vec4(r,g*0.3,b,1);
	if ( int(FragCubeIndex) < MAX_PROJECTILES )
		OutFragColor = vec4(0,1,0,1);
	if ( int(FragCubeIndex) == 127*127 )
		OutFragColor.xyz = vec3(0.1);

	float Lit = length(FragWorldPosition-Light.xyz)/Light.w;
	Lit = Lit < 1.0 ? 1.0 : 0.2;
	OutFragColor.xyz *= vec3(Lit);

	//OutFragColor = (Type==0) ? vec4(1,0,0,1) : vec4(0,1,0,1);
	//if ( int(FragCubeIndex) == 127*127 )
	//	OutFragColor.xyz = vec3(0);

	//OutFragColor = texture(PositionsTexture,vec2(0));
}
`;


