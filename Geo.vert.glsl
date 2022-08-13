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

//#define OCCUPANCY_IN_VERTEX
#if defined(OCCUPANCY_IN_VERTEX)
out vec4 FragOccupancySample;
out float FragOccupancyShadow;
#endif
uniform sampler2D OccupancyMapTexture;
uniform vec2 OccupancyMapTextureSize;
uniform vec3 OccupancyMapWorldMin;
uniform vec3 OccupancyMapWorldMax;

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

vec3 GetMapPosition(vec3 WorldPosition/*,out float Inside*/)
{
	vec3 WorldUv;
	WorldUv.x = Range01( OccupancyMapWorldMin.x, OccupancyMapWorldMax.x, WorldPosition.x );
	WorldUv.y = Range01( OccupancyMapWorldMin.y, OccupancyMapWorldMax.y, WorldPosition.y );
	WorldUv.z = Range01( OccupancyMapWorldMin.z, OccupancyMapWorldMax.z, WorldPosition.z );
	
	//Inside = Inside01(WorldUv.x) && Inside01(WorldUv.y) && Inside01(WorldUv.z);
	return WorldUv;
}

vec4 GetOccupancySample(vec3 WorldPosition,out float MapPositionYNormalised)
{
//#if defined(OCCUPANCY_IN_VERTEX)
#if 0
	vec3 MapPosition = GetMapPosition(WorldPosition);
	MapPositionYNormalised = MapPosition.y;
	return FragOccupancySample;
#else
	float Inside;
	//vec3 MapPosition = GetMapPosition(WorldPosition,Inside);
	vec3 MapPosition = GetMapPosition(WorldPosition);
	//if ( !Inside )	return vec4(0);
	vec2 MapPx = floor( MapPosition.xz * OccupancyMapTextureSize );
	vec2 TexelSize = vec2(1) / OccupancyMapTextureSize;
	vec2 MapUv = MapPx * TexelSize;
	
	MapPositionYNormalised = MapPosition.y;
	
	//	texelfetch is a tiny bit faster
	//vec4 OccupancyData = texture( OccupancyMapTexture, MapUv );
	vec4 OccupancyData = texelFetch( OccupancyMapTexture, ivec2(MapPx), 0 );
	return OccupancyData;
#endif
}


const int YSectionsPerComponent = 7;
const float YSectionsPerComponentf = float(YSectionsPerComponent);
const int YSectionComponents = 4;
#define YSectionCount	(YSectionsPerComponent*YSectionComponents)
#define YSectionCountf	float(YSectionCount)

#define WorldSectionSizeY	( ( OccupancyMapWorldMax.y - OccupancyMapWorldMin.y ) / YSectionCountf )

#define ShadowSamplePositionOffset	0.04	
#define MinShadowDistance		(0.0)
#define MaxShadowDistance		(1.0)
//	how much to Light*= depending on shadow strength
#define ShadowLightMultMin		(1.0)
#define ShadowLightMultMax		(0.2)
const vec3 LightWorldPosition = vec3(1,10,0);
#define APPLY_SHADOW_LIGHTING	true
#define APPLY_PHONG_LIGHTING	true
#define GENERATE_ADDITIONAL_SHADOW	false

//	faster version but hard shadow only
#define SHADOW_ANY_ABOVE		false	//	false=noticably slower

float GetSectionValue(float Section)
{
	//	pow(10,0)==1 ??
	//	pow is more expensive, but maybe we can avoid the if's
	//return pow( 10.0, Section );
	if ( Section == 0.0 )		return 1.0;
	if ( Section == 1.0 )		return 10.0;
	if ( Section == 2.0 )		return 100.0;
	if ( Section == 3.0 )		return 1000.0;
	if ( Section == 4.0 )		return 10000.0;
	if ( Section == 5.0 )		return 100000.0;
	if ( Section == 6.0 )		return 1000000.0;
	if ( Section == 7.0 )		return 10000000.0;
	if ( Section == 8.0 )		return 100000000.0;
	if ( Section == 9.0 )		return 1000000000.0;
	if ( Section == 10.0 )	return 10000000000.0;
	if ( Section == 11.0 )	return 100000000000.0;
	return 0.0;
}

