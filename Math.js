//	can I export Math here?
const Default = 'Pop Math';
export default Default;

export function DegToRad(Degrees)
{
	return Degrees * (Math.PI / 180);
}

export function RadToDeg(Radians)
{
	return Radians * (180 / Math.PI);
}

export const radians = DegToRad;
export const degrees = RadToDeg;

export function SinCos(Degrees)
{
	let AngleRad = DegToRad( Degrees );
	let Sin = Math.sin( AngleRad );
	let Cos = Math.cos( AngleRad );
	return [Sin,Cos];
}

//	note: glsl clamp() is clamp(value,min,max)
export function clamp(min,max,Value)
{
	return Math.min( Math.max(Value, min), max);
}
export const Clamp = clamp;

export function Clamp01(Value)
{
	return Clamp(0,1,Value);
}

//	note: glsl clamp() is clamp(value,min,max)
export function clamp2(Min,Max,Value)
{
	if ( !Array.isArray(Min) )	Min = [Min,Min];
	if ( !Array.isArray(Max) )	Max = [Max,Max];
	const x = clamp( Min[0], Max[0], Value[0] );
	const y = clamp( Min[1], Max[1], Value[0] );
	return [x,y];
}
export const Clamp2 = clamp2;


export function range(Min,Max,Value)
{
	return (Max==Min) ? 0 : (Value-Min) / (Max-Min);
}
export const Range = range;

export function rangeClamped(Min,Max,Value)
{
	return clamp( 0, 1, range( Min, Max, Value ) );
}
export const RangeClamped = rangeClamped;

export function lerp(Min,Max,Time)
{
	return Min + (( Max - Min ) * Time);
}
export const Lerp = lerp;

export function LerpArray(Min,Max,Time)
{
	let Values = Min.slice();
	for ( let i=0;	i<Min.length;	i++ )
		Values[i] = Lerp( Min[i], Max[i], Time );
	return Values;
}

export const Lerp2 = LerpArray;
export const Lerp3 = LerpArray;
export const Lerp4 = LerpArray;

export function Fract(a)
{
	return a % 1;
}
export const fract = Fract;


export function Dot2(a,b)
{
	let Dot = (a[0]*b[0]) + (a[1]*b[1]);
	return Dot;
}

export function Dot3(a,b)
{
	let Dot = (a[0]*b[0]) + (a[1]*b[1]) + (a[2]*b[2]);
	return Dot;
}

export function Dot4(a,b)
{
	let Dot = (a[0]*b[0]) + (a[1]*b[1]) + (a[2]*b[2]) + (a[3]*b[3]);
	return Dot;
}


export function LengthSq2(xy)
{
	if ( !Array.isArray(xy) )
		throw "LengthSq2() expecting 2D xy array";
	
	let dx = xy[0];
	let dy = xy[1];
	let LengthSq = dx*dx + dy*dy;
	return LengthSq;
}


export function LengthSq3(a,b=[0,0,0])
{
	let dx = a[0] - b[0];
	let dy = a[1] - b[1];
	let dz = a[2] - b[2];
	let LengthSq = dx*dx + dy*dy + dz*dz;
	return LengthSq;
}


export function Length2(xy)
{
	if ( !Array.isArray(xy) )
		throw "Length2() expecting 2D xy array";
	
	let LengthSq = LengthSq2( xy );
	let Len = Math.sqrt( LengthSq );
	return Len;
}


export function Length3(a)
{
	let LengthSq = LengthSq3( [0,0,0], a );
	let Len = Math.sqrt( LengthSq );
	return Len;
}

export function Normalise2(xy,NormalLength=1)
{
	let Length = Length2( xy );
	Length *= 1 / NormalLength;
	return [ xy[0]/Length, xy[1]/Length ];
}

export function Normalise3(a,NormalLength=1)
{
	let Length = Length3( a );
	Length *= 1 / NormalLength;
	return [ a[0]/Length, a[1]/Length, a[2]/Length ];
}

export function Subtract2(a,b)
{
	return [ a[0]-b[0], a[1]-b[1] ];
}

export function Subtract3(a,b)
{
	return [ a[0]-b[0], a[1]-b[1], a[2]-b[2] ];
}

export function Add3(a,b)
{
	return [ a[0]+b[0], a[1]+b[1], a[2]+b[2] ];
}

export function Multiply2(a,b)
{
	return [ a[0]*b[0], a[1]*b[1] ];
}

export function Multiply3(a,b)
{
	if ( !Array.isArray(a) )
		a = [a,a,a];
	if ( !Array.isArray(b) )
		b = [b,b,b];
	return [ a[0]*b[0], a[1]*b[1], a[2]*b[2] ];
}

export function Divide3(a,b)
{
	if ( !Array.isArray(a) )
		a = [a,a,a];
	if ( !Array.isArray(b) )
		b = [b,b,b];
	return [ a[0]/b[0], a[1]/b[1], a[2]/b[2] ];
}

export function Cross3(a,b)
{
	let x = a[1] * b[2] - a[2] * b[1];
	let y = a[2] * b[0] - a[0] * b[2];
	let z = a[0] * b[1] - a[1] * b[0];
	return [x,y,z];
}


export function Distance(a,b)
{
	let Delta = a - b;
	return Math.abs(Delta);
}

export function Distance2(a,b)
{
	let Delta = Subtract2( a,b );
	return Length2( Delta );
}

export function Distance3(a,b)
{
	let Delta = Subtract3( a,b );
	return Length3( Delta );
}

export function Rotate2(xy,AngleDegrees)
{
	const AngleRad = DegToRad( AngleDegrees );
	const sin = Math.sin(AngleRad);
	const cos = Math.cos(AngleRad);
	
	const x = (cos * xy[0]) - (sin * xy[1]);
	const y = (sin * xy[0]) + (cos * xy[1]);
	return [x,y];
}

//	this acts like glsl; returns min per-component
//	min2( [1,100], [2,99] ) = [1,99]
export function min2(a,b,c,d,etc)
{
	const xs = [...arguments].map( n => n[0] );
	const ys = [...arguments].map( n => n[1] );
	const x = Math.min( ...xs );
	const y = Math.min( ...ys );
	return [x,y];
}
export const Min2 = min2;

//	this acts like glsl; returns max per-component
export function max2(a,b,c,d,etc)
{
	const xs = [...arguments].map( n => n[0] );
	const ys = [...arguments].map( n => n[1] );
	const x = Math.max( ...xs );
	const y = Math.max( ...ys );
	return [x,y];
}
export const Max2 = max2;




//	how many angles to turn A to B
export function GetAngleDiffDegrees(a,b)
{
	//	make angle relative to zero
	if ( a > 180 )	a -= 360;
	if ( a < -180 )	a += 360;
	if ( b > 180 )	b -= 360;
	if ( b < -180 )	b += 360;

	return b - a;
}

export function SnapRectInsideParent(Rect,ParentRect)
{
	//	don't modify original rect
	Rect = Rect.slice();
	
	//	fit bottom right
	let RectRight = Rect[0]+Rect[2];
	let ParentRight = ParentRect[0]+ParentRect[2];
	if ( RectRight > ParentRight )
		Rect[0] -= RectRight - ParentRight;
	
	let RectBottom = Rect[1]+Rect[3];
	let ParentBottom = ParentRect[1]+ParentRect[3];
	if ( RectBottom > ParentBottom )
		Rect[1] -= RectBottom - ParentBottom;
	
	//	now fit top left
	if ( Rect[0] < ParentRect[0] )
		Rect[0] = ParentRect[0];

	if ( Rect[1] < ParentRect[1] )
		Rect[1] = ParentRect[1];

	//	todo: clip, if right/bottom > parent, rect is too big
	if ( Rect[2] > ParentRect[2] )
		Rect[2] = ParentRect[2];
	if ( Rect[3] > ParentRect[3] )
		Rect[3] = ParentRect[3];

	return Rect;
}

export function MakeRectSquareCentered(Rect,Grow=true)
{
	//	default to grow
	Grow = (Grow!==false);
	
	//	don't modify original rect
	Rect = Rect.slice();
	
	let PadWidth = 0;
	let PadHeight = 0;
	let w = Rect[2];
	let h = Rect[3];
	if ( w==h )
		return Rect;
	
	if ( Grow )
	{
		if ( w > h )
			PadHeight = w - h;
		else
			PadWidth = h - w;
	}
	else
	{
		if ( w > h )
			PadWidth = h - w;
		else
			PadHeight = w - h;
	}
	
	Rect[0] -= PadWidth/2;
	Rect[1] -= PadHeight/2;
	Rect[2] += PadWidth;
	Rect[3] += PadHeight;
	return Rect;
}

//	scale rect from it's center
export function GrowRect(Rect,Scale)
{
	//	don't modify original rect
	Rect = Rect.slice();
	
	let LeftChange = (Rect[2] * Scale) - Rect[2];
	let TopChange = (Rect[3] * Scale) - Rect[3];
	Rect[0] -= LeftChange/2;
	Rect[1] -= TopChange/2;
	Rect[2] += LeftChange;
	Rect[3] += TopChange;
	return Rect;
}



export function SplitRect(ParentRect,Border,Columns,Rows)
{
	let ParentWidth = ParentRect.w;
	ParentWidth -= Border * (Columns-1);
	let BoxWidth = ParentWidth / Columns;
	//BoxWidth -= Border * (Columns-1);
	
	let ParentHeight = ParentRect.h;
	ParentHeight -= Border * (Rows-1);
	let BoxHeight = ParentHeight / Rows;
	//BoxHeight -= Border * (Rows-1);
	
	let Rects = [];
	
	let y = ParentRect.y;
	for ( let r=0;	r<Rows;	r++ )
	{
		let x = ParentRect.x;
		for ( let c=0;	c<Columns;	c++ )
		{
			let Rect = new TRect( x, y, BoxWidth, BoxHeight );
			x += BoxWidth + Border;
			Rects.push( Rect );
		}
		y += Border + BoxHeight;
	}
	
	return Rects;
}

export function GetNormalisedRect(ChildRect,ParentRect)
{
	let pl = ParentRect[0];
	let pr = pl + ParentRect[2];
	let pt = ParentRect[1];
	let pb = pt + ParentRect[3];
	
	let cl = ChildRect[0];
	let cr = cl + ChildRect[2];
	let ct = ChildRect[1];
	let cb = ct + ChildRect[3];
	
	let l = Range( pl, pr, cl );
	let r = Range( pl, pr, cr );
	let t = Range( pt, pb, ct );
	let b = Range( pt, pb, cb );
	let w = r-l;
	let h = b-t;
	
	return [l,t,w,h];
}


export function ScaleRect(ChildRect,ParentRect)
{
	let pl = ParentRect[0];
	let pr = pl + ParentRect[2];
	let pt = ParentRect[1];
	let pb = pt + ParentRect[3];
	
	let cl = ChildRect[0];
	let cr = cl + ChildRect[2];
	let ct = ChildRect[1];
	let cb = ct + ChildRect[3];
	
	let l = Lerp( pl, pr, cl );
	let r = Lerp( pl, pr, cr );
	let t = Lerp( pt, pb, ct );
	let b = Lerp( pt, pb, cb );
	let w = r-l;
	let h = b-t;
	
	return [l,t,w,h];
}

