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
uniform sampler2D OldVelocitys;
#define MAX_PROJECTILES	50
uniform vec4 ProjectileVel[MAX_PROJECTILES];
uniform vec4 ProjectilePos[MAX_PROJECTILES];
#define FragIndex	(int(gl_FragCoord.x) + int(gl_FragCoord.y)*128)

float FloorY = -20.0;

void main()
{
	Colour = vec4(uv,0,1);
	vec4 Vel = texture(OldVelocitys, uv);
	vec4 xyz = texture(OldPositions, uv);

	//xyz.y -= mix(0.004,0.015,xyz.w);
	//	repeat
	//if ( xyz.y < 0.0 )xyz.y += 1.0;
	xyz += Vel ;//* 0.01666;
	
	//	stick to floor
	xyz.y = max( xyz.y, FloorY );

	//	new projectile data
	if ( FragIndex < MAX_PROJECTILES && ProjectilePos[FragIndex].w > 0.0 )
		xyz = ProjectilePos[FragIndex];

	Colour = xyz;
}
`;


