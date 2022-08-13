#version 300 es
precision highp float;
out vec4 FragColor;
precision highp float;
in vec2 Uv;
uniform sampler2D SourceTexture;

void main()
{
	vec2 Sampleuv = Uv;
	//Sampleuv -= 0.5 / 64.0;//makes no difference
	
	vec4 Sample = texture( SourceTexture, Sampleuv );
	FragColor = Sample;
}

