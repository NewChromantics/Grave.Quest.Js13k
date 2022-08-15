export const Vert =
`#version 300 es

out float FragCubeIndex;
out vec3 FragWorldPosition;
uniform mat4 WorldToCameraTransform;
uniform mat4 CameraProjectionTransform;
uniform float TickCount;
uniform sampler2D PositionsTexture;

//	get 0..1 cube model position
vec3 GetLocalPosition(int CubeVertexIndex)
{
	int CubeVertexIndexComponent = CubeVertexIndex*3;
	ivec4 VertexPositions30s = ivec4(0x3695a00b,0x3706d82f,0x26484ed2,0xbfe9);
	int ChunkIndex = int( CubeVertexIndexComponent / 30 );
	int BitIndex = CubeVertexIndexComponent % 30;
	int Value32 = VertexPositions30s[ChunkIndex];
/*
	Value32 >>= BitIndex;
	int x = Value32 & 1;
	int y = Value32 & 2;
	int z = Value32 & 4;
	return vec3(x,y,z)/vec3(1,2,4);
*/
	int x = (Value32>>BitIndex) & 1;
	int y = (Value32>>BitIndex+1) & 1;
	int z = (Value32>>BitIndex+2) & 1;
	return vec3(x,y,z);
}
	
mat4 GetLocalToWorldTransform(int CubeIndex)
{
	int u = CubeIndex % textureSize(PositionsTexture,0).x;
	int v = (CubeIndex/ textureSize(PositionsTexture,0).y);
	vec4 Position4 = texelFetch( PositionsTexture, ivec2(u,v), 0 );
	vec3 WorldPosition = mix( vec3(-500),vec3(500),Position4.xyz);


	//	some movement for testing
	float Tickf = mod(TickCount+float(CubeIndex),10000.0) / 1000.0;
	float Angle = radians(Tickf*460.0);
	float Dist = float(CubeIndex)/10000.0;
	WorldPosition += vec3( cos(Angle)*Dist, sin(Angle)*Dist, -80.0 );
	

	//CubeIndex-=100000/2;
	//vec3 WorldPosition = vec3( CubeIndex%100, CubeIndex/100, -80.0 );
	//WorldPosition *= 1.8;

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
	FragCubeIndex = float(CubeIndex);
	FragWorldPosition = WorldPosition.xyz;
}
`;

export const Frag =
`#version 300 es
precision highp float;
out vec4 OutFragColor;
in float FragCubeIndex;
uniform sampler2D PositionsTexture;

void main()
{
	float r = mod(FragCubeIndex,1234.0)/1000.0;
	float g = mod(FragCubeIndex,100.0)/100.0;
	float b = mod(FragCubeIndex,7777.0)/7777.0;
	OutFragColor = vec4(r,g,b,1);
	//OutFragColor = texture(PositionsTexture,vec2(0));
}
`;


