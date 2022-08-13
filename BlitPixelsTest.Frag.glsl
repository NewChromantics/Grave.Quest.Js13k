precision highp float;

varying vec2 FragPixelPosition;


bool AndOne(int x)
{
	int Origx = x;
	
	//	shift >>1
	x = x/2;
	//	shift <<1
	x = x*2;
	
	if ( x != Origx )
	{
		//	lost the lowest bit
		return true;
	}
	else
	{
		return false;
	}
}

void main()
{
	bool Oddx = AndOne( int(FragPixelPosition.x) );
	bool Oddy = AndOne( int(FragPixelPosition.y) );

	gl_FragColor = vec4(0,0,1,1);
	
	if ( Oddx == Oddy )
		gl_FragColor = vec4(1,1,1,1);
	
}

