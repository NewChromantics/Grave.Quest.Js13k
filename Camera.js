export function Subtract3(a,b)
{
	return [ a[0]-b[0], a[1]-b[1], a[2]-b[2] ];
}


export function Length3(a)
{
	let dx = a[0];
	let dy = a[1];
	let dz = a[2];
	let LengthSq = dx*dx + dy*dy + dz*dz;
	let Len = Math.sqrt( LengthSq );
	return Len;
}
export function Normalise3(a,NormalLength=1)
{
	let Length = Length3( a );
	Length *= 1 / NormalLength;
	return [ a[0]/Length, a[1]/Length, a[2]/Length ];
}
export function Cross3(a0,a1,a2,b0,b1,b2)
{
	let x = a1 * b2 - a2 * b1;
	let y = a2 * b0 - a0 * b2;
	let z = a0 * b1 - a1 * b0;
	return [x,y,z];
}

export function DegToRad(Degrees)
{
	return Degrees * (Math.PI / 180);
}

export function RadToDeg(Radians)
{
	return Radians * (180 / Math.PI);
}

export function MatrixInverse4x4(Matrix)
{
	let mat = new DOMMatrix(Matrix);
	mat.invertSelf();
	return Array.from(mat.toFloat32Array());
}

export function CreateLookAtRotationMatrix(eye,up,center)
{
	let z = Subtract3( center, eye );
	z = Normalise3( z );
	
	let x = Cross3( ...up, ...z );
	x = Normalise3( x );
	
	let y = Cross3( ...z,...x );
	y = Normalise3( y );
	
	let tx = 0;
	let ty = 0;
	let tz = 0;
	
	let out =
	[
	 x[0],	y[0],	z[0],	0,
	 x[1],	y[1],	z[1],	0,
	 x[2],	y[2],	z[2],	0,
	 tx,	ty,	tz,	1,
	 ];
	
	return out;
}

export function CreateTranslationMatrix(x,y,z,w=1)
{
	return [ 1,0,0,0,	0,1,0,0,	0,0,1,0,	x,y,z,w	];
}

export function GetMatrixTranslation(Matrix)
{
	//	do we need to /w here?
	let xyz = Matrix.slice(12,12+3);
	let w = Matrix[15];
	xyz[0] /= w;
	xyz[1] /= w;
	xyz[2] /= w;
	return xyz;
}
export function SetMatrixTranslation(Matrix,x,y,z,w=1)
{
	Matrix[12] = x;
	Matrix[13] = y;
	Matrix[14] = z;
	Matrix[15] = w;
}

//	multiply position by matrix
export function TransformPosition(Position,Transform)
{
	const PosMatrix = CreateTranslationMatrix(...Position);
	const TransMatrix = MatrixMultiply4x4(Transform,PosMatrix);
	const TransPos = GetMatrixTranslation(TransMatrix);
	return TransPos;
}


//	apply A, then B. So A is child, B is parent
//	gr: but that doesn't seem to be riht
export function MatrixMultiply4x4(a,b)
{
	a = new DOMMatrix(a);
	b = new DOMMatrix(b);
	let mat = a.multiply(b);
	return Array.from(mat.toFloat32Array());
}



