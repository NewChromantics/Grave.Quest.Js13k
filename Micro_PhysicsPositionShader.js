export const SpriteMeta =
`
#define SpriteIndex	(1.0+floor(gl_FragCoord.y/6.0))
#define SpriteDepth	(mod(gl_FragCoord.y,6.0))
#define TimeOff		( Time==0.0 ? 0.0 : 100000.0 )
#define SpriteTime	( (TimeOff+Time) * (SpriteIndex/100.0) + SpriteIndex*37.47 )
#define SinTimef(Speed)	( fract(SpriteTime/Speed) * PI * 2.0 )
#define AnimOff		vec3( 2.5*cos(SinTimef(480.0)), 2.3*sin(SinTimef(400.0)), 2.8*cos(SinTimef(300.0)) )
#define Spritexyz	vec3(-10.0+SpriteIndex*1.1,3,SpriteDepth*CUBESIZE*1.3)+AnimOff
#define SpriteTrans mat4( vec4(0.1,0,0,0),	vec4(0,-0.1,0,0),	vec4(0,0,0.1,0),	vec4(Spritexyz,1) )
`;

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

uniform sampler2D SpritePositions;

uniform float Time;
${SpriteMeta}

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

	//	initialise close to pos
	if ( FragIndex >= MAX_PROJECTILES && Time == 0.0 )
	{
		ivec2 Spriteuv = ivec2( gl_FragCoord.x, 0 );
		vec4 SpritePos = SpriteTrans * texelFetch( SpritePositions, Spriteuv, 0 );
		SpritePos.y = float(FLOORY);
		xyz = mix(xyz,SpritePos.xyz, 1.0);
	}
	Colour.xyz = xyz;
}
`;


