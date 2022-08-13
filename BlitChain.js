import {CreatePromise} from '../PopEngineCommon/PopApi.js'
import {GetAsset,RegisterAssetFetchFunction,RegisterAssetAsyncFetchFunction,RegisterShaderAssetFilename} from '../../PopEngineCommon/AssetManager.js'
//	need Pop.Image here!

const QuadGeo = 'BlitQuad';
let ScreenQuad_Attribs = null;

async function CreateTriangleBuffer(RenderContext,Geometry)
{
	//	auto-calc triangle counts or vertex sizes etc
	if ( !Geometry.TriangleCount )
	{
		if ( Geometry.PositionSize && Geometry.Positions )
		{
			Geometry.TriangleCount = Geometry.Positions.length / Geometry.PositionSize;
		}
		else
		{
			throw `Cannot determine trianglecount/vertex attribute size for geometry`;
		}
	}
	
	const VertexAttribs = [];
	const LocalPosition = {};
	//	gr: should engine always just figure this out?
	LocalPosition.Size = Geometry.Positions.length / Geometry.TriangleCount;
	LocalPosition.Data = new Float32Array( Geometry.Positions );
	VertexAttribs['LocalPosition'] = LocalPosition;
	
	if ( Geometry.TexCoords )
	{
		const Uv0 = {};
		Uv0.Size = Geometry.TexCoords.length / Geometry.TriangleCount;
		Uv0.Data = new Float32Array( Geometry.TexCoords );
		VertexAttribs['LocalUv'] = Uv0;
	}
	
	//const TriangleIndexes = new Int32Array( Geometry.TriangleIndexes );
	const TriangleIndexes = undefined;
	const TriangleBuffer = await RenderContext.CreateGeometry( VertexAttribs, TriangleIndexes );
	
	return TriangleBuffer;
}

function GetScreenQuad(MinX,MinY,MaxX,MaxY,TheZ=0)
{
	let Positions = [];
	let TexCoords = [];
	
	function AddTriangle(a,b,c)
	{
		Positions.push( ...a.slice(0,3) );
		Positions.push( ...b.slice(0,3) );
		Positions.push( ...c.slice(0,3) );
		
		const TriangleIndex = Positions.length / 3;
		function PosToTexCoord(xyzuv)
		{
			const u = xyzuv[3];
			const v = xyzuv[4];
			const w = TriangleIndex;
			return [u,v,w];
		}
		
		TexCoords.push( ...PosToTexCoord(a) );
		TexCoords.push( ...PosToTexCoord(b) );
		TexCoords.push( ...PosToTexCoord(c) );
	}
	
	let tr = [MaxX,MinY,TheZ,	1,0];
	let tl = [MinX,MinY,TheZ,	0,0];
	let br = [MaxX,MaxY,TheZ,	1,1];
	let bl = [MinX,MaxY,TheZ,	0,1];
	
	AddTriangle( tl, tr, br );
	AddTriangle( br, bl, tl );
	
	const Geometry = {};
	Geometry.Positions = Positions;
	Geometry.PositionSize = 3;
	Geometry.TexCoords = TexCoords;
	return Geometry;
}

function CreateBlitQuadGeometry()
{
	let l = 0;
	let t = 0;
	let r = 1;
	let b = 1;
	const VertexData = [	l,t,	r,t,	r,b,	r,b, l,b, l,t	];
	
	const TexCoord = {};
	TexCoord.Size = 2;
	TexCoord.Data = VertexData;

	const Geometry = {};
	Geometry.TexCoord = TexCoord;
	return Geometry;
}


async function CreateQuadTriangleBuffer(RenderContext)
{
	//	was called GetScreenQuad_TriangleBuffer in demo
	//const Geometry = GetScreenQuad(-0.5,-0.5,0.5,0.5,0.5);
	//const Buffer = await CreateTriangleBuffer(RenderContext,Geometry);

	const Geometry = CreateBlitQuadGeometry();
	const TriangleIndexes = undefined;
	const Buffer = await RenderContext.CreateGeometry( Geometry, TriangleIndexes );

	
	Pop.Debug(`created CreateQuadTriangleBuffer ${Buffer}`);
	//	these need to be in the right order...
	//	that depends what order thejs lib reads VertexAttribs in CreateGeometry...
	//	TriangleBuffer isn't an object either...
	//ScreenQuad_Attribs = Object.keys(VertexAttribs);

	return Buffer;
}




