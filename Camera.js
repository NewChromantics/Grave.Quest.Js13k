import * as PopMath from './Math.js'

//	this generates a pos & rot matrix already multiplied together
//	would be nice to seperate to be more readable
function CreateLookAtMatrix(eye,up,center)
{
	let z = PopMath.Subtract3( eye, center );
	z = PopMath.Normalise3( z );
	
	let x = PopMath.Cross3( up, z );
	x = PopMath.Normalise3( x );
	
	let y = PopMath.Cross3( z,x );
	y = PopMath.Normalise3( y );
	
	//	this is the result when multiplying rot*trans matrix
	//	(dot prod)
	let tx = -(x[0] * eye[0] + x[1] * eye[1] + x[2] * eye[2]);
	let ty = -(y[0] * eye[0] + y[1] * eye[1] + y[2] * eye[2]);
	let tz = -(z[0] * eye[0] + z[1] * eye[1] + z[2] * eye[2]);
	
	let out =
	[
	 x[0],	y[0],	z[0],	0,
	 x[1],	y[1],	z[1],	0,
	 x[2],	y[2],	z[2],	0,
	 tx,	ty,	tz,	1,
	 ];
	
	return out;
}


export class Camera
{
	constructor(CopyCamera)
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

		if ( CopyCamera instanceof Camera )
		{
			this.FovVertical = CopyCamera.FovVertical;
			this.Position = CopyCamera.Position.slice();
			this.LookAt = CopyCamera.LookAt.slice();
			this.NearDistance = CopyCamera.NearDistance;
			this.FarDistance = CopyCamera.FarDistance;
			this.Rotation4x4 = CopyCamera.Rotation4x4;
		}
	}
	
	
	FieldOfViewToFocalLengths(FovHorz,FovVert)
	{
		let fx = 363.30 * 2;
		let s = 0;
		let fy = 364.19 * 2;
		let cx = 400;
		let cy = 400;
		
		//	lengths should be in pixels?
		let Width = 1;
		let Height = 1;
		let FocalLengthHorz = Width / Math.tan( PopMath.radians(FovHorz) / 2);
		let FocalLengthVert = Height / Math.tan( PopMath.radians(FovVert) / 2);
		Pop.Debug('FocalLengthVert',FocalLengthVert,'FocalLengthHorz',FocalLengthHorz);
		//^^^ FocalLengthHorz=1.816739344621
		
		//	needs to convert to -1...1?
		//	or 0..1
		//	https://strawlab.org/2011/11/05/augmented-reality-with-OpenGL
		let ImW = 800;
		let ImH = 800;
		let x0 = 0;	//	image center in...opengl?
		let y0 = 0;	//	image center in...opengl?
		FocalLengthHorz = 2 * fx / ImW;	//	2*K00/width
		let GL_s = -2 * s /ImW;			//	-2*K01/width
		let LensCenterX = (ImW - 2 * cx + 2 * x0)/ImW;	//	(width - 2*K02 + 2*x0)/width
		//	0
		let Flip = 1;	//	-1 to flip
		FocalLengthVert = (Flip*2) * fy / ImH;	//	-2*K11/height
		let LensCenterY = ((ImH*Flip) - 2 * (Flip*cy) + 2*y0)/ImH;	//	(height - 2*K12 + 2*y0)/height
		Pop.Debug('FocalLengthVert',FocalLengthVert,'FocalLengthHorz',FocalLengthHorz);
		
		let Focal = {};
		Focal.fx = FocalLengthHorz;
		Focal.fy = FocalLengthVert;
		Focal.cx = LensCenterX;
		Focal.cy = LensCenterY;
		return Focal;
	}
	
	FocalLengthsToFieldOfView(fx,fy,cx,cy,ImageWidth,ImageHeight)
	{
		let FovHorizontal = PopMath.RadToDeg( 2 * Math.atan( ImageWidth / (2*fx) ) );
		let FovVertical = PopMath.RadToDeg( 2 * Math.atan( ImageHeight / (2*fy) ) );
		let Fov = {};
		Fov.Horz = FovHorizontal;
		Fov.Vert = FovVertical;
		return Fov;
	}
	
	GetFieldOfView(ViewRect)
	{
		let Fov = {};
		let Aspect = ViewRect[2] / ViewRect[3];
		Fov.Horz = this.FovVertical / Aspect;
		Fov.Vert = this.FovVertical;
		return Fov;
	}
	
	GetPixelFocalLengths(ViewRect)
	{
		/*
		let UseFov = true;
		
		if ( UseFov )
		{
			let Fov = this.GetFieldOfView();
		}
		*/
		let Focal = {};
		//	from calibration on 800x800 image
		Focal.fx = 363.30 * 2;
		Focal.fy = 364.19 * 2;
		Focal.cx = 400;
		Focal.cy = 400;
		Focal.s = 0;
		
		return Focal;
	}
	
	PixelToOpenglFocalLengths(PixelFocals,ImageSize)
	{
		//	https://strawlab.org/2011/11/05/augmented-reality-with-OpenGL
		//	convert pixel focal projection to opengl projection frustum
		let s = 0;
		let ImW = ImageSize[0];
		let ImH = ImageSize[1];
		
		
		let x0 = 0;	//	image center in...opengl?
		let y0 = 0;	//	image center in...opengl?
		let FocalLengthHorz = 2 * PixelFocals.fx / ImW;	//	2*K00/width
		let GL_s = -2 * s /ImW;			//	-2*K01/width
		let LensCenterX = (ImW - 2 * PixelFocals.cx + 2 * x0)/ImW;	//	(width - 2*K02 + 2*x0)/width
		//	0
		let Flip = 1;	//	-1 to flip
		let FocalLengthVert = (Flip*2) * PixelFocals.fy / ImH;	//	-2*K11/height
		let LensCenterY = ((ImH*Flip) - 2 * (Flip*PixelFocals.cy) + 2*y0)/ImH;	//	(height - 2*K12 + 2*y0)/height
		//Pop.Debug('FocalLengthVert',FocalLengthVert,'FocalLengthHorz',FocalLengthHorz);
		
		const OpenglFocal = {};
		OpenglFocal.fx = FocalLengthHorz;
		OpenglFocal.fy = FocalLengthVert;
		OpenglFocal.cx = LensCenterX;
		OpenglFocal.cy = LensCenterY;
		OpenglFocal.s = GL_s;
		
		return OpenglFocal;
	}
	
	GetOpenglFocalLengths(ViewRect)
	{
		if ( this.FocalCenter !== false )
			throw `Something is changing the .FocalCenter which is old API`;

		/*
		if ( this.PixelFocals )
		{
			const Focal = this.PixelToOpenglFocalLengths( this.PixelFocals, this.PixelFocals.ImageSize );
			return Focal;
		}

		const OpenglFocal = {};

		const Width = ViewRect[2];
		const Height = ViewRect[3];
		const Aspect = Width / Height;
		const FovVertical = this.FovVertical;
		//const FovHorizontal = FovVertical * Aspect;
		
		//	width * fov
		//	 was 1/tan
		OpenglFocal.fy = Math.tan( PopMath.radians(FovVertical) / 2) / Width;
		//OpenglFocal.fx = 1.0 / Math.tan( PopMath.radians(FovHorizontal) / 2);
		OpenglFocal.fx = OpenglFocal.fy / Aspect;
		//	gr: half because fx/fy is goes either side... when -1..1
		OpenglFocal.fy *= 2;
		OpenglFocal.fx *= 2;
		
		//	focal center is middle of viewport
		//	gr: 0.5 is making projection clip in corners...
		let Centerxf = 0.0;
		let Centeryf = 0.0;
		OpenglFocal.cx = PopMath.lerp( ViewRect[0], ViewRect[0]+ViewRect[2], Centerxf );
		OpenglFocal.cx += this.FocalCenterOffset[0];
		OpenglFocal.cy = PopMath.lerp( ViewRect[1], ViewRect[1]+ViewRect[3], Centeryf );
		OpenglFocal.cy += this.FocalCenterOffset[1];
		
		OpenglFocal.s = 0;
		
		return OpenglFocal;
	}
	*/

		/*
		const Focal = this.GetPixelFocalLengths();
		//	image size from calibrated focal lengths
		const ImageWidth = 800;
		const ImageHeight = 800;
		const OpenglFocal = this.PixelToOpenglFocalLengths( Focal, [ImageWidth, ImageHeight] );
		*/
		
		const Aspect = ViewRect[2] / ViewRect[3];
		const FovVertical = this.FovVertical;
		//const FovHorizontal = FovVertical * Aspect;
		
		const OpenglFocal = {};
		OpenglFocal.fy = 1.0 / Math.tan( PopMath.radians(FovVertical) / 2);
		//OpenglFocal.fx = 1.0 / Math.tan( PopMath.radians(FovHorizontal) / 2);
		OpenglFocal.fx = OpenglFocal.fy / Aspect;
		OpenglFocal.cx = this.FocalCenterOffset[0];
		OpenglFocal.cy = this.FocalCenterOffset[1];
		OpenglFocal.s = 0;
		return OpenglFocal;
	}
	
	//	world to pixel
	GetOpencvProjectionMatrix(ViewRect)
	{
		//	this is the projection matrix on a rectified/undistorted image
		//	3D to 2D... (seems like its backwards..)
		/*
		 Matrix[0] =
		 |fx  0 cx|
		 |0  fy cy|
		 |0  0   1|
		*/
		
		//	from calibration on 800x800 image
		const Focal = this.GetPixelFocalLengths();
		
		let Matrix =
		[
			Focal.fx, 	Focal.s,	Focal.cx,
		  	0,			Focal.fy,	Focal.cy,
		  	0, 			0, 			1
		];
		/*	test unconvert
		let w = ViewRect[2];
		let h = ViewRect[3];
		
		let Fov = this.FocalLengthsToFieldOfView( fx, fy, cx, cy, w, h );
		//let FovHorizontal = PopMath.RadToDeg( 2 * Math.atan( w / (2*fx) ) );
		//let FovVertical = PopMath.RadToDeg( 2 * Math.atan( h / (2*fy) ) );
		Pop.Debug('opencv camera','FovHorizontal',Fov.Horz,'FovVertical',Fov.Vert);
		
		//let FocalLengthHorz = w / Math.tan( PopMath.radians(FovHorizontal) / 2) / 2;
		//Pop.Debug("fx",fx,"...",FocalLengthHorz);
		*/
		return Matrix;
	}
	
	
	makePerspective( left, right, top, bottom, near, far ) 
	{
		if ( far === undefined ) {

			console.warn( 'THREE.Matrix4: .makePerspective() has been redefined and has a new signature. Please check the docs.' );

		}

		const te = [];
		const x = 2 * near / ( right - left );
		const y = 2 * near / ( top - bottom );

		const a = ( right + left ) / ( right - left );
		const b = ( top + bottom ) / ( top - bottom );
		const c = - ( far + near ) / ( far - near );
		const d = - 2 * far * near / ( far - near );

		te[ 0 ] = x;	te[ 4 ] = 0;	te[ 8 ] = a;	te[ 12 ] = 0;
		te[ 1 ] = 0;	te[ 5 ] = y;	te[ 9 ] = b;	te[ 13 ] = 0;
		te[ 2 ] = 0;	te[ 6 ] = 0;	te[ 10 ] = c;	te[ 14 ] = d;
		te[ 3 ] = 0;	te[ 7 ] = 0;	te[ 11 ] = - 1;	te[ 15 ] = 0;

		return te;
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

	GetScreenToCameraTransform(ViewRect)
	{
		const CameraToScreen = this.GetProjectionMatrix(ViewRect);
		const ScreenToCamera = PopMath.MatrixInverse4x4( CameraToScreen );
		return ScreenToCamera;
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
			const Mtx = PopMath.CreateLookAtRotationMatrix( this.LookAt, Up, this.Position );
			return Mtx;
		}
		const Mtx = PopMath.CreateLookAtRotationMatrix( this.Position, Up, this.LookAt );
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
		let Trans = PopMath.Subtract3( [0,0,0], this.Position );
		let Translation = PopMath.CreateTranslationMatrix( ...Trans );
		let Matrix = PopMath.MatrixMultiply4x4( Rotation, Translation );
		//Pop.Debug("GetWorldToCameraMatrix", Matrix.slice(12,16) );
		return Matrix;
	}
	
	SetLocalToWorldTransform(Transform4x4)
	{
		if ( Transform4x4.length != (4*4) )
			throw `SetLocalToWorldTransform(${Transform4x4}) expecting 16-element array`;
			
		this.Position = PopMath.GetMatrixTranslation(Transform4x4);
		this.Rotation4x4 = Transform4x4.slice();
		PopMath.SetMatrixTranslation( this.Rotation4x4, 0,0,0,1 );
	}
	
	GetLocalToWorldMatrix()
	{
		let WorldToCameraMatrix = this.GetWorldToCameraMatrix();
		
		//	gr; this SHOULD be inverse...
		let Matrix = PopMath.MatrixInverse4x4( WorldToCameraMatrix );
		//let Matrix = LocalToWorld;
		//Pop.Debug("Matrix",Matrix);
		
		return Matrix;
	}
	
	GetWorldToFrustumTransform(ViewRect=[-1,-1,1,1])
	{
		const CameraToFrustum = this.GetProjectionMatrix( ViewRect );
		const WorldToCamera = this.GetWorldToCameraMatrix();
		const WorldToFrustum = PopMath.MatrixMultiply4x4( CameraToFrustum, WorldToCamera );
		return WorldToFrustum;
	}
	
	//	this gets a transform, which when applied to a cube of -1..1,-1..1,-1..1
	//	will skew the cube into a representation of the view frustum in world space
	GetLocalToWorldFrustumTransformMatrix(ViewRect=[-1,-1,1,1])
	{
		//	todo: correct viewrect with aspect ratio of viewport
		//		maybe change input to Viewport to match GetProjection matrix?
		let CameraToScreen = this.GetProjectionMatrix( ViewRect );
		let ScreenToCamera = PopMath.MatrixInverse4x4( CameraToScreen );
		//	put into world space
		let LocalToWorld = this.GetLocalToWorldMatrix();
		let ScreenToWorld = PopMath.MatrixMultiply4x4( LocalToWorld, ScreenToCamera );
		return ScreenToWorld;
	}
	
	GetUp()
	{
		//let y = PopMath.Cross3( z,x );
		//y = PopMath.Normalise3( y );
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
			LookAt = PopMath.TransformPosition( LocalPos,LocalToWorld  );
		}
			
		let z = PopMath.Subtract3( LookAt, this.Position );
		if ( Normalised )
			z = PopMath.Normalise3( z );
		return z;
	}
	
	GetBackward(Normalised=true)
	{
		const Forward = this.GetForward(Normalised);
		const Backward = PopMath.Multiply3(Forward,[-1,-1,-1]);
		return Backward;
	}
	
	GetRight()
	{
		const up = this.GetUp();
		const z = this.GetForward();
		let x = PopMath.Cross3( up, z );
		x = PopMath.Normalise3( x );
		return x;
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
	
	GetPitchYawRollDistance()
	{
		//	dir from lookat to position (orbit, not first person)
		let Dir = this.GetBackward(false);
		let Distance = PopMath.Length3( Dir );
		//Pop.Debug("Distance = ",Distance,Dir);
		Dir = PopMath.Normalise3( Dir );
		
		let Yaw = PopMath.RadToDeg( Math.atan2( Dir[0], Dir[2] ) );
		let Pitch = PopMath.RadToDeg( Math.asin(-Dir[1]) );
		let Roll = 0;
		
		return [Pitch,Yaw,Roll,Distance];
	}
	
	SetOrbit(Pitch,Yaw,Roll,Distance)
	{
		//	don't allow zero or negative distance
		//	need some arbritry epsilon, so use the clipping distance
		Distance = Math.max( this.NearDistance, Distance ); 
		
		let Pitchr = PopMath.radians(Pitch);
		let Yawr = PopMath.radians(Yaw);
		//Pop.Debug("SetOrbit()", ...arguments );
		//Pop.Debug("Pitch = "+Pitch);
		
		let Deltax = Math.sin(Yawr) * Math.cos(Pitchr);
		let Deltay = -Math.sin(Pitchr);
		let Deltaz = Math.cos(Yawr) * Math.cos(Pitchr);
		Deltax *= Distance;
		Deltay *= Distance;
		Deltaz *= Distance;
		
		//Pop.Debug( "SetOrbit deltas", Deltax, Deltay, Deltaz );
		this.Position[0] = this.LookAt[0] + Deltax;
		this.Position[1] = this.LookAt[1] + Deltay;
		this.Position[2] = this.LookAt[2] + Deltaz;
		
	}
	
	//	move only position, not lookat, clamps zoom in
	OnCameraZoom(Delta)
	{
		const Pyrd = this.GetPitchYawRollDistance();
		Pyrd[3] -= Delta;
		this.SetOrbit( ...Pyrd );
		
		//	prevent an orbit from using old distance
		this.Last_OrbitPos = null;
	}
	
	OnCameraOrbit(x,y,z,FirstClick)
	{
		//	remap input from xy to yaw, pitch
		let yxz = [y,x,z];
		x = yxz[0];
		y = yxz[1];
		z = yxz[2];
		
		if ( FirstClick || !this.Last_OrbitPos )
		{
			this.Start_OrbitPyrd = this.GetPitchYawRollDistance();
			//Pop.Debug("this.Start_OrbitPyrd",this.Start_OrbitPyrd);
			this.Last_OrbitPos = [x,y,z];
		}
		
		let Deltax = this.Last_OrbitPos[0] - x;
		let Deltay = this.Last_OrbitPos[1] - y;
		let Deltaz = this.Last_OrbitPos[2] - z;
	
		Deltax *= 0.1;
		Deltay *= 0.1;
		Deltaz *= 0.1;
	
		let NewPitch = this.Start_OrbitPyrd[0] + Deltax;
		let NewYaw = this.Start_OrbitPyrd[1] + Deltay;
		let NewRoll = this.Start_OrbitPyrd[2] + Deltaz;
		let NewDistance = this.Start_OrbitPyrd[3];
		
		this.SetOrbit( NewPitch, NewYaw, NewRoll, NewDistance );
	}
	
	//	opposite of GetOrbit
	GetLookAtRotation()
	{
		//	forward instead of backward
		let Dir = this.GetForward(false);
		let Distance = PopMath.Length3( Dir );
		//Pop.Debug("Distance = ",Distance,Dir);
		Dir = PopMath.Normalise3( Dir );
		
		let Yaw = PopMath.RadToDeg( Math.atan2( Dir[0], Dir[2] ) );
		let Pitch = PopMath.RadToDeg( Math.asin(-Dir[1]) );
		let Roll = 0;
		
		return [Pitch,Yaw,Roll,Distance];
	}
	
	//	opposite of SetOrbit
	SetLookAtRotation(Pitch,Yaw,Roll,Distance)
	{
		let Pitchr = PopMath.radians(Pitch);
		let Yawr = PopMath.radians(Yaw);
		//Pop.Debug("SetOrbit()", ...arguments );
		//Pop.Debug("Pitch = "+Pitch);
		
		let Deltax = Math.sin(Yawr) * Math.cos(Pitchr);
		let Deltay = -Math.sin(Pitchr);
		let Deltaz = Math.cos(Yawr) * Math.cos(Pitchr);
		Deltax *= Distance;
		Deltay *= Distance;
		Deltaz *= Distance;
		
		//Pop.Debug( "SetOrbit deltas", Deltax, Deltay, Deltaz );
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
	

	
	OnCameraPan(x,y,z,FirstClick)
	{
		if ( FirstClick )
			this.LastPos_PanPos = [x,y,z];
		//Pop.Debug("OnCameraPan", ...arguments, JSON.stringify(this));

		let Deltax = this.LastPos_PanPos[0] - x;
		let Deltay = this.LastPos_PanPos[1] - y;
		let Deltaz = this.LastPos_PanPos[2] - z;
		Deltax = Deltax * 0.01;
		Deltay = Deltay * -0.01;
		Deltaz = Deltaz * 0.01;
		let Delta = [ Deltax, Deltay, Deltaz ];
		this.MoveCameraAndLookAt( Delta );
		
		this.LastPos_PanPos = [x,y,z];
	}
	
	OnCameraPanLocal(x,y,z,FirstClick)
	{
		if ( FirstClick || !this.LastPos_PanLocalPos )
			this.LastPos_PanLocalPos = [x,y,z];
	
		let Deltax = this.LastPos_PanLocalPos[0] - x;
		let Deltay = this.LastPos_PanLocalPos[1] - y;
		let Deltaz = this.LastPos_PanLocalPos[2] - z;
		Deltax *= -0.01;
		Deltay *= -0.01;
		Deltaz *= -0.01;

		let Right3 = this.GetRight();
		Right3 = PopMath.Multiply3( Right3, [Deltax,Deltax,Deltax] );
		this.MoveCameraAndLookAt( Right3 );

		let Up3 = this.GetUp();
		Up3 = PopMath.Multiply3( Up3, [Deltay,Deltay,Deltay] );
		this.MoveCameraAndLookAt( Up3 );

		let Forward3 = this.GetForward();
		Forward3 = PopMath.Multiply3( Forward3, [Deltaz,Deltaz,Deltaz] );
		this.MoveCameraAndLookAt( Forward3 );

		this.LastPos_PanLocalPos = [x,y,z];
	}

	//	maybe rename to GetWorldRay
	GetScreenRay(u,v,ScreenRect,RayDistance=null)
	{
		let Aspect = ScreenRect[2] / ScreenRect[3];

		//let x = PopMath.lerp( -1, 1, u );
		//let y = PopMath.lerp( 1, -1, v );
		//const ViewRect = ScreenRect;

		let x = PopMath.lerp( -Aspect, Aspect, u );
		let y = PopMath.lerp( 1, -1, v );
		const ViewRect = [0,0,1,1];
		
		const Camera = this;
		
		const RayNear = this.NearDistance;
		const RayFar = RayDistance || this.FarDistance;
		
		let CameraToScreenTransform = Camera.GetProjectionMatrix( ViewRect );
		let ScreenToCameraTransform = PopMath.MatrixInverse4x4( CameraToScreenTransform );
		
		let StartMatrix = PopMath.CreateTranslationMatrix( x, y, RayNear );
		let EndMatrix = PopMath.CreateTranslationMatrix( x, y, RayFar );
		StartMatrix = PopMath.MatrixMultiply4x4( ScreenToCameraTransform, StartMatrix );
		EndMatrix = PopMath.MatrixMultiply4x4( ScreenToCameraTransform, EndMatrix );
		
		StartMatrix = PopMath.MatrixMultiply4x4( Camera.GetLocalToWorldMatrix(), StartMatrix );
		EndMatrix = PopMath.MatrixMultiply4x4( Camera.GetLocalToWorldMatrix(), EndMatrix );

		const Ray = {};
		
		//	gr: these positions are wrong, they're scaled completley wrong
		//		maybe theyre scaled in camera's z (near/far), but... im pretty sure they should be in world space...
		Ray.Start = PopMath.GetMatrixTranslation( StartMatrix, true );
		Ray.End = PopMath.GetMatrixTranslation( EndMatrix, true );
		//	...so we're gonna rescale for now
		
		//	ray dir seems to be right, so get new world positions from that
		Ray.Position = Camera.Position.slice();
		
		//	gr: this ray is BACKWARDS
		//		but this is working for world-space math checks
		//		I think the Z dir is backwards in the projection hence why it renders correctly, but maths is backwards
		//		the raymarch dir is also backwards, which matches this backwards
		Ray.Direction = PopMath.Normalise3( PopMath.Subtract3( Ray.Start, Ray.End ) );
		//Ray.Position = Ray.Start;
		
		Ray.Start = PopMath.GetRayPositionAtTime( Ray.Position, Ray.Direction, RayNear );
		Ray.End = PopMath.GetRayPositionAtTime( Ray.Position, Ray.Direction, RayFar );
		Ray.Position = Ray.Start;
		
		return Ray;
	}
	
	//Pop.Debug("initial pitch/yaw/roll/distance",this.GetPitchYawRollDistance());
}

export default Camera;
