let xr = navigator.xr;

async function GetSupportedSessionMode()
{
	if ( !xr )
		return false;
	
	//	mozilla XR emulator has supportsSession
	//	proper spec is isSessionSupported
	if ( !xr.isSessionSupported && !xr.supportsSession )
		throw "XR platform missing isSessionSupported and supportsSession";
	if ( !xr.isSessionSupported )
	{
		//	make a wrapper
		xr.isSessionSupported = async function(SessionType)
		{
			//	sessionSupported throws if not supported
			try
			{
				await xr.supportsSession( SessionType );
				return true;
			}
			catch(e)
			{
				return false;
			}
		}
	}
	
	//	gr: we may want to enumerate all the modes
	const SessionTypes =
	[
	'immersive-ar',
	'immersive-vr',
	'inline'
	];
	
	const Errors = [];
	for ( let SessionType of SessionTypes )
	{
		try
		{
			const Supported = await xr.isSessionSupported(SessionType);
			if (!Supported)
				throw `XR SessionType ${SessionType} not supported (${Supported})`;
			return SessionType;
		}
		catch(e)
		{
			console.warn(e);
		}
	}

	return false;
}

function CreatePromise()
{
	let r,x,p=new Promise((rs,rj)=>{r=rs;x=rj});
	p.Resolve=r;
	p.Reject=x;
	return p;
}

function GetBlendModeAlpha(BlendMode)
{
	//	if undefined or invalid, assume opaque
	switch(BlendMode)
	{
	case 'additive':
	case 'alpha-blend':
		return 0;
	
	case 'opaque':
	default:
		return 1;
	}
}

class Device_t
{
	constructor(Session,ReferenceSpace,gl,OnRender,OnInput)
	{
		this.gl = gl;
		this.Session = Session;
		this.ReferenceSpace = ReferenceSpace;
		this.OnRender = OnRender;
		this.OnInput = OnInput;
		this.WaitForEnd = CreatePromise();
		this.Inputs={};
		Session.addEventListener('end',this.WaitForEnd.Resolve);
	}
	
	async InitLayer()
	{
		let gl=this.gl;
		this.EnableStencilBuffer = false;

		
		const Options = {};
		//	scale down frame buffer size to debug frag vs vert bound
		//	mentioned here: https://developer.oculus.com/documentation/web/webxr-perf-workflow/
		Options.framebufferScaleFactor = 1.0;
		Options.antialias = true;
		this.Layer = new XRWebGLLayer( this.Session, gl, Options );
		this.Session.updateRenderState({ baseLayer: this.Layer });
	
		//	https://developer.oculus.com/documentation/web/webxr-ffr/#to-set-and-adjust-ffr-dynamically
		//	set dynamic FFR...
		if ( this.Layer.fixedFoveation === undefined )
			console.warn(`WebXR layer doesn't support FixedFoveationRendering`,this.Layer);
		else
			this.Layer.fixedFoveation = 1;
		this.OnFrame(0,null);
	}
	
	OnFrame(TimeMs,Frame)
	{
		this.Session.requestAnimationFrame( this.OnFrame.bind(this) );
		let gl=this.gl;
		//	do browser anim step
		const Pose = Frame ? Frame.getViewerPose(this.ReferenceSpace) : null;
		
		//	don't know what to render?
		if ( !Pose )
		{
			console.log(`XR no pose`,Pose);
			return;
		}
		this.FrameUpdate_Input(Frame,Pose);
		this.OnRender(false,new DOMMatrix(Pose.transform.matrix));	//	prerender
		//	render
		//const DeviceFrameBuffer = gl.getParameter(gl.FRAMEBUFFER_BINDING);
		let DeviceFrameBuffer = this.Layer.framebuffer;
		for ( let View of Pose.views )
			this.OnFrameClassic( Frame, Pose, View, DeviceFrameBuffer );
		
		this.OnRender(true);	//	post render
	}
	
	OnFrameClassic(Frame,Pose,View,FrameBuffer)
	{
		let Viewport = this.Layer.getViewport(View);
		
		let Camera = {};
		Camera.Alpha = GetBlendModeAlpha(Frame.session.environmentBlendMode);
		Camera.FrameBuffer = FrameBuffer;
		Camera.Viewport = [Viewport.x,Viewport.y,Viewport.width,Viewport.height];
		Camera.LocalToWorld = new DOMMatrix(Pose.transform.matrix);
		Camera.WorldToLocal = new DOMMatrix(Pose.transform.inverse.matrix);
		Camera.GetProjectionMatrix = function(Viewport)
		{
			return View.projectionMatrix;
		}
		this.OnRender(Camera);
	}
	
