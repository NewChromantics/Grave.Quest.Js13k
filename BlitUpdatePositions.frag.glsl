#version 300 es
precision highp float;
out vec4 FragColor;


precision highp float;
in vec2 Uv;
uniform sampler2D OldPositionsTexture;
uniform sampler2D VelocitysTexture;
uniform vec2 TexelSize;
#define SampleUv	Uv//( Uv + TexelSize * 0.5 )

const float Timestep = 1.0 / 60.0;
const float Floory = -5.0;

void main()
{
	vec4 Pos4 = texture( OldPositionsTexture, SampleUv );
	vec3 Velocity = texture( VelocitysTexture, SampleUv ).xyz;
	
	Pos4.xyz += Velocity * Timestep;
	
	//	dont fall below floor (need to stop velocity if we're on the floor)
	//Pos4.y = max( Floory, Pos4.y );
	
	FragColor = Pos4;
}

