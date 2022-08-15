import Camera_t from './Camera.js'
import * as CubeShader from './Micro_CubeShader.js'

let Camera = new Camera_t();
Camera.Position = [ 0,0,10 ];
Camera.LookAt = [ 0,0,0 ];
Camera.FovVertical = 60;
let rc;
let gl;
let TickCount=0;


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
		
		let dai = gl.getExtension('ANGLE_instanced_arrays');
		gl.drawArraysInstanced = ()=> dai.drawArraysInstancedANGLE(...arguments);
		
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
		Render(Canvas.width,Canvas.height);
		TickCount++;
	}
	Tick();
	return 'Bootup finished';
}


function Update()
{
	
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
	
	let Instances = 200000;

	//	set uniforms
	//const Viewport=[0,0,1,1];
	SetUniformMat4(rc.CubeShader,'WorldToCameraTransform',Camera.GetWorldToCameraMatrix());
	SetUniformMat4(rc.CubeShader,'CameraToWorldTransform',Camera.GetLocalToWorldMatrix());
	SetUniformMat4(rc.CubeShader,'CameraProjectionTransform',Camera.GetProjectionMatrix(Viewport));
	SetUniformFloat(rc.CubeShader,'TickCount',TickCount%Instances);
	
	let TriangleCount = 6*2*3;
	let IndexCount = TriangleCount*3;
	gl.drawArrays( gl.TRIANGLES, 0, IndexCount*Instances );
}
