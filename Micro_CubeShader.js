export const Vert =
`#version 300 es

flat out  int FragCubeIndex;
out vec3 FragWorldPosition;
uniform mat4 WorldToCameraTransform;
uniform mat4 CameraProjectionTransform;
uniform float TickCount;

#define TRIANGLE(a,b,c)	vec3[3](a,b,c)

vec3 GetLocalPosition(int TriangleIndex,int VertexIndex)
{
	vec3 tln = vec3(0,0,0);
	vec3 trn = vec3(1,0,0);
	vec3 brn = vec3(1,1,0);
	vec3 bln = vec3(0,1,0);
	vec3 tlf = vec3(0,0,1);
	vec3 trf = vec3(1,0,1);
	vec3 brf = vec3(1,1,1);
	vec3 blf = vec3(0,1,1);
	vec3 Triangle[3];
	if ( TriangleIndex==0 )	Triangle = TRIANGLE( brn, trn, tln );
	if ( TriangleIndex==1 )	Triangle = TRIANGLE( tln, bln, brn );
	if ( TriangleIndex==2 )	Triangle = TRIANGLE( trf, tlf, blf );
	if ( TriangleIndex==3 )	Triangle = TRIANGLE( blf, brf, trf );
	if ( TriangleIndex==4 )	Triangle = TRIANGLE( tln, tlf, trf );
	if ( TriangleIndex==5 )	Triangle = TRIANGLE( trf, trn, tln );
	if ( TriangleIndex==6 )	Triangle = TRIANGLE( brf, blf, bln );
	if ( TriangleIndex==7 )	Triangle = TRIANGLE( bln, brn, brf );
	if ( TriangleIndex==8 )	Triangle = TRIANGLE( tlf, tln, bln );
	if ( TriangleIndex==9 )	Triangle = TRIANGLE( bln, blf, tlf );
	if ( TriangleIndex==10 )	Triangle = TRIANGLE( trn, trf, brf );
	if ( TriangleIndex==11 )	Triangle = TRIANGLE( brf, brn, trn );
	return Triangle[VertexIndex];
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
	int TriangleIndex = VertexOfCube /3;
	int VertexIndex = VertexOfCube % 3;
	vec3 LocalPosition = GetLocalPosition( TriangleIndex, VertexIndex );
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


