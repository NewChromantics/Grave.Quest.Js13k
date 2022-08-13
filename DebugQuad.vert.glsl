precision highp float;
attribute vec2 TexCoord;
varying vec2 Uv;

uniform vec4 Rect;

void main()
{
	vec2 uv = mix( Rect.xy, Rect.xy+Rect.zw, TexCoord );
	gl_Position.xy = mix( vec2(-1,-1), vec2(1,1), uv );
	gl_Position.z = 0.0;
	gl_Position.w = 1.0;
	
	Uv = TexCoord;
}

