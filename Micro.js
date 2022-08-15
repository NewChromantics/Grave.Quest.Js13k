import Camera_t from './Camera.js'
import * as CubeShader from './Micro_CubeShader.js'

let Camera = new Camera_t();
Camera.Position = [ 0,0,10 ];
Camera.LookAt = [ 0,0,0 ];
Camera.FovVertical = 45;
let rc;
let gl;
let TickCount=0;

let PositionsTexture;

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
		
		this.CubeShader = this.CreateShader();
	}
	
	CreateShader()
	{
		const FragShader = CompileShader( gl.FRAGMENT_SHADER, CubeShader.Frag);
		const VertShader = CompileShader( gl.VERTEX_SHADER, CubeShader.Vert);
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
		Canvas.width = Canvas.getBoundingClientRect().width;
		Canvas.height = Canvas.getBoundingClientRect().height;
		Update();
		UpdateGpu();
		Render(Canvas.width,Canvas.height);
		TickCount++;
	}
	Tick();
	return 'Bootup finished';
}


function Update()
{
	
}

function UpdateGpu()
{
	if ( !PositionsTexture )
	{
		//	todo: this will move to shader for init and maybe then dont need any texture initialisation code
		function InitPosition(x,Index)
		{
			return [Math.random(),Math.random(),Math.random(),Math.random()];
		}
		const Width = 512;
		const Height = 512;
		let PixelData = new Float32Array(new Array(Width*Height).fill(0).map(InitPosition).flat(2));
		
		PositionsTexture = gl.createTexture();
		PositionsTexture.Width = Width;
		PositionsTexture.Height = Height;

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
		
		//	wont render without setting min&mag on float (min on u8)
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
		//gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
		//gl.generateMipmap(gl.TEXTURE_2D);
		//gl.texSubImage2D( gl.TEXTURE_2D, MipLevel, ...Rect, SourceFormat, SourceType, SubDataValues );
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
	let GlTextureNames = [ gl.TEXTURE0, gl.TEXTURE1, gl.TEXTURE2, gl.TEXTURE3, gl.TEXTURE4, gl.TEXTURE5, gl.TEXTURE6, gl.TEXTURE7 ];
	let TextureKey = `TEXTURE${TextureIndex}`;
	//let TextureValue = gl[TextureKey];
	//let TextureValue = GlTextureNames[TextureIndex];
	let TextureValue = gl.TEXTURE0;
	gl.activeTexture( TextureValue );
	gl.bindTexture( gl.TEXTURE_2D, Texture );
	//gl.uniform1iv( UniformLocation, [TextureIndex] );
	gl.uniform1i( UniformLocation, 0);
	if ( !gl.isTexture(Texture) )
		throw `${Texture} Not a texture?`
}


function Render(w,h)
{
	const Viewport=[0,0,w/h,h/h];
	gl.viewport(0,0,w,h);
	gl.clearColor( TickCount%60/60, 0.1, 0.3, 1.0 );
	gl.clearColor( 0, 0.1, 0.3, 1.0 );
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	gl.disable(gl.CULL_FACE);
	
	//	bind shader
	gl.useProgram( rc.CubeShader );
	//	bind geo
	//	gr: dont use any buffers (binding geo)
	//		just generate cube vertexes in vertex shader
	//		with gl_VertexID
	//	https://gamedev.stackexchange.com/questions/158391/what-are-free-vertex-indices-in-webgl-2-and-how-do-they-relate-to-geometry-sha
	//		then world positions are from texture
	
	let Instances = PositionsTexture.Width * PositionsTexture.Height;

	//	set uniforms
	//const Viewport=[0,0,1,1];
	SetUniformMat4(rc.CubeShader,'WorldToCameraTransform',Camera.GetWorldToCameraMatrix());
	SetUniformMat4(rc.CubeShader,'CameraToWorldTransform',Camera.GetLocalToWorldMatrix());
	SetUniformMat4(rc.CubeShader,'CameraProjectionTransform',Camera.GetProjectionMatrix(Viewport));
	SetUniformFloat(rc.CubeShader,'TickCount',TickCount%Instances);
	
	//	hardcoded texture slots
	SetUniformTexture(rc.CubeShader,'PositionsTexture',0,PositionsTexture);
	
	
	let TriangleCount = 6*2*3;
	let IndexCount = TriangleCount*3;
	gl.drawArrays( gl.TRIANGLES, 0, IndexCount*Instances );
}
