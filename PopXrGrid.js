import Pop from './PopEngine/PopEngine.js'
import FrameCounter_t from './PopEngine/FrameCounter.js'
import App_t from './RushGame.js'
import {WaitForFrame} from './PopEngine/PopWebApi.js'


//	detect whne XR has stopped rendering and only render desktop then
let LastXrRenderTimeMs = null;


const ForceXrLayerType = null;
//const ForceXrLayerType = 'MultiView';
//const ForceXrLayerType = 'StereoLayer';
//const ForceXrLayerType = 'Classic';



async function RenderLoop(Canvas,XrOnWaitForCallback)
{
	const RenderView = new Pop.Gui.RenderView(null,Canvas);
	const RenderContext = new Pop.Sokol.Context(RenderView);
	
	
	let App = new App_t();
	App.BindMouseCameraControls( RenderView );
	
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
		LastXrRenderTimeMs = Pop.GetTimeNowMs();
		return App.GetXrRenderCommands(...arguments);
	}
			
	async function XrLoop(RenderContext,XrOnWaitForCallback)
	{
		while ( true )
		{
			try
			{
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

	if ( XrOnWaitForCallback )
		XrLoop(RenderContext,XrOnWaitForCallback).catch(console.error);
	
	
	const FrameCounter = new FrameCounter_t(`Render`);
	
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
	
		//	can't yield if we're doing gpu ticks
		if ( LastXrRenderTimeMs )
		{
			//if ( LastXrRenderTimeMs )
			//	await Pop.Yield(10*1000);
		}
		else
		{
			let Commands = [];
			try
			{
				Commands = App.GetDesktopRenderCommands(RenderContext,RenderView);
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
		await MinWaitPromise;
	}
}


export default async function Bootup(XrOnWaitForCallback)
{
	await RenderLoop('Window',XrOnWaitForCallback);
}