export function AccumulateRects(RectA,RectB)
{
	let ra = RectA[0] + RectA[2];
	let rb = RectB[0] + RectB[2];
	let ba = RectA[1] + RectA[3];
	let bb = RectB[1] + RectB[3];
	let l = Math.min( RectA[0], RectB[0] );
	let r = Math.max( ra, rb );
	let t = Math.min( RectA[1], RectB[1] );
	let b = Math.max( ba, bb );
	let w = r-l;
	let h = b-t;
	return [l,t,w,h];
}


export function ClipRectsToOverlap(RectA,RectB)
{
	let ra = RectA[0] + RectA[2];
	let rb = RectB[0] + RectB[2];
	let ba = RectA[1] + RectA[3];
	let bb = RectB[1] + RectB[3];
	let l = Math.max( RectA[0], RectB[0] );
	let r = Math.min( ra, rb );
	let t = Math.max( RectA[1], RectB[1] );
	let b = Math.min( ba, bb );
	let w = r-l;
	let h = b-t;
	return [l,t,w,h];
}


export function PointInsideRect(xy,Rect)
{
	let x = xy[0];
	let y = xy[1];
	
	if ( x < Rect[0] )			return false;
	if ( x > Rect[0]+Rect[2] )	return false;
	if ( y < Rect[1] )			return false;
	if ( y > Rect[1]+Rect[3] )	return false;
	
	return true;
}

//	is a outside b
export function RectIsOutside(RectA,RectB)
{
	let la = RectA[0];
	let lb = RectB[0];
	let ta = RectA[1];
	let tb = RectB[1];
	let ra = RectA[0] + RectA[2];
	let rb = RectB[0] + RectB[2];
	let ba = RectA[1] + RectA[3];
	let bb = RectB[1] + RectB[3];
	
	//	too far left
	if ( ra < lb )
		return true;
	//	too far right
	if ( la > rb )
		return true;
	//	too high up
	if ( ba < tb )
		return true;
	//	too low
	if ( ta > bb )
		return true;
	//	is overlapping (but maybe not wholly inside!)
	return false;
}


//	are these rects overlapping each other 
export function RectIsOverlapped(RectA,RectB)
{
	if ( RectIsOutside( RectA, RectB ) )
		return false
	return true;

	//	gr: the below seems to fail when they're close (and A is still inside B)
	//		leaving this code here because debugging, it seemed correct, but is wrong. (I still want to know why)
	let la = RectA[0];
	let lb = RectB[0];
	let ta = RectA[1];
	let tb = RectB[1];
	let ra = RectA[0] + RectA[2];
	let rb = RectB[0] + RectB[2];
	let ba = RectA[1] + RectA[3];
	let bb = RectB[1] + RectB[3];

	//	there's a better way of doing this by putting rectB into RectA space
	//	but lets do that later
	if ( PointInsideRect( [la,ta], RectB ) )	return true;
	if ( PointInsideRect( [ra,ta], RectB ) )	return true;
	if ( PointInsideRect( [ra,ba], RectB ) )	return true;
	if ( PointInsideRect( [la,ba], RectB ) )	return true;
	
	if ( PointInsideRect( [lb,tb], RectA ) )	return true;
	if ( PointInsideRect( [rb,tb], RectA ) )	return true;
	if ( PointInsideRect( [rb,bb], RectA ) )	return true;
	if ( PointInsideRect( [lb,bb], RectA ) )	return true;
	
	return false;
}


export function GetTriangleArea2(PointA,PointB,PointC)
{
	//	get edge lengths
	const a = Distance2( PointA, PointB );
	const b = Distance2( PointB, PointC );
	const c = Distance2( PointC, PointA );
	
	//	Heron's formula
	const PerimeterLength = a + b + c;
	//	s=semi-permeter
	const s = PerimeterLength / 2;
	const Area = Math.sqrt( s * (s-a) * (s-b) * (s-c) );
	return Area;
}

export function GetRectCenter(Rect)
{
	const Halfw = Rect[2]/2;
	const Halfh = Rect[3]/2;
	return [ Rect[0]+Halfw, Rect[1]+Halfh ];
}

export function GetRectArea(Rect)
{
	return Rect[2] * Rect[3];
}

export function GetCircleArea(Radius)
{
	return Math.PI * (Radius*Radius);
}

export function GetBox3Area(BoxMin,BoxMax)
{
	const Size =
	[
	 BoxMax[0] - BoxMin[0],
	 BoxMax[1] - BoxMin[1],
	 BoxMax[2] - BoxMin[2],
	];
	const Area = Size[0] * Size[1] * Size[2];
	return Area;
}

//	overlap area is the overlap as a fraction of the biggest rect
export function GetOverlapArea(Recta,Rectb)
{
	let Overlap = ClipRectsToOverlap( Recta, Rectb );
	let OverlapSize = GetRectArea(Overlap);
	let BigSize = Math.max( GetRectArea(Recta), GetRectArea(Rectb) );
	return OverlapSize / BigSize;
}


export function GetSphereSphereIntersection(Sphere4a,Sphere4b)
{
	let Delta = Subtract3( Sphere4b, Sphere4a );
	let Distance = Length3( Delta );
	let RadiusA = Sphere4a[3];
	let RadiusB = Sphere4b[3];
	if ( Distance > RadiusA + RadiusB )
		return null;

	
	let MidDistance = (RadiusA + RadiusB)/2;
	let Intersection = [];
	Intersection[0] = Sphere4a[0] + Delta[0] * MidDistance;
	Intersection[1] = Sphere4a[1] + Delta[1] * MidDistance;
	Intersection[2] = Sphere4a[2] + Delta[2] * MidDistance;
	return Intersection;
}

export function MatrixInverse4x4(Matrix)
{
	let m = Matrix;
	let r = [];
	
	r[0] = m[5]*m[10]*m[15] - m[5]*m[14]*m[11] - m[6]*m[9]*m[15] + m[6]*m[13]*m[11] + m[7]*m[9]*m[14] - m[7]*m[13]*m[10];
	r[1] = -m[1]*m[10]*m[15] + m[1]*m[14]*m[11] + m[2]*m[9]*m[15] - m[2]*m[13]*m[11] - m[3]*m[9]*m[14] + m[3]*m[13]*m[10];
	r[2] = m[1]*m[6]*m[15] - m[1]*m[14]*m[7] - m[2]*m[5]*m[15] + m[2]*m[13]*m[7] + m[3]*m[5]*m[14] - m[3]*m[13]*m[6];
	r[3] = -m[1]*m[6]*m[11] + m[1]*m[10]*m[7] + m[2]*m[5]*m[11] - m[2]*m[9]*m[7] - m[3]*m[5]*m[10] + m[3]*m[9]*m[6];
	
	r[4] = -m[4]*m[10]*m[15] + m[4]*m[14]*m[11] + m[6]*m[8]*m[15] - m[6]*m[12]*m[11] - m[7]*m[8]*m[14] + m[7]*m[12]*m[10];
	r[5] = m[0]*m[10]*m[15] - m[0]*m[14]*m[11] - m[2]*m[8]*m[15] + m[2]*m[12]*m[11] + m[3]*m[8]*m[14] - m[3]*m[12]*m[10];
	r[6] = -m[0]*m[6]*m[15] + m[0]*m[14]*m[7] + m[2]*m[4]*m[15] - m[2]*m[12]*m[7] - m[3]*m[4]*m[14] + m[3]*m[12]*m[6];
	r[7] = m[0]*m[6]*m[11] - m[0]*m[10]*m[7] - m[2]*m[4]*m[11] + m[2]*m[8]*m[7] + m[3]*m[4]*m[10] - m[3]*m[8]*m[6];
	
	r[8] = m[4]*m[9]*m[15] - m[4]*m[13]*m[11] - m[5]*m[8]*m[15] + m[5]*m[12]*m[11] + m[7]*m[8]*m[13] - m[7]*m[12]*m[9];
	r[9] = -m[0]*m[9]*m[15] + m[0]*m[13]*m[11] + m[1]*m[8]*m[15] - m[1]*m[12]*m[11] - m[3]*m[8]*m[13] + m[3]*m[12]*m[9];
	r[10] = m[0]*m[5]*m[15] - m[0]*m[13]*m[7] - m[1]*m[4]*m[15] + m[1]*m[12]*m[7] + m[3]*m[4]*m[13] - m[3]*m[12]*m[5];
	r[11] = -m[0]*m[5]*m[11] + m[0]*m[9]*m[7] + m[1]*m[4]*m[11] - m[1]*m[8]*m[7] - m[3]*m[4]*m[9] + m[3]*m[8]*m[5];
	
	r[12] = -m[4]*m[9]*m[14] + m[4]*m[13]*m[10] + m[5]*m[8]*m[14] - m[5]*m[12]*m[10] - m[6]*m[8]*m[13] + m[6]*m[12]*m[9];
	r[13] = m[0]*m[9]*m[14] - m[0]*m[13]*m[10] - m[1]*m[8]*m[14] + m[1]*m[12]*m[10] + m[2]*m[8]*m[13] - m[2]*m[12]*m[9];
	r[14] = -m[0]*m[5]*m[14] + m[0]*m[13]*m[6] + m[1]*m[4]*m[14] - m[1]*m[12]*m[6] - m[2]*m[4]*m[13] + m[2]*m[12]*m[5];
	r[15] = m[0]*m[5]*m[10] - m[0]*m[9]*m[6] - m[1]*m[4]*m[10] + m[1]*m[8]*m[6] + m[2]*m[4]*m[9] - m[2]*m[8]*m[5];
	
	let det = m[0]*r[0] + m[1]*r[4] + m[2]*r[8] + m[3]*r[12];
	for ( let i=0;	i<16;	i++ )
		r[i] /= det;
	
	return r;

}

//	multiply position by matrix
export function TransformPosition(Position,Transform)
{
	const PosMatrix = CreateTranslationMatrix(...Position);
	const TransMatrix = MatrixMultiply4x4(Transform,PosMatrix);
	const TransPos = GetMatrixTranslation(TransMatrix,true);
	return TransPos;
}

//	gr: I've made this simpler, but its backwards to the other, and usual multiply notation, so maybe no...
//	order is left-to-right of significance. eg. scale, then move.
export function MatrixMultiply4x4Multiple()
{
	//	apply in the right order!
	let Matrix = null;
	for ( let m=0;	m<arguments.length;	m++ )
	{
		let ParentMatrix = arguments[m];
		if ( Matrix == null )
			Matrix = ParentMatrix;
		else
			Matrix = MatrixMultiply4x4( ParentMatrix, Matrix );
	}
	
	return Matrix;
}

