#version 300 es
precision highp float;
out vec4 OutFragColor;
in vec4 FragColour;

uniform bool MuteColour;
uniform bool InvertColour;

uniform sampler2D DepthTexture;
uniform mat4 NormalDepthToViewDepthTransform;
uniform mat4 CameraToWorldTransform;
uniform mat4 ProjectionToCameraTransform;

in vec3 FragWorldPosition;
in vec2 FragLocalUv;
in vec3 FragLocalPosition;
in vec2 FragViewUv;
in vec3 ClipPosition;
in vec3 FragWorldNormal;

in vec3 FragCameraPosition;


const float BorderWidth = 0.08;

float Range(float Min,float Max,float Value)
{
	return (Value-Min) / (Max-Min);
}




void main()
{
	float u = Range( BorderWidth, 1.0 - BorderWidth, FragLocalUv.x ); 
	float v = Range( BorderWidth, 1.0 - BorderWidth, FragLocalUv.y );
	if ( u < 0.0 || u > 1.0 || v < 0.0 || v > 1.0 )
	{
	}
	else
		discard; 
	
	OutFragColor = vec4(FragLocalUv,0,1.0);
}


