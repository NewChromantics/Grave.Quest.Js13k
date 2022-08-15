import Camera_t from './Camera.js'
import * as CubeShader from './Micro_CubeShader.js'
import * as PhysicsShader from './Micro_PhysicsShader.js'

let Camera = new Camera_t();
Camera.Position = [ 0,0,10 ];
Camera.LookAt = [ 0,0,0 ];
Camera.FovVertical = 45;
let rc;
let gl;
let TickCount=0;

let PositionsTexture;
let OldPositionsTexture;
let PositionsTarget;

function CompileShader(Type,Source)
{
	const Shader = gl.createShader(Type);
	gl.shaderSource( Shader, Source );
	gl.compileShader( Shader );
	const CompileStatus = gl.getShaderParameter( Shader, gl.COMPILE_STATUS);
	if ( !CompileStatus )
	{
		let Error = gl.getShaderInfoLog(Shader);
		throw `Failed to compile: ${Error}`;
	}
	return Shader;
}


class RenderContext_t
{
	constructor(Canvas)
	{
		const Options = {};
		Options.antialias = true;
		Options.xrCompatible = true;
		Options.premultipliedAlpha = false;
		Options.alpha = true;
		gl = Canvas.getContext('webgl2', Options );
		//this.OnResize();
		
		const RenderToFloat = gl.getExtension('EXT_color_buffer_float');
		
		this.CubeShader = this.CreateShader(CubeShader);
		this.PhysicsShader = this.CreateShader(PhysicsShader);
		
		PositionsTarget = gl.createFramebuffer();
	}
	
	CreateShader(Source)
	{
		const FragShader = CompileShader( gl.FRAGMENT_SHADER, Source.Frag);
		const VertShader = CompileShader( gl.VERTEX_SHADER, Source.Vert);
		let Program = gl.createProgram();
		gl.attachShader( Program, VertShader );
		gl.attachShader( Program, FragShader );
		gl.linkProgram( Program );
		return Program;
	}
	
}


export default async function Bootup(Canvas,XrOnWaitForCallback)
{
	rc = new RenderContext_t(Canvas);
	
	function Tick()
	{
		window.requestAnimationFrame(Tick);
		//setTimeout( Tick, 500 );
		
		Canvas.width = Canvas.getBoundingClientRect().width;
		Canvas.height = Canvas.getBoundingClientRect().height;
		Update();
		UpdateGpu();
		Render(Canvas.width,Canvas.height);
		//	debug to screen
		RenderPhysics();
		
		//RenderPhysics([Canvas.width,Canvas.height]);
		
		TickCount++;
		
	}
	Tick();
	return 'Bootup finished';
}


function Update()
{
	
}

function InitTextureParams()
{
	//const Filter = gl.LINEAR;
	const Filter = gl.NEAREST;
	//	non-power of 2 must be clamp to edge
	const RepeatMode = gl.CLAMP_TO_EDGE;
	
	//	wont render without setting min&mag on float (min on u8)
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER,Filter);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER,Filter);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, RepeatMode);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, RepeatMode);

	//gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
	//gl.generateMipmap(gl.TEXTURE_2D);
	//gl.texSubImage2D( gl.TEXTURE_2D, MipLevel, ...Rect, SourceFormat, SourceType, SubDataValues );

}

function UpdateGpu()
{
	if ( !PositionsTexture )
	{
		//	todo: this will move to shader for init and maybe then dont need any texture initialisation code
		function InitPosition(x,Index)
		{
			return [Math.random(),Math.random()+1,Math.random(),Math.random()];
		}
		const Width = 512;
		const Height = 512;
		let PixelData = new Float32Array(new Array(Width*Height).fill(0).map(InitPosition).flat(2));
		
		PositionsTexture = gl.createTexture();
		PositionsTexture.Size = [Width,Height];

		const SourceFormat = gl.RGBA;
		
		const SourceType = gl.FLOAT;
		const InternalFormat = gl.RGBA32F;	//	webgl2
		const MipLevel = 0;
		const Border = 0;
		const Rect = [0,0,Width,Height];

		//	subimage for later partial updating
		gl.activeTexture( gl.TEXTURE0 );
		gl.bindTexture( gl.TEXTURE_2D, PositionsTexture );
		gl.texImage2D( gl.TEXTURE_2D, MipLevel, InternalFormat, Width, Height, Border, SourceFormat, SourceType, PixelData );
		InitTextureParams();

		OldPositionsTexture = gl.createTexture();
		OldPositionsTexture.Size = [Width,Height];
		gl.activeTexture( gl.TEXTURE0 );
		gl.bindTexture( gl.TEXTURE_2D, OldPositionsTexture );
		gl.texImage2D( gl.TEXTURE_2D, MipLevel, InternalFormat, Width, Height, Border, SourceFormat, SourceType, null );
		InitTextureParams();
	}
}