float GetOccupancyMapShadowFactor(vec3 WorldPosition)
{
	//	get our position in the occupancy map
	float MapYNormalised;
	vec4 OccupancyData = GetOccupancySample(WorldPosition,MapYNormalised);
	
	//	just return anything so we can test minimal texture sample
	//return (OccupancyData.x+OccupancyData.y+OccupancyData.z+OccupancyData.w)/10000.0;

	//	from blit occupancy frag
	float ThisSection = floor(MapYNormalised * YSectionCountf );
	
	float ThisComponent = floor( ThisSection / YSectionsPerComponentf );
	float ThisCompSection = mod( ThisSection, YSectionsPerComponentf );
	float ThisCompSectionValue = GetSectionValue( ThisCompSection );

	//	clear all the data below us
	vec4 OccupancyMask = vec4( ThisComponent<=0.0, ThisComponent<=1.0, ThisComponent<=2.0, ThisComponent<=3.0 );
	OccupancyData *= OccupancyMask;

	if ( SHADOW_ANY_ABOVE )
	{
		//	clear component data in our component, below us
		OccupancyData.x /= (ThisComponent==0.0) ? (ThisCompSectionValue*10.0) : 1.0;	//	*10 to go one section up
		OccupancyData.y /= (ThisComponent==1.0) ? (ThisCompSectionValue*10.0) : 1.0;
		OccupancyData.z /= (ThisComponent==2.0) ? (ThisCompSectionValue*10.0) : 1.0;
		OccupancyData.w /= (ThisComponent==3.0) ? (ThisCompSectionValue*10.0) : 1.0;
		OccupancyData = floor(OccupancyData);
	
		float AnyShadow = OccupancyData.x + OccupancyData.y + OccupancyData.z + OccupancyData.w;
		return sign( AnyShadow );
	}
	else
	{
		float LowestHitSection = 9999.0;
		for ( int TestComp=0;	TestComp<YSectionComponents;	TestComp++ )
		{
			float ComponentValue = floor(OccupancyData[TestComp]);
			if ( ComponentValue <= 0.0 )	//	skip whole section
				continue;
			
			for ( float TestSection=0.0;	TestSection<YSectionsPerComponentf;	TestSection++ )
			{
				//	breaks good on cpu, bad on gpu?
				if ( ComponentValue <= 0.0 )	//	skip whole section
					break;
				if ( LowestHitSection < 9999.0 )	//	already hit
					break;
					
				float SectionIndex = TestSection + (float(TestComp)*YSectionsPerComponentf);
				bool IsAbove = (SectionIndex > ThisSection);
				float Hits = ( IsAbove && ComponentValue > 0.0) ? mod( ComponentValue, 10.0 ) : 0.0;
				float HitDistance = ( Hits > 0.0 ) ? SectionIndex : 9999.0;
				LowestHitSection = min( LowestHitSection, HitDistance );
				ComponentValue = floor(ComponentValue/10.0);
			}
		}
		
		float SectionsAway = LowestHitSection - ThisSection;
		float DistanceAway = WorldSectionSizeY * SectionsAway;
		float Strength = Range01( MaxShadowDistance, MinShadowDistance, DistanceAway );
		return Strength;
	}
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
	
#if defined(OCCUPANCY_IN_VERTEX)
	float YNorm;
	//	a non varying world pos
	//	change this to be 3 (non varying) samples for the triangle
	//	and then lerp/smoothstep in the shader
	//vec3 LightWorldPos = WorldPos.xyz;
	vec3 LightWorldPos = (LocalToWorldTransform * vec4(0,0,0,1)).xyz;
	vec3 ShadowSamplePosition = LightWorldPos + (FragWorldNormal*ShadowSamplePositionOffset);
	/* makes no difference on fps
	if ( WorldPos.z < -2.1 )
	{
		FragOccupancySample = vec4(0);
		FragColour = vec4(1,0,0,1);	
	}
	else*/
		FragOccupancySample = GetOccupancySample( LightWorldPos.xyz, YNorm );
	//FragOccupancyShadow = GetOccupancyMapShadowFactor( LightWorldPos.xyz );
#endif
}

