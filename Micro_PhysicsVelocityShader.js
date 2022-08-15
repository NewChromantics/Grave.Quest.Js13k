export {Vert} from './Micro_PhysicsPositionShader.js'

export const Frag =
`#version 300 es
precision highp float;
out vec4 Colour;
in vec2 uv;
uniform sampler2D OldVelocitys;
uniform sampler2D OldPositions;
uniform vec4 ProjectileVel;
uniform vec4 ProjectilePos;

#define FragIndex	(int(gl_FragCoord.x) + (int(gl_FragCoord.y)*128))

const float AirDrag = 0.04;
const float FloorDragMin = 0.1;	//	less = more bounce
const float FloorDragMax = 0.3;	//	less = more bounce
const float GravityY = -16.0;

const float Timestep = 1.0/60.0;
float FloorY = -20.0;
#define Rand	xyz.w
#define FloorDrag	mix(FloorDragMin,FloorDragMax,Rand)

void main()
{
	vec4 Vel4 = texture(OldVelocitys, uv);
	vec3 Vel = Vel4.xyz;
	vec4 xyz = texture(OldPositions, uv);

	//	new projectile data
	if ( FragIndex == 0 && ProjectileVel.w > 0.0 )
	{
		Vel = ProjectileVel.xyz;
		xyz = ProjectilePos;
	}

	Vel *= 1.0 - AirDrag;
	vec3 Force = vec3(0);
	Force.y = GravityY;

	if ( xyz.y <= FloorY )
	{
		float BounceDrag = 0.91;//	try and make sure we always lose energy
		vec3 Bounce = reflect( Vel*BounceDrag, vec3(0,1,0) );
		Bounce *= 1.0/Timestep;
		Bounce *= 1.0 - FloorDrag;
		Force += Bounce;
		Vel = vec3(0);
	}
	Vel = Vel + Force*Timestep;

	Colour = vec4(Vel,Vel4.w);
}
`;
