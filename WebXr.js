/*
import * as Pop from './PopWebApiCore.js'
import {CreatePromise} from './PopApi.js'
import PromiseQueue from './PromiseQueue.js'
import {BrowserAnimationStep} from './PopWebApi.js'
import {RenderTarget,RenderCommands_t,GetString,RenderCommand_Draw} from './PopWebOpenglApi.js'
import Camera_t from './Camera.js'
import {SetMatrixTranslation,Distance3} from './Math.js'
import Image_t from './PopWebImageApi.js'
import FrameCounter_t from './FrameCounter.js'

import {CreateBlitQuadGeometry,MergeGeometry} from './CommonGeometry.js'

function ViewportToRect(Viewport)
{
	let Rect =
	[
		Viewport.x,
		Viewport.y,
		Viewport.width,
		Viewport.height
	];
	return Rect;
}


class RenderTargetViewProxy extends RenderTarget
{
	constructor(Layer,View,RenderContext)
	{
		super();
		this.RenderContext = RenderContext;
		this.Layer = Layer;
		this.View = View;
	}

	//	dont clear xr frame buffers
	ClearColour(r,g,b,a)
	{
	}
	ClearDepth()
	{
	}
	
	GetRenderTargetRect()
	{
		const Layer = this.Layer;
		const Viewport = Layer.getViewport(this.View);
		const Rect = ViewportToRect(Viewport);
		return Rect;
	}
	
	GetRenderContext()
	{
		return this.RenderContext;
	}
	
	GetFrameBuffer()
	{
		return this.Layer.framebuffer;
	}
	
	BindRenderTarget(RenderContext)
	{
		const gl = RenderContext.GetGlContext();
		//	should already be bound when entering here, so this should be redundant
		const FrameBuffer = this.GetFrameBuffer();
		gl.bindFramebuffer( gl.DRAW_FRAMEBUFFER, FrameBuffer );

		this.ResetState();
		
		const Viewport = this.GetRenderTargetRect();
		gl.viewport( ...Viewport );
		//	gr: I believe this breaks the looking glass webxr extension
		gl.scissor( ...Viewport );
		gl.enable(gl.SCISSOR_TEST);

		function Unbind(){};
		return Unbind;
	}
}


//	this is really storage
class RenderTargetStereoLayer extends RenderTarget
{
	constructor(XrFactory,Session,Layer,RenderContext,EnableStencilBuffer)
	{
		super();
		this.XrFactory = XrFactory;
		this.EnableStencilBuffer = EnableStencilBuffer;
		this.AntiAliasSamples = 2;
		this.Session = Session;
		this.Views = null;
		this.Layer = Layer;
		this.RenderContext = RenderContext;

		this.AttachmentDirty = true;

		const gl = this.RenderContext.Context;
	}
	
	//	dont clear xr frame buffers
	ClearColour(r,g,b,a)
	{
	}
	ClearDepth()
	{
	}
	
	CreateFrameBuffer(View)
	{
		const gl = this.RenderContext.Context;

		const SubImage = this.XrFactory.getViewSubImage( this.Layer, View );
		const mv_ext = null;
		
		//	setup frame buffer with 2 colour & depth attachments
		const FrameBuffer = gl.createFramebuffer();
		gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, FrameBuffer);

		const Viewport = this.GetRenderTargetRect(View);
		const Width = Viewport[2];
		const Height = Viewport[3];

		//	bind colour
		//	gr: https://github.com/abidaqib/WebXRTest1/blob/40692ecf649b9282f5b38fb570c871cddff8d8ef/layers-samples/proj-multiview.html
		//		this example just took colour from layer...
		//		oculus (webvr) example created it's own
		this.ColourTexture = this.ColourTexture || SubImage.colorTexture;
		this.DepthTexture = this.DepthTexture || SubImage.depthStencilTexture || this.Layer.depthStencilTexture;
			
		return FrameBuffer;
	}
	
	BindFrameBufferAttachments(FrameBuffer=null,View)
	{
		if ( !this.AttachmentDirty )
			return;
		
		FrameBuffer = FrameBuffer || this.FrameBuffer;
		
		const gl = this.RenderContext.Context;
		const mv_ext = null;
		
		//	can use the images we grab once, but we do need to attach every frame
		const ColourTexture = this.ColourTexture;
		const DepthTexture = this.DepthTexture;
		//const SubImage = this.XrFactory.getViewSubImage( this.Layer, View );
		//const ColourTexture = SubImage.colorTexture;
		//const DepthTexture = SubImage.depthStencilTexture;
		
		gl.bindFramebuffer( gl.DRAW_FRAMEBUFFER, FrameBuffer );

		//const DepthAttachment = this.EnableStencilBuffer ? gl.DEPTH_STENCIL_ATTACHMENT : gl.DEPTH_ATTACHMENT;
		const DepthAttachment = gl.DEPTH_ATTACHMENT;
		
		//	use MSAA if the extension is availible
		if ( this.AntiAliasSamples>1 && gl.framebufferTexture2DMultisampleEXT )
		{
			gl.framebufferTexture2DMultisampleEXT(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, ColourTexture, 0, 4);
			gl.framebufferTexture2DMultisampleEXT(gl.FRAMEBUFFER, DepthAttachment, gl.TEXTURE_2D, DepthTexture, 0, 4);
		}
		else
		{
			gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, ColourTexture, 0);
			gl.framebufferTexture2D(gl.FRAMEBUFFER, DepthAttachment, gl.TEXTURE_2D, DepthTexture, 0);
		}
		
		//	gr: i thought this would cause a flush, but doesn't seem to?
		//const Status = gl.checkFramebufferStatus( gl.DRAW_FRAMEBUFFER );
		//if ( Status != gl.FRAMEBUFFER_COMPLETE )	console.log(`XRframebuffer attachment status not complete: ${GetString(gl,Status)}`);
		this.AttachmentDirty = false;
	}
	
	GetFrameBuffer(View)
	{
		if ( !this.FrameBuffer )
			this.FrameBuffer = this.CreateFrameBuffer(View);
		return this.FrameBuffer;
	}
	
	GetRenderContext()
	{
		return this.RenderContext;
	}
	
	UpdateViews(Views)
	{
		this.Views = Views;
	}

	GetRenderTargetRect(View)
	{
		if ( !View )	throw `GetRenderTargetRect() View required`;
		//	viewport is same for both views in multiview
		const SubImage = this.XrFactory.getViewSubImage( this.Layer, View );
		const Viewport = SubImage.viewport;
		return ViewportToRect(Viewport);
	}
	
	BindRenderTarget(RenderContext,View)
	{
		if ( !View )
			throw `View required`;
		const gl = RenderContext.GetGlContext();
		
		//	gr: this should be binding as if it's rendering to one eye
		//	https://developer.oculus.com/documentation/web/web-multiview/#multi-view-webvr-code-example
		//	working demo here
		//	https://immersive-web.github.io/webxr-samples/layers-samples/proj-multiview.html
		const FrameBuffer = this.GetFrameBuffer(View);
		if ( FrameBuffer === undefined )
			throw `RenderTargetFrameBufferProxy BindRenderTarget() with ${FrameBuffer}, invalid`;
 
		//gl.bindFramebuffer( gl.DRAW_FRAMEBUFFER, FrameBuffer );
		//const SubImage = this.XrFactory.getViewSubImage( this.Session.renderState.layers[0], View );
		const SubImage = this.XrFactory.getViewSubImage( this.Layer, View );
		
		//	not sure if we need this, or if it's just somewhere to store the variable in the demo
		//	doesn't seem to be needed
		SubImage.framebuffer = FrameBuffer;
		
		//	need to do this everyframe otherwise it's incomplete
		this.BindFrameBufferAttachments(FrameBuffer,View);
		
		//	this demo then does one viewport, and one render of instances
		//	https://immersive-web.github.io/webxr-samples/layers-samples/proj-multiview.html
		this.ResetState();

		//	gr: viewport is same on both layers (no x offset)
		//const Viewport = glLayer.viewport;
		const Viewport = this.GetRenderTargetRect(View);
		gl.viewport( ...Viewport );
		
		//	webxr on quest needs scissoring
		//	does this break pixel3 webAR?
		//	gr: I believe this breaks the looking glass webxr extension
		//	gr: for multiview, we don't want to scissor
		//gl.scissor( ...Viewport );
		//gl.enable(gl.SCISSOR_TEST);
		//gl.disable(gl.SCISSOR_TEST);

		//	disabling scissor jumps frame rate to 50, but only get right eye
		gl.disable(gl.SCISSOR_TEST);
		//gl.clearColor( 0, 0, 0, 1 );
		//gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	
		function Unbind()
		{
		}
		return Unbind.bind(this);
	}
}


class RenderTargetStereoProxy extends RenderTarget
{
	constructor(StereoRenderTarget,View)
	{
		super();
		this.StereoRenderTarget = StereoRenderTarget;
		this.View = View;
	}

	//	dont clear xr frame buffers
	ClearColour(r,g,b,a)
	{
	}
	ClearDepth()
	{
	}

	GetFrameBuffer()
	{
		return this.StereoRenderTarget.GetFrameBuffer(this.View);
	}
	
	GetRenderContext()
	{
		return this.StereoRenderTarget.RenderContext;
	}
	
	GetRenderTargetRect()
	{
		if ( !this.View )
			throw `Missing view, cannot get render target rect`;
		
		const LayerImage = this.Factory.getViewSubImage( this.Layer, this.View );
		const Viewport = LayerImage.viewport;
		const Rect = ViewportToRect( Viewport );
		return Rect;
	}
	
	
	BindRenderTarget(RenderContext)
	{
		const gl = RenderContext.GetGlContext();
		const Unbind = this.StereoRenderTarget.BindRenderTarget( RenderContext, this.View );
		return Unbind;
	}
}


//	turn this into a generic [projection]layers target
class RenderTargetMultiview extends RenderTarget
{
	constructor(XrFactory,Session,Layer,RenderContext,EnableStencilBuffer)
	{
		super();
		this.XrFactory = XrFactory;
		this.EnableStencilBuffer = EnableStencilBuffer;
		this.AntiAliasSamples = 2;
		this.Session = Session;
		this.Views = null;
		this.Layer = Layer;
		this.RenderContext = RenderContext;
	}
	
	CreateFrameBuffer()
	{
		const gl = this.RenderContext.Context;

		if ( !this.Views )
			throw `Cannot create framebuffer without views`;
			
		const View0 = this.Views[0];
		const SubImage = this.XrFactory.getViewSubImage( this.Layer, View0 );
		const mv_ext = this.RenderContext.MultiView;
		
		//	setup frame buffer with 2 colour & depth attachments
		const FrameBuffer = gl.createFramebuffer();
		
		gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, FrameBuffer);

		const Viewport = this.GetRenderTargetRect();
		const Width = Viewport[2];
		const Height = Viewport[3];

		//	bind colour
		//	gr: https://github.com/abidaqib/WebXRTest1/blob/40692ecf649b9282f5b38fb570c871cddff8d8ef/layers-samples/proj-multiview.html
		//		this example just took colour from layer...
		//		oculus (webvr) example created it's own
		this.ColourTexture = this.ColourTexture || SubImage.colorTexture || this.Layer.colorTexture;
		if ( !this.ColourTexture )
		{
			this.ColourTexture = gl.createTexture();
			gl.bindTexture(gl.TEXTURE_2D_ARRAY, this.ColourTexture);
			gl.texStorage3D(gl.TEXTURE_2D_ARRAY, 1, gl.RGBA8, Width, Height, 2);
			//	threejs does this
			//	https://github.com/mrdoob/three.js/commit/c680e4c7159b94514a2121bd64dd17d21ba89c02
			gl.texParameteri( gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MAG_FILTER, gl.NEAREST );
			gl.texParameteri( gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MIN_FILTER, gl.NEAREST );
			//gl.texImage3D(gl.TEXTURE_2D_ARRAY, 0, gl.RGBA8, Width, Height, 2, 0, gl.RGBA, gl.UNSIGNED_BYTE, null );
		}
		//mv_ext.framebufferTextureMultiviewOVR(gl.DRAW_FRAMEBUFFER, gl.COLOR_ATTACHMENT0, this.ColourTexture, 0, 0, 2);
		//mv_ext.framebufferTextureMultisampleMultiviewOVR(gl.DRAW_FRAMEBUFFER, gl.COLOR_ATTACHMENT0, this.ColourTexture, 0, this.AntiAliasSamples, 0, 2);

		//	create depth/stencil if not provided
		this.DepthTexture = this.DepthTexture || SubImage.depthStencilTexture || this.Layer.depthStencilTexture;
		if ( !this.DepthTexture )
		{
			console.log("MaxViews = " + gl.getParameter(mv_ext.MAX_VIEWS_OVR));
			this.DepthTexture = gl.createTexture();
			gl.bindTexture(gl.TEXTURE_2D_ARRAY, this.DepthTexture);
			gl.texStorage3D(gl.TEXTURE_2D_ARRAY, 1, gl.DEPTH_COMPONENT24, Width, Height, 2);
			//	threejs
			gl.texParameteri( gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MAG_FILTER, gl.NEAREST );
			gl.texParameteri( gl.TEXTURE_2D_ARRAY, gl.TEXTURE_MIN_FILTER, gl.NEAREST );
			//gl.texImage3D(gl.TEXTURE_2D_ARRAY, 0, gl.DEPTH_COMPONENT24, Width, Height, 2, 0, gl.DEPTH_STENCIL, gl.UNSIGNED_INT_24_8, null );
			//gl.texImage3D(gl.TEXTURE_2D_ARRAY, 0, gl.DEPTH_COMPONENT24, Width, Height, 2, 0, gl.DEPTH_COMPONENT, gl.UNSIGNED_INT, null );
		}
		//	attach depth/stencil to framebuffer
		//mv_ext.framebufferTextureMultiviewOVR(gl.DRAW_FRAMEBUFFER, gl.DEPTH_ATTACHMENT, this.DepthTexture, 0, 0, 2);
		//mv_ext.framebufferTextureMultisampleMultiviewOVR(gl.DRAW_FRAMEBUFFER, gl.DEPTH_ATTACHMENT, this.DepthTexture, 0, this.AntiAliasSamples, 0, 2);
		//mv_ext.framebufferTextureMultisampleMultiviewOVR(gl.DRAW_FRAMEBUFFER, gl.DEPTH_STENCIL_ATTACHMENT, this.DepthTexture, 0, this.AntiAliasSamples, 0, 2);

		//	have to bind every frame, so dont bother doing it here
		//this.BindFrameBufferAttachments(Framebuffer);
			
		return FrameBuffer;
	}
	
	BindFrameBufferAttachments(FrameBuffer=null)
	{
		FrameBuffer = FrameBuffer || this.FrameBuffer;
		
		const gl = this.RenderContext.Context;
		const mv_ext = this.RenderContext.MultiView;
		
		gl.bindFramebuffer( gl.DRAW_FRAMEBUFFER, FrameBuffer );

		//	demo re-assigns each frame
		mv_ext.framebufferTextureMultisampleMultiviewOVR(gl.DRAW_FRAMEBUFFER, gl.COLOR_ATTACHMENT0, this.ColourTexture, 0, this.AntiAliasSamples, 0, 2);
			
		//	demo always uses depth_attachment
		//	https://github.com/immersive-web/webxr-samples/blob/7db0e01bf6ca0814c73dcaa5fb71e37fe340dca5/layers-samples/proj-multiview.html
		//mv_ext.framebufferTextureMultisampleMultiviewOVR(gl.DRAW_FRAMEBUFFER, gl.DEPTH_STENCIL_ATTACHMENT, this.DepthTexture, 0, this.AntiAliasSamples, 0, 2);
		const DepthAttachment = this.EnableStencilBuffer ? gl.DEPTH_STENCIL_ATTACHMENT : gl.DEPTH_ATTACHMENT;
		mv_ext.framebufferTextureMultisampleMultiviewOVR(gl.DRAW_FRAMEBUFFER, DepthAttachment, this.DepthTexture, 0, this.AntiAliasSamples, 0, 2);
		
		
	//	const Status = gl.checkFramebufferStatus( gl.DRAW_FRAMEBUFFER );
	//	if ( Status != gl.FRAMEBUFFER_COMPLETE )
	//		console.log(`XRframebuffer attachment status not complete: ${GetString(gl,Status)}`);
	}
	
	GetFrameBuffer()
	{
		if ( !this.FrameBuffer )
			this.FrameBuffer = this.CreateFrameBuffer();
		return this.FrameBuffer;
	}
	
	GetRenderContext()
	{
		return this.RenderContext;
	}
	
	UpdateViews(Views)
	{
		this.Views = Views;
	}

	GetRenderTargetRect()
	{
		//	viewport is same for both views in multiview
		const View0 = this.Views[0];
		const SubImage = this.XrFactory.getViewSubImage( this.Layer, View0 );
		const Viewport = SubImage.viewport;
		return ViewportToRect(Viewport);
	}
	
	BindRenderTarget(RenderContext)
	{
		const gl = RenderContext.GetGlContext();
		
		//	gr: this should be binding as if it's rendering to one eye
		//	https://developer.oculus.com/documentation/web/web-multiview/#multi-view-webvr-code-example
		//	working demo here
		//	https://immersive-web.github.io/webxr-samples/layers-samples/proj-multiview.html
		const FrameBuffer = this.GetFrameBuffer();
		if ( FrameBuffer === undefined )
			throw `RenderTargetFrameBufferProxy BindRenderTarget() with ${FrameBuffer}, invalid`;
 
		//gl.bindFramebuffer( gl.DRAW_FRAMEBUFFER, FrameBuffer );

		let view = this.Views[0];
		let glLayer = this.XrFactory.getViewSubImage( this.Session.renderState.layers[0], view);
		
		//	not sure if we need this, or if it's just somewhere to store the variable in the demo
		//	doesn't seem to be needed
		glLayer.framebuffer = FrameBuffer;
		
		//	need to do this everyframe otherwise it's incomplete
		this.BindFrameBufferAttachments();
		
		gl.disable(gl.SCISSOR_TEST);
		//gl.clearColor( 0, 0, 0, 1 );
		//gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	
		//	this demo then does one viewport, and one render of instances
		//	https://immersive-web.github.io/webxr-samples/layers-samples/proj-multiview.html
		this.ResetState();

		//	gr: viewport is same on both layers (no x offset)
		//const Viewport = glLayer.viewport;
		const Viewport = this.GetRenderTargetRect();
		gl.viewport( ...Viewport );
		
		//	webxr on quest needs scissoring
		//	does this break pixel3 webAR?
		//	gr: I believe this breaks the looking glass webxr extension
		//	gr: for multiview, we don't want to scissor
		//gl.scissor( ...Viewport );
		//gl.enable(gl.SCISSOR_TEST);
		gl.disable(gl.SCISSOR_TEST);

		function Unbind()
		{
		}
		return Unbind.bind(this);
	}
}

//	currently webxr lets us create infinite sessions, so monitor when we have a device already created
let Devices = [];

let SupportedSessionMode = null;

//	allow this to be overriden with custom polyfills
//	todo: abstract these interfaces so we can have our own XR API along side navigator
//let PlatformXr = navigator.xr;
function GetPlatformXr()
{
	return navigator.xr;
}
let PlatformXRWebGLLayer = (typeof XRWebGLLayer !== 'undefined') ? XRWebGLLayer : null;

async function GetSupportedSessionMode()
{
	const PlatformXr = GetPlatformXr();
	if ( !PlatformXr )
		return false;
	
	//	mozilla XR emulator has supportsSession
	//	proper spec is isSessionSupported
	if ( !PlatformXr.isSessionSupported && !PlatformXr.supportsSession )
		throw "XR platform missing isSessionSupported and supportsSession";
	if ( !PlatformXr.isSessionSupported )
	{
		//	make a wrapper
		PlatformXr.isSessionSupported = async function(SessionType)
		{
			//	sessionSupported throws if not supported
			try
			{
				await PlatformXr.supportsSession( SessionType );
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
			const Supported = await PlatformXr.isSessionSupported(SessionType);
			if (!Supported)
				throw `XR SessionType ${SessionType} not supported (${Supported})`;
			return SessionType;
		}
		catch(e)
		{
			Pop.Warning(e);
		}
	}

	return false;
}

//	setup cache of support for synchronous call
//GetSupportedSessionMode().then( Mode => SupportedSessionMode=Mode ).catch( Pop.Debug );


function IsReferenceSpaceOriginFloor(ReferenceSpaceType)
{
	//	gr: anything that ends in '-floor' should match
	switch( ReferenceSpaceType )
	{
		case 'local-floor':
		case 'bounded-floor':
			return true;
			
		default:
			return false;
	}
}

//	this will probably merge with the native input state structs,
//	but for now we're using it to track input state changes
class XrInputState
{
	constructor()
	{
		this.Buttons = [];		//	[Name] = true/false/pressure
		this.Position = null;	//	[xyz] or false if we lost tracking
		this.Transform = null;	//	for now, saving .position .quaternion .matrix
	}
}

//	return alpha 0 or 1 for AR(alpha blend) or additive mode
function IsTransparentBlendMode(BlendMode)
{
	//	if undefined or invalid, assume opaque
	switch(BlendMode)
	{
	case 'additive':
	case 'alpha-blend':
		return true;
	
	case 'opaque':
	default:
		return false;
	}
}


class Device_t
{
	constructor(Session,ReferenceSpace,RenderContext,GetRenderCommands)
	{
		this.OnEndPromises = [];
		this.Cameras = {};
		this.Session = Session;
		this.ReferenceSpace = ReferenceSpace;
		this.RenderContext = RenderContext;
		this.GetRenderCommands = GetRenderCommands;
		
		this.FrameCounter = new FrameCounter_t(`XR Frame`);
		this.DepthImages = {};	//	[CameraName] = Image. Depth data is per-view
		this.DepthInfoError = 'x';//null;	//	on quest/chrome, calling get depth info throws a dom exception that wont catch. so if it ever fails, mark it as failed and dont let it trigger again
		
		//	overload these! (also, name it better, currently matching window/touches)
		this.OnMouseDown = this.OnMouseEvent_Default.bind(this);
		this.OnMouseMove = this.OnMouseEvent_Default.bind(this);
		this.OnMouseUp = this.OnMouseEvent_Default.bind(this);
		
		//	store input state so we can detect button up, tracking lost/regained
		this.InputStates = {};	//	[Name] = XrInputState
		
		this.RealSpaceChangedQueue = new PromiseQueue(`XR real space change`);
		
		//	bind to device
		this.ReferenceSpace.onreset = this.OnSpaceChanged.bind(this);
		
		//	some implementations are missing addEventListener
		if ( this.ReferenceSpace.addEventListener )
			this.ReferenceSpace.addEventListener('reset', this.OnSpaceChanged.bind(this) );
			
		Session.addEventListener('end', this.OnSessionEnded.bind(this) );
		//	this is async so gets called from outside now
		//this.InitLayer( RenderContext );
		
		//	do an initial space update in case its initialised already
		this.OnSpaceChanged();
	}
	
	async WaitForInit(LayerType=null)
	{
		await this.InitLayer( this.RenderContext, LayerType );
	}
	
	async WaitForNewSpace()
	{
		return this.RealSpaceChangedQueue.WaitForNext();
	}
	
	OnSpaceChanged(Event)
	{
		//	get new space from reference space
		//	this also occurs when orientation is reset
		const Geometry = this.ReferenceSpace.boundsGeometry;
		Pop.Debug(`OnSpaceChanged`,Event,Geometry);
		
		//	only keep the latest data
		this.RealSpaceChangedQueue.ClearQueue();
		this.RealSpaceChangedQueue.Push(Geometry);
	}
	
	//	I think here we can re-create layers if context dies,
	//	without recreating device
	async InitLayer(RenderContext,ForcedLayerType)
	{
		const OpenglContext = this.RenderContext.GetGlContext();

		this.EnableStencilBuffer = false;
		//	on desktop this throws when created with inline-vr session
		//	this is how we can distinguish if we support layers or not
		this.XrFactory = null;
		try
		{
			this.XrFactory = new XRWebGLBinding( this.Session, OpenglContext );
		}
		catch(e)
		{
			console.warn(`XrFactory not supported; ${e}`);
		}
	
		const gl = OpenglContext;
		
		if ( !ForcedLayerType )
		{
			if ( RenderContext.MultiView && this.XrFactory )
				ForcedLayerType = 'MultiView';
			else if ( this.XrFactory )
				ForcedLayerType = 'StereoLayer';
			else if ( PlatformXRWebGLLayer )
				ForcedLayerType = 'Classic';
		}
		
		//	try and create projection layers
		if ( ForcedLayerType == 'MultiView' )
		{
			if ( !RenderContext.MultiView )
				throw `MultiView requested, but no multiview extension`;
				
			this.Layer = this.XrFactory.createProjectionLayer({
				textureType: "texture-array",
				depthFormat: this.EnableStencilBuffer ? gl.DEPTH24_STENCIL8 : gl.DEPTH_COMPONENT24
			});
			
			//	gr: where did I find requestProjectionLayer?? missing now
			//this.Layer = await this.xrGLFactory.requestProjectionLayer(gl.TEXTURE_2D_ARRAY, {stencil: this.EnableStencilBuffer});
			this.Session.updateRenderState({ layers: [this.Layer] });
		}
		else if ( ForcedLayerType == 'StereoLayer' )
		{
			this.Layer = this.XrFactory.createProjectionLayer({
				//textureType: "texture",
				depthFormat: this.EnableStencilBuffer ? gl.DEPTH24_STENCIL8 : gl.DEPTH_COMPONENT24
			});
			
			this.Session.updateRenderState({ layers: [this.Layer] });
		}
		else if ( ForcedLayerType == 'Classic' )// no factory = no layers
		{
			const Options = {};
			//	scale down frame buffer size to debug frag vs vert bound
			//	mentioned here: https://developer.oculus.com/documentation/web/webxr-perf-workflow/
			Options.framebufferScaleFactor = 1.0;
			Options.antialias = true;
			
			this.Layer = new PlatformXRWebGLLayer( this.Session, OpenglContext, Options );
			this.Session.updateRenderState({ baseLayer: this.Layer });
		}
		else
		{
			throw `Don't know how to create layer type ${ForcedLayerType} for WebXR`;
		}
		this.LayerType = ForcedLayerType;
	
		//	https://developer.oculus.com/documentation/web/webxr-ffr/#to-set-and-adjust-ffr-dynamically
		//	set dynamic FFR...
		if ( this.Layer.fixedFoveation === undefined )
			console.warn(`WebXR layer doesn't support FixedFoveationRendering`,this.Layer);
		else
			this.Layer.fixedFoveation = 1;
			
		//	this doesnt work unless updateRenderState is called, so place it here
		//	start loop
		this.Session.requestAnimationFrame( this.OnFrame.bind(this) );
	}
	
	async WaitForEnd()
	{
		const OnEnd = CreatePromise();
		this.OnEndPromises.push( OnEnd );
		return OnEnd;
	}
	
	OnSessionEnded()
	{
		Pop.Debug("XR session ended");
		//	notify all promises waiting for us to finish, fifo, remove as we go
		while ( this.OnEndPromises.length )
		{
			const Promise = this.OnEndPromises.shift();
			Promise.Resolve();
		}
	}
	
	GetCamera(Name)
	{
		if ( !this.Cameras.hasOwnProperty(Name) )
		{
			this.Cameras[Name] = new Camera_t();
			this.Cameras[Name].Name = Name;
		}
		return this.Cameras[Name];
	}
	
	UpdateInputState(InputName,Pose,Buttons,ExtraData)
	{
		//	new state!
		if ( !this.InputStates.hasOwnProperty(InputName) )
		{
			//	new state!
			this.InputStates[InputName] = new XrInputState();
			Pop.Debug(`New input! ${InputName}`);
		}
		const State = this.InputStates[InputName];
		State.ExtraData = ExtraData;
		
		//	if no pose, no longer tracking
		if ( !Pose )
		{
			if ( State.Position )
				Pop.Debug(`${InputName} lost tracking`);
			State.Position = false;
			State.Transform = false;
		}
		else
		{
			if ( !State.Position )
				Pop.Debug(`${InputName} now tracking`);
			
			const Position = [Pose.transform.position.x,Pose.transform.position.y,Pose.transform.position.z];
			const RotationQuat = Pose.transform.orientation;
			State.Position = Position;
			State.Transform = Pose.transform;
		}
		
		//	work out new button states & any changes
		//	gr: here, if not tracking, we may want to skip any changes
		//	gr: include tracking state in some meta data?
		const ButtonCount = Math.max(State.Buttons.length,Buttons.length);
		const NewButtonState = [];
		let ButtonChangedCount = 0;
		for ( let b=0;	b<ButtonCount;	b++ )
		{
			//	currently the button is either a button object(.pressed .touched) or a bool, or nothing
			const FrameButton = Buttons[b];
			const Old = (b < State.Buttons.length) ? State.Buttons[b] : undefined;
			const New = (FrameButton && FrameButton.pressed) || (FrameButton===true);
			const ButtonName = b;
			
			if ( !Old && New )
			{
				ButtonChangedCount++;
				this.OnMouseDown( State.Position, ButtonName, InputName, State.Transform, State.ExtraData );
			}
			else if ( Old && !New )
			{
				ButtonChangedCount++;
				this.OnMouseUp( State.Position, ButtonName, InputName, State.Transform, State.ExtraData );
			}
			NewButtonState.push(New);
		}

		State.Buttons = NewButtonState;
		
		//	if no button changes, we still want to register a controller move with no button
		if ( ButtonChangedCount == 0 )
			this.OnMouseMove( State.Position, null, InputName, State.Transform, State.ExtraData );
	}
	
	GetDepthImage(Name)
	{
		if ( !this.DepthImages.hasOwnProperty(Name) )
		{
			this.DepthImages[Name] = new Image_t(`${Name}_Depth`);
			const Px = new Float32Array( [1,0,0,1] );
			this.DepthImages[Name].WritePixels( 1,1,Px,'Float4');
		}
		return this.DepthImages[Name];
	}
	
	GetCameraName(View)
	{
		//	different names from different browsers
		//	webxr spec is expecting 'left', 'right' and 'none' for mono
		if (typeof View.eye == 'string')
			return View.eye.toLowerCase();
		
		if (typeof View.eye == 'number')
		{
			const EyeNames = ['left', 'right'];
			return EyeNames[View.eye];
		}

		Pop.Debug(`Improperly handled View.eye=${View.eye}(${typeof View.eye})`);
		return View.eye;
	}
	
	OnFrame(TimeMs,Frame)
	{
		this.FrameCounter.Add();
		
		//	gr: need a better fix here.
		//	https://github.com/immersive-web/webxr/issues/225
		//		when XR is active, and the 2D window is NOT active
		//		the window.requestAnimationFrame is not fired, so we
		//		continue the generic Pop API animation from here
		//	I imagine there is some situation where both are firing and we're
		//	getting double the updates... need to figure that out
		//	gr: problem here? we're rendering before the frame as we queue up an
		//		update...
		//	maybe Session.requestAnimationFrame should also trigger Pop.WebApi.BrowserAnimationStep itself?
		const ProxyWindowAnimation = true;
		if ( ProxyWindowAnimation )
		{
			BrowserAnimationStep(TimeMs);
		}
		
		//Pop.Debug("XR frameFrame);
		//	request next frame
		this.Session.requestAnimationFrame( this.OnFrame.bind(this) );
		
		//	get pose in right space
		const Pose = Frame.getViewerPose(this.ReferenceSpace);
		
		//	don't know what to render?
		if ( !Pose )
		{
			Pop.Warning(`XR no pose`,Pose);
			return;
		}
		
		this.FrameUpdate_Input(Frame,Pose);
		
		if ( Frame.getImageTrackingResults )
			this.FrameUpdate_ImageTracking(Frame,Pose);
		
		//	extract depth textures
		//	https://immersive-web.github.io/depth-sensing/
		if ( Frame.getDepthInformation  )
			this.FrameUpdate_Depth(Frame,Pose);
		
		const gl = this.RenderContext.Context;
		
		
		if ( this.LayerType == 'MultiView' )
		{
			this.FrameUpdate_RenderMultiView( Frame, Pose );
		}
		else if ( this.LayerType == 'Classic' )
		{
			const DeviceFrameBuffer = gl.getParameter(gl.FRAMEBUFFER_BINDING);
			for ( let View of Pose.views )
				this.FrameUpdate_RenderClassic( Frame, Pose, View, DeviceFrameBuffer );
		}
		else if ( this.LayerType == 'StereoLayer' )
		{
			this.FrameUpdate_RenderStereoLayer( Frame, Pose );
		}
		else
			throw `Unknown layer type ${this.LayerType}`;
	}
	
	FrameUpdate_ImageTracking(Frame,Pose)
	{
		//	gather results and put in promise queue... or synchronous callback?
		const TrackingResults = Frame.getImageTrackingResults();
		for ( let TrackingResult of TrackingResults )
		{
			//	todo: map to constructor key
			const ImageIndex = TrackingResult.index;
			
			const ImagePose = Frame.getPose(TrackingResult.imageSpace, this.ReferenceSpace);
			const ImageState = TrackingResult.trackingState;
			// if (state == "tracked") {
			///} else if (state == "emulated") {
		}
	}
	
	FrameUpdate_Depth(Frame,Pose)
	{
		//	on quest, the function exists but it throws an exception as its unsupported,
		//	we can assume its the same for all views really.
		//	todo: better way to catch lack of support and skip the exception?
		if ( this.DepthInfoError )
			return;

		try
		{
			for ( let View of Pose.views )
			{
				const DepthInfo = Frame.getDepthInformation(View);
				if ( !DepthInfo )
					continue;
					
				const NormalDepthToViewDepthTransform = DepthInfo.normDepthBufferFromNormView.matrix;
					
				const CameraName = this.GetCameraName(View);
				const DepthImage = this.GetDepthImage(CameraName);
				
				//	store meta on image (should be camera?)
				DepthImage.NormalDepthToViewDepthTransform = NormalDepthToViewDepthTransform;
				
				//	gr: maybe a bit of a waste to do any cpu conversion when we can do it on gpu
				//	gr: only needed if data isnt float
				//	todo: get .normDepthBufferFromNormView to get projection matrix
				let Depth16 = new Uint16Array( DepthInfo.data );
				let Depthf = new Float32Array( Depth16 );
				//let Depthf = new Float32Array( DepthInfo.width*DepthInfo.height );
				//DepthImage.WritePixels( DepthInfo.width, DepthInfo.height, Depth16, 'R16' );
				DepthImage.WritePixels( DepthInfo.width, DepthInfo.height, Depthf, 'Float1' );
				
				
				//const NonZeros = new Uint16Array(DepthInfo.data).filter( x => x!=0 );
				//if ( NonZeros.length )
				//	console.log(`DepthInfo with non zero`,DepthInfo);
			}
		}
		catch(e)
		{
			console.error(`Error with getDepthInformation`,e);
			this.DepthInfoError = e;
		}
	}
	
	FrameUpdate_Input(Frame,Pose)
	{
		//	handle inputs
		//	gr: we're propogating like a mousebutton for integration, but our Openvr api
		//		has keyframed input structs per-controller/pose
		const FrameInputs = Array.from(Frame.session.inputSources);
		
		const UpdatedInputNames = [];
		function UpdateInputNode_(InputXrSpace,InputName,Buttons,ExtraData)
		{
			//	get the pose
			const InputPose = InputXrSpace ? Frame.getPose(InputXrSpace,this.ReferenceSpace) : null;
			this.UpdateInputState(InputName,InputPose,Buttons,ExtraData);
			UpdatedInputNames.push(InputName);
		}
		const UpdateInputNode = UpdateInputNode_.bind(this);
		
		//	track which inputs we updated, so we can update old inputs that have gone missing
		
		function UpdateInput(Input)
		{
			try
			{
				//	gr: this input name is not unique enough yet!
				const InputName = Input.handedness;

				//	treat joints as individual inputs as they all have their own pos
				if ( Input.hand )
				{
					function GetPose(XrSpace)
					{
						if ( !XrSpace )
							return null;
						return Frame.getPose(XrSpace,this.ReferenceSpace);
					}
					const HandInputs = ExtractHandInputs( Input.hand, InputName, GetPose.bind(this) );
					for ( let Input of HandInputs )
					{
						UpdateInputNode( Input.PoseSpace, Input.Name, Input.Buttons, Input.ExtraData );
					}
				}
				else//	normal controller, but on quest, this is also the center of the hand with the finger-click button0
					//	so we should make use of these buttons for a "palm" finger
				if ( Input.gamepad )
				{
					if (!Input.gamepad.connected)
						return;
				
					//	todo: convert buttons from bits to
					//	device-specific named buttons;
					//	eg. on quest 4==A or X, and 5==B or Y
					//	we've changed to named mouse & touch buttons, we should here too
					const Buttons = Input.gamepad.buttons || [];
					UpdateInputNode( Input.targetRaySpace, InputName, Buttons );
				}
			}
			catch(e)
			{
				Pop.Debug(`Input error ${e}`);
			}
		}
		try
		{
			FrameInputs.forEach(UpdateInput.bind(this));
		}
		catch(e)
		{
			console.error(e);
		}
		
		const OldInputNames = Object.keys(this.InputStates);
		const MissingInputNames = OldInputNames.filter( Name => !UpdatedInputNames.some( uin => uin == Name) );
		MissingInputNames.forEach( Name => UpdateInputNode(null,Name,[]) );
		
	}
	
	FrameUpdate_RenderMultiView(Frame, Pose)
	{
		if ( !this.MultiviewRenderTarget )
		{
			this.MultiviewRenderTarget = new RenderTargetMultiview( this.XrFactory, this.Session, this.Layer, this.RenderContext, this.EnableStencilBuffer );
		}
		const RenderTarget = this.MultiviewRenderTarget;
		RenderTarget.UpdateViews(Pose.views);

		//	fast/min-test
		//const Unbind = RenderTarget.BindRenderTarget(this.RenderContext);
		//Unbind();
		
		//	to get scene commands, we only need one camera
		//	2nd view stuff is done in shader view multiview
		const LeftCamera = this.GetXrCamera( Frame, Pose, Pose.views[0] );
		const RightCamera = this.GetXrCamera( Frame, Pose, Pose.views[1] );
		
		//	need something nicer here to pass params to render commands
		//	this is used by the callback to get shaders with multiview enabled
		//	maybe we can automate this in the asset system, but... that's becoming very
		//	self dependent/enclosed
		LeftCamera.MultiView = true;
		RightCamera.MultiView = true;
		
		const Cameras = [LeftCamera,RightCamera];
		let RenderCommands = this.GetRenderCommands( this.RenderContext, LeftCamera );
		
		//	execute commands
		RenderCommands = new RenderCommands_t( RenderCommands );
		
		const Viewport = this.MultiviewRenderTarget.GetRenderTargetRect();
		const InjectedUniforms = {};
		InjectedUniforms.Pop_CameraWorldToCameraTransforms = Cameras.map( c => c.GetWorldToCameraMatrix() ).map( v => Array.from(v) ).flat(2);
		InjectedUniforms.Pop_CameraProjectionTransforms = Cameras.map( c => c.GetProjectionMatrix(Viewport) ).map( v => Array.from(v) ).flat(2);

		function InjectCameraUniforms(RenderCommand)
		{
			if ( RenderCommand instanceof RenderCommand_Draw )
			{
				Object.assign( RenderCommand.Uniforms, InjectedUniforms );
			}
		}
		RenderCommands.Commands.forEach( InjectCameraUniforms );
		
		this.RenderContext.ProcessRenderCommands( RenderCommands, RenderTarget );
	}
	
	GetXrCamera(Frame,Pose,View)
	{
		const CameraName = this.GetCameraName(View);
		const Camera = this.GetCamera(CameraName);
		
		//	maybe need a better place to propogate this info (along with chaperone/bounds)
		//	but for now renderer just needs to know (but input doesnt know!)
		Camera.IsOriginFloor = IsReferenceSpaceOriginFloor(this.ReferenceSpace.Type);
		
		//	use the render params on our camera
		if ( Frame.session.renderState )
		{
			Camera.NearDistance = Frame.session.renderState.depthNear || Camera.NearDistance;
			Camera.FarDistance = Frame.session.renderState.depthFar || Camera.FarDistance;
			Camera.FovVertical = Frame.session.renderState.inlineVerticalFieldOfView || Camera.FovVertical;
		}
		
		//	update camera
		//	view has an XRRigidTransform (quest)
		//	https://developer.mozilla.org/en-US/docs/Web/API/XRRigidTransform
		Camera.Transform = View.transform;	//	stored for debugging
		
		//	write position (w should always be 0
		Camera.Position = [View.transform.position.x,View.transform.position.y,View.transform.position.z];
		
		//	get rotation but remove the translation (so we use .Position)
		//	we also want the inverse for our camera-local purposes
		Camera.Rotation4x4 = View.transform.inverse.matrix;
		SetMatrixTranslation(Camera.Rotation4x4,0,0,0,1);
		
		Camera.ProjectionMatrix = View.projectionMatrix;
		
		Camera.DepthImage = this.GetDepthImage(CameraName);
		return Camera;
	}
	
	//	non-layer rendering
	FrameUpdate_RenderClassic(Frame,Pose,View,DeviceFrameBuffer)
	{
		const RenderTarget = new RenderTargetViewProxy( this.Layer, View, this.RenderContext );
		
		//	generate camera
		const Camera = this.GetXrCamera(Frame,Pose,View);

		//	would be nice if we could have some generic camera uniforms and only generate one set of commands?
		let RenderCommands = this.GetRenderCommands( this.RenderContext, Camera );
		
		//	AR (and additive, eg. hololens) need to be transparent
		const TransparentClear = IsTransparentBlendMode(Frame.session.environmentBlendMode);

		//	force any clear-colours of null (device) render target to have alpha=0 for AR/transparent devices
		//	gr: should we do this before, or after parsing...
		if ( TransparentClear )
		{
			function SetRenderTargetCommandClearTransparent(Command)
			{
				if ( Command[0] != 'SetRenderTarget' )
					return Command;
				//	only applies to device target
				if ( Command[1] != null )
					return Command;
				//	set arg2 (clear colour) to null to not clear
				Command[2] = null;
				return Command;
			}
			RenderCommands = RenderCommands.map( SetRenderTargetCommandClearTransparent );
		}
		
		//	execute commands
		RenderCommands = new RenderCommands_t( RenderCommands );
		this.RenderContext.ProcessRenderCommands( RenderCommands, RenderTarget );
	}

	FrameUpdate_RenderStereoLayer(Frame,Pose)
	{
		//	gr: we need one storage for 1x framebuffer and 1x attachments
		//		but 2 objects to pass to render commands for different "devices"
		if ( !this.StereoRenderTargetStorage )
			this.StereoRenderTargetStorage = new RenderTargetStereoLayer( this.XrFactory, this.Session, this.Layer, this.RenderContext, this.EnableStencilBuffer );
		//	dirty so target will re-attach target & bind framebuffer
		this.StereoRenderTargetStorage.AttachmentDirty = true;
		
		const Views = Pose.views;
		
		for ( let View of Views )
		{
			const RenderTarget = new RenderTargetStereoProxy( this.StereoRenderTargetStorage, View );
		
			//	generate camera
			const Camera = this.GetXrCamera(Frame,Pose,View);

			//	would be nice if we could have some generic camera uniforms and only generate one set of commands?
			let RenderCommands = this.GetRenderCommands( this.RenderContext, Camera );
		
			//	AR (and additive, eg. hololens) need to be transparent
			const TransparentClear = IsTransparentBlendMode(Frame.session.environmentBlendMode);

			//	force any clear-colours of null (device) render target to have alpha=0 for AR/transparent devices
			//	gr: should we do this before, or after parsing...
			if ( TransparentClear )
			{
				function SetRenderTargetCommandClearTransparent(Command)
				{
					if ( Command[0] != 'SetRenderTarget' )
						return Command;
					//	only applies to device target
					if ( Command[1] != null )
						return Command;
					//	set arg2 (clear colour) to null to not clear
					Command[2] = null;
					return Command;
				}
				RenderCommands = RenderCommands.map( SetRenderTargetCommandClearTransparent );
			}
		
			//	execute commands
			RenderCommands = new RenderCommands_t( RenderCommands );
			this.RenderContext.ProcessRenderCommands( RenderCommands, RenderTarget );
		}
	}
	
	
	Close()
	{
		this.Destroy();
	}
	
	Destroy()
	{
		if ( !this.Session )
			return;
			
		this.Session.end();
		this.Session = null;
	}
	
	OnMouseEvent_Default(xyz,Button,Controller,Transform)
	{
		Pop.Debug(`OnXRInput(${[...arguments]})`);
	}
		
	async WaitForTrackedImage()
	{
		//	todo: use promise queue & update from frame update
		
		if ( !this.Session.getTrackedImageScores )
			throw `This XR session doesn't support tracked images`;
		
		while ( this.Session )
		{
			//	need to decide if we want to look for this image... every frame? (if its a moving target)
			//	or just once like an anchor.
			let TrackingScores = await this.Session.getTrackedImageScores();
			
			//	https://github.com/immersive-web/marker-tracking/blob/main/explainer.md
			//	"in the same order as the trackedImages"
			function CompareScores(a,b)
			{
				if ( a > b )	return -1;
				if ( a < b )	return 1;
				return 0;
			}
			
			TrackingScores = Array.from(TrackingScores);
			TrackingScores = TrackingScores.filter( Score => Score != 'untrackable' );
			TrackingScores.sort( CompareScores );
			
			//	todo: handle multiple results, by calling getTrackedImageScores in another thread
			//		put all results into a promisequeue, and make this function pick off from there
			if ( TrackingScores.length == 0 )
			{
				await Pop.Yield(500);
				continue;
			}
			return TrackingScores[0];
		}
		
		throw `XR Session closed. No more tracked images`;
	}
}

 


//	TrackImages is a dictionary of
//	[ImageName] = { Image:PopImage, WidthInMetres:Metres }
//	to supply to image tracking in case its availible
export async function CreateDevice(RenderContext,GetRenderCommands,OnWaitForCallback,TrackImages=null,LayerType=null)
{
	if ( !OnWaitForCallback )
		throw `CreateDevice() requires OnUserCallback callback for 3rd argument`;
	if ( !GetRenderCommands )
		throw `CreateDevice() requires a GetRenderCommands callback for 2nd argument`;
	
	const SessionMode = await GetSupportedSessionMode();
	if ( SessionMode == false )
		throw "Browser doesn't support XR.";
	
	//	if we have a device, wait for it to finish
	if ( Devices.length )
		await Devices[0].WaitForEnd();

	const PlatformXr = GetPlatformXr();

	if ( TrackImages )
	{
		async function GetWebXrTrackImageMeta(TrackImage)
		{
			const TrackMeta = {};
			TrackMeta.image = await TrackImage.Image.GetImageBitmap();
			TrackMeta.widthInMeters = TrackImage.WidthMetres;
			return TrackMeta;
		}

		//	convert TrackImages into webxr compatible meta;
		//	we do this early as it needs to be async and we need to do it before the synchornous callback
		//	todo: save keys so we can refer back to them later?
		const TrackImagesMeta = [];
		for ( let TrackImage of Object.values(TrackImages) )
		{
			const Meta = await GetWebXrTrackImageMeta(TrackImage);
			TrackImagesMeta.push(Meta);
		}
		TrackImages = TrackImagesMeta;
	}

	//	loop until we get a session
	while(true)
	{
		try
		{
			//	this will cause a dom exception if there's more than one async queue
			//	so we create a callback, that a callback can call when the user clicks a button
			//const Session = await PlatformXr.requestSession(SessionMode);
			const SessionPromise = CreatePromise();
			const Callback = function()
			{
				//	gr: could use a generic callback like the audio system does
				//	this should be called from user interaction, so we start,
				//	and return that promise
				try
				{
					const Options = {};
					//	gr: this should/could request for permission for the extra functionality
					//	https://immersive-web.github.io/webxr/#dictdef-xrsessioninit
					//Options.requiredFeatures = ['local-floor'];

					Options.optionalFeatures = [];
					
					//	gr: I thought these were space types... rather than features
					Options.optionalFeatures.push('local');
					Options.optionalFeatures.push('local-floor');
					Options.optionalFeatures.push('bounded-floor');

					Options.optionalFeatures.push('hand-tracking');	//	for quest
					Options.optionalFeatures.push('hit-test');	//	raycasting
					
					//	try and enable meshing
					//	https://cabanier.github.io/real-world-geometry/webxrmeshing-1.html
					Options.optionalFeatures.push('XRWorldMeshFeature');
					Options.optionalFeatures.push('XRNearMeshFeature');
					
					//	feature names based on specs/proposals from
					//	https://github.com/orgs/immersive-web/repositories

					//	https://immersive-web.github.io/depth-sensing/
					Options.optionalFeatures.push('depth-sensing');
					//	depth sensing options required if requesting feature
					Options.depthSensing = {};
					Options.depthSensing.usagePreference = ['gpu-optimized','cpu-optimized'];
					Options.depthSensing.dataFormatPreference = ['float32','luminance-alpha'];
					
					Options.optionalFeatures.push('light-estimation');
					
					Options.optionalFeatures.push('dom-overlay');	//	rendering dom in 3d
					
					//	https://github.com/immersive-web/marker-tracking/blob/main/explainer.md
					Options.optionalFeatures.push('image-tracking');
					
					Options.optionalFeatures.push('real-world-geometry');
					
					//	https://immersive-web.github.io/real-world-geometry/plane-detection.html
					Options.optionalFeatures.push('plane-detection');
					
					//	https://immersive-web.github.io/raw-camera-access/
					Options.optionalFeatures.push('camera-access');
					
					//	oculus foveated rendering
					//	https://developer.oculus.com/documentation/web/webxr-ffr/
					Options.optionalFeatures.push('high-fixed-foveation-level');
					

					
					if ( TrackImages )
					{
						//	gr: if provided, should we force/.requiredFeatures the image-tracking,
						//		or get support-info after.
						//		client would have to keep calling CreateDevice and look for specific exceptions?
						//	our API kinda wants to be as easy as possible from outside...
					
						Options.trackedImages = TrackImages;
					}
					
					const RequestSessionPromise = PlatformXr.requestSession(SessionMode,Options);
					RequestSessionPromise.then( Session => SessionPromise.Resolve(Session) ).catch( e => SessionPromise.Reject(e) );
				}
				catch(e)
				{
					SessionPromise.Reject(e);
				}
			}
			OnWaitForCallback(Callback);
			const Session = await SessionPromise;
			
			const HasHitTest = Session.requestHitTestSource != null;
			console.log(`XR HasHitTest=${HasHitTest}`);
			
			//	gr: isImmersive was deprecated
			//		we want a local space, maybe not relative to the floor?
			//		so we can align with other remote spaces a bit more easily
			//	try and get reference space types in an ideal order
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
						Pop.Warning(`XR ReferenceSpace type ${ReferenceSpaceType} not supported. ${e}`);
					}
				}
				throw `Failed to find supported XR reference space`;
			}
			const ReferenceSpace = await GetReferenceSpace();
			Pop.Debug(`Got XR ReferenceSpace`,ReferenceSpace);
			
			const Device = new Device_t( Session, ReferenceSpace, RenderContext, GetRenderCommands );
			await Device.WaitForInit(LayerType);
			
			//	add to our global list (currently only to make sure we have one at a time)
			Devices.push( Device );
			
			//	when device ends, remove it from the list
			const RemoveDevice = function()
			{
				Devices = Devices.filter( d => d!=Device );
			}
			Device.WaitForEnd().then(RemoveDevice).catch(RemoveDevice);
			
			return Device;
		}
		catch(e)
		{
			Pop.Debug("Error creating XR session",e);
			await Pop.Yield(10*1000);
		}
	}
}

function ExtractHandInputs(InputHand,InputName,GetPose)
{
	const Joints = Object.fromEntries(InputHand.entries());

	//	divide each finger into it's own input, with trailing bones(joints).
	//	First joint name is our most important one and is the position of the input
	//	it then has transforms of its children
	//	we should have one general one for the hand?
	function GetFingerSkeleton(Prefix)
	{
		return [
			`${Prefix}-tip`,
			`${Prefix}-phalanx-distal`,
			`${Prefix}-phalanx-proximal`,
			`${Prefix}-metacarpal`,
			//`wrist`
		];
	}
	//	these names + skeleton above are standard webxr names (from quest)
	const FingerNames =
	[
		'thumb',
		'index-finger',
		'middle-finger',
		'ring-finger',
		'pinky-finger'
	];
	
	function GetJointPosition(JointName)
	{
		const XrSpace = Joints[JointName];
		const Pose = GetPose(XrSpace);
		const Position = Pose ? [Pose.transform.position.x,Pose.transform.position.y,Pose.transform.position.z] : null;
		return Position;
	}
	function GetJointLocalToWorld(JointName)
	{
		const XrSpace = Joints[JointName];
		const Pose = GetPose(XrSpace);
		const Position = Pose ? Array.from(Pose.transform.matrix) : null;
		return Position;
	}
	
	const InputOriginLocalToWorld = GetJointLocalToWorld('wrist');
	
	//	each finger is a "button"
	function GetFingerInput(FingerName)
	{
		const NodeName = `${InputName}_${FingerName}`;
		const JointNames = GetFingerSkeleton(FingerName);
		const JointLocalToWorlds = JointNames.map( GetJointLocalToWorld );
		const JointSpaces = JointNames.map( jn => Joints[jn] );
		
		const Input = {};
		Input.Name = NodeName;
		Input.PoseSpace = JointSpaces[0];	//	primary joint (tip)
		Input.ExtraData = {};
		Input.ExtraData.LocalToWorlds = JointLocalToWorlds;
		Input.ExtraData.InputOriginLocalToWorld = InputOriginLocalToWorld;
		//	new system never has buttons down...
		//	could do a float of how straight fingers are
		//	or if tip is touching another tip...
		//	could do both as our input system is all about named buttons
		//	eg. left-index-finger-outstretched=0.9
		Input.Buttons = [];
		
		return Input;
	}
	const FingerInputs = FingerNames.map(GetFingerInput);
	return FingerInputs;
}
*/

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
