export const NmeMeta =
`

#define dataFetch(t)	texelFetch(t,ivec2(Cubexy),0)

#define ss(s)		vec2(CUBESIZE*s,0)
#define SpriteMats(worldtrans,s0)	mat4(s0.xyyy,s0.yxyy,s0.yyxy,vec4(worldtrans,1))
#define SpriteMat(worldtrans)		SpriteMats(worldtrans,ss(1.0))

uniform vec4 WavePositions[WAVEPOSITIONCOUNT];

#define SPRITEDIM	vec3(SPRITEW,0,0)
#define CHARDIM		vec3(CHARW,CHARH,0)

//	sprite local pos centered
#define SpriteXyzw(si,wh)	vec4(texelFetch(SpritePositions,ivec2(Cubexy.x,si),0).xyz-(wh/2.0),1)
//#define SpriteXyzw(si,wh)	vec4(vec3(2.5,5.0,0)-(wh/2.0),1)
//#define SpriteXyzw(si,wh)	vec4(vec3(0.0,0.0,0),1)

#define WaveXyz(wv)	(WavePositions[wv].xyz*vec3(5,4,0)+vec3(0,4,-6))

//	on death stay still
//#define Nmexyz		(SpriteMat(WaveXyz(NmeIndex))*SpriteXyzw(SpriteIndex,SPRITEDIM)).xyz
//#define NmePos		mix(Nmexyz,HeartPos0,WavePositions[NmeIndex].w*sign(Livesf))

//	on death move to heart
#define Nmexyz		(SpriteMat(Dead?HeartPos0:WaveXyz(NmeIndex))*SpriteXyzw(SpriteIndex,SPRITEDIM)).xyz
#define NmePos		mix(Nmexyz,HeartPos0,WavePositions[NmeIndex].w)


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
#define CharRow				(Sloti-(ActorCount+2))
#define Sloti				int(Cubexy.y)
#define Slot_IsActor		(Sloti<ActorCount)
#define Slot_IsProjectile	(Sloti==ProjectileRow)
#define Slot_IsHeart		(Sloti==ActorCount+1)
#define Slot_IsChar			(CharRow>=0&&CharRow<=1)
#define Slot_IsFloor		(FragIndex==DATALAST)
#define Projectilei			int(Cubexy.x)
#define FetchProjectile(t,p)	texelFetch(t,ivec2(p,ProjectileRow),0)

//	type changes, so is velocity w
#define Type			Vel4.w
#define Typei			int(Type)
#define Type_IsStatic	(Typei<=STATIC)
#define Type_IsNull		(Typei==NULL)
#define Type_IsDebris	(Typei==DEBRIS||Typei==DEBRISHEART||Typei==DEBRISBLOOD)
#define Type_IsDebrisHeart	(Typei==DEBRISHEART)
#define Type_IsDebrisBlood	(Typei==DEBRISBLOOD)
#define Type_IsSprite	(Typei>=SPRITE0)
//#define SpriteIndex		((abs(Typei)-SPRITE0)%SPRITECOUNT)
#define SpriteIndex		(Typei>0?0 : abs(Typei)-SPRITE0 )

#define PPerChar		20
#define CharBuffer		(STRINGCOUNT*16)
#define Chari			(int(Cubexy.x)+(CharRow*DATAWIDTH))
//#define CharI			(FragIndex-(DATALAST-PPerChar*CharBuffer))
#define CharP			(Chari%PPerChar)
#define CharN			int(Chari/PPerChar)

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

#define HeartPos(sxyz)	(CameraToWorld * SpriteMat(vec3(0,-0.5,2.4)) * sxyz ).xyz
#define HeartPos0		HeartPos(vec4(0,0,0,1))
#define HeartXyz		HeartPos(SpriteXyzw(SPRITEHEART,CHARDIM))

uniform vec3 Heart;
#define HeartCooldown	int(Heart.y)
#define Livesf			max(0.0,Heart.x)
#define Dead			(Livesf<1.0)
#define FirstFrame		(Heart.z<=0.0)

uniform mat4 CameraToWorld;

#define RAND1			(Pos4.w)
#define UP				vec3(0,1,0)
#define INITIAL_POS_RANDOMNESS	0.002
`;

export const Vert =
`//	quad crammed into vec4s
#define u4 vec4(0,1,1,0)
#define v4 vec4(0,0,1,1)
out vec2 uv;
void main()
{
	#define CASE(x) case x:uv=vec2(u4[x],v4[x]);break;
	switch(gl_VertexID)
	{
	CASE(0)
	CASE(1)
	CASE(2)
	CASE(3)
	}
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
		xyz = (SpriteMat(xyz)*SpriteXyzw(SpriteIndex,SPRITEDIM)).xyz;
		if ( !Type_IsStatic )
			xyz = NmePos;	//	if is actor
		if ( Slot_IsProjectile )
			xyz = vec3(0,-10,0);
		if ( Slot_IsHeart )
			xyz = HeartXyz;
		if ( Slot_IsChar )
			xyz = CharXyz;
		//xyz = mix(xyz,NmePos.xyz, 1.0-INITIAL_POS_RANDOMNESS);
	}
	else
	{
		xyz += Vel4.xyz * TIMESTEP;
	
		//	stick to floor
		xyz.y = max( xyz.y, float(FLOORY) );
	}

//	char disapearing fix. not sure why
  if ( Slot_IsChar ) xyz = CharXyz;

	//	new projectile data
	if ( Slot_IsProjectile && ProjectilePos[Projectilei].w > 0.0 )
		xyz = ProjectilePos[Projectilei].xyz;

	Colour.xyz = xyz;
}
`;