export default class BlitChain
{
	constructor(ShaderAssetNames,TempImagePool)
	{
		this.CanRenderToFloat = null;	//	unknown if null
		//this.CanRenderToFloat = false;
		
		this.ShaderPassesAssetNames = ShaderAssetNames;
		this.TempImagePool = TempImagePool;

		RegisterAssetAsyncFetchFunction( QuadGeo, CreateQuadTriangleBuffer );
		
		//	we're not calling this in TStream stuff, we need to work out a good place to wait for it
		//this.LoadAssets();
	}
	
	async LoadAssets()
	{
	}
	
	GetTempRenderTargetTexture(TemplateTexture)
	{
		const Width = TemplateTexture.GetWidth();
		const Height = TemplateTexture.GetHeight();
		let Format = 'RGBA';
		if ( this.CanRenderToFloat )
		{
			Format = 'Float4';
		}
		if ( this.CanRenderToFloat !== true && this.CanRenderToFloat !== false )
			Pop.Debug(`GetTempRenderTargetTexture CanRenderToFloat=${this.CanRenderToFloat}`);
		const TempTexture = this.TempImagePool.Alloc(Width,Height,Format);
		TempTexture.Name = `TempBlitter texture`;
		return TempTexture;
	}
	
	ReleaseTempTexture(TempTexture)
	{
		this.TempImagePool.Release(TempTexture);
	}

