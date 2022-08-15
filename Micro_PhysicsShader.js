export const Vert =
`#version 300 es
vec2 Quad[4] = vec2[4]( vec2(0,0), vec2(1,0), vec2(1,1), vec2(0,1) );
out vec2 uv;
void main()
{
	gl_Position = vec4( Quad[gl_VertexID], 0, 1 );
	uv = gl_Position.xy;
}
`;

export const Frag =
`#version 300 es
precision highp float;
out vec4 OutFragColor;
in vec2 uv;
void main()
{
	OutFragColor = vec4(uv,0,1);
}
`;


