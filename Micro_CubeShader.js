export const Vert =
`#version 300 es

flat out  int FragCubeIndex;
out vec3 FragWorldPosition;
uniform mat4 WorldToCameraTransform;
uniform mat4 CameraProjectionTransform;
uniform float TickCount;


//	get 0..1 cube model position
vec3 GetLocalPosition(int CubeVertexIndex)
{
	int CubeVertexIndexComponent = CubeVertexIndex*3;
	ivec4 VertexPositions30s = ivec4(0x3695a00b,0x3706d82f,0x26484ed2,0xbfe9);
	int ChunkIndex = int( CubeVertexIndexComponent / 30 );
	int BitIndex = CubeVertexIndexComponent % 30;
	int Value32 = VertexPositions30s[ChunkIndex];
	Value32 >>= BitIndex;
	int x = Value32&1;
	int y = (Value32&2)/2;
	int z = (Value32&4)/4;
	return vec3(x,y,z);
}
	
mat4 GetLocalToWorldTransform(int CubeIndex)
{
	/*
	//	texelfetch seems a tiny bit faster
	//vec4 Position4 = texture( PhysicsPositionsTexture, PhysicsPositionUv.xy );
	vec4 Position4 = texelFetch( PhysicsPositionsTexture, ivec2(PhysicsPositionUv.xy*PhysicsPositionsTextureSize), 0 );
	vec3 WorldPosition = Position4.xyz;
	//vec3 WorldPosition = vec3(PhysicsPositionUv,0);
	*/
 CubeIndex-=100000/2;
	vec3 WorldPosition = vec3( CubeIndex%100, CubeIndex/100, -80.0 );
	WorldPosition *= 1.8;
	mat4 Transform = mat4( 1,0,0,0,
							0,1,0,0,
							0,0,1,0,
							WorldPosition,1 );
	return Transform;
}

vec3 GetWorldPosition(mat4 LocalToWorldTransform,vec3 LocalPosition)
{
	vec4 WorldPos = LocalToWorldTransform * vec4(LocalPosition,1.0);
	WorldPos.xyz *= WorldPos.www;
	WorldPos.w = 1.0;
	return WorldPos.xyz;
}

void main()
{
	//int CubeIndex = int(TickCount);
	int CubeIndex = gl_VertexID / (3*2*6);
	int VertexOfCube = gl_VertexID % (3*2*6);
	//int TriangleIndex = VertexOfCube /3;
	//int VertexIndex = VertexOfCube % 3;
	vec3 LocalPosition = GetLocalPosition( VertexOfCube );
	mat4 LocalToWorldTransform = GetLocalToWorldTransform( CubeIndex );
	vec3 WorldPosition = GetWorldPosition( LocalToWorldTransform, LocalPosition );
	vec4 CameraPos = WorldToCameraTransform * vec4(WorldPosition,1);	//	world to camera space
	vec4 ProjectionPos = CameraProjectionTransform * CameraPos;
	gl_Position = ProjectionPos;
	FragCubeIndex = CubeIndex;
	FragWorldPosition = WorldPosition.xyz;
}
`;

export const Frag =
`#version 300 es
precision highp float;
out vec4 OutFragColor;

void main()
{
	OutFragColor = vec4(1,0,0,1);
}
`;


