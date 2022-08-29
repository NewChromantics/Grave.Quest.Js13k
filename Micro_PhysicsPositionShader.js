export const NmeMeta =
`
#define			FragIndex	(int(gl_FragCoord.x) + (int(gl_FragCoord.y)*DATAWIDTH))

#define dataFetch(t)	texelFetch(t,ivec2(gl_FragCoord),0)

#define SpriteMat(t,s)	mat4( vec4(CUBESIZE*s,0,0,0),	vec4(0,CUBESIZE*s,0,0),	vec4(0,0,CUBESIZE*s,0),	vec4(t,1) )


#define NmeDepth	NmeY
#define NmeX		(mod(NmeIndexf,10.0))
#define NmeY		(floor(NmeIndexf/10.0))
#define TimeOff		( Time==0.0 ? 0.0 : 100000.0 )
#define NmeTime		( (TimeOff+Time) * (NmeIndexf/700.0) + NmeIndexf*37.47 )
#define SinTimef(Speed)	( fract(NmeTime/Speed) * PI * 2.0 )
#define AnimOff		vec3( 2.5*cos(SinTimef(480.0)), max(1.0,2.3*sin(SinTimef(400.0))), 2.8*cos(SinTimef(300.0)) )
//#define AnimOff		vec3(0)
#define Nmexyz		vec3(NmeX-5.0,1.0+NmeY*3.0,-3.0)+AnimOff
#define NmeTrans	SpriteMat( Nmexyz,1.2 )
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

#define IsFloor			(int(FragCubeIndex) == DATALAST)
#define IsChar			(CharI>=0)
#define PPerChar		20
//#define CharI			(FragIndex-(DATAWIDTH*(DATAHEIGHT-10)))
#define CharBuffer		30
#define CharI			(FragIndex-(DATALAST-PPerChar*CharBuffer))
#define CharP			(CharI%PPerChar)
#define CharN			int(CharI/PPerChar)

uniform mat4 String;
#define CharLineW		10
#define CharOrigin		vec3(-float(CharLineW)*0.5*0.4,2,7)
#define CharKern		vec3(0.4,-0.4,1)
#define CharPos(n)		CharOrigin+vec3(n%CharLineW,int(n/CharLineW),0)*CharKern

#define Charxyz(n,s)	(CameraToWorld * SpriteMat(CharPos(n),1.0) * texelFetch( SpritePositions, ivec2(CharP,s), 0 )).xyz
#define CharXyz			(Charxyz(CharN,int(String[CharN/4][CharN%4])))

uniform mat4 CameraToWorld;

uniform float Time;
#define FirstFrame		(Time==0.0)
#define RAND1			(Pos4.w)
#define UP				vec3(0,1,0)
#define INITIAL_POS_RANDOMNESS	0.002
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

	if ( FirstFrame )
	{
		mat4 Trans = Type_IsSprite ? NmeTrans : SpriteMat( xyz,1.0 );
		vec4 NmePos = Trans * texelFetch( SpritePositions, Spriteuv, 0 );
		xyz = mix(xyz,NmePos.xyz, 1.0-INITIAL_POS_RANDOMNESS);
		if ( IsProjectile )
			xyz = vec3(10,0,0);

		if ( IsChar )
		{
			xyz = CharXyz;
		}
	}
	else
	{
		xyz += Vel4.xyz * TIMESTEP;
	
		//	stick to floor
		xyz.y = max( xyz.y, float(FLOORY) );
	}

	//	new projectile data
	if ( FragIndex < MAX_PROJECTILES && ProjectilePos[FragIndex].w > 0.0 )
		xyz = ProjectilePos[FragIndex].xyz;

	Colour.xyz = xyz;
}
`;