	async Execute(RenderContext,InputUniforms,OutputTexture,ReadBackPixels)
	{
		//	get render to float capability if not already determined (BEFORE we grab the temp texture!)
		if ( this.CanRenderToFloat === null )
		{
			this.CanRenderToFloat = RenderContext.CanRenderToPixelFormat('Float4');
			Pop.Debug(`BlitChain CanRenderToFloat=${this.CanRenderToFloat}`);
		}
				
		//Pop.Debug(`Blit chain Execute`);
		function RenderBlit(RenderTarget,InputTexture,LastPass)
		{
			Pop.Debug(`RenderBlit()`);
			//	gr: BlitFragShader can't be right? due to our smart organising of passes, maybe this function is never called
			Pop.Warning(`gr: BlitFragShader can't be right? due to our smart organising of passes, maybe this function is never called`);
			const Geo = GetAsset(QuadGeo,RenderContext);
			const Shader = GetAsset(BlitFragShader,RenderContext);
			function SetUniforms(Shader)
			{
				Shader.SetUniform('InputTexture',InputTexture);
				Shader.SetUniform('VertexRect',[0,0,1,1]);
				Shader.SetUniform('OutputImageSize',[RenderTarget.GetWidth(),RenderTarget.GetHeight()]);
			}
			RenderTarget.DrawGeometry( Geo, Shader, SetUniforms );
		}

		function RenderPass(RenderTarget,ShaderName,Uniforms)
		{
			const Geo = GetAsset(QuadGeo,RenderContext);
			const Shader = GetAsset(ShaderName,RenderContext);
			function SetUniforms(Shader)
			{
				Uniforms.VertexRect = [0,0,1,1];
				for ( let [Key,Value] of Object.entries(Uniforms) )
				{
					//	gr: an error here brought down the old decoder entirely
					//		why wasn't it trying to continue the blit?
					try
					{
						Shader.SetUniform(Key,Value);
					}
					catch(e)
					{
						Pop.Warning(`Error setting uniform in blit ${e}`);
					}
				}
			}
			//RenderTarget.SetBlendModeBlitWithAlpha();
			RenderTarget.SetBlendModeBlit();
			RenderTarget.DrawGeometry( Geo, Shader, SetUniforms.bind(this) );
		}
		
		async function SokolRenderPass(RenderTarget,ShaderName,Uniforms,LastPass)
		{
			//Geo = await GetScreenQuad_TriangleBuffer(Sokol);
			//const FragSource = TestShader_FragSource;
			//const VertSource = TestShader_VertSource;
			//const TestShaderAttribs = ScreenQuad_Attribs;
			//TestShader = await Sokol.CreateShader( VertSource, FragSource, TestShaderUniforms, TestShaderAttribs );

			Uniforms.VertexRect = [0,0,1,1];
			Uniforms.OutputImageSize = [RenderTarget.GetWidth(),RenderTarget.GetHeight()];

			const Geo = GetAsset( QuadGeo, RenderContext );
			const Shader = GetAsset( ShaderName, RenderContext );
			const Commands = [];
			const ClearColour = [0,1,0];
			
			Commands.push( [ 'SetRenderTarget', RenderTarget, ClearColour ] );
			Commands.push( [ 'Draw', Geo, Shader, Uniforms ] );

			if ( LastPass && ReadBackPixels )
			{
				let ReadBackFormat = ReadBackPixels;
				if ( ReadBackPixels === true )
					ReadBackFormat = RenderTarget.GetFormat();
			
				Commands.push( [ 'ReadPixels', RenderTarget, ReadBackFormat ] );
			}
				
			await RenderContext.Render(Commands);
		}
		
		
		function BlitCopy(Input,Output,LastPass)
		{
			RenderContext.RenderToRenderTarget( Output,  (rt)=>RenderBlit(rt,Input) );
		}
		
		async function Blit(Input,Output,ShaderName,LastPass)
		{
			if ( !ShaderName )
				throw `Blit chain Blit() null shader name, handle copy`;
				
			const Uniforms = Object.assign( {}, InputUniforms );
			Uniforms.InputTexture = Input;
			Uniforms.InputTextureSize = Input ? [Input.GetWidth(),Input.GetHeight()] : [1,1];
			
			//	web/immediate mode rendering
			if ( RenderContext.RenderToRenderTarget )
			{
				function Render(RenderTarget)
				{
					RenderPass( RenderTarget, ShaderName, Uniforms ); 
				}
				if ( LastPass && ReadBackPixels )
					throw `todo: read back pixels in immediate render`;
				RenderContext.RenderToRenderTarget(Output, Render, ReadBackPixels );
			}
			else // sokol/render command mode
			{
				await SokolRenderPass( Output, ShaderName, Uniforms, LastPass );
			}
		}
		
		const Shaders = this.ShaderPassesAssetNames;
		
		const TempTexture = this.GetTempRenderTargetTexture(OutputTexture);
		try
		{
			await this._ExecuteBlitChain( OutputTexture, TempTexture, Shaders, Blit );
			this.ReleaseTempTexture(TempTexture);
		}
		catch(e)
		{
			this.ReleaseTempTexture(TempTexture);
			throw e;
		}
	}
	
	
	async _ExecuteBlitChain(OutputTexture,TempTexture,Shaders,Blit)
	{
		const NullTexture = 'DummyInputTextureNonNull';
		const InputTexture = NullTexture;
		let BufferA = TempTexture;
		let Output = OutputTexture;
		let Input = InputTexture;
		let Blitters = Shaders;
		
		//	blit chain
		//  alternate front & back
		let Back = null;
		let Front = null;

		for ( let i=0;	i<Blitters.length;	i++ )
		{
			const LastPass = (i==Blitters.length-1);
			let Blitter = Blitters[i];
			if (Blitter == null)
				continue;

			//  back buffer flip
			//  not rendered to front yet, back should be input	
			if (Front == null)
			{
				Back = Input;
				//	gr: little trick, if we have an EVEN number of blits, blit to BufferA first and
				//		the last front should be output. (assuming no null blitters)
				let EvenNumberOfBlits = (Blitters.length % 2) == 0;
				Front = EvenNumberOfBlits ? BufferA : Output;
			}
			else // flip
			{
				Back = Front;
				Front = (Back == Output) ? BufferA : Output;
			}

			//Graphics.Blit(Source, BackBuffer);
			//SetUniforms(Blitter);
			//Graphics.Blit(Back, Front, Blitter);
			const Src = (Back==NullTexture) ? null : Back;
			const Dst = (Front==NullTexture) ? null : Front;
			await Blit(Src,Dst,Blitter,LastPass);
		}
		
		//	gr: due to the smort front/back buffer originising, 
		//		I don't think this will actually be called
		if ( Front != Output )
		{
			const Src = (Front==NullTexture) ? null : Front;
			const Dst = (Output==NullTexture) ? null : Output;
			//Graphics.Blit(Front, Output);
			const LastPass = true;
			await Blit(Src,Dst,null,LastPass);
			Pop.Debug("Extra blit to output Blitters.Count=" + Blitters.Count);
		}
	}
}
