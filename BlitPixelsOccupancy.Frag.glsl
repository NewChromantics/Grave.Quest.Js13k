precision highp float;

varying float MapYNormalised;

//	output gets added together
//	but we need to write all of them in order to get a "bit" each
//	so we will section up the values so we can add 2 of the same Y together
//	so 
//		bit0 is 1	+1+1+1+1
//		bit1 is 10		+10+10+10
//		bit2 is 100		+100+100+100
//	this limits the number of objects in the same XZ & Y to 10
//	before it overflows into the next section....
//	we can probably live with this.
//	we could write to a u32 texture, but its rarely supported, so 
//	writing to float and errr, trial&error until we find where data gets screwed up
float GetSectionValue(float Section)
{
	//	pow(10,0)==1 ??
	//return pow( 10.0, float(Section) );
	if ( Section == 0.0 )		return 1.0;
	if ( Section == 1.0 )		return 10.0;
	if ( Section == 2.0 )		return 100.0;
	if ( Section == 3.0 )		return 1000.0;
	if ( Section == 4.0 )		return 10000.0;
	if ( Section == 5.0 )		return 100000.0;
	if ( Section == 6.0 )		return 1000000.0;
	if ( Section == 7.0 )		return 10000000.0;
	if ( Section == 8.0 )		return 100000000.0;
	if ( Section == 9.0 )		return 1000000000.0;
	if ( Section == 10.0 )	return 10000000000.0;
	if ( Section == 11.0 )	return 100000000000.0;
	return 0.0;
}

const int YSectionsPerComponent = 7;
const float YSectionsPerComponentf = float(YSectionsPerComponent);
const int YSectionComponents = 4;
const float YSectionCount = float(YSectionsPerComponent*YSectionComponents);

void main()
{
	float Section = floor(MapYNormalised * YSectionCount );
	Section = clamp( Section, 0.0, YSectionCount-1.0 );
	
	float Component = floor( Section / YSectionsPerComponentf );
	float CompSection = mod( Section, YSectionsPerComponentf );
	
	float CompSectionf = GetSectionValue( CompSection );

	//	not sure if this is faster than if's	
	vec4 ComponentMask = vec4( Component==0.0, Component==1.0, Component==2.0, Component==3.0 );
	vec4 Output = ComponentMask * vec4(CompSectionf);
	
	//gl_FragColor = vec4(SectionValue,SectionValue,SectionValue,SectionValue);
	gl_FragColor = Output;

	
	//	colour is going to be OR'd (via add)
	//	so it needs to be a bit representing Y
	//	todo: 4x8bit encoding
	/*
	int Range = 4 * 8;
	int Bit = int(floor(MapYNormalised * Range));
	
	int Bit0 = (Bit < 8) ? Bit - 0 : 0;
	int Bit1 = (Bit < 16) ? Bit - 8 : 0;
	int Bit2 = (Bit < 24) ? Bit - 16 : 0;
	int Bit3 = (Bit < 32) ? Bit - 24 : 0;
	
	float Bit0f = Bit0 / 255.0;
	
	gl_FragColor = vec4(Bitf,Bitf,Bitf,Bitf);
	int Range = 8;
	float Bit = floor(MapYNormalised * float(Range));

	float Byte = pow(2.0,Bit);//1 << Bit;
	float Bytef = Byte / 255.0;
	gl_FragColor = vec4(Bytef,Bytef,Bytef,Bytef);
	*/
}