	FrameUpdate_Input(Frame,Pose)
	{
		let RefSpace = this.ReferenceSpace;
		function GetPose(XrSpace)
		{
			let Pose = XrSpace ? Frame.getPose(XrSpace,RefSpace) : null;
			return Pose ? new DOMMatrix(Pose.transform.matrix) : null;
		}

		//	de-activate prev states
		Object.entries(this.Inputs).forEach(e=>e[1].Active=false);
		
		let EnumInput = (Name,Down,XrSpace)=>
		{
			let Trans = GetPose(XrSpace);
			let In = this.Inputs[Name];
			if ( !Trans && !In )	return;
			In = In||{};
			In.Transform = Trans||In.Transform;
			In.Active = Trans!=null;
			In.Down = Down && In.Active;
			this.Inputs[Name] = In;
		}
		
		function IterateInput(Input,Index)
		{
			//	gr: this input name is not unique enough yet!
			const InputName = Input.handedness;
			//	treat joints as individual inputs as they all have their own pos
			/*if ( Input.hand )
			{
				const HandInputs = ExtractHandInputs( Input.hand, InputName, GetPose.bind(this) );
				for ( let Input of HandInputs )
				{
					UpdateInputNode( Input.PoseSpace, Input.Name, Input.Buttons, Input.ExtraData );
				}
			}
			else//	normal controller, but on quest, this is also the center of the hand with the finger-click button0
			 */
			//	so we should make use of these buttons for a "palm" finger
			if ( Input.gamepad )
			{
				if (!Input.gamepad.connected)
					return;
				
				const AnyDown = (Input.gamepad.buttons||[]).some(x=>x.pressed);
				EnumInput(InputName,AnyDown,Input.targetRaySpace);
			}
			else
			{
				console.warn(`Ignoring input ${InputName} #${Index}`);
			}
		}
		
		let Inputs = Array.from(Frame.session.inputSources);
		Inputs.forEach(IterateInput.bind(this));
		this.OnInput(this.Inputs);
	}
}

export async function CreateXr(gl,OnRender,OnInput,OnWaitForCallback)
{
	const SessionMode = await GetSupportedSessionMode();
	if ( SessionMode == false )
		throw "Browser doesn't support XR.";

	const SessionPromise = CreatePromise();
	const Callback = function()
	{
		//	gr: could use a generic callback like the audio system does
		//	this should be called from user interaction, so we start,
		//	and return that promise
		try
		{
			const Options = {};
			Options.optionalFeatures = [];
			Options.optionalFeatures.push('local');
			Options.optionalFeatures.push('local-floor');
			Options.optionalFeatures.push('bounded-floor');
			Options.optionalFeatures.push('hand-tracking');	//	for quest
			Options.optionalFeatures.push('high-fixed-foveation-level');
			const RequestSessionPromise = xr.requestSession(SessionMode,Options);
			RequestSessionPromise.then( Session => SessionPromise.Resolve(Session) ).catch( e => SessionPromise.Reject(e) );
		}
		catch(e)
		{
			SessionPromise.Reject(e);
		}
	}
	OnWaitForCallback(Callback);
	
	const Session = await SessionPromise;
	const ReferenceSpaceTypes =
	[
		'bounded-floor',	//	expecting player to not move out of this space. bounds geometry returned, y=0=floor
		'local-floor',		//	y=0=floor
		'local',			//	origin = view starting pos
		'unbounded',		//	gr: where is origin?
		'viewer',
	];
	async function GetReferenceSpace()
	{
		for ( let ReferenceSpaceType of ReferenceSpaceTypes )
		{
			try
			{
				const ReferenceSpace = await Session.requestReferenceSpace(ReferenceSpaceType);
				ReferenceSpace.Type = ReferenceSpaceType;
				return ReferenceSpace;
			}
			catch(e)
			{
				console.warn(`XR ReferenceSpace type ${ReferenceSpaceType} not supported. ${e}`);
			}
		}
		throw `Failed to find supported XR reference space`;
	}
	const ReferenceSpace = await GetReferenceSpace();
	console.log(`Got XR ReferenceSpace`,ReferenceSpace);
	
	const Device = new Device_t( Session, ReferenceSpace, gl, OnRender, OnInput );
	await Device.InitLayer();
	return Device;
}
