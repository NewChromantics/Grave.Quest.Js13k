export const NmeMeta =
`
#define Range(mn,mx,v)		((v-mn)/(mx-mn))
#define Range01(mn,mx,v)	clamp(Range(mn,mx,v),0.0,1.1)
#define Lerp(mn,mx,v)	( mn + ((mx-mn)*v) )
#define ENTROPY_MIN4	vec4(ENTROPY_MIN,ENTROPY_MIN,ENTROPY_MIN,0)
#define ENTROPY_MAX4	vec4(ENTROPY_MAX,ENTROPY_MAX,ENTROPY_MAX,1)
#define dataFetch(t)	Lerp( ENTROPY_MIN4, ENTROPY_MAX4, texelFetch(t,ivec2(Cubexy),0) )
#define dataWrite(v)	Range( ENTROPY_MIN4.xyz,ENTROPY_MAX4.xyz,v)

#define SpriteMat(t)		mat4(CUBESIZE,oooo,CUBESIZE,oooo,CUBESIZE,0,t,1)

#define HCZ3	vec3(CUBESIZE*0.5)

uniform vec4 WavePositions[WAVEPOSITIONCOUNT];

#define SPRITEDIM	vec3(SPRITEW,0,0)
#define CHARDIM		vec3(CHARW,CHARH,0)

//	sprite local pos centered
#define SpriteXyzw(si,wh)	vec4(texelFetch(SpritePositions,ivec2(Cubexy.x,si),0).xyz-(wh/2.0),1)

#define WaveXyz(wv)	(WavePositions[wv].xyz*vec3(5,4,0)+vec3(0,4,-10))

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
#ifndef Cubexy
#define Cubexy			gl_FragCoord
#endif
#define					FragIndex	(int(Cubexy.x) + (int(Cubexy.y)*DATAWIDTH))

#define						ActorCount	MAX_ACTORS
#define ProjectileRow		(ActorCount+0)				//100
#define HeartRow			(ActorCount+1)				//101
#define CharRow				(Sloti-(ActorCount+2))		//102 103
#define WeaponRow			(ActorCount+5)			//	104
#define Sloti				int(Cubexy.y)
#define Slot_IsActor		(Sloti<ActorCount)
#define Slot_IsProjectile	(Sloti==ProjectileRow)
#define Slot_IsHeart		(Sloti==HeartRow)
#define Slot_IsChar			(CharRow>=0&&CharRow<=1)
#define Slot_IsFloor		(FragIndex==DATALAST)
#define Projectilei			int(Cubexy.x)
#define FetchProjectile(t,p)	texelFetch(t,ivec2(p,ProjectileRow),0)
#define Slot_IsWeapon		(Sloti==WeaponRow )//&& Weaponi < MAX_WEAPONS)
#define Weaponi				int(Cubexy.x)

//	type changes, so is velocity w
#define Type			Vel4.w
#define Typei			int(Type)
#define Type_IsStatic	(Typei<=STATIC)
#define Type_IsNull		(Typei==NULL)
#define Type_IsDebris	(Typei==DEBRIS||Typei==DEBRISHEART||Typei==DEBRISBLOOD)
#define Type_IsDebrisHeart	(Typei==DEBRISHEART)
#define Type_IsDebrisBlood	(Typei==DEBRISBLOOD)
#define Type_IsSprite	(Typei>=SPRITE0)
#define Type_IsAsleep	(Typei<0)
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
#define CharOrigin		vec3(-float(CharLineW)*0.5*0.4,1,-8)
#define CharKern		vec3(0.45,-0.4,1)
#define CharPos(n)		CharOrigin+vec3(n%CharLineW,int(n/CharLineW),0)*CharKern

#define Charxyz(n,s)	(CameraToWorld * SpriteMat(CharPos(n)) * texelFetch( SpritePositions, ivec2(CharP,s), 0 )).xyz
#define CharS			int(String[CharN/16][CharN%16/4][CharN%4])
#define CharXyz			(Charxyz(CharN,CharS))
#define Charw			int(texelFetch( SpritePositions, ivec2(CharP,CharS), 0 ).w)
#define CharNull		(Charw==0)

#define HeartPos(sxyz)	(CameraToWorld * SpriteMat(vec3(0,-0.6,-1.5)) * sxyz ).xyz
#define HeartPos0		HeartPos(vec4(ooo1))
#define HeartXyz		HeartPos(SpriteXyzw(SPRITEHEART,CHARDIM))

uniform vec3 Heart;
#define HeartCooldown	int(Heart.y)
#define Livesf			max(0.0,Heart.x)
#define Dead			(Livesf<1.0)
#define FirstFrame		(Heart.z<=0.0)

uniform mat4 CameraToWorld;

uniform vec4 ProjectileVel[MAX_PROJECTILES];
uniform vec4 ProjectilePos[MAX_PROJECTILES];
uniform mat4 WeaponPoses[MAX_WEAPONS];
uniform vec4	Random4;
uniform sampler2D OldVelocitys;
uniform sampler2D NewVelocitys;
uniform sampler2D OldPositions;
uniform sampler2D NewPositions;
uniform sampler2D SpritePositions;

#define RAND1			(Pos4.w)
#define UP				vec3(0,1,0)
`;

export const Vert =
`
out vec2 uv;
void main()
{
#define c(n,u,v)	case n:uv=vec2(u,v);break;
	switch(gl_VertexID)
	{
c(0,0,0)
c(1,1,0)
c(2,1,1)
c(3,0,1)
	}
	gl_Position=vec4(uv*2.0-1.0,0,1);
}
`;

export const Frag =
`out vec4 xyzw;
in vec2 uv;

${NmeMeta}

#define xyz	xyzw.xyz
void main()
{
	vec4 Vel4 = dataFetch(OldVelocitys);
	xyzw = dataFetch(OldPositions);
	
	if ( FirstFrame )
	{
		xyz = (SpriteMat(xyz)*SpriteXyzw(SpriteIndex,SPRITEDIM)).xyz;
		if ( !Type_IsStatic )
			xyz = NmePos;	//	if is actor
		if ( Slot_IsHeart )
			xyz = HeartXyz;
		if ( Slot_IsChar )
			xyz = CharXyz;
	}
	else
	{
		xyz += Vel4.xyz * TIMESTEP;
	}

	//	new projectile data
	if ( Slot_IsProjectile && ProjectilePos[Projectilei].w > 0.0 )
		xyz = ProjectilePos[Projectilei].xyz;

	//	stick to floor
	xyz.y = max( xyz.y, float(FLOORY) );
	xyz = dataWrite(xyz);
}
`;


