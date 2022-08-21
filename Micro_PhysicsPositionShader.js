export const Vert =
`//	quad crammed into vec4s
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
`out vec4 Colour;
in vec2 uv;
uniform sampler2D OldPositions;
uniform sampler2D OldVelocitys;
uniform vec4 ProjectileVel[MAX_PROJECTILES];
uniform vec4 ProjectilePos[MAX_PROJECTILES];
#define			FragIndex	(int(gl_FragCoord.x) + (int(gl_FragCoord.y)*DATAWIDTH))


void main()
{
	vec4 Vel = texelFetch(OldVelocitys,ivec2(gl_FragCoord),0);
	Colour = texelFetch(OldPositions,ivec2(gl_FragCoord),0);
	vec3 xyz = Colour.xyz;

	xyz += Vel.xyz * TIMESTEP;
	
	//	stick to floor
	xyz.y = max( xyz.y, float(FLOORY) );

	//	new projectile data
	if ( FragIndex < MAX_PROJECTILES && ProjectilePos[FragIndex].w > 0.0 )
		xyz = ProjectilePos[FragIndex].xyz;

	Colour.xyz = xyz;
}
`;