export class Camera
{
	constructor()
	{
		this.FovVertical = 45;
		this.ZForwardIsNegative = false;

		this.Up = [0,1,0];
		this.Position = [ 0,2,20 ];
		this.LookAt = [ 0,0,0 ];
		this.Rotation4x4 = undefined;		//	override rotation
		this.ProjectionMatrix = undefined;	//	override projection matrix
		
		this.NearDistance = 0.01;
		this.FarDistance = 1000;

		//	gr: to be clear, this is an offset from the center
		//		which will usually be middle of the viewrect of the projection matrix
		//		so we just add this on.
		//		maybe this shouldn't be here any more and provided with the viewrect
		this.FocalCenterOffset = [0,0];
		this.FocalCenter = false;	//	old api, null to catch anyone setting it
	}
	
	
	GetOpenglFocalLengths(ViewRect)
	{
		if ( this.FocalCenter !== false )
			throw `Something is changing the .FocalCenter which is old API`;

		const Aspect = ViewRect[2] / ViewRect[3];
		const FovVertical = this.FovVertical;
		//const FovHorizontal = FovVertical * Aspect;
		
		const OpenglFocal = {};
		OpenglFocal.fy = 1.0 / Math.tan( DegToRad(FovVertical) / 2);
		//OpenglFocal.fx = 1.0 / Math.tan( DegToRad(FovHorizontal) / 2);
		OpenglFocal.fx = OpenglFocal.fy / Aspect;
		OpenglFocal.cx = this.FocalCenterOffset[0];
		OpenglFocal.cy = this.FocalCenterOffset[1];
		OpenglFocal.s = 0;
		return OpenglFocal;
	}
	
	
	//	GetOpencvProjectionMatrix but 4x4 with z correction for near/far
	//	rename to CameraToScreen/View
	GetProjectionMatrix(ViewRect)
	{
		//	overriding user-provided matrix
		if ( this.ProjectionMatrix )
			return this.ProjectionMatrix;
		
		const OpenglFocal = this.GetOpenglFocalLengths( ViewRect );
		
		const Far = this.FarDistance;
		const Near = this.NearDistance;
		
		let Matrix = [];
		Matrix[0] = OpenglFocal.fx;
		Matrix[1] = OpenglFocal.s;
		Matrix[2] = OpenglFocal.cx;
		Matrix[3] = 0;
		
		Matrix[4] = 0;
		Matrix[5] = OpenglFocal.fy;
		Matrix[6] = OpenglFocal.cy;
		Matrix[7] = 0;
		
		//	near...far in opengl needs to resovle to -1...1
		//	gr: glDepthRange suggests programmable opengl pipeline is 0...1
		//		not sure about this, but matrix has changed below so 1 is forward on z
		//		which means we can now match the opencv pose (roll is wrong though!)
		//	http://ogldev.atspace.co.uk/www/tutorial12/tutorial12.html
		Matrix[8] = 0;
		Matrix[9] = 0;
		//	gr: this should now work in both ways, but one of them is mirrored.
		//		false SHOULD match old engine style... but is directx
		if ( this.ZForwardIsNegative )
		{
			//	opengl
			Matrix[10] = -(-Near-Far) / (Near-Far);
			Matrix[11] = -1;
		}
		else
		{
			//	directx (also, our old setup!)
			Matrix[10] = (-Near-Far) / (Near-Far);
			Matrix[11] = 1;
		}
		Matrix[12] = 0;
		Matrix[13] = 0;
		Matrix[14] = (2*Far*Near) / (Near-Far);
		Matrix[15] = 0;
		
		return Matrix;
	}
	
	
	SetLocalRotationMatrix(Rotation4x4)
	{
		if ( Rotation4x4.length != 4*4 )
			throw "SetLocalRotationMatrix() matrix is not 4x4: " + JSON.stringify(Rotation4x4);
		
		this.Rotation4x4 = Rotation4x4.slice();
	}
	
	IsProjectionForwardNegativeZ()
	{
		const Matrix = this.GetProjectionMatrix([0,0,1,1]);
		//	gr [10] AND [11] are always negative?
		//	we should be able to do the math and work out the z multiplication
		const ZForwardIsNegative = Matrix[11] < 0;
		return ZForwardIsNegative;
	}
	
	GetLocalRotationMatrix()
	{
		if ( this.Rotation4x4 )
			return this.Rotation4x4;
		
		//	allow user to override here with a rotation matrix
		const Up = this.GetUp();
		
		//	gr: this cant be right!?
		const InvertRotationEye = this.IsProjectionForwardNegativeZ();
		if ( InvertRotationEye )
		{
			const Mtx = CreateLookAtRotationMatrix( this.LookAt, Up, this.Position );
			return Mtx;
		}
		const Mtx = CreateLookAtRotationMatrix( this.Position, Up, this.LookAt );
		return Mtx;
	}
	
	

	
	//	camera's modelview transform
	//	gr: this should be renamed WorldToLocal
	GetWorldToCameraMatrix()
	{
		//	https://stackoverflow.com/questions/349050/calculating-a-lookat-matrix
		const Up = this.GetUp();
		
		let Rotation = this.GetLocalRotationMatrix();
		
		//	to move from world space to camera space, we should take away the camera origin
		//	so this should always be -pos
		let Trans = Subtract3( [0,0,0], this.Position );
		let Translation = CreateTranslationMatrix( ...Trans );
		let Matrix = MatrixMultiply4x4( Rotation, Translation );
		//Pop.Debug("GetWorldToCameraMatrix", Matrix.slice(12,16) );
		return Matrix;
	}
	
