#version 300 es
//#define MULTI_VIEW

#if defined(MULTI_VIEW)
#extension GL_OVR_multiview : require
layout(num_views=2) in;
//	gr: popengine writes these automatically (these could be up to 15 for... caves?)
uniform mat4 Pop_CameraWorldToCameraTransforms[2];
uniform mat4 Pop_CameraProjectionTransforms[2];

//	gl_ViewID_OVR is keyword which dictates which eye is being rendered (0,1,etc)
#define WorldToCameraTransform		( Pop_CameraWorldToCameraTransforms[gl_ViewID_OVR] )
#define CameraProjectionTransform	( Pop_CameraProjectionTransforms[gl_ViewID_OVR] )
#endif

in vec3 LocalPosition;
in vec3 LocalUv;
in vec3 LocalNormal;
out vec3 FragWorldPosition;
out vec3 FragLocalPosition;
out vec2 FragLocalUv;
out vec3 FragCameraPosition;	//	position in camera space
out vec2 FragViewUv;
out vec3 ClipPosition;
out vec4 FragColour;
out vec3 FragLocalNormal;
out vec3 FragWorldNormal;

in mat4 LocalToWorldTransform;
#if !defined(WorldToCameraTransform)
uniform mat4 WorldToCameraTransform;
uniform mat4 CameraProjectionTransform;
#endif
in vec4 Colour;

uniform float VelocityStretch;


#if defined(POSITION_FROM_TEXTURE)
//	gr: we have a problem here... the previous position is often very close
//		and if not moving at all they disapear
#define USE_PREVIOUS_POSITIONS_TEXTURE 1
//const bool UsePreviousPositionsTexture = true;
//in vec2 PhysicsPositionUv;
uniform sampler2D PhysicsPreviousPositionsTexture;
uniform sampler2D PhysicsPositionsTexture;
uniform vec2 PhysicsPositionsTextureSize;
uniform sampler2D PhysicsVelocitysTexture;

#define PhysicsPositionUv	GetPhysicsUv()
vec2 GetPhysicsUv()
{
	float Index = float(gl_InstanceID);
	float x = mod( Index, PhysicsPositionsTextureSize.x );
	float y = floor( Index / PhysicsPositionsTextureSize.x );
	return vec2(x,y) / PhysicsPositionsTextureSize;
}

mat4 GetLocalToWorldTransform()
{
	//	texelfetch seems a tiny bit faster
	//vec4 Position4 = texture( PhysicsPositionsTexture, PhysicsPositionUv.xy );
	vec4 Position4 = texelFetch( PhysicsPositionsTexture, ivec2(PhysicsPositionUv.xy*PhysicsPositionsTextureSize), 0 );
	vec3 WorldPosition = Position4.xyz;
	//vec3 WorldPosition = vec3(PhysicsPositionUv,0);
	
	mat4 Transform = mat4( 1,0,0,0,	
							0,1,0,0,	
							0,0,1,0,	
							WorldPosition,1 );
	return Transform;
}

#define WorldVelocity	GetWorldVelocity()
vec3 GetWorldVelocity()
{
	//	texelfetch seems a tiny bit faster
	//vec4 Velocity4 = texture( PhysicsVelocitysTexture, PhysicsPositionUv );
	vec4 Velocity4 = texelFetch( PhysicsVelocitysTexture, ivec2(PhysicsPositionUv*PhysicsPositionsTextureSize), 0 );
	return Velocity4.xyz;
}

#else // ! POSITION_FROM_TEXTURE
#define USE_PREVIOUS_POSITIONS_TEXTURE 0

in vec3 WorldVelocity;

mat4 GetLocalToWorldTransform()
{
	return LocalToWorldTransform;
}
#endif

#define UsePreviousPositionsTexture	(USE_PREVIOUS_POSITIONS_TEXTURE==1)


