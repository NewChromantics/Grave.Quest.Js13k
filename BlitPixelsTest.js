import Camera_t from './PopEngine/Camera.js'
import {CreateTranslationMatrix,Add3,Multiply3,Dot3,lerp,LengthSq3,Normalise3,Subtract3} from './PopEngine/Math.js'
import {CreateRandomImage} from './PopEngine/Images.js'
import {GetRandomColour} from './PopEngine/Colour.js'
import * as PopMath from './PopEngine/Math.js'
import Pop from './PopEngine/PopEngine.js'

import AssetManager from './PopEngine/AssetManager.js'
import {HasFetchFunction} from './PopEngine/AssetManager.js'
import {CreateBlitQuadGeometry} from './PopEngine/CommonGeometry.js'
import {GetDirtyFloatIndexArray} from './PopEngine/DirtyBuffer.js'
import DirtyBuffer from './PopEngine/DirtyBuffer.js'





async function CreateQuadTriangleBuffer(RenderContext)
{
	const Geometry = CreateBlitQuadGeometry();
	const TriangleIndexes = undefined;
	return RenderContext.CreateGeometry( Geometry, TriangleIndexes );
}

let PixelTestShaderName = null;


let PositionIndexArray = null;
function GetPositionIndexDirtyArray(Length)
{
	if ( !PositionIndexArray )
	{
		const Values = new Array(Length).fill(0).map( (zero,index) => index );
		const FloatValues = new Float32Array(Values);
		PositionIndexArray = new DirtyBuffer( FloatValues );
	}
	
	//	need something smarter than this? DirtyBuffer can handle that though
	if ( PositionIndexArray.length < Length )
	{
		const FirstIndex = PositionIndexArray.length;
		const Values = new Array(Length - PositionIndexArray.length).fill(0).map( (zero,index) => FirstIndex+index );
		const FloatValues = new Float32Array(Values);
		PositionIndexArray.push(FloatValues);
	}
	
	return PositionIndexArray;
}


export default function GetBlitPixelTestRenderCommands(RenderContext,OutputTexture,VoxelBuffer,OccupancyMapSize,ReadBackOccupancy)
{
	const Test = false;
	
	if ( !HasFetchFunction('Quad') )
	{
		AssetManager.RegisterAssetAsyncFetchFunction('Quad', CreateQuadTriangleBuffer );
	}
	if ( !PixelTestShaderName )
	{
		let VertFilename = 'BlitPixelsOccupancy.Vert.glsl';
		let FragFilename = 'BlitPixelsOccupancy.Frag.glsl';
		if ( Test )
		{
			 VertFilename = 'BlitPixelsTest.Vert.glsl';
			FragFilename = 'BlitPixelsTest.Frag.glsl';
		}
		PixelTestShaderName = AssetManager.RegisterShaderAssetFilename( FragFilename, VertFilename );
	}

	if ( !VoxelBuffer )
		return [];
	
	const w = OutputTexture.GetWidth();
	const h = OutputTexture.GetHeight();
	
	let PositionIndexes = GetPositionIndexDirtyArray( VoxelBuffer.VoxelsUsed );

	const Clear = [0,0,0,0];
	const ReadBack = ReadBackOccupancy;
	const SetRenderTarget = ['SetRenderTarget',OutputTexture,Clear,ReadBack];
	
	//	render pixels
	const Geo = AssetManager.GetAsset('Quad',RenderContext);
	const Shader = AssetManager.GetAsset(PixelTestShaderName,RenderContext);
	
	const Uniforms = {};
	Uniforms.PositionIndex = PositionIndexes;
	Uniforms.OutputTextureSize = [w,h];
	Uniforms.PositionsTexture = VoxelBuffer.PositionsTexture;
	Uniforms.PositionsTextureSize = [Uniforms.PositionsTexture.GetWidth(),Uniforms.PositionsTexture.GetHeight()];
	Uniforms.OccupancyMapWorldMin = OccupancyMapSize.WorldMin;
	Uniforms.OccupancyMapWorldMax = OccupancyMapSize.WorldMax;
	
	const State = {};
	//	turning depth write off seems to make the texture not resolve before rendering left eye
	//	too slow?
	State.DepthWrite = true;
	State.DepthRead = false;
	State.BlendMode = 'ExplicitAdd';
	
	const DrawPixels = ['Draw',Geo,Shader,Uniforms,State];
	
	return [SetRenderTarget,DrawPixels];
}

