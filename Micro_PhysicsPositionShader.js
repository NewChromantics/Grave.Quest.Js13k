export const NmeMeta =
`
#define			FragIndex	(int(gl_FragCoord.x) + (int(gl_FragCoord.y)*DATAWIDTH))

#define dataFetch(t)	texelFetch(t,ivec2(gl_FragCoord),0)

#define SpritePixelScale	(CUBESIZE*1.2)
#define SpriteMat(t)	mat4( vec4(SpritePixelScale,0,0,0),	vec4(0,SpritePixelScale,0,0),	vec4(0,0,SpritePixelScale,0),	vec4(t,1) )


#define NmeDepth	(mod(NmeIndexf/10.0,10.0))
#define NmeX		(mod(NmeIndexf,10.0))
#define TimeOff		( Time==0.0 ? 0.0 : 100000.0 )
#define TimePause	( Time < INTROMS ? 0.01 : 1.0 )
#define NmeTime		(( (TimeOff+Time) * (NmeIndexf/1000.0) + NmeIndexf*37.47 )*TimePause)
#define SinTimef(Speed)	( fract(NmeTime/Speed) * PI * 2.0 )
#define AnimOff		vec3( 2.5*cos(SinTimef(480.0)), 2.3*sin(SinTimef(400.0)), 2.8*cos(SinTimef(300.0)) )
//#define AnimOff		vec3(0)
#define Nmexyz		vec3(-5.0+NmeX,3,-3.0+NmeDepth*CUBESIZE*1.3)+AnimOff
#define NmeTrans	SpriteMat( Nmexyz )
#define Spriteuv	ivec2( gl_FragCoord.x, SpriteIndex )

#define Row				int(gl_FragCoord.y)
#define IsProjectile	(Row==0)
#define NmeIndex		(Row-1)
#define NmeIndexf		float(NmeIndex)
#define Type			Vel4.w
#define Typei			int(Vel4.w)
#define Type_IsStatic	(Typei<=STATIC)
#define Type_IsDebris	(Typei==DEBRIS)
#define Type_IsSprite	(Typei>=SPRITE0)
#define SpriteIndex		((abs(Typei)-SPRITE0)%SPRITECOUNT)

uniform float Time;
#define FirstFrame		(Time==0.0)
#define RAND1			(Pos4.w)
#define UP				vec3(0,1,0)
#define INITIAL_POS_RANDOMNESS	0.0002
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

uniform sampler2D SpritePositions;

${NmeMeta}

void main()
{
	vec4 Vel4 = dataFetch(OldVelocitys);
	Colour = dataFetch(OldPositions);
	vec3 xyz = Colour.xyz;

	xyz += Vel4.xyz * TIMESTEP;
	
	//	stick to floor
	xyz.y = max( xyz.y, float(FLOORY) );

	if ( FirstFrame /*|| Type_IsSprite */)
	{
		mat4 Trans = Type_IsSprite ? NmeTrans : SpriteMat( xyz );
		vec4 NmePos = Trans * texelFetch( SpritePositions, Spriteuv, 0 );
		//xyz = mix(xyz,NmePos.xyz, 1.0-INITIAL_POS_RANDOMNESS);
xyz =NmePos.xyz;
	}

	//	new projectile data
	if ( FragIndex < MAX_PROJECTILES && ProjectilePos[FragIndex].w > 0.0 )
		xyz = ProjectilePos[FragIndex].xyz;

	Colour.xyz = xyz;
}
`;


