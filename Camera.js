function Subtract3(a,b)
{
	return a.map( (v,i) => v-b[i] );
}

function Inc3(Vec,Delta)
{
	[0,1,2].map(i=>Vec[i]+=Delta[i]);
}

function Normalise3(a,NewLength=1)
{
	let Length = Math.hypot( ...a );
	return a.map( x => x/Length*NewLength );
}

function Cross3(a0,a1,a2,b0,b1,b2)
{
	return [
		a1 * b2 - a2 * b1,
		a2 * b0 - a0 * b2,
		a0 * b1 - a1 * b0
		];
}

const DegToRad = Math.PI / 180;
const RadToDeg = 1/DegToRad;
const Near = 0.01;
const Far = 10000;
const FovV = 45;
const Up = [0,1,0];

export default class Camera
{
	constructor()
	{
		this.Position = [ 0,2,20 ];
		this.LookAt = [ 0,0,0 ];
	}
		
	//GetProjectionMatrix(ViewRect)
	GetProjectionMatrix(Viewport)
	{
		let ViewRect = [0,0,Viewport[2]/Viewport[3],1];
			
		//	overriding user-provided matrix
		if ( this.ProjectionMatrix )
			return this.ProjectionMatrix;
		
		const Aspect = ViewRect[2] / ViewRect[3];
		let fy = 1.0 / Math.tan( DegToRad*FovV / 2);
		let fx = fy / Aspect;
		
		let Depth = (-Near-Far) / (Near-Far);
		let DepthTrans = (2*Far*Near) / (Near-Far);
		let s=0,cx=0,cy=0;
		return [
			fx,s,cx,0,
			0,fy,cy,0,
			0,0,Depth,1,
			0,0,DepthTrans,0
		];
	}
	
	get LocalRotation4x4()
	{
		if ( this.Rotation4x4 )
			return this.Rotation4x4;
		
		const Matrix = this.GetProjectionMatrix([0,0,1,1]);
		//	gr [10] AND [11] are always negative?
		//	we should be able to do the math and work out the z multiplication
		const ZForwardIsNegative = Matrix[11] < 0;
		let eye = ZForwardIsNegative ? this.LookAt : this.Position;
		let center = ZForwardIsNegative ? this.Position : this.LookAt;
		//	CreateLookAtRotationMatrix(eye,up,center)
		let z = Normalise3( Subtract3( center, eye ) );
		let x = Normalise3( Cross3( ...Up, ...z ) );
		let y = Normalise3( Cross3( ...z,...x ) );
		return [
			x[0],	y[0],	z[0],	0,
			x[1],	y[1],	z[1],	0,
			x[2],	y[2],	z[2],	0,
			0,	0,	0,	1,
		];
	}

	get WorldToLocal()
	{
		//	to move from world space to camera space, we should take away the camera origin
		//	so this should always be -pos
		let Trans = this.Position.map( x=>-x );
		let Translation = new DOMMatrix().translate(...Trans);
		let WorldToCamera = new DOMMatrix(this.LocalRotation4x4).multiply(Translation);
		return WorldToCamera;
	}
	
	get LocalToWorld()
	{
		return this.WorldToLocal.inverse();
	}
	
	GetWorldTransform(LocalOffset)
	{
		return this.LocalToWorld.translate(...LocalOffset);
	}
	
	//	get forward vector in world space
	GetForward(Normalised=1)
	{
		let LookAt = this.LookAt;

		//	external transform, so need to calc the real lookat
		if ( this.Rotation4x4 )
		{
			//let LookAtTrans = this.GetWorldTransform([0,0,-1]);
			//	gr: why is this backwards...
			LookAt = this.LocalToWorld.transformPoint(new DOMPoint(0,0,-1));
		}
			
		let z = Subtract3( LookAt, this.Position );
		return Normalised ? Normalise3( z, Normalised ) : z;
	}
		
	MovePositionAndLookAt(Delta)
	{
		Inc3(this.Position,Delta);
		Inc3(this.LookAt,Delta);
	}
	
	
	GetLookAtRotation()
	{
		//	forward instead of backward
		let Dir = this.GetForward(false);
		let Distance = Math.hypot( ...Dir );
		Dir = Normalise3( Dir );
		
		let Yaw = RadToDeg * Math.atan2( Dir[0], Dir[2] );
		let Pitch = RadToDeg * Math.asin(-Dir[1]);
		return [Pitch,Yaw,0,Distance];
	}
	
	SetLookAtRotation(p,y,r,d)
	{
		p *= DegToRad;
		let cp = Math.cos(p);
		y *= DegToRad;
		let Delta =
		[
			Math.sin(y) * cp,
			-Math.sin(p),
			Math.cos(y) * cp
		];
		this.LookAt = this.Position.map( (p,i)=> p + Delta[i] * d );
	}
	
	OnCameraFirstPersonRotate(x,y,z,FirstClick)
	{
		let yrp = [y,x,z];
		
		if ( FirstClick || !this.LastyFpsPos )
		{
			this.StartPyrd = this.GetLookAtRotation();
			this.LastyFpsPos = yrp;
		}
		
		let Delta = this.LastyFpsPos.map( (x,i) => (x-yrp[i])*0.1 );
		Delta[3]=0;
		let pyrd = this.StartPyrd.map( (x,i) => x + Delta[i] );
		this.SetLookAtRotation( ...pyrd );
	}
}