function SetUniformMat4(Program,Name,Value)
{
	let UniformLocation = gl.getUniformLocation( Program, Name );
	const Transpose = false;
	gl.uniformMatrix4fv( UniformLocation, Transpose, Value );
}


function SetUniformFloat(Program,Name,Value)
{
	let UniformLocation = gl.getUniformLocation( Program, Name );
	gl.uniform1fv( UniformLocation, [Value] );
}

function SetUniformTexture(Program,Name,TextureIndex,Texture)
{
	let UniformLocation = gl.getUniformLocation( Program, Name );
	let TextureValue = gl.TEXTURE0+TextureIndex;
	gl.activeTexture( TextureValue );
	gl.bindTexture( gl.TEXTURE_2D, Texture );
	gl.uniform1iv( UniformLocation, [TextureIndex] );
	if ( !gl.isTexture(Texture) )
		throw `${Texture} Not a texture?`
}


function Render(w,h)
{
	gl.bindFramebuffer( gl.FRAMEBUFFER, null );
	const Viewport=[0,0,w/h,h/h];
	gl.viewport(0,0,w,h);
	gl.clearColor( TickCount%60/60, 0.1, 0.3, 1.0 );
	gl.clearColor( 0, 0.1, 0.3, 1.0 );
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	gl.disable(gl.CULL_FACE);
	gl.enable(gl.DEPTH_TEST);
	
	const Shader = rc.CubeShader;
	//	bind shader
	gl.useProgram( Shader );
	//	bind geo
	//	gr: dont use any buffers (binding geo)
	//		just generate cube vertexes in vertex shader
	//		with gl_VertexID
	//	https://gamedev.stackexchange.com/questions/158391/what-are-free-vertex-indices-in-webgl-2-and-how-do-they-relate-to-geometry-sha
	//		then world positions are from texture
	
	let Instances = PositionsTexture.Size[0] * PositionsTexture.Size[0];

	//	set uniforms
	//const Viewport=[0,0,1,1];
	SetUniformMat4(Shader,'WorldToCameraTransform',Camera.GetWorldToCameraMatrix());
	SetUniformMat4(Shader,'CameraToWorldTransform',Camera.GetLocalToWorldMatrix());
	SetUniformMat4(Shader,'CameraProjectionTransform',Camera.GetProjectionMatrix(Viewport));
	SetUniformFloat(Shader,'TickCount',TickCount%1000);
	
	//	hardcoded texture slots
	SetUniformTexture(Shader,'PositionsTexture',0,PositionsTexture);
	SetUniformTexture(Shader,'OldPositionsTexture',1,OldPositionsTexture);

	
	let TriangleCount = 6*2*3;
	let IndexCount = TriangleCount*3;
	gl.drawArrays( gl.TRIANGLES, 0, IndexCount*Instances );
}

function SwapPositions()
{
	let Old = OldPositionsTexture;
	OldPositionsTexture = PositionsTexture;
	PositionsTexture = Old;
}


function RenderPhysics(ScreenSize)
{
	//	swap
	SwapPositions();
	
	const Target = ScreenSize ? null : PositionsTexture;
	ScreenSize = ScreenSize || Target.Size;
	
	if ( Target )
	{
		//	render to texture
		gl.bindFramebuffer( gl.FRAMEBUFFER, PositionsTarget );
		gl.bindTexture( gl.TEXTURE_2D, null );
		gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, Target, 0 );
	}
	else
	{
		gl.bindFramebuffer( gl.FRAMEBUFFER, null );
	}
	
	gl.viewport(0,0,...ScreenSize);
	gl.clearColor(1,0,0,1);
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	gl.disable(gl.CULL_FACE);

	//	bind shader
	const Shader = rc.PhysicsShader;
	gl.useProgram( Shader );

	SetUniformFloat( Shader,'TickCount',TickCount);
	if ( Target )
		SetUniformTexture( Shader,'OldPositions',0,OldPositionsTexture);
	else
		SetUniformTexture( Shader,'OldPositions',0,PositionsTexture);
	
	gl.drawArrays( gl.TRIANGLE_FAN, 0, 4 );
}
