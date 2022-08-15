export const Vert =
`#version 300 es
vec2 Quad[4] = vec2[4]( vec2(0,0), vec2(1,0), vec2(1,1), vec2(0,1) );
out vec2 uv;
void main()
{
	uv = Quad[gl_VertexID];
	gl_Position = vec4( mix( vec2(-1), vec2(1), uv ), 0, 1 );
}
`;

export const Frag =
`#version 300 es
precision highp float;
out vec4 OutFragColor;
in vec2 uv;
uniform sampler2D OldPositions;
void main()
{
	OutFragColor = vec4(uv,0,1);
	vec4 xyz = texture(OldPositions, uv);
	xyz.y -= mix(0.001,0.010,xyz.w);
	if ( xyz.y < 0.0 )
		xyz.y += 1.0;
	OutFragColor = xyz;
}
`;