//	apply A, then B. So A is child, B is parent
//	gr: but that doesn't seem to be riht
export function MatrixMultiply4x4(a,b)
{
	var a00 = a[0],
	a01 = a[1],
	a02 = a[2],
	a03 = a[3];
	var a10 = a[4],
	a11 = a[5],
	a12 = a[6],
	a13 = a[7];
	var a20 = a[8],
	a21 = a[9],
	a22 = a[10],
	a23 = a[11];
	var a30 = a[12],
	a31 = a[13],
	a32 = a[14],
	a33 = a[15];
	
	// Cache only the current line of the second matrix
	var b0 = b[0],
	b1 = b[1],
	b2 = b[2],
	b3 = b[3];

	let out = [];
	out[0] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
	out[1] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
	out[2] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
	out[3] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
	
	b0 = b[4];b1 = b[5];b2 = b[6];b3 = b[7];
	out[4] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
	out[5] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
	out[6] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
	out[7] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
	
	b0 = b[8];b1 = b[9];b2 = b[10];b3 = b[11];
	out[8] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
	out[9] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
	out[10] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
	out[11] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
	
	b0 = b[12];b1 = b[13];b2 = b[14];b3 = b[15];
	out[12] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
	out[13] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
	out[14] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
	out[15] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
	return out;
}

