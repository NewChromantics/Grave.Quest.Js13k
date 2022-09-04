export const NmeMeta =
`

#define dataFetch(t)	texelFetch(t,ivec2(Cubexy),0)

#define SpriteScale	1.0
#define s0			vec2(CUBESIZE*SpriteScale,0)
#define SpriteMat(worldtrans)	mat4(s0.xyyy,s0.yxyy,s0.yyxy,vec4(worldtrans,1))

uniform vec4 WavePositions[WAVEPOSITIONCOUNT];

//	sprite local pos
#define SpriteXyzw(si)	vec4(texelFetch(SpritePositions,ivec2(Cubexy.x,si),0).xyz,1)

//	wave world pos
#define WaveXyz(wv)	(WavePositions[wv].xyz*vec3(5,4,0)+vec3(0,4,-6))

#define Nmexyz		(SpriteMat(WaveXyz(NmeIndex))*SpriteXyzw(SpriteIndex)).xyz
#define NmePos		mix(Nmexyz,HeartPos0,WavePositions[NmeIndex].w )

#define NmeIndex		int(Sloti)
#define NmeIndexf		float(NmeIndex)

//	voxel slots are frag y (should pack these into index, but we use .x for sprite index)
//	only to be used in blits
#if !defined(Cubexy)
#define Cubexy			gl_FragCoord
#endif
#define					FragIndex	(int(Cubexy.x) + (int(Cubexy.y)*DATAWIDTH))

#define						ActorCount	100
#define ProjectileRow		(ActorCount+0)
#define Sloti				int(Cubexy.y)
#define Slot_IsActor		(Sloti<ActorCount)
#define Slot_IsProjectile	(Sloti==ProjectileRow)
#define Slot_IsHeart		(Sloti==ActorCount+1)
#define Slot_Char			(Sloti==ActorCount+2)
#define Slot_IsFloor		(FragIndex==DATALAST)
#define Projectilei			int(Cubexy.x)
#define Chari
#define FetchProjectile(t,p)	texelFetch(t,ivec2(p,ProjectileRow),0)

//	type changes, so is velocity w
#define Type			Vel4.w
#define Typei			int(Type)
#define Type_IsStatic	(Typei<=STATIC)
#define Type_IsNull		(Typei==NULL)
#define Type_IsDebris	(Typei==DEBRIS)
#define Type_IsSprite	(Typei>=SPRITE0)
//#define SpriteIndex		((abs(Typei)-SPRITE0)%SPRITECOUNT)
#define SpriteIndex		(Typei>0?0 : abs(Typei)-SPRITE0 )

#define IsChar			(CharI>=0)
#define PPerChar		20
//#define CharI			(FragIndex-(DATAWIDTH*(DATAHEIGHT-10)))
#define CharBuffer		(STRINGCOUNT*16)
#define CharI			(FragIndex-(DATALAST-PPerChar*CharBuffer))
#define CharP			(CharI%PPerChar)
#define CharN			int(CharI/PPerChar)

uniform mat4 String[STRINGCOUNT];
#define CharLineW		10
#define CharOrigin		vec3(-float(CharLineW)*0.5*0.4,2,7)
#define CharKern		vec3(0.45,-0.4,1)
#define CharPos(n)		CharOrigin+vec3(n%CharLineW,int(n/CharLineW),0)*CharKern

#define Charxyz(n,s)	(CameraToWorld * SpriteMat(CharPos(n)) * texelFetch( SpritePositions, ivec2(CharP,s), 0 )).xyz
#define CharS			int(String[CharN/16][CharN%16/4][CharN%4])
#define CharXyz			(Charxyz(CharN,CharS))
#define Charw			int(texelFetch( SpritePositions, ivec2(CharP,CharS), 0 ).w)
#define CharNull		(Charw==0)

#define HeartPos(sxyz)	(CameraToWorld * SpriteMat(vec3(0,-0.8,2.2)) * sxyz ).xyz
#define HeartPos0		(CameraToWorld*vec4(0,0,1,1)).xyz	//HeartPos(vec4(0,0,0,1))
#define HeartXyz		HeartPos0	//HeartPos(SpriteXyzw(SPRITEHEART))


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
	//if ( FirstFrame || Type_IsSprite )
	{
		xyz = (SpriteMat(xyz)*SpriteXyzw(SpriteIndex)).xyz;
		if ( !Type_IsStatic )
			xyz = NmePos;	//	if is actor
		if ( Slot_IsProjectile )
			xyz = vec3(0,-10,0);
		if ( Slot_IsHeart )
			xyz = HeartXyz;
		if ( IsChar )
			xyz = CharXyz;
		//xyz = mix(xyz,NmePos.xyz, 1.0-INITIAL_POS_RANDOMNESS);
	}
	else
	{
		xyz += Vel4.xyz * TIMESTEP;
	
		//	stick to floor
		xyz.y = max( xyz.y, float(FLOORY) );
	}

	//	new projectile data
	if ( Slot_IsProjectile && ProjectilePos[Projectilei].w > 0.0 )
		xyz = ProjectilePos[Projectilei].xyz;

	Colour.xyz = xyz;
}
`;


