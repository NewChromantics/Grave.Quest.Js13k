export const Vert =
`#version 300 es

flat out  int FragCubeIndex;
out vec3 FragWorldPosition;
uniform mat4 WorldToCameraTransform;
uniform mat4 CameraProjectionTransform;
uniform float TickCount;

#define TRIANGLE(a,b,c)	vec3[3](a,b,c)

int GetLocalVertexPosition(int CubeVertexIndexComponent)
{
	ivec4 VertexPositions32 = ivec4(0xf695a00b,0x2dc1b60b,0xa66484ed,0x2ff);
	int ChunkIndex = int( CubeVertexIndexComponent / 32 );
	int BitIndex = CubeVertexIndexComponent % 32;
	int Value32 = VertexPositions32[ChunkIndex];
	int Value = (Value32 >> BitIndex) & 1;
	return Value;
}

//	get cube position
vec3 GetLocalPosition(int CubeVertexIndex)
{
	int x = GetLocalVertexPosition( (CubeVertexIndex*3)+0 );
	int y = GetLocalVertexPosition( (CubeVertexIndex*3)+1 );
	int z = GetLocalVertexPosition( (CubeVertexIndex*3)+2 );
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