export function CreateLookAtRotationMatrix(eye,up,center)
{
	let z = Subtract3( center, eye );
	z = Normalise3( z );
	
	let x = Cross3( up, z );
	x = Normalise3( x );
	
	let y = Cross3( z,x );
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

export function SetMatrixTranslation(Matrix,x,y,z,w=1)
{
	Matrix[12] = x;
	Matrix[13] = y;
	Matrix[14] = z;
	Matrix[15] = w;
}

export function CreateTranslationMatrix(x,y,z,w=1)
{
	return [ 1,0,0,0,	0,1,0,0,	0,0,1,0,	x,y,z,w	];
}

export function CreateScaleMatrix(x,y,z)
{
	y = (y === undefined) ? x : y;
	z = (z === undefined) ? x : z;

	return [ x,0,0,0,	0,y,0,0,	0,0,z,0,	0,0,0,1	];
}

export function CreateTranslationScaleMatrix(Position,Scale)
{
	let sx = Scale[0];
	let sy = Scale[1];
	let sz = Scale[2];
	let tx = Position[0];
	let ty = Position[1];
	let tz = Position[2];
	return [ sx,0,0,0,	0,sy,0,0,	0,0,sz,0,	tx,ty,tz,1 ];
}

export function CreateTranslationQuaternionMatrix(Position,Quaternion)
{
	const rx = Quaternion[0];
	const ry = Quaternion[1];
	const rz = Quaternion[2];
	const rw = Quaternion[3];
	const sx = 1;
	const sy = 1;
	const sz = 1;
	const tx = Position[0];
	const ty = Position[1];
	const tz = Position[2];
	const tw = (Position.length >= 4) ? Position[3] : 1;
	const Matrix =
	[
		(1.0-2.0*(ry*ry + rz*rz))*sx,
		(rx*ry + rz*rw)*sx*2.0,
		(rx*rz - ry*rw)*sx*2.0,
		0.0,

		(rx*ry - rz*rw)*sy*2.0,
		(1.0-2.0*(rx*rx + rz*rz))*sy,
		(ry*rz + rx*rw)*sy*2.0,
		0.0,

		(rx*rz + ry*rw)*sz*2.0,
		(ry*rz - rx*rw)*sz*2.0,
		(1.0-2.0*(rx*rx + ry*ry))*sz,
		0.0,

		tx,
		ty,
		tz,
		tw
	];
	return Matrix;
}

export function Matrix3x3ToMatrix4x4(Matrix3,Row4=[0,0,0,1])
{
	let Matrix4 =
	[
		Matrix3[0],	Matrix3[1],	Matrix3[2], 0,
		Matrix3[3],	Matrix3[4],	Matrix3[5],	0,
		Matrix3[6],	Matrix3[7],	Matrix3[8],	0,
		Row4[0],	Row4[1],	Row4[2],	Row4[3]
	];
	return Matrix4;
}

export function CreateIdentityMatrix()
{
	return CreateTranslationMatrix( 0,0,0 );
}

export function GetMatrixScale(Matrix)
{
	let Rowx = Matrix.slice(0,4);
	let Rowy = Matrix.slice(4,8);
	let Rowz = Matrix.slice(8,12);
	let Scalex = Length3( Rowx );
	let Scaley = Length3( Rowy );
	let Scalez = Length3( Rowz );
	return [Scalex,Scaley,Scalez];
}

export function GetMatrixTranslation(Matrix,DivW=false)
{
	//	do we need to /w here?
	let xyz = Matrix.slice(12,12+3);
	if ( DivW )
	{
		let w = Matrix[15];
		xyz[0] /= w;
		xyz[1] /= w;
		xyz[2] /= w;
	}
	return xyz;
}


//	gr: alternative quaternion -> matrix
//	https://github.com/immersive-web/webxr-polyfill/blob/0202e9d2b80fcce3d46010f21869b8684da9c4f5/build/webxr-polyfill.js#L340
export function GetQuaternionFromMatrix4x4(mat) 
{
	let out = [0,0,0,1];
  let trace = mat[0] + mat[5] + mat[10];
  let S = 0;
  if (trace > 0) {
    S = Math.sqrt(trace + 1.0) * 2;
    out[3] = 0.25 * S;
    out[0] = (mat[6] - mat[9]) / S;
    out[1] = (mat[8] - mat[2]) / S;
    out[2] = (mat[1] - mat[4]) / S;
  } else if ((mat[0] > mat[5]) && (mat[0] > mat[10])) {
    S = Math.sqrt(1.0 + mat[0] - mat[5] - mat[10]) * 2;
    out[3] = (mat[6] - mat[9]) / S;
    out[0] = 0.25 * S;
    out[1] = (mat[1] + mat[4]) / S;
    out[2] = (mat[8] + mat[2]) / S;
  } else if (mat[5] > mat[10]) {
    S = Math.sqrt(1.0 + mat[5] - mat[0] - mat[10]) * 2;
    out[3] = (mat[8] - mat[2]) / S;
    out[0] = (mat[1] + mat[4]) / S;
    out[1] = 0.25 * S;
    out[2] = (mat[6] + mat[9]) / S;
  } else {
    S = Math.sqrt(1.0 + mat[10] - mat[0] - mat[5]) * 2;
    out[3] = (mat[1] - mat[4]) / S;
    out[0] = (mat[8] + mat[2]) / S;
    out[1] = (mat[6] + mat[9]) / S;
    out[2] = 0.25 * S;
  }
  return out;
}


//	same as above, get quaternion from matrix, 
//	need to work out which is better and how they differ
export function GetMatrixQuaternion(Matrix)
{
	function m(col,row)
	{
		let Index = col + (row*4);
		return Matrix[Index];
	}
	//	https://github.com/sacchy/Unity-Arkit/blob/master/Assets/Plugins/iOS/UnityARKit/Utility/UnityARMatrixOps.cs
	//Quaternion q = new Quaternion();
	const q = {};
	q.x = 0;
	q.y = 0;
	q.z = 0;
	q.w = 1;
	// Adapted from: http://www.euclideanspace.com/maths/geometry/rotations/conversions/matrixToQuaternion/index.htm
	//	>	The max( 0, ... ) is just a safeguard against rounding error.
	q.w = Math.sqrt(Math.max(0, 1 + m(0, 0) + m(1, 1) + m(2, 2))) / 2;
	q.x = Math.sqrt(Math.max(0, 1 + m(0, 0) - m(1, 1) - m(2, 2))) / 2;
	q.y = Math.sqrt(Math.max(0, 1 - m(0, 0) + m(1, 1) - m(2, 2))) / 2;
	q.z = Math.sqrt(Math.max(0, 1 - m(0, 0) - m(1, 1) + m(2, 2))) / 2;
	q.x *= Math.sign(q.x * (m(1, 2) - m(2, 1)));
	q.y *= Math.sign(q.y * (m(2, 0) - m(0, 2)));
	q.z *= Math.sign(q.z * (m(0, 1) - m(1, 0)));

	//	gr: pop math structs are all arrays	
	//return q;
	return [q.x,q.y,q.z,q.w];
}

export function CreateAxisRotationMatrix(Axis,Degrees)
{
	let Radians = DegToRad( Degrees );
	
	let x = Axis[0];
	let y = Axis[1];
	let z = Axis[2];
	let len = Math.sqrt(x * x + y * y + z * z);
	len = 1 / len;
	x *= len;
	y *= len;
	z *= len;
		
	let s = Math.sin(Radians);
	let c = Math.cos(Radians);
	let t = 1 - c;
		
	// Perform rotation-specific matrix multiplication
	let out = [];
	out[0] = x * x * t + c;
	out[1] = y * x * t + z * s;
	out[2] = z * x * t - y * s;
	out[3] = 0;
	out[4] = x * y * t - z * s;
	out[5] = y * y * t + c;
	out[6] = z * y * t + x * s;
	out[7] = 0;
	out[8] = x * z * t + y * s;
	out[9] = y * z * t - x * s;
	out[10] = z * z * t + c;
	out[11] = 0;
	out[12] = 0;
	out[13] = 0;
	out[14] = 0;
	out[15] = 1;
	return out;
}

export function Min3(a,b)
{
	let Min =
	[
	 Math.min( a[0], b[0] ),
	 Math.min( a[1], b[1] ),
	 Math.min( a[2], b[2] ),
	];
	return Min;
}

export function Max3(a,b)
{
	let Max =
	[
	 Math.max( a[0], b[0] ),
	 Math.max( a[1], b[1] ),
	 Math.max( a[2], b[2] ),
	 ];
	return Max;
}


export function GetNextPowerOf2(Number)
{
	//	round any floats
	Number = Math.ceil( Number );
	
	if ( Number <= 0 )
		return false;
	
	//	get bits under us
	const LowerBits = Number & (Number-1);
	if ( LowerBits == 0 )
		return Number;
	
	//Pop.Debug("number",Number,LowerBits);
	//	OR all the ^2 bits below us
	Number--;
	Number |= Number >> 1;
	Number |= Number >> 2;
	Number |= Number >> 4;
	Number |= Number >> 8;
	Number |= Number >> 16;
	//	now it's all bits below, roll over to the power^2 bit
	Number++;
	
	return Number;
}


export function NormalisePlane(Plane4)
{
	let Length = Length3( Plane4 );
	Plane4[0] /= Length;
	Plane4[1] /= Length;
	Plane4[2] /= Length;
	Plane4[3] /= Length;
}


export function GetNormalisedPlane(Plane4)
{
	Plane4 = Plane4.slice();
	NormalisePlane( Plane4 );
	return Plane4;
}


//	from https://stackoverflow.com/a/34960913/355753
export function GetFrustumPlanes(ProjectionMatrix4x4,Normalised=true)
{
	const FrustumMatrix4x4 = ProjectionMatrix4x4;
	let left = [];
	let right = [];
	let bottom = [];
	let top = [];
	let near = [];
	let far = [];
	
	let mat;
	if ( true )//Params.TransposeFrustumPlanes )
	{
		mat = function(row,col)
		{
			return FrustumMatrix4x4[ (row*4) + col ];
		}
	}
	else
	{
		mat = function(col,row)
		{
			return FrustumMatrix4x4[ (row*4) + col ];
		}
	}
	
	for ( let i=0;	i<4;	i++ )
	{
		left[i]		= mat(i,3) + mat(i,0);
		right[i]	= mat(i,3) - mat(i,0);
		bottom[i]	= mat(i,3) + mat(i,1);
		top[i]		= mat(i,3) - mat(i,1);
		near[i]		= mat(i,3) + mat(i,2);
		far[i]		= mat(i,3) - mat(i,2);
	}
	
	if ( Normalised )
	{
		NormalisePlane( left );
		NormalisePlane( right );
		NormalisePlane( top );
		NormalisePlane( bottom );
		NormalisePlane( near );
		NormalisePlane( far );
	}
	
	const Planes = {};
	Planes.Left = left;
	Planes.Right = right;
	Planes.Top = top;
	Planes.Bottom = bottom;
	Planes.Near = near;
	Planes.Far = far;
	return Planes;
}

export function GetBox3Corners(BoxMin,BoxMax)
{
	const BoxCorners =
	[
	 [BoxMin[0], BoxMin[1], BoxMin[2] ],
	 [BoxMax[0], BoxMin[1], BoxMin[2] ],
	 [BoxMin[0], BoxMax[1], BoxMin[2] ],
	 [BoxMax[0], BoxMax[1], BoxMin[2] ],
	 [BoxMin[0], BoxMin[1], BoxMax[2] ],
	 [BoxMax[0], BoxMin[1], BoxMax[2] ],
	 [BoxMin[0], BoxMax[1], BoxMax[2] ],
	 [BoxMax[0], BoxMax[1], BoxMax[2] ],
	 ];
	return BoxCorners;
}

export function BoxCenterSizeToMinMax(Center,Size)
{
	//	if size is radius, this is halfed again
	const HalfSize = Multiply3( Size, 0.5*0.50 );
	const Box = {};
	Box.Min = Subtract3( Center, HalfSize );
	Box.Max = Add3( Center, HalfSize );
	//Box.Size = HalfSize;
	Box.Size = Subtract3( Box.Max, Box.Min );
	return Box;
}

export function GetBoundingBoxsBoundingBox(BoundingBoxs)
{
	//	extract all positions
	const Mins = BoundingBoxs.map( bb => bb.Min );
	const Maxs = BoundingBoxs.map( bb => bb.Max );
	const Positions = Mins.concat(Maxs);
	return GetBoundingBox(Positions);
}


//	get [min,max] returned from a large set of values
export function GetMinMax(Values)
{
	//	this will crash (too many args) after a certain size
	//return Math.min( ...Values );
	
	const InitalValues = [Number.POSITIVE_INFINITY,Number.NEGATIVE_INFINITY];
	const MinMax = Values.reduce( ([min, max], val) => [Math.min(min, val), Math.max(max, val)], InitalValues );
	return MinMax;
}

export function GetBoundingBox(Positions)
{
	//	gr: faster if we can use min(...)
	let xs,ys,zs;
	
	//	array of xyz's
	if ( Array.isArray(Positions[0]) )
	{
		xs = Positions.map( Position => Position[0] );
		ys = Positions.map( Position => Position[1] );
		zs = Positions.map( Position => Position[2] );
	}
	else
	{
		//	can we make this faster by preallocating?
		let xyzs = [ [], [], [] ];
		//	gr: tighter loop, but adds modulus...
		for ( let i=0;	i<Positions.length;	i++ )
			xyzs[i%3].push( Positions[i] );
		
		xs = xyzs[0];
		ys = xyzs[1];
		zs = xyzs[2];
		/*
		for ( let i=0;	i<Positions.length;	i+=3 )
		{
			const x = Positions[i+0];
			const y = Positions[i+1];
			const z = Positions[i+2];
			xs.push(x);
			ys.push(y);
			zs.push(z);
		}
		*/
	}
	
	//	then get the min/max of each set
	const MinMaxx = GetMinMax(xs);
	const MinMaxy = GetMinMax(ys);
	const MinMaxz = GetMinMax(zs);
	
	const BoundingBox = {};
	BoundingBox.Min =
	[
		MinMaxx[0],
		MinMaxy[0],
		MinMaxz[0],
	];
	BoundingBox.Max =
	[
		MinMaxx[1],
		MinMaxy[1],
		MinMaxz[1],
	];
	return BoundingBox;
/*
	//	positions are striped xyz
	let Min = Positions.slice(0,3);
	let Max = Min.slice();
	for ( let i=0;	i<Positions.length;	i+=3 )
	{
		const x = Positions[i+0];
		const y = Positions[i+1];
		const z = Positions[i+2];
		Min[0] = Math.min( Min[0], x );
		Min[1] = Math.min( Min[1], y );
		Min[2] = Math.min( Min[2], z );
		Max[0] = Math.max( Max[0], x );
		Max[1] = Math.max( Max[1], y );
		Max[2] = Math.max( Max[2], z );
	}
	const Bounds = {};
	Bounds.Min = Min;
	Bounds.Max = Max;
	return Bounds;
	*/
}

export function GetBoundingBoxCenter(Box)
{
	const Min = Box.Min;
	const Max = Box.Max;
	
	const x = (Min[0] + Max[0]) / 2;
	const y = (Min[1] + Max[1]) / 2;
	const z = (Min[2] + Max[2]) / 2;
	return [x,y,z];
}

//	returns [x,y,z,radius]
export function GetBoundingSphereFromBoundingBox(Box)
{
	const Center = GetBoundingBoxCenter(Box);
	const Radius = Distance3( Center, Box.Max );
	Center.push(Radius);
	return Center;
}


export function IsBoundingBoxIntersectingFrustumPlanes(Box,Planes)
{
	//	convert to list of planes from .Left .Near .Far etc
	if ( !Array.isArray(Planes) )
	{
		function GetPlaneFromKey(Key)
		{
			return Planes[Key];
		}
		Planes = Object.keys( Planes ).map( GetPlaneFromKey );
	}

	const BoxCorners =
	[
		[Box.Min[0], Box.Min[1], Box.Min[2], 1],
		[Box.Max[0], Box.Min[1], Box.Min[2], 1],
		[Box.Min[0], Box.Max[1], Box.Min[2], 1],
		[Box.Max[0], Box.Max[1], Box.Min[2], 1],
		[Box.Min[0], Box.Min[1], Box.Max[2], 1],
		[Box.Max[0], Box.Min[1], Box.Max[2], 1],
		[Box.Min[0], Box.Max[1], Box.Max[2], 1],
		[Box.Max[0], Box.Max[1], Box.Max[2], 1],
	];
	
	//	https://www.iquilezles.org/www/articles/frustumcorrect/frustumcorrect.htm
	for ( let i=0;	i<Planes.length;	i++	)
	{
		let out = 0;
		const Plane = Planes[i];
		for ( let c=0;	c<BoxCorners.length;	c++ )
			out += Dot4( Plane, BoxCorners[c] ) < 0.0;
		
		//	all corners are outside this plane
		if( out == BoxCorners.length )
			return false;
	}
	/*	extra check for when large box is outside frustum but being included
	int out;
	out=0; for( int i=0; i<8; i++ ) out += ((fru.mPoints[i].x > box.mMaxX)?1:0); if( out==8 ) return false;
	out=0; for( int i=0; i<8; i++ ) out += ((fru.mPoints[i].x < box.mMinX)?1:0); if( out==8 ) return false;
	out=0; for( int i=0; i<8; i++ ) out += ((fru.mPoints[i].y > box.mMaxY)?1:0); if( out==8 ) return false;
	out=0; for( int i=0; i<8; i++ ) out += ((fru.mPoints[i].y < box.mMinY)?1:0); if( out==8 ) return false;
	out=0; for( int i=0; i<8; i++ ) out += ((fru.mPoints[i].z > box.mMaxZ)?1:0); if( out==8 ) return false;
	out=0; for( int i=0; i<8; i++ ) out += ((fru.mPoints[i].z < box.mMinZ)?1:0); if( out==8 ) return false;
	*/
	return true;
}

export function IsPositionInsideBox3(Position,BoxMin,BoxMax)
{
	for ( let dim=0;	dim<3;	dim++ )
	{
		const p = Position[dim];
		const min = BoxMin[dim];
		const max = BoxMax[dim];
		if ( p < min )
			return false;
		if ( p > max )
			return false
	}
	
	return true;
}

export function IsInsideBox3(Position,BoxMin,BoxMax)
{
	//Pop.Warning(`Math.IsInsideBox3 Deprecated; use Math.IsPositionInsideBox3`);
	return IsPositionInsideBox3(...arguments);
}


//	is this box wholly inside another box
export function IsBox3InsideBox3(BoxMinA,BoxMaxA,BoxMinB,BoxMaxB)
{
	const CornersA = GetBox3Corners(BoxMinA,BoxMaxA);
	for ( let Pos of CornersA )
	{
		const Inside = IsPositionInsideBox3( Pos, BoxMinB, BoxMaxB );
		if ( !Inside )
			return false;
	}
	return true;
}

//	get the AND of 2 box3s
export function GetOverlappedBox3(BoxMinA,BoxMaxA,BoxMinB,BoxMaxB)
{
	//	get the overlapping area as a box
	//	min = maximum min
	//	max = minimum max
	const OverlapMin = [];
	const OverlapMax = [];
	for ( let Dim=0;	Dim<3;	Dim++ )
	{
		OverlapMin[Dim] = Math.max( BoxMinA[Dim], BoxMinB[Dim] );
		OverlapMax[Dim] = Math.min( BoxMaxA[Dim], BoxMaxB[Dim] );
		
		//	if min > max the boxes aren't overlapping
		//	doesnt matter which we snap to? but only do one or the box will flip
		const Min = Math.min( OverlapMin[Dim], OverlapMax[Dim] );
		//const Max = Math.max( OverlapMin[Dim], OverlapMax[Dim] );
		OverlapMin[Dim] = Min;
		//OverlapMax[Dim] = Max;
	}
	
	const Box = {};
	Box.Min = OverlapMin;
	Box.Max = OverlapMax;
	return Box;
}


export function IsBox3OverlappingBox3(BoxMinA,BoxMaxA,BoxMinB,BoxMaxB)
{
	const OverlapBox = GetOverlappedBox3(BoxMinA,BoxMaxA,BoxMinB,BoxMaxB);
	
	//	get overlapping amount
	const OverlapArea = GetBox3Area(OverlapBox.Min,OverlapBox.Max);
	if ( OverlapArea > 0 )
		return true;
	return false;
}

export function GetBox3Overlap(BoxMinA,BoxMaxA,BoxMinB,BoxMaxB)
{
	const AreaA = GetBox3Area( BoxMinA, BoxMaxA );
	const AreaB = GetBox3Area( BoxMinB, BoxMaxB );
	const OverlapBox = GetOverlappedBox3(BoxMinA,BoxMaxA,BoxMinB,BoxMaxB);
	const OverlapArea = GetBox3Area(OverlapBox.Min,OverlapBox.Max);

	if ( OverlapArea > AreaA || OverlapArea > AreaB )
	{
		const OverlapBox2 = GetOverlappedBox3(BoxMinA,BoxMaxA,BoxMinB,BoxMaxB);
		throw `Math error, Overlap is bigger than boxes`;
	}
	
	if ( AreaB == 0 )
		return 0;

	const OverlapNormal = OverlapArea / AreaB;
	return OverlapNormal;
}


export function GetIntersectionTimeRayBox3(RayStart,RayDirection,BoxMin,BoxMax)
{
	let tmin = -Infinity;
	let tmax = Infinity;
	
	for ( let dim=0;	dim<3;	dim++ )
	{
		let AxisDir = RayDirection[dim];
		if ( AxisDir == 0 )
			continue;
		let tx1 = ( BoxMin[dim] - RayStart[dim] ) / AxisDir;
		let tx2 = ( BoxMax[dim] - RayStart[dim] ) / AxisDir;
		
		let min = Math.min( tx1, tx2 );
		let max = Math.max( tx1, tx2 );
		tmin = Math.max( tmin, min );
		tmax = Math.min( tmax, max );
	}
	
	//	invalid input ray (dir = 000)
	if ( tmin === null )
	{
		//	gr: maybe this should throw
		//Pop.Debug("GetIntersectionRayBox3 invalid ray", RayStart, RayDirection );
		return false;
	}
	
	//	ray starts inside box... maybe change this return so its the exit intersection?
	if ( tmin < 0 )
	{
		//return RayStart;
		return false;
	}
	
	
	//	ray miss
	if ( tmax < tmin )
		return false;
	//	from inside? or is this behind
	if ( tmax < 0.0 )
		return false;
	
	return tmin;
}

export function GetIntersectionRayBox3(RayStart,RayDirection,BoxMin,BoxMax)
{
	const IntersectionTime = GetIntersectionTimeRayBox3( RayStart, RayDirection, BoxMin, BoxMax );
	if ( IntersectionTime === false )
		return false;
	
	let Intersection = Multiply3( RayDirection, [IntersectionTime,IntersectionTime,IntersectionTime] );
	Intersection = Add3( RayStart, Intersection );
	
	return Intersection;
}


export function GetIntersectionLineBox3(Start,End,BoxMin,BoxMax)
{
	const Direction = Subtract3( End, Start );
	
	const IntersectionTime = GetIntersectionTimeRayBox3( Start, Direction, BoxMin, BoxMax );
	if ( IntersectionTime === false )
		return false;

	if ( IntersectionTime > 1 )
		return false;

	let Intersection = Multiply3( Direction, [IntersectionTime,IntersectionTime,IntersectionTime] );
	Intersection = Add3( Start, Intersection );
	
	return Intersection;
}

//	returns signed distance, so if negative, point is behind plane.
export function GetDistanceToPlane(Plane4,Position3)
{
	//	plane should be normalised
	const Distance = Dot3( Position3, Plane4 ) + Plane4[3];
	return Distance;
	/*
	 // n must be normalized
	 return dot(p,n.xyz) + n.w;
	 
	 const a = Plane4[0];
	 const b = Plane4[1];
	 const c = Plane4[2];
	 const d = Plane4[3];
	 const x = Position3[0];
	 const y = Position3[1];
	 const z = Position3[2];
	 const Distance = (a * x + b * y + c * z + d);
	 return Distance;
	 */
}

export function InsideMinusOneToOne(f)
{
	return ( f>=-1 && f<= 1 );
}

export function PositionInsideBoxXZ(Position3,Box3)
{
	if ( Position3[0] < Box3.Min[0] )	return false;
	//if ( Position3[1] < Box3.Min[1] )	return false;
	if ( Position3[2] < Box3.Min[2] )	return false;
	if ( Position3[0] > Box3.Max[0] )	return false;
	//if ( Position3[1] > Box3.Max[1] )	return false;
	if ( Position3[2] > Box3.Max[2] )	return false;
	return true;
}


//	4 control points
export function GetBezier4Position(Start,ControlA,ControlB,End,Time)
{
	function GetBezier(p0,p1,p2,p3,t)
	{
		const OneMinusTcu = (1-t) * (1-t) * (1-t);
		const OneMinusTsq = (1-t) * (1-t);
		const Tsq = t*t;
		const Tcu = t*t*t;
		//	https://javascript.info/bezier-curve
		const p = OneMinusTcu*p0 + 3*OneMinusTsq*t*p1 +3*(1-t)*Tsq*p2 + Tcu*p3;
		return p;
	}

	const Out = [];
	const Dims = Start.length;
	for ( let d=0;	d<Dims;	d++ )
	{
		const p0 = Start[d];
		const p1 = ControlA[d];
		const p2 = ControlB[d];
		const p3 = End[d];
		const p = GetBezier(p0,p1,p2,p3,Time);
		Out[d] = p;
	}
	return Out;
}
	

//	wait, is this cubic? it's not quadratic!
//	gr: this uses 3 points, can calc middle, rename it!
export function GetCubicBezierPosition(Start,Middle,End,Time,TravelThroughMiddle=false)
{
	//P = (1-t)2P1 + 2(1-t)tP2 + t2P3
	
	function GetBezier(p0,p1,p2,t)
	{
		const oneMinusT = 1 - t;
		const oneMinusTsq = oneMinusT * oneMinusT;
		const tsq = t*t;
		return (p0*oneMinusTsq) + (p1 * 4.0 * t * oneMinusT) + (p2 * tsq);
	}
	
	//	calculate the middle control point so it goes through middle
	//	https://stackoverflow.com/a/6712095/355753
	//const ControlMiddle_x = GetBezier(Start[0], Middle[0], End[0], 0.5 );
	//const ControlMiddle_y = GetBezier(Start[1], Middle[1], End[1], 0.5 );
	//const ControlMiddle_z = GetBezier(Start[2], Middle[2], End[2], 0.5 );
	const GetControl = function(a,b,c,Index)
	{
		const p0 = a[Index];
		const p1 = b[Index];
		const p2 = c[Index];
		
		//	x(t) = x0 * (1-t)^2 + 2 * x1 * t * (1 - t) + x2 * t^2
		//	x(t=1/2) = xt = x0 * 1/4 + 2 * x1 * 1/4 + x2 * 1/4
		//	x1/2 = xt - (x0 + x2)/4
		let pc = p1 - ((p0 + p2)/4);
		return pc;
		
		//	need to work out what p1/middle/control point should be when
		//	t=0.5 == p1
		//	https://stackoverflow.com/a/9719997/355753
		//const pc = 2 * (p1 - (p0 + p2)/2);
		//return pc;
	}
	const GetControlPoint = function(a,b,c)
	{
		const ControlMiddle_x = GetControl( Start, Middle, End, 0 );
		const ControlMiddle_y = GetControl( Start, Middle, End, 1 );
		const ControlMiddle_z = GetControl( Start, Middle, End, 2 );
		const ControlMiddle = [ ControlMiddle_x, ControlMiddle_y, ControlMiddle_z ];
		return ControlMiddle;
	}
	
	//	calculate where the control point needs to be for t=0.5 to go through the middle point
	if ( TravelThroughMiddle )
	{
		Middle = GetControlPoint( Start, Middle, End );
	}

	//	enum dimensions
	let Position = [];
	for ( let i=0;	i<Start.length;	i++ )
	{
		let p0 = Start[i];
		let p1 = Middle[i];
		let p2 = End[i];
		
		Position[i] = GetBezier( p0, p1, p2, Time );
	}
	return Position;
}


//	this gives a point between Start & End
export function GetCatmullPosition(Previous,Start,End,Next,Time)
{
	function GetCatmull(p0,p1,p2,p3,t)
	{
		//	https://github.com/chen0040/cpp-spline/blob/master/spline/src/main/cpp/CatmullRom.cpp
		let u = t;
		let Result = u * u * u * ( (-1) * p0 + 3 * p1 - 3 * p2 + p3) / 2;
		Result += u * u * ( 2 * p0 - 5 * p1 + 4 * p2 - p3) / 2;
		Result += u * ((-1) * p0 + p2) / 2;
		Result += p1;
		return Result;
	}

	//	enum the dimensions
	let Position = [];
	for ( let i=0;	i<Start.length;	i++ )
	{
		let p0 = Previous[i];
		let p1 = Start[i];
		let p2 = End[i];
		let p3 = Next[i];
		Position[i] = GetCatmull( p0, p1, p2, p3, Time );
	}
	return Position;
}

//	Time normalised along the path to cope with looping
export function GetCatmullPathPosition(Path,Time,Loop=false)
{
	if ( Time > 1 )
		throw "GetCatmullPathPosition(Time="+Time+") should have normalised time";
	
	if ( Path.length < 4 )
		throw "Catmull path must have at least 4 points (this has "+ Path.length + ")";
	
	if ( Loop )
		Time *= Path.length;
	else
		Time *= Path.length - 1;
	
	//	get index from time
	let Start = Math.floor( Time );
	
	//	we calc the points between [Prev] Start & End [Next]
	let Previous = Start - 1;
	let End = Start + 1;
	let Next = End + 1;
	
	//	we're calculating points between start & end
	const Lerp = range( Start, End, Time );
	if ( Lerp < 0 || Lerp > 1 )
		throw "Trying to calculate wrong time between Start=" + Start + " End=" + End + " Time="+Time;

	//	wrap numbers around if looping
	//	otherwise clamp
	let FixIndex = null;
	
	if ( Loop )
	{
		FixIndex = function(Index)
		{
			if ( Index < 0 )			Index += Path.length;
			if ( Index >= Path.length )	Index -= Path.length;
			return Index;
		}
	}
	else
	{
		FixIndex = function(Index)
		{
			Index = clamp( 0, Path.length-1, Index );
			return Index;
		}
	}
	
	Previous = FixIndex( Previous );
	Start = FixIndex( Start );
	End = FixIndex( End );
	Next = FixIndex( Next );
	
	//	indexes should be correct now
	if ( Next >= Path.length )
		throw "Next is wrong";
	if ( Previous < 0 )
		throw "Previous is wrong";
	
	const Pos = GetCatmullPosition( Path[Previous], Path[Start], Path[End], Path[Next], Lerp );
	return Pos;
}



//	generic function, which we can cache
let RandomFloatCache = {};
export function FillRandomFloat(Array,Min=0,Max=1)
{
	if ( Array.constructor != Float32Array )
		throw `Expecting Array(${typeof Array}/${Array.constructor}) to be Float32Array`;
	
	//	see if the old cache is big enough
	const CacheName = `Float_${Min}_${Max}`;
	
	function WriteRandom(Array,Start,Length)
	{
		Pop.Debug(`WriteRandom(${Start},${Length})`,Array);
		for ( let i=Start;	i<Start+Length;	i++ )
			Array[i] = Lerp( Min, Max, Math.random() );
	}
	
	const TargetSize = Array.length;
	
	//	resize/create cache
	if ( RandomFloatCache.hasOwnProperty(CacheName) )
	{
		//	check if its big enough
		const Cache = RandomFloatCache[CacheName];
		if ( Cache.length < TargetSize )
		{
			//	todo: save old, alloc new, memcpy into new
			Cache = null;
		}
	}
	
	if ( !RandomFloatCache[CacheName] )
	{
		//	new cache
		const Cache = new Float32Array(TargetSize);
		WriteRandom(Cache,0,Cache.length);
		RandomFloatCache[CacheName] = Cache;
	}
	
	//	copy to target
	const Cache = RandomFloatCache[CacheName];
	Array.set( Cache, 0, Array.length );
}


//	expecting array[16]
export function GetMatrixTransposed(Matrix4x4)
{
	//	todo: slice to retain input type (array, float32array etc)
	//const Trans = Matrix4x4.slice();
	const m = Matrix4x4;
	const Transposed =
	[
		m[0],	m[4],	m[8],	m[12],
	 	m[1],	m[5],	m[9],	m[13],
	 	m[2],	m[6],	m[10],	m[14],
	 	m[3],	m[7],	m[11],	m[15]
	];
	return Transposed;
}


//	expecting direction to be normalised
export function GetRayPositionAtTime(Position,Direction,Time)
{
	let Offset = Multiply3( Direction, [Time,Time,Time] );
	let RayPos = Add3( Position, Offset );
	return RayPos; 
}

//	expecting ray & plane to be in same space
//	expecting dir to be normalised
//	returns null or intersection position
export function GetPlaneIntersection(RayPosition,RayDirection,Plane)
{
	//	https://gist.github.com/doxas/e9a3d006c7d19d2a0047
	let PlaneOffset = Plane[3];
	let PlaneNormal = Plane.slice(0,3);
	let PlaneDistance = -PlaneOffset;
	let Denom = Dot3( RayDirection, PlaneNormal);
	let t = -( Dot3( RayPosition, PlaneNormal ) + PlaneDistance) / Denom;
	
	//	wrong side, enable for 2 sided
	let DoubleSided = true;//false;
	
	let Min = 0.01;
	
	if ( t <= Min && !DoubleSided )
		return false;
	
	const IntersectionPos = GetRayPositionAtTime( RayPosition, RayDirection, t );
	return IntersectionPos;
}

export function GetIntersectionRayTriangle3(RayStart,RayDirection,a,b,c)
{
	//	https://www.scratchapixel.com/lessons/3d-basic-rendering/ray-tracing-rendering-a-triangle/ray-triangle-intersection-geometric-solution
	//	get plane normal
	const ab = Subtract3(b,a);
	const ac = Subtract3(c,a);
	//	dont need to normalise?
	let Normal = Cross3(ab,ac);
	//const Area = Math.Length3(Normal);
	
	//	find intersection on plane
	
	//	check if ray and plane are parallel	|- so dot=0
	const kEpsilon = 0.0001;
	let NormalDotRayDirection = Dot3( Normal, RayDirection );
	if ( Math.abs(NormalDotRayDirection) < kEpsilon )
		return false;
	
	//	if this is positive, triangle is facing away (normal in same direction as our ray)
	//	we want 2 sided, we don't want to care about winding, so flip
	/*if ( NormalDotRayDirection > 0 )
	{
		Normal = Math.Cross3(ac,ab);
		NormalDotRayDirection = Dot3( Normal, RayDirection );
	}*/
	
	//	get plane distance (origin to plane, its the length a-0 along the normal)
	const TrianglePlaneDistance = Dot3( Normal, a );
	
	//	solve
	//	intersection = start + (dir*t)
	//	get plane intersection time
	//	RayToPlaneDistance is plane's D for the ray (compared to triangle plane distance)
	const RayToPlaneDistance = Dot3( Normal, RayStart);
	
	//	therefore distance from ray origin to triangle is
	//	RayToPlaneDistance + TrianglePlaneDistance
	//	but along the ray, it's relative to the direction compared to the plane normal
	const DistanceRayToTriangle = RayToPlaneDistance - TrianglePlaneDistance;
	let IntersectionTime = DistanceRayToTriangle / NormalDotRayDirection;

	//	normal is opposite to ray dir, so NormalDotRayDirection will be negative, so flip it
	IntersectionTime = -IntersectionTime;
	
	//	start of ray is behind plane
	if ( IntersectionTime < 0 )
	{
		//return false;
	}
	
	//	get the plane intersection pos
	const IntersectionPosition = Add3( RayStart, Multiply3( RayDirection, [IntersectionTime,IntersectionTime,IntersectionTime] ) );
	//Pop.Debug(`IntersectionTime=${IntersectionTime}`);
	//return IntersectionPosition;
	
	//	test if point is inside triangle
	let TotalSign = 0;
	{
		const p = IntersectionPosition;
		const ab = Subtract3( b, a );
		const pa = Subtract3( p, a );
		const cross = Cross3( ab, pa );
		const nc = Dot3( Normal, cross );
		if ( nc < 0 )
			return false;
		TotalSign += nc;
	}
	
	{
		const p = IntersectionPosition;
		const bc = Subtract3( c, b );
		const pb = Subtract3( p, b );
		const cross = Cross3( bc, pb );
		const nc = Dot3( Normal, cross );
		if ( nc < 0 )
			return false;
		TotalSign += nc;
	}

	{
		const p = IntersectionPosition;
		const ca = Subtract3( a, c );
		const pc = Subtract3( p, c );
		const cross = Cross3( ca, pc );
		const nc = Dot3( Normal, cross );
		if ( nc < 0 )
			return false;
		TotalSign += nc;
	}
	/*	gr: this is always 1...
	Pop.Debug(`TotalSign=${TotalSign}`);
	if ( TotalSign > 2 )
		return false;
*/
	return IntersectionPosition;
}

/*	get SDF distance, merge with above
DistanceToTriangle3 = function(Position,a,b,c)
{
	const p = Position;
	const ba = Subtract3(b, a);
	const pa = Subtract3(p, a);
	const cb = Subtract3(c, b);
	const pb = Subtract3(p, b);
	const ac = Subtract3(a, c);
	const pc = Subtract3(p, c);
	const nor = cross3( ba, ac );

	//	work out which side of each edge we're on
	const Sideab = sign(dot(cross(ba,nor),pa));
	const Sidecb = sign(dot(cross(cb,nor),pb));
	const Sideac = sign(dot(cross(ac,nor),pc));
	const TotalSign = Sideab + Sidecb + Sideac;
	
	let DistanceSq;
	
	if ( TotalSign < 2 )
	{
		DistanceSq = min( min(
				 dot2(ba*clamp(dot(ba,pa)/dot2(ba),0.0,1.0)-pa),
				 dot2(cb*clamp(dot(cb,pb)/dot2(cb),0.0,1.0)-pb) ),
			dot2(ac*clamp(dot(ac,pc)/dot2(ac),0.0,1.0)-pc) )
	}
	else
	{
		DistanceSq = dot(nor,pa)*dot(nor,pa)/dot2(nor) )
	}
	
	return Math.sqrt(DistanceSq);
}
*/

export function GetDistanceToRect(xy,Rect)
{
	function sdBox(p,b)
	{
		//	b = "radius"
		//	vec2 d = abs(p)-b;
		let dx = Math.abs(p[0]) - b[0];
		let dy = Math.abs(p[1]) - b[1];
		
		//	return length(max(d,0.0)) + min(max(d.x,d.y),0.0);
		const max_d_0 = [ Math.max(dx,0), Math.max(dy,0) ];
		const length_max_d_0 = Length2(max_d_0);
		const minmax_dx_0 = Math.min( Math.max(dx,dy), 0 );

		return length_max_d_0 + minmax_dx_0;
	}
	
	const HalfWidth = Rect[2]/2;
	const HalfHeight = Rect[3]/2;
	
	const px = xy[0] - (Rect[0]+HalfWidth);
	const py = xy[1] - (Rect[1]+HalfHeight);
	return sdBox( [px,py], [HalfWidth,HalfHeight] );
}

export function GetDistanceToCircle(xy,CirclePosRadius)
{
	const Distance = Distance2(xy,CirclePosRadius);
	const Radius = CirclePosRadius[2];
	return Distance - Radius;
}

export function GetTimeAlongLine2(Position,Start,End)
{
	//	direction or End-in-localspace
	const Direction = Subtract2( End, Start );
	const DirectionLength = Length2( Direction );
	const LocalPosition = Subtract2( Position, Start );
	if ( DirectionLength == 0 )
		return 0;
	const Projection = Dot2( LocalPosition, Direction) / (DirectionLength*DirectionLength);
	return Projection;
}

export function GetNearestPointOnLine2(Position,Start,End)
{
	let Projection = GetTimeAlongLine2( Position, Start, End );
	
	//	clamp to line
	//	past start
	Projection = Math.max( 0.0, Projection );
	//	past end
	Projection = Math.min( 1.0, Projection );
	
	const Near = Lerp2( Start, End, Projection );
	return Near;
}

export function GetDistanceToLine2(Position,Start,End)
{
	//	todo: LineButt & LineSquare versions
	const Near = GetNearestPointOnLine2(Position,Start,End);
	const Distance = Distance2(Position,Near);
	return Distance;
}


//	Corners is an array of [x,y] arrays
//	gr: dont need a Center but current use pre-calcs it anyway
export function GetDistanceToPolygon2(Position,Corners,Center)
{
	const uv = Position;
	
	function sign(p1,p2,p3)
	{
		const p1_x = p1[0];
		const p1_y = p1[1];
		const p2_x = p2[0];
		const p2_y = p2[1];
		const p3_x = p3[0];
		const p3_y = p3[1];
		return (p1_x - p3_x) * (p2_y - p3_y) - (p2_x - p3_x) * (p1_y - p3_y);
	}
	
	//	glsl sign
	//	sign returns -1.0 if x<0.0, 0.0 if x=0.0 and 1.0 if x>0.0.
	function sign(f)
	{
		if ( f == 0 )	return 0;
		if ( f < 0 )	return -1;
		return 1;
	}
	
	//	note GLSL and Math.clamp are different orders!
	function clamp2(Value,Min,Max)
	{
		return Clamp2(Min,Max,Value);
	}
	function clamp(Value,Min,Max)
	{
		return Clamp(Min,Max,Value);
	}
	
	//	float sdSegment( in vec2 p, in vec2 a, in vec2 b )
	function sdSegment(p,a,b)
	{
		const pa = Subtract2(p,a);
		const ba = Subtract2(b,a);
		const delta = Dot2(ba,ba);
		const h = (delta == 0) ? 0 : clamp( Dot2(pa,ba)/delta, 0.0, 1.0 );
		const baScaled = Multiply2( ba, [h,h] );
		return Distance2( pa, baScaled );
	}
	
	function sdTriangle(p,p0,p1,p2 )
	{
		//	get edges/deltas
		const e0 = Subtract2(p1,p0);
		const e1 = Subtract2(p2,p1);
		const e2 = Subtract2(p0,p2);
		const v0 = Subtract2(p ,p0);
		const v1 = Subtract2(p ,p1);
		const v2 = Subtract2(p ,p2);
		const e0_x = e0[0];
		const e0_y = e0[1];
		const e1_x = e1[0];
		const e1_y = e1[1];
		const e2_x = e2[0];
		const e2_y = e2[1];
		
		const e0_LocalScale = clamp( Dot2(v0,e0)/Dot2(e0,e0), 0.0, 1.0 );
		const e1_LocalScale = clamp( Dot2(v1,e1)/Dot2(e1,e1), 0.0, 1.0 );
		const e2_LocalScale = clamp( Dot2(v2,e2)/Dot2(e2,e2), 0.0, 1.0 );
		const pq0 = Subtract2(v0,Multiply2(e0,[e0_LocalScale,e0_LocalScale]));
		const pq1 = Subtract2(v1,Multiply2(e1,[e1_LocalScale,e1_LocalScale]));
		const pq2 = Subtract2(v2,Multiply2(e2,[e2_LocalScale,e2_LocalScale]));
		const s = sign( e0_x*e2_y - e0_y*e2_x );
		
		const pq0_lengthsq = Dot2(pq0,pq0);
		const pq1_lengthsq = Dot2(pq1,pq1);
		const pq2_lengthsq = Dot2(pq2,pq2);
		
		const v0_x = v0[0];
		const v0_y = v0[1];
		const v1_x = v1[0];
		const v1_y = v1[1];
		const v2_x = v2[0];
		const v2_y = v2[1];
		
		const pq0_signeddistance2 = [pq0_lengthsq, s*(v0_x*e0_y-v0_y*e0_x)];
		const pq1_signeddistance2 = [pq1_lengthsq, s*(v1_x*e1_y-v1_y*e1_x)];
		const pq2_signeddistance2 = [pq2_lengthsq, s*(v2_x*e2_y-v2_y*e2_x)];
		
		const d = min2( pq0_signeddistance2, pq1_signeddistance2, pq2_signeddistance2 );
		return -Math.sqrt(d[0]) * sign(d[1]);
	}
	
	//	get center as 3rd corner of triangle
	//const Center = GetCenterPosition();
	if ( !Center )
		throw `GetDistanceToPolygon2() todo: calc the center, make it optional`;
	
	let MinDistance = 999.0;
	for ( let i=0;	i<Corners.length-1;	i++ )
	{
		const a = Corners[i+0];
		const b = Corners[i+1];
		
		//	get distance to outer edge
		let EdgeDistance = sdSegment(uv,a,b);
		
		//	then workout if inside or not
		let InsideDistance = sdTriangle( uv, a, b, Center );
		
		let Distance;
		if ( InsideDistance < 0.0 )
		{
			//	the inside is per triangle, so we'll get triangle distances rather than a polygon distance
			//Distance = InsideDistance;
			Distance = -EdgeDistance;
		}
		else
		{
			Distance = EdgeDistance;
		}
		
		//	we need the LARGEST inner size
		//	gr: this hasn't helped... something wrong with sdSegment distances?
		if ( MinDistance < 0.0 && Distance < 0.0 )
			MinDistance = Math.max( MinDistance, Distance );
		else
			MinDistance = Math.min( Distance, MinDistance );
	}
	
	return MinDistance;
}


export function GetRayRayIntersection3(StartA,DirA,StartB,DirB)
{
	//	must be normalised to match c# version
	const da = Normalise3(DirA);
	const db = Normalise3(DirB);

	const dc = Subtract3(StartB,StartA);

	const dadb_cross = Cross3(da, db);
	const dcdb_cross = Cross3(dc, db);
	const dcda_cross = Cross3(dc, da);

	const sa = Dot3(dcdb_cross, dadb_cross) / LengthSq3(dadb_cross);
	const sb = Dot3(dcda_cross, dadb_cross) / LengthSq3(dadb_cross);

	const Result = {};
	Result.IntersectionTimeA = sa;
	Result.IntersectionTimeB = sb;
	return Result;
}
/*

void GetLineLineIntersection3(float3 StartA,float3 EndA,float3 StartB,float3 EndB,out float IntersectionTimeA,out float IntersectionTimeB)
{
	float LengthA = length(EndA - StartA);
	float LengthB = length(EndB - StartB);
		
	float3 DirA = (EndA - StartA);
	float3 DirB = (EndB - StartB);
	GetRayRayIntersection3( StartA, DirA, StartB, DirB, IntersectionTimeA, IntersectionTimeB );

	//	Intersection time is along ray in world units, even though we normalised the dir. 
	//	if they cross at ita=2 then thats still 2 in world space
	//	so divide to get it relative to the line
	IntersectionTimeA /= LengthA;
	IntersectionTimeB /= LengthB;
}


void GetLineLineIntersection3Clamped(float3 StartA,float3 EndA,float3 StartB,float3 EndB,out float IntersectionTimeA,out float IntersectionTimeB)
{
	GetLineLineIntersection3( StartA, EndA, StartB, EndB, IntersectionTimeA, IntersectionTimeB);
	IntersectionTimeA = Clamp01(IntersectionTimeA);
	IntersectionTimeB = Clamp01(IntersectionTimeB);
}
*/



function GaussianElimination(A,n)
{
	// originally by arturo castro - 08/01/2010
	//
	// ported to c from pseudocode in
	// http://en.wikipedia.org/wiki/Gaussian_elimination
	
	let i = 0;
	let m = n - 1;
	for ( let j=0;	j<n && i<m;	j++ )
	{
		// Find pivot in column j, starting in row i:
		let maxi = i;
		for (let k = i + 1; k < m; k++)
		{
			let a_k_j = Math.abs(A[k][j]);
			let a_maxi_j = Math.abs(A[maxi][j]);
			if (a_k_j > a_maxi_j)
			{
				maxi = k;
			}
		}
		let a_maxi_j = A[maxi][j];
		if (a_maxi_j != 0)
		{
			//console.log( a_maxi_j + " != 0" );
			//swap rows i and maxi, but do not change the value of i
			if (i != maxi)
			{
				for (let k = 0; k < n; k++)
				{
					let aux = A[i][k];
					A[i][k] = A[maxi][k];
					A[maxi][k] = aux;
				}
			}
			//Now A[i,j] will contain the old value of A[maxi,j].
			//divide each entry in row i by A[i,j]
			let A_ij = A[i][j];
			for (let k = 0; k < n; k++)
			{
				A[i][k] /= A_ij;
			}
			//Now A[i,j] will have the value 1.
			for (let u = i + 1; u < m; u++)
			{
				//subtract A[u,j] * row i from row u
				let A_uj = A[u][j];
				for (let k = 0; k < n; k++)
				{
					let neg = A_uj * A[i][k];
					let auk = A[u][k];
					A[u][k] = auk - neg;
				}
				//Now A[u,j] will be 0, since A[u,j] - A[i,j] * A[u,j] = A[u,j] - 1 * A[u,j] = 0.
			}
			
			i++;
		}
	}
	
	//back substitution
	for (let k = m - 2; k >= 0; k--)
	{
		for (let l = k + 1; l < n - 1; l++)
		{
			A[k][m] -= A[k][l] * A[l][m];
			//A[i*n+j]=0;
		}
	}
}
	
export function CalcHomography(src,dest,Plane='xy')
{
	function ArrayToXy(xy)
	{
		if ( xy.x !== undefined )
			return xy;
		const x = xy[0];
		const y = xy[1];
		xy = {};
		xy.x = x;
		xy.y = y;
		return xy;
	}
	src = src.map(ArrayToXy);
	dest = dest.map(ArrayToXy);
	
	// originally by arturo castro - 08/01/2010
	//
	// create the equation system to be solved
	//
	// from: Multiple View Geometry in Computer Vision 2ed
	//       Hartley R. and Zisserman A.
	//
	// x' = xH
	// where H is the homography: a 3 by 3 matrix
	// that transformed to inhomogeneous coordinates for each point
	// gives the following equations for each point:
	//
	// x' * (h31*x + h32*y + h33) = h11*x + h12*y + h13
	// y' * (h31*x + h32*y + h33) = h21*x + h22*y + h23
	//
	// as the homography is scale independent we can let h33 be 1 (indeed any of the terms)
	// so for 4 points we have 8 equations for 8 terms to solve: h11 - h32
	// after ordering the terms it gives the following matrix
	// that can be solved with gaussian elimination:
	
	
	let P = [
			 [-src[0].x, -src[0].y, -1,   0,   0,  0, src[0].x*dest[0].x, src[0].y*dest[0].x, -dest[0].x ], // h11
			 [  0,   0,  0, -src[0].x, -src[0].y, -1, src[0].x*dest[0].y, src[0].y*dest[0].y, -dest[0].y ], // h12
			 
			 [-src[1].x, -src[1].y, -1,   0,   0,  0, src[1].x*dest[1].x, src[1].y*dest[1].x, -dest[1].x ], // h13
			 [  0,   0,  0, -src[1].x, -src[1].y, -1, src[1].x*dest[1].y, src[1].y*dest[1].y, -dest[1].y ], // h21
			 
			 [-src[2].x, -src[2].y, -1,   0,   0,  0, src[2].x*dest[2].x, src[2].y*dest[2].x, -dest[2].x ], // h22
			 [  0,   0,  0, -src[2].x, -src[2].y, -1, src[2].x*dest[2].y, src[2].y*dest[2].y, -dest[2].y ], // h23
			 
			 [-src[3].x, -src[3].y, -1,   0,   0,  0, src[3].x*dest[3].x, src[3].y*dest[3].x, -dest[3].x ], // h31
			 [  0,   0,  0, -src[3].x, -src[3].y, -1, src[3].x*dest[3].y, src[3].y*dest[3].y, -dest[3].y ], // h32
			 ];
	
	GaussianElimination( P, 9);
	

	let Row0,Row1,Row2,Row3;
	
	//	gr: to let us invert, need determinet to be non zero
	let m22 = 1;
	
	if ( Plane == 'xy' )
	{
		//	z = identity
		Row0 = [ P[0][8], P[1][8],	0, P[2][8] ];
		Row1 = [ P[3][8], P[4][8],	0, P[5][8] ];
		Row2 = [ 0, 		0, 		m22, 0 ];
		//	translation
		Row3 = [ P[6][8], P[7][8],	0, 1 ];
	}
	else if ( Plane == 'xz' )
	{
		//	y = identity
		Row0 = [ P[0][8],	0,		P[1][8],	P[2][8] ];
		Row1 = [ 0,			m22,	0,			0		 ];
		Row2 = [ P[3][8],	0, 		P[4][8],	P[5][8] ];
		//	translation
		Row3 = [ P[6][8],	0,		P[7][8],	1 ];
	}
	else
	{
		throw `Unhandled output plane ${Plane}; expecting xy or xz`;
	}
	
	//	if we setrow() for each, we'll get an exception as unity checks validity of the matrix
	//let HomographyMtx = new Matrix4x4(Rows4[0], Rows4[1], Rows4[2], Rows4[3]);
	const HomographyMtx = 
	[
		...Row0,
		...Row1,
		...Row2,
		...Row3,
	];
	
	return HomographyMtx;
}

//	this expects to be a homography transform to a... 0..1 square on a plane
//	if you decide 0...1 means something else, that's fine!
export function GetCameraPoseFromHomography(Homography4x4)
{
	//	gr: all this code is based on 3x3 column major
	//		which we dont do. depending on the plane mode we've filled a row
	//	which is what xyw() is for
	/*
	//	z = identity
		Row0 = [ P[0][8], P[1][8],	0, P[2][8] ];
		Row1 = [ P[3][8], P[4][8],	0, P[5][8] ];
		Row2 = [ 0, 		0, 		m22, 0 ];
		//	translation
		Row3 = [ P[6][8], P[7][8],	0, 1 ];
	*/
	if ( Homography4x4.length != 4*4 )
		throw `Expecting a 4x4 homography; length=${Homography4x4.length}`;

	function GetColumn(c)
	{
		return GetRow(c);
		let Col = [c+0,c+4,c+8,c+12].map( Index => Homography4x4[Index] );
		return xyw(Col);
	}
	function GetRow(r)
	{
		let Row = Homography4x4.slice( r*4, (r+1)*4 );
		return xyw(Row);
	}
	
	//	https://stackoverflow.com/a/10781165/355753
	//pose = Mat::eye(3, 4, CV_32FC1);      // 3x4 matrix, the camera pose
	//let Pose = CreateIdentityMatrix();
	let Pose4x4 = 
	[
		1,0,0,0,
		0,1,0,0,
		0,0,1,0,
		0,0,0,1
	];
	function SetColumn(c,xyz)
	{
		//Pose4x4[c+0] = xyz[0];
		//Pose4x4[c+4] = xyz[1];
		//Pose4x4[c+8] = xyz[2];
		//	set transposed
		//	column is row when transposed
		Pose4x4[ (c*4)+0 ] = xyz[0];
		Pose4x4[ (c*4)+1 ] = xyz[1];
		Pose4x4[ (c*4)+2 ] = xyz[2];
	}
	
	let norm1 = Length3(GetColumn(0));
	let norm2 = Length3(GetColumn(1));
	let tnorm = (norm1 + norm2) / 2.0;	// Normalization value 

	function xyw(xyzw)
	{
		return [xyzw[0], xyzw[1], xyzw[3] ];
	}

	//	another implementation here
	//	https://stackoverflow.com/q/17027277/355753

	//Mat p1 = H.col(0);       // Pointer to first column of H
	//Mat p2 = pose.col(0);    // Pointer to first column of pose (empty)
	//cv::normalize(p1, p2);   // Normalize the rotation, and copies the column to pose
	let col0 = Normalise3( GetColumn(0) );
	SetColumn(0, col0);

	//p1 = H.col(1);           // Pointer to second column of H
	//p2 = pose.col(1);        // Pointer to second column of pose (empty)
	//cv::normalize(p1, p2);   // Normalize the rotation and copies the column to pose
	let col1 = Normalise3( GetColumn(1) );
	SetColumn(1, col1);

	//Mat p3 = p1.cross(p2);   // Computes the cross-product of p1 and p2
	//Mat c2 = pose.col(2);    // Pointer to third column of pose
	//p3.copyTo(c2);       // Third column is the crossproduct of columns one and two
	let p1 = col0;//GetColumn(0);
	let p2 = col1;//GetColumn(1);
	let p3 = Cross3( p1, p2 );
	SetColumn(2,p3);

	//	translation
	//pose.col(3) = H.col(2) / tnorm;  //vector t [R|t] is the last column of pose
	//	col2 is col3 in our 4x4
	//let col2 = GetColumn(2);
	let col2 = GetColumn(3);
	col2 = Divide3( col2, [tnorm,tnorm,tnorm] );
	SetColumn(3,col2);

	return Pose4x4;
/*
	//	gr: adapted from my c# version, https://github.com/NewChromantics/PopOpenvrOsc/blob/e36841046d06344b8411695c94e760d43f75e1b0/Assets/Calibration/PopHomography.cs#L10
	//	which I think was just taken from opencv's decompose homography
	//	https://stackoverflow.com/questions/17027277/android-opencv-homography-to-camera-pose-considering-camera-intrinsics-and-ba 
	//	opencv says, dont do that though, use solvepnp
	
	
	
	let h = Homography4x4;
	let norm1 = Length4(GetColumn(0));
	let norm2 = Length4(GetColumn(1));
	let tnorm = (norm1 + norm2) / 2.0;	// Normalization value 

	function xyw(xyzw)
	{
		return [xyzw[0], xyzw[1], xyzw[3] ];
	}

	function Mult(v3,Scale)
	{
		return Mult3( v3, [Scale,Scale,Scale] );
	}

	//  actually 3x4 so normalisation might need to be corrected (extra 0 in z!) 
	let col0 = Normalise3( xyw( GetColumn(0) ) ); 
	let col1 = Normalise3( xyw( GetColumn(1) ) ); 
	//Pose.SetColumn(0, ); 
	//Pose.SetColumn(1,); 
	let col2 = Cross3( col0, col1 );
	
	//double[] buffer = new double[3]; 
	//h.col(2).get(0, 0, buffer); 
	var Buffer0 = col2.x; 
	var Buffer1 = col2.y; 
	var Buffer2 = col2.z; 
	//  row 0 col 3  
	var Row0Col3 = Buffer0 / tnorm; 
	var Row1Col3 = Buffer1 / tnorm; 
	var Row2Col3 = Buffer2 / tnorm; 
	var Col3 = new Vector4(Row0Col3, Row1Col3, Row2Col3, 1); 

	Position = Col3; 
	//Rotation = Quaternion.LookRotation(col2, mult(col1,1) ); 
	*/
}

//	returns false for parralel lines
//	returns [x,y,TimeAlongAOfIntersection]
export function GetRayRayIntersection(StartA,EndA,StartB,EndB)
{
	let Ax = StartA[0];
	let Ay = StartA[1];
	let Bx = EndA[0];
	let By = EndA[1];
	
	let Cx = StartB[0];
	let Cy = StartB[1];
	let Dx = EndB[0];
	let Dy = EndB[1];
	
	//  Fail if either line is undefined.
	//if (Ax==Bx && Ay==By || Cx==Dx && Cy==Dy) return NO;
	
	//	Translate the system so that point A is on the origin.
	Bx-=Ax;
	By-=Ay;
	Cx-=Ax; 
	Cy-=Ay;
	Dx-=Ax; 
	Dy-=Ay;
	
	//  Discover the length of segment A-B.
	let distAB = Math.hypot(Bx,By);
	//	gr: todo; we COULD intersect a 1x1 line still!
	if ( distAB == 0 )
	{
		console.warn(`todo: extra checks on a 1x1 line where ray/ray intersection fails`);
		return false;
	}
	
	//	Rotate the system so that point B is on the positive X axis.
	let theCos = Bx / distAB;
	let theSin = By / distAB;
	
	let newX = Cx*theCos + Cy*theSin;
	Cy = Cy*theCos - Cx*theSin; 
	Cx = newX;
	
	newX = Dx*theCos + Dy*theSin;
	Dy = Dy*theCos - Dx*theSin;
	Dx = newX;
	
	// Fail if the lines are parallel.
	if ( Cy==Dy )
		return false;
	
	//	Discover the position of the intersection point along line A-B.
	let ABpos = Dx+(Cx-Dx) * Dy/(Dy-Cy);
	
	let IntersectionX = Ax + ABpos * theCos;
	let IntersectionY = Ay + ABpos * theSin;

	//	position div length = normalised time	
	const TimeAlongA = ABpos / distAB;
	//if ( isNaN(IntersectionX) ||isNaN(IntersectionX) ||isNaN(TimeAlongA) )
	//	return false;
	
	return [IntersectionX,IntersectionY,TimeAlongA];
}

export function GetLineLineIntersection(StartA,EndA,StartB,EndB)
{
	//	get ray intersection
	const Intersection = GetRayRayIntersection(StartA,EndA,StartB,EndB);
	if ( Intersection === false )
		return false;

	//	clip to line A, return false if outside
	const TimeAlongA = Intersection[2];
	if ( TimeAlongA < 0 )
		return false;
	if ( TimeAlongA > 1 )
		return false;
	
	return Intersection.slice(0,2);
}

//	return a "distance" to how much a is inside b
//	this is essentially used to find overlapping lines, and to find
//	the weakest (smallest) line
//	a = [ [x,y] [x,y] ] 
//	b= [ [x,y], [x,y] ]
export function GetLineDistanceToLine(a,b)
{
	//	we could probably find the dot too as an early rejection
	//	but we want a score
	//	also, do we want to know if the lines intersect?
	
	//	find nearest start/end points on b
	let NearStart = GetNearestPointOnLine2( a[0], b[0], b[1] );
	let NearEnd = GetNearestPointOnLine2( a[1], b[0], b[1] );
	
	let StartDistance = Distance2( NearStart, a[0] );
	let EndDistance = Distance2( NearEnd, a[1] );
	
	if ( isNaN(StartDistance) || isNaN(EndDistance) )
		throw `GetLineDistanceToLine nan`;
		
	return StartDistance + EndDistance;
}


export function GetStraightnessOfPoints(Positions)
{
	let Directions = [];
	for ( let i=1;	i<Positions.length;	i++ )
	{
		const Prev = Positions[i-1];
		const Next = Positions[i-0];
		const Direction = Normalise3(Subtract3(Prev,Next));
		Directions.push(Direction);
	}
	let Dots = [];
	for ( let i=1;	i<Directions.length;	i++ )
	{
		const Prev = Directions[i-1];
		const Next = Directions[i-0];
		const Dot = Dot3(Prev,Next);
		Dots.push(Dot);
	}
	
	let TotalDot = 1;
	//	mult, or average?
	for ( let Dot of Dots )
		TotalDot *= Dot;
	return TotalDot;
}

export function GetRectsFromIndexes(StartIndex,EndIndex,Width,Channels,RectsNeedToStripeIndexes=true)
{
	let Stride = Channels * Width;
	
	if ( StartIndex % Channels != 0 )
		throw `Expecting first index ${StartIndex} to align with channels ${Channels}`;
	if ( EndIndex % Channels != Channels-1 )
		throw `Expecting end index ${EndIndex} to align with channels ${Channels}`;
	
	const StartPixel = StartIndex/Channels;
	const EndPixel = Math.floor(EndIndex /Channels);
	
	const Rects = [];	
	function PushRow(x,y,RowWidth)
	{
		let Rect = {};
		Rect.StartIndex = (y*Width) + x;
		Rect.EndIndex = Rect.StartIndex + RowWidth;
		Rect.StartIndex *= Channels;
		Rect.EndIndex *= Channels;
		Rect.EndIndex -= 1;
		Rect.x = x;
		Rect.y = y;
		Rect.w = RowWidth;
		Rect.h = 1;
		
		function MergeRect(LastRect)
		{
			if ( LastRect.x != Rect.x )	return false;
			if ( LastRect.w != Rect.w )	return false;
			if ( LastRect.y+LastRect.h != Rect.y )	
				return false;
			
			//	if we need data to stripe, (ie, full width rects), check it
			if ( RectsNeedToStripeIndexes )
			{
				if ( Rect.StartIndex != LastRect.EndIndex+1 )
					return false;
			}
			
			const Bottom = Rect.y+Rect.h;
			LastRect.h = Bottom - LastRect.y;
			LastRect.EndIndex = Rect.EndIndex;
			return true;
		}
		
		//	merge with above if possible
		if ( Rects.length )
		{
			const LastRect = Rects[Rects.length-1];
			if ( MergeRect(LastRect) )
				return;
		}
		Rects.push(Rect);
	}
	
	//	split indexes into rows
	let Pixel = StartPixel;
	while ( Pixel <= EndPixel )
	{
		let y = Math.floor( Pixel / Width );
		let RowStart = Pixel % Width;
		
		let RowStartPixel = (y*Width) + RowStart;
		let RowEndPixel = (y*Width) + Width-1;
		
		RowEndPixel = Math.min( RowEndPixel, EndPixel );

		const RowWidth = (RowEndPixel - RowStartPixel)+1;
		
		PushRow( RowStart, y, RowWidth );
		
		if ( RowWidth == 0 )
			throw `mis calculation, avoid infinite loop`;
		Pixel += RowWidth;
	}
	
	return Rects;
}