vec3 GetWorldPos(mat4 LocalToWorldTransform)
{
	vec4 WorldPos = LocalToWorldTransform * vec4(LocalPosition,1.0);
	WorldPos.xyz *= WorldPos.www;
	WorldPos.w = 1.0;

	vec4 OriginWorldPos = LocalToWorldTransform * vec4(0,0,0,1);
	OriginWorldPos.xyz *= OriginWorldPos.www;
	OriginWorldPos.w = 1.0;	
	
	//	stretch world pos along velocity
	vec3 TailDelta = -WorldVelocity * VelocityStretch * (1.0/60.0);
	
	//	old method
	//WorldPos.xyz += -WorldVelocity * 1.5 * LocalPosition.z;
	//return WorldPos.xyz;
	
	vec3 LocalPosInWorld = WorldPos.xyz - OriginWorldPos.xyz;
	
	//	this is the opposite of what it should be and shows the future
	//	but better than flashes of past that wasnt there (better if we just stored prev pos)
	float ForwardWeight = UsePreviousPositionsTexture ? 0.9 : 0.9;
	float BackwarddWeight = UsePreviousPositionsTexture ? 0.0 : 0.1;
	vec3 NextPos = WorldPos.xyz - (TailDelta*ForwardWeight);
	vec3 PrevPos = WorldPos.xyz + (TailDelta*BackwarddWeight);
	
#if USE_PREVIOUS_POSITIONS_TEXTURE==1
	if ( UsePreviousPositionsTexture )
	{
		//PrevPos.xyz = texture( PhysicsPreviousPositionsTexture, PhysicsPositionUv ).xyz;
		PrevPos.xyz = texelFetch( PhysicsPreviousPositionsTexture, ivec2(PhysicsPositionUv*PhysicsPositionsTextureSize), 0 ).xyz;
		PrevPos.xyz += LocalPosition;
	}
#endif
	//	"lerp" between depending on whether we're at front or back
	//	^^ this is why we're getting angled shapes, even if we did a cut off we
	//	could have 1/8 verts in front
	
	//	gr; this nvidia object space motion blur stretches if the [current]normal 
	//		is inline(dot(next-prev,velocity)>0) with the motion vector(velocity)... in EYESPACE
	//	https://www.nvidia.com/docs/io/8230/gdc2003_openglshadertricks.pdf
	float Scale = dot( normalize(LocalPosInWorld), normalize(-TailDelta) );
	float Lerp = Scale > 0.0 ? 1.0 : 0.0;
	
	WorldPos.xyz = mix( PrevPos, NextPos, Lerp );
	return WorldPos.xyz;
}

float Range(float Min,float Max,float Value)
{
	return (Value-Min) / (Max-Min);
}

float Range01(float Min,float Max,float Value)
{
	return clamp( Range( Min, Max, Value ), 0.0, 1.0 );
}


void main()
{
	mat4 LocalToWorldTransform = GetLocalToWorldTransform();

	vec3 WorldPos = GetWorldPos(LocalToWorldTransform);
	vec4 CameraPos = WorldToCameraTransform * vec4(WorldPos,1.0);	//	world to camera space
	vec4 ProjectionPos = CameraProjectionTransform * CameraPos;

	vec4 WorldNormal = LocalToWorldTransform * vec4(LocalNormal,0.0);
	WorldNormal.xyz = normalize(WorldNormal.xyz);


	gl_Position = ProjectionPos;
	
	FragViewUv = gl_Position.xy;
	ClipPosition = gl_Position.xyz / gl_Position.www;	//	not sure if this should divide...
	
	FragCameraPosition = CameraPos.xyz ;/// CameraPos.www;
	
	FragWorldPosition = WorldPos.xyz;
	//FragColour = Colour;//LocalPosition;
	FragColour = vec4( LocalUv, 1 );
	FragLocalPosition = LocalPosition;
	FragLocalUv = LocalUv.xy;
	FragColour = Colour;
	FragLocalNormal = LocalNormal;
	FragWorldNormal = WorldNormal.xyz;
}

