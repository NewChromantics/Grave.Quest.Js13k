function Subtract3(a,b)
{
	return a.map( (v,i) => v-b[i] );
}

function Inc3(Vec,Delta)
{
	[0,1,2].map(i=>Vec[i]+=Delta[i]);
}

function Length3(x,y,z)
{
	return Math.sqrt(x*x+y*y+z*z);
}

function Normalise3(a,NewLength=1)
{
	let Length = Length3( ...a );
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

function DegToRad(Deg)
{
	return Deg * (Math.PI / 180);
}

function RadToDeg(Rad)
{
	return Rad * (180 / Math.PI);
}


function GetMatrixTranslation(Matrix)
{
	let xyz = Matrix.slice(12,12+3);
	let w = Matrix[15];
	return xyz.map( v => v/w );
}

function SetMatrixTranslation(Matrix,x,y,z,w=1)
{
	Matrix[12] = x;
	Matrix[13] = y;
	Matrix[14] = z;
	Matrix[15] = w;
}


function MatrixMultiply4x4(a,b)
{
	a = new DOMMatrix(a);
	b = new DOMMatrix(b);
	let mat = a.multiply(b);
	return Array.from(mat.toFloat32Array());
}



export default class Camera
{
	constructor()
	{
		this.FovVertical = 45;

		this.Up = [0,1,0];
		this.Position = [ 0,2,20 ];
		this.LookAt = [ 0,0,0 ];
		this.Rotation4x4 = undefined;		//	override rotation
		this.ProjectionMatrix = undefined;	//	override projection matrix
		
		this.NearDistance = 0.01;
		this.FarDistance = 10000;
	}
	
		
	//	GetOpencvProjectionMatrix but 4x4 with z correction for near/far
	//	rename to CameraToScreen/View
	GetProjectionMatrix(ViewRect)
	{
		//	overriding user-provided matrix
		if ( this.ProjectionMatrix )
			return this.ProjectionMatrix;
		
		const Aspect = ViewRect[2] / ViewRect[3];
		let fy = 1.0 / Math.tan( DegToRad(this.FovVertical) / 2);
		let fx = fy / Aspect;
		
		let Far = this.FarDistance;
		let Near = this.NearDistance;
		let Depth = (-Near-Far) / (Near-Far);
		let DepthTrans = (2*Far*Near) / (Near-Far);
		let s=0,cx=0,cy=0;
		let Matrix =
		[
			fx,s,cx,0,
			0,fy,cy,0,
			0,0,Depth,1,
			0,0,DepthTrans,0
		];
		return Matrix;
	}
	
	GetLocalRotationMatrix()
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
		let x = Normalise3( Cross3( ...this.Up, ...z ) );
		let y = Normalise3( Cross3( ...z,...x ) );
		return [
			x[0],	y[0],	z[0],	0,
			x[1],	y[1],	z[1],	0,
			x[2],	y[2],	z[2],	0,
			0,	0,	0,	1,
		];
	}

	
	GetWorldToLocalMatrix()
	{
		let Rotation = this.GetLocalRotationMatrix();
		
		//	to move from world space to camera space, we should take away the camera origin
		//	so this should always be -pos
		let Trans = this.Position.map( x=>-x );
		let Translation = new DOMMatrix().translate(...Trans);
		let WorldToCamera = new DOMMatrix(Rotation).multiply(Translation);
		return WorldToCamera.toFloat32Array();
	}
	
	GetLocalToWorldMatrix()
	{
		let WorldToCameraMatrix = new DOMMatrix(this.GetWorldToLocalMatrix());
		return WorldToCameraMatrix.inverse();
	}
	
	GetWorldTransform(LocalOffset)
	{
		let LocalToWorld = this.GetLocalToWorldMatrix();
		let Trans = LocalToWorld.translate(...LocalOffset);
		return Trans;
	}
	
	//	get forward vector in world space
	GetForward(Normalised=1)
	{
		let LookAt = this.LookAt;

		//	external transform, so need to calc the real lookat
		if ( this.Rotation4x4 )
		{
			//let LookAtTrans = this.GetWorldTransform([0,0,-1]);
			let LocalToWorld = this.GetLocalToWorldMatrix();
			//	gr: why is this backwards...
			LookAt = new DOMMatrix(LocalToWorld).transformPoint(new DOMPoint(0,0,-1));
		}
			
		let z = Subtract3( LookAt, this.Position );
		return Normalised ? Normalise3( z, Normalised ) : z;
	}
		
	MovePositionAndLookAt(Delta)
	{
		Inc3(this.Position,Delta);
		Inc3(this.LookAt,Delta);
	}
	
	
	//	opposite of GetOrbit
	GetLookAtRotation()
	{
		//	forward instead of backward
		let Dir = this.GetForward(false);
		let Distance = Length3( ...Dir );
		Dir = Normalise3( Dir );
		
		let Yaw = RadToDeg( Math.atan2( Dir[0], Dir[2] ) );
		let Pitch = RadToDeg( Math.asin(-Dir[1]) );
		let Roll = 0;
		
		return [Pitch,Yaw,Roll,Distance];
	}
	
	//	opposite of SetOrbit
	SetLookAtRotation(Pitch,Yaw,Roll,Distance)
	{
		let Pitchr = DegToRad(Pitch);
		let CosPitch = Math.cos(Pitchr);
		let Yawr = DegToRad(Yaw);
		let Delta =
		[
			Math.sin(Yawr) * CosPitch,
			-Math.sin(Pitchr),
			Math.cos(Yawr) * CosPitch
		];
		this.LookAt = this.Position.map( (p,i)=> p + Delta[i] * Distance );
	}
	
	//	better name! like... RotateLookAt
	OnCameraFirstPersonRotate(x,y,z,FirstClick)
	{
		//	remap input from xy to yaw, pitch
		let xyz = [y,x,z];
		
		if ( FirstClick || !this.Last_FirstPersonPos )
		{
			this.Start_FirstPersonPyrd = this.GetLookAtRotation();
			//Pop.Debug("this.Start_OrbitPyrd",this.Start_OrbitPyrd);
			this.Last_FirstPersonPos = xyz;
		}
		
		let Scale = 0.1;
		let Delta = this.Last_FirstPersonPos.map( (x,i) => (x-xyz[i])*Scale );
		Delta[3]=0;
		let pyrd = this.Start_FirstPersonPyrd.map( (x,i) => x + Delta[i] );
		this.SetLookAtRotation( ...pyrd );
	}
}
