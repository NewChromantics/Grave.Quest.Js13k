import Pop from './PopEngine/PopEngine.js'
import FrameCounter_t from './PopEngine/FrameCounter.js'
import App_t from './RushGame.js'
import {WaitForFrame} from './PopEngine/PopWebApi.js'
import Camera_t from './PopEngine/Camera.js'
import {Add3,CreateIdentityMatrix,TransformPosition,GetMatrixTranslation,MatrixInverse4x4,SetMatrixTranslation} from './PopEngine/Math.js'

//	detect whne XR has stopped rendering and only render desktop then
let LastXrRenderTimeMs = null;


const ForceXrLayerType = null;
//const ForceXrLayerType = 'MultiView';
//const ForceXrLayerType = 'StereoLayer';
//const ForceXrLayerType = 'Classic';



class DesktopXrDevice
{
	constructor(RenderContext,RenderView,GetXrRenderCommands)
	{
		this.GetXrRenderCommands = GetXrRenderCommands;
		this.Camera = new Camera_t();
		//	try and emulate default XR pose a bit
		this.Camera.Position = [0,1.5,0];
		this.Camera.LookAt = [0,1.5,-1];
		this.Camera.FovVertical = 60;

		this.BindCameraControls(RenderView);
		
		//	emulate xr device
		this.OnMouseMove = function(xyz,Button,InputName,Transform,ExtraData){};
		this.OnMouseDown = function(xyz,Button,InputName,Transform){};
		this.OnMouseUp = function(xyz,Button,InputName,Transform){};
		
		this.RenderThreadPromise = this.RenderThread(RenderContext,RenderView);
	}
	
	BindCameraControls(RenderView)
	{
		const Camera = this.Camera;
		const Game = this.Game;
		const This = this;
		let InputName = 'Mouse';
		
		function GetTransform()
		{
			//	need a 3D position for the input device
			//	todo: remove use of precise webxr object
			let Transform = {};

			let CameraRotation = Camera.GetLocalRotationMatrix();
			CameraRotation = MatrixInverse4x4( CameraRotation );

			const WeaponOffsetLocal = [0.0,-0.15,0.3];
			let InputPosition = TransformPosition( WeaponOffsetLocal, CameraRotation );
			InputPosition = Add3( Camera.Position, InputPosition );
			
			//let Trans = PopMath.Subtract3( [0,0,0], this.Position );
			//let Translation = PopMath.CreateTranslationMatrix( ...Trans );
			//let Matrix = PopMath.MatrixMultiply4x4( Rotation, Translation );
			
			//	forward seems right on webxr camera/transform, but not our camera...
			//Weapon.LocalForward = [0,0,1];
			
			Transform.matrix = CameraRotation;
			SetMatrixTranslation( Transform.matrix, ...InputPosition );

			return Transform;
		}
	
		
		function MoveCamera(x,y,Button,FirstDown)
		{
			if ( Button == 'Right' )
				Camera.OnCameraFirstPersonRotate( x, y, 0, FirstDown!=false );
			
			if ( Button == 'Middle' )
				Camera.OnCameraPanLocal( -x, y, 0, FirstDown!=false );
		}
		
		RenderView.OnMouseDown = function(x,y,Button)
		{
			const Transform = GetTransform();
			const InputPosition = GetMatrixTranslation(Transform.matrix);
			This.OnMouseDown( InputPosition, Button, InputName, Transform );
			
			MoveCamera(x,y,Button,true);
		}
		
		RenderView.OnMouseMove = function(x,y,Button)
		{
			const Transform = GetTransform();
			const InputPosition = GetMatrixTranslation(Transform.matrix);
			This.OnMouseMove( InputPosition, Button, InputName, Transform );
			
			MoveCamera(x,y,Button,false);
		}
		
		RenderView.OnMouseScroll = function(x,y,Button,Delta)
		{
			Camera.OnCameraPanLocal( x, y, 0, true );
			Camera.OnCameraPanLocal( x, y, -Delta[1] * 10.0, false );
			//Camera.OnCameraZoom( -Delta[1] * 0.1 );
			
			//	refresh xr positions
			const Transform = GetTransform();
			const InputPosition = GetMatrixTranslation(Transform.matrix);
			This.OnMouseMove( InputPosition, Button, InputName, Transform );
		}
		
		RenderView.OnMouseUp = function(x,y,Button)
		{
			const Transform = GetTransform();
			const InputPosition = GetMatrixTranslation(Transform.matrix);
			This.OnMouseUp( InputPosition, Button, InputName, Transform );
		}
	}
	
