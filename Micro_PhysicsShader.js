export const Vert =
`#version 300 es
//	quad crammed into vec4s
#define u vec4(0,1,1,0)[gl_VertexID]
#define v vec4(0,0,1,1)[gl_VertexID]
out vec2 uv;
void main()
{
	uv = vec2(u,v);
	gl_Position = vec4( uv*2.0-1.0, 0, 1 );	//	0..1 -> -1..1
}
`;

export const Frag =
`#version 300 es
precision highp float;
out vec4 Colour;
in vec2 uv;
uniform sampler2D OldPositions;
void main()
{
	Colour = vec4(uv,0,1);
	vec4 xyz = texture(OldPositions, uv);
	xyz.y -= mix(0.004,0.015,xyz.w);
	//	repeat
	if ( xyz.y < 0.0 )xyz.y += 1.0;
	//	stick to floor
	xyz.y = max( xyz.y, 0.45 );
	Colour = xyz;
}
`;


