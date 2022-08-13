#version 300 es
precision highp float;
in vec2 TexCoord;
out vec2 Uv;

void main()
{
	gl_Position.xy = mix( vec2(-1,-1), vec2(1,1), TexCoord );
	gl_Position.z = 1.0;
	gl_Position.w = 1.0;
	
	Uv = TexCoord;
}

