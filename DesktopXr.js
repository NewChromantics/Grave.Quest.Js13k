import Camera_t from './Camera.js'

function GetTime(){	return Math.floor(performance.now());	}

let Camera = new Camera_t();
Camera.Position = [ 0,0,10 ];
Camera.LookAt = [ 0,0,0 ];
Camera.FovVertical = 45;

let CameraButton = 1;

let InputState =
{
	"0":	{	Down:false, Transform:null },
	"1":	{	Down:false, Transform:null },
	"2":	{	Down:false, Transform:null },
};

let WeaponOffset = [0,-5,10];

const ButtonMasks = [ 1<<0, 1<<2, 1<<1 ];

let MouseLastPos = null;
function OnMouseMove(Event)
{
	if ( Event.buttons & ButtonMasks[CameraButton] )
	{
		let Rect = Event.currentTarget.getBoundingClientRect();
		let ClientX = Event.pageX || Event.clientX;
		let ClientY = Event.pageY || Event.clientY;
		let x = ClientX - Rect.left;
		let y = ClientY - Rect.top;
		
		let First = MouseLastPos==null;
		x *= 1;
		y *= 1;
		Camera.OnCameraFirstPersonRotate( x, y, 0, First );
		
		MouseLastPos = [x,y];
	}
}

function OnMouseDown(Event)
{
	MouseLastPos = null;
	InputState[Event.button].Down = GetTime();
	Event.preventDefault();
}

function OnMouseUp(Event)
{
	InputState[Event.button].Down = false;
}

function Multiply3(a,b)
{
	return [ a[0]*b[0], a[1]*b[1], a[2]*b[2] ];
}

function OnMouseWheel(Event)
{
	let DeltaScale = -0.6;
	let Deltaz = Event.deltaY * DeltaScale;
	let Forward3 = Camera.GetForward();
	Forward3 = Multiply3( Forward3, [Deltaz,Deltaz,Deltaz] );
	Camera.MovePositionAndLookAt( Forward3 );
}

export default class DesktopXr
{
	constructor(Canvas)
	{
		this.Camera = Camera;
		Canvas.addEventListener('mousedown',OnMouseDown,true);
		Canvas.addEventListener('mousemove',OnMouseMove,true);
		Canvas.addEventListener('mouseup',OnMouseUp,true);
		Canvas.addEventListener('wheel',OnMouseWheel,true);
	}
	
	GetInput()
	{
		//	update transform of buttons
		for ( let Button in InputState )
		{
			InputState[Button].Transform = Camera.GetWorldTransform(WeaponOffset);
		}
		return InputState;
	}
}
