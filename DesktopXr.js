import Camera_t from './Camera.js'

function GetTime(){	return Math.floor(performance.now());	}

let Camera = new Camera_t();
Camera.Position = [ 0,1.8,8 ];
Camera.LookAt = [ 0,1.8,0 ];
Camera.FovVertical = 45;

let CameraButton = 1;
let InputState ={0:{},1:{},2:{}};
let WeaponOffset = [0,-0.5,0.5];
let ButtonMasks = [ 1<<0, 1<<2, 1<<1 ];
let MouseLastPos = null;

function OnMouse(Event)
{
	if ( Event.button == CameraButton && Event.type=='mousedown' )
		MouseLastPos = null;

	if ( Event.buttons & ButtonMasks[CameraButton] )
	{
		let Rect = Event.currentTarget.getBoundingClientRect();
		let ClientX = Event.pageX || Event.clientX;
		let ClientY = Event.pageY || Event.clientY;
		let x = ClientX - Rect.left;
		let y = ClientY - Rect.top;
		
		let First = MouseLastPos==null;
		Camera.OnCameraFirstPersonRotate( x, y, 0, First );
		
		MouseLastPos = [x,y];
	}
	
	//ButtonMasks.forEach( (bm,i) => InputState[i].Down = (Event.buttons&bm) ? GetTime() : false );
	[1<<0].forEach( (bm,i) => InputState[i].Down = (Event.buttons&bm) ? GetTime() : false );
}


function OnMouseWheel(Event)
{
	let Delta = Event.deltaY * -0.06;
	let Forward3 = Camera.GetForward(Delta);
	Camera.MovePositionAndLookAt( Forward3 );
}

export default class DesktopXr
{
	constructor(Canvas)
	{
		this.Camera = Camera;
		Canvas.addEventListener('mousedown',OnMouse,true);
		Canvas.addEventListener('mousemove',OnMouse,true);
		Canvas.addEventListener('mouseup',OnMouse,true);
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