	GetLocalToWorldMatrix()
	{
		let WorldToCameraMatrix = this.GetWorldToCameraMatrix();
		
		//	gr; this SHOULD be inverse...
		let Matrix = MatrixInverse4x4( WorldToCameraMatrix );
		//let Matrix = LocalToWorld;
		//Pop.Debug("Matrix",Matrix);
		
		return Matrix;
	}
		
	GetUp()
	{
		return this.Up.slice();
	}
	
	//	get forward vector in world space
	GetForward(Normalised=true)
	{
		let LookAt = this.LookAt;

		//	external transform, so need to calc the real lookat
		if ( this.Rotation4x4 )
		{
			let LocalToWorld = this.GetLocalToWorldMatrix();
			//	gr: why is this backwards...
			let LocalPos = [0,0,-1];
			LookAt = TransformPosition( LocalPos,LocalToWorld  );
		}
			
		let z = Subtract3( LookAt, this.Position );
		if ( Normalised )
			z = Normalise3( z );
		return z;
	}
		
	MoveCameraAndLookAt(Delta)
	{
		this.Position[0] += Delta[0];
		this.Position[1] += Delta[1];
		this.Position[2] += Delta[2];
		this.LookAt[0] += Delta[0];
		this.LookAt[1] += Delta[1];
		this.LookAt[2] += Delta[2];
	}
	
	
	//	opposite of GetOrbit
	GetLookAtRotation()
	{
		//	forward instead of backward
		let Dir = this.GetForward(false);
		let Distance = Length3( Dir );
		//Pop.Debug("Distance = ",Distance,Dir);
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
		let Yawr = DegToRad(Yaw);
		let Deltax = Math.sin(Yawr) * Math.cos(Pitchr);
		let Deltay = -Math.sin(Pitchr);
		let Deltaz = Math.cos(Yawr) * Math.cos(Pitchr);
		Deltax *= Distance;
		Deltay *= Distance;
		Deltaz *= Distance;
		this.LookAt[0] = this.Position[0] + Deltax;
		this.LookAt[1] = this.Position[1] + Deltay;
		this.LookAt[2] = this.Position[2] + Deltaz;
	}
	
	//	better name! like... RotateLookAt
	OnCameraFirstPersonRotate(x,y,z,FirstClick)
	{
		//	remap input from xy to yaw, pitch
		let yxz = [y,x,z];
		x = yxz[0];
		y = yxz[1];
		z = yxz[2];
		
		if ( FirstClick || !this.Last_FirstPersonPos )
		{
			this.Start_FirstPersonPyrd = this.GetLookAtRotation();
			//Pop.Debug("this.Start_OrbitPyrd",this.Start_OrbitPyrd);
			this.Last_FirstPersonPos = [x,y,z];
		}
		
		let Deltax = this.Last_FirstPersonPos[0] - x;
		let Deltay = this.Last_FirstPersonPos[1] - y;
		let Deltaz = this.Last_FirstPersonPos[2] - z;
		
		Deltax *= 0.1;
		Deltay *= 0.1;
		Deltaz *= 0.1;
		
		let NewPitch = this.Start_FirstPersonPyrd[0] + Deltax;
		let NewYaw = this.Start_FirstPersonPyrd[1] + Deltay;
		let NewRoll = this.Start_FirstPersonPyrd[2] + Deltaz;
		let NewDistance = this.Start_FirstPersonPyrd[3];
		
		this.SetLookAtRotation( NewPitch, NewYaw, NewRoll, NewDistance );
	}
}

export default Camera;