	async RenderThread(RenderContext,RenderView)
	{
		const FrameCounter = new FrameCounter_t(`Desktop Render`);

		//	while not rendering other xr device...
		while ( true )
		{
			let Commands = [];
			try
			{
				const Viewport = RenderView.GetScreenRect();
				Commands = this.GetXrRenderCommands( RenderContext, this.Camera, Viewport );
			}
			catch(e)
			{
				console.error(e);
				//const ClearRed = ['SetRenderTarget',null,[1,0,0]];
				//Commands.splice(0,0,ClearRed);
			}
			
			await RenderContext.Render(Commands);
			FrameCounter.Add();
		}
	}
}




async function RenderLoop(Canvas,XrOnWaitForCallback)
{
	const RenderView = new Pop.Gui.RenderView(null,Canvas);
	const RenderContext = new Pop.Sokol.Context(RenderView);
	
	
	let App = new App_t();
	
	async function AppThread()
	{
		await App.GameIteration();
	}
	AppThread();
	
	//	simple thread for now, we will want to change this at some point to 
	//	a) provide gpu access for physics updates
	//	b) time it so its right after XR controller update
	//	c) time it right after XR render? (for physics etc)
	//	c) should it be async?...
	async function TickThread()
	{
		while (true)
		{
			const TimestepSecs = await WaitForFrame();
			App.Tick(TimestepSecs);
		}
	}
	TickThread();
	
	
		
	function GetXrRenderCommands()
	{
		//	make screen camera track xr camera
		//AppCamera.Position = Camera.Position.slice();
		//AppCamera.LookAt = Camera.LookAt.slice();
		LastXrRenderTimeMs = Pop.GetTimeNowMs();
		return App.GetSceneRenderCommands(...arguments);
	}
	
	
	let DesktopXr = new DesktopXrDevice( RenderContext, RenderView, GetXrRenderCommands );
	App.BindXrControls( DesktopXr );
	
			
	async function XrLoop(RenderContext,XrOnWaitForCallback)
	{
		while ( true )
		{
			try
			{
				//	use desktop device until an xr device appears
				//DesktopXr
				
				
				LastXrRenderTimeMs = null;
				const TrackedImages = null;
				const Device = await Pop.Xr.CreateDevice( RenderContext, GetXrRenderCommands, XrOnWaitForCallback, TrackedImages, ForceXrLayerType );
				App.BindXrControls( Device );

				const Enders = [Device.WaitForEnd(),App.WaitForUserExit()];
				await Promise.any(Enders);
				//	close xr device in case it was requested by app
				Device.Close();
			}
			catch(e)
			{
				console.error(`Failed to create xr ${e}`);
				await Pop.Yield(1*1000);
			}
		}
	}

	//	if callback function provided, try and make xr devices
	if ( XrOnWaitForCallback )
		XrLoop(RenderContext,XrOnWaitForCallback).catch(console.error);
	
	
	
	while ( RenderView )
	{
		//	this is capping desktop when 30... quest is just 40 (as we're not wait for an animationframe?)
		const GpuTickFps = 60;
		const MinWaitPromise = Pop.Yield(1000/GpuTickFps);
		
		//	only intermediately render if xr is running
		//	todo: check time since render and "turn on" again if we havent XR rendered for a while
		if ( Pop.GetTimeNowMs() - LastXrRenderTimeMs > 2*1000 )
			LastXrRenderTimeMs = null;

		let TimestepSecs = 1/GpuTickFps;
		try
		{
			await App.GpuTick(RenderContext,TimestepSecs);
		}
		catch(e)
		{
			console.error(`GpuTick Exception; ${e}`);
			//	slow down for any shader errors
			await Pop.Yield(50);
		}
	
		await MinWaitPromise;
	}
}


export default async function Bootup(XrOnWaitForCallback)
{
	await RenderLoop('Window',XrOnWaitForCallback);
}
