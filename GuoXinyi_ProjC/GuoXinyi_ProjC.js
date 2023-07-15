//3456789_123456789_123456789_123456789_123456789_123456789_123456789_123456789_
// (JT: why the numbers? counts columns, helps me keep 80-char-wide listings)
//
// TABS set to 2.
//
// ORIGINAL SOURCE:
// RotatingTranslatedTriangle.js (c) 2012 matsuda
// HIGHLY MODIFIED to make:
//
// JT_MultiShader.js  for EECS 351-1, 
//									Northwestern Univ. Jack Tumblin

// Xinyi Guo's Project C

/* Show how to use 3 separate VBOs with different verts, attributes & uniforms. 
-------------------------------------------------------------------------------
	Create a 'VBObox' object/class/prototype & library to collect, hold & use all 
	data and functions we need to render a set of vertices kept in one Vertex 
	Buffer Object (VBO) on-screen, including:
	--All source code for all Vertex Shader(s) and Fragment shader(s) we may use 
		to render the vertices stored in this VBO;
	--all variables needed to select and access this object's VBO, shaders, 
		uniforms, attributes, samplers, texture buffers, and any misc. items. 
	--all variables that hold values (uniforms, vertex arrays, element arrays) we 
	  will transfer to the GPU to enable it to render the vertices in our VBO.
	--all user functions: init(), draw(), adjust(), reload(), empty(), restore().
	Put all of it into 'JT_VBObox-Lib.js', a separate library file.

USAGE:
------
1) If your program needs another shader program, make another VBObox object:
 (e.g. an easy vertex & fragment shader program for drawing a ground-plane grid; 
 a fancier shader program for drawing Gouraud-shaded, Phong-lit surfaces, 
 another shader program for drawing Phong-shaded, Phong-lit surfaces, and
 a shader program for multi-textured bump-mapped Phong-shaded & lit surfaces...)
 
 HOW:
 a) COPY CODE: create a new VBObox object by renaming a copy of an existing 
 VBObox object already given to you in the VBObox-Lib.js file. 
 (e.g. copy VBObox1 code to make a VBObox3 object).

 b) CREATE YOUR NEW, GLOBAL VBObox object.  
 For simplicity, make it a global variable. As you only have ONE of these 
 objects, its global scope is unlikely to cause confusions/errors, and you can
 avoid its too-frequent use as a function argument.
 (e.g. above main(), write:    var phongBox = new VBObox3();  )

 c) INITIALIZE: in your JS progam's main() function, initialize your new VBObox;
 (e.g. inside main(), write:  phongBox.init(); )

 d) DRAW: in the JS function that performs all your webGL-drawing tasks, draw
 your new VBObox's contents on-screen. 
 (NOTE: as it's a COPY of an earlier VBObox, your new VBObox's on-screen results
  should duplicate the initial drawing made by the VBObox you copied.  
  If that earlier drawing begins with the exact same initial position and makes 
  the exact same animated moves, then it will hide your new VBObox's drawings!
  --THUS-- be sure to comment out the earlier VBObox's draw() function call  
  to see the draw() result of your new VBObox on-screen).
  (e.g. inside drawAll(), add this:  
      phongBox.switchToMe();
      phongBox.draw();            )

 e) ADJUST: Inside the JS function that animates your webGL drawing by adjusting
 uniforms (updates to ModelMatrix, etc) call the 'adjust' function for each of your
VBOboxes.  Move all the uniform-adjusting operations from that JS function into the
'adjust()' functions for each VBObox. 

2) Customize the VBObox contents; add vertices, add attributes, add uniforms.
 ==============================================================================*/


// Global Variables  
//   (These are almost always a BAD IDEA, but here they eliminate lots of
//    tedious function arguments. 
//    Later, collect them into just a few global, well-organized objects!)
// ============================================================================
// for WebGL usage:--------------------
var gl;													// WebGL rendering context -- the 'webGL' object
																// in JavaScript with all its member fcns & data
var g_canvasID;									// HTML-5 'canvas' element ID#

// For multiple VBOs & Shaders:-----------------
worldBox = new VBObox0();		  // Holds VBO & shaders for 3D 'world' ground-plane grid, etc;
gouraudBox = new VBObox1();		  // "  "  for first set of custom-shaded 3D parts
phongBox = new VBObox2();     // "  "  for second set of custom-shaded 3D parts
var g_axis = 1;
// For animation:---------------------
var g_lastMS = Date.now();			// Timestamp (in milliseconds) for our 
                                // most-recently-drawn WebGL screen contents.  
                                // Set & used by moveAll() fcn to update all
                                // time-varying params for our webGL drawings.
  // All time-dependent params (you can add more!)
var g_angleSphere  =  0.0; 			  // Current rotation angle, in degrees.
				// Rotation angle rate, in degrees/second.
var g_anglebamboo  =  0.0;
var g_bamRate = 40;
                                //---------------
var g_angleBalloon  = 0.0;       // current angle, in degrees
var g_angBalloRate =  5.0;        // rotation angle rate, degrees/sec

var g_angleTetra  = 0.0;       // current angle, in degrees
var g_angTetraRate =  2.0;        // rotation angle rate, degrees/sec

var g_angleCloak = 0;
var g_cloakRate =  25;                            //---------------


                                //---------------
var g_posNow0 =  0.0;           // current position
var g_posRate0 = 0.6;           // position change rate, in distance/second.
var g_posMax0 =  0.5;           // max, min allowed for g_posNow;
var g_posMin0 = -0.5;           
                                // ------------------
var g_posNow1 =  0.0;           // current position
var g_posRate1 = 0.5;           // position change rate, in distance/second.
var g_posMax1 =  1.0;           // max, min allowed positions
var g_posMin1 = -1.0;
                                //---------------

// For mouse/keyboard:------------------------
var g_show0 = 1;								// 0==Show, 1==Hide VBO0 contents on-screen.
var g_show1 = 0;								// 	"					"			VBO1		"				"				" 
var g_show2 = 1;                //  "         "     VBO2    "       "       "

// GLOBAL CAMERA CONTROL:					// 
g_worldMat = new Matrix4();				// Changes CVV drawing axes to 'world' axes.
//------------For projection matrix: -------------------------------
var g_near = 1;
var g_far = 100;
var g_fov = 30;
var g_top = Math.tan(g_fov/2*Math.PI/180)*(g_near+(g_far-g_near)/3);
//console.log(g_top);

//------------For view matrix: -------------------------------
var g_eyex = 7;
var g_eyey = 7;
var g_eyez = 4;
var g_theta =106;
var g_phi = 216;
// var g_eyex = 8.2;
// var g_eyey = 0;
// var g_eyez = 2;
// var g_theta =90;
// var g_phi = 180;
var g_r = 1
g_lookx = g_eyex + g_r*Math.sin(g_theta*Math.PI/180)*Math.cos(g_phi*Math.PI/180);
g_looky = g_eyey + g_r*Math.sin(g_theta*Math.PI/180)*Math.sin(g_phi*Math.PI/180);
g_lookz = g_eyez + g_r*Math.cos(g_theta*Math.PI/180);
var g_delta = 0.05;
// (equivalently: transforms 'world' coord. numbers (x,y,z,w) to CVV coord. numbers)
// WHY?
// Lets mouse/keyboard functions set just one global matrix for 'view' and 
// 'projection' transforms; then VBObox objects use it in their 'adjust()'
// member functions to ensure every VBObox draws its 3D parts and assemblies
// using the same 3D camera at the same 3D position in the same 3D world).
//------------For sphere spinning: -------------------------------
//----------- Gui control:------------------------------------
var controls = new function() {
	this.g_ifBlinn = "Blinn-Phong";
	this.g_ShadMet = "Phong";
	this.g_spinRate = 20.0;
	this.g_lightOn = true;
	this.g_ambiOn = true;
	this.g_diffOn = true;
	this.g_specOn = true;
	this.g_lamPosX = 6.0;
	this.g_lamPosY = 5.0;
	this.g_lamPosZ = 5.0;
	this.g_ambiRGB = [0.4*255,0.4*255,0.4*255];
	this.g_diffRGB = [1.0*255, 1.0*255, 1.0*255];
	this.g_specRGB = [1.0*255, 1.0*255, 1.0*255];
	this.g_matlSel = 9;
}

var gui = new dat.GUI();
gui.add(controls, 'g_ifBlinn',['Phong','Blinn-Phong']).name("Lighting Method");
gui.add(controls, 'g_ShadMet',['Gouraud','Phong']).name("Shading Method");
gui.add(controls, 'g_spinRate', 0, 100).name("Sphere Rate");
gui.add(controls, 'g_matlSel', [1,2,3,
	4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22]).name("Sphere Material");
var folder = gui.addFolder('Light Source Control');
folder.add(controls,'g_lightOn').name("Light Source On/Off");
folder.add(controls,'g_ambiOn').name("Ambient Light On/Off");
folder.add(controls,'g_diffOn').name("Diffuse Light On/Off");
folder.add(controls,'g_specOn').name("Specular Light On/Off");
var folder1 = folder.addFolder('Light Position');
folder1.add(controls,'g_lamPosX',-20,20).name("X");
folder1.add(controls,'g_lamPosY',-20,20).name("Y");
folder1.add(controls,'g_lamPosZ',-20,20).name("Z");
var folder2 = folder.addFolder('Light Color');
folder2.addColor(controls,'g_ambiRGB').name("Ambient Color");
folder2.addColor(controls,'g_diffRGB').name("Diffuse Color");
folder2.addColor(controls,'g_specRGB').name("Specular Color");
folder.open();
folder2.open();
folder1.open();

function main() {
//=============================================================================
  // Retrieve the HTML-5 <canvas> element where webGL will draw our pictures:
  g_canvasID = document.getElementById('webgl');	
  // Create the the WebGL rendering context: one giant JavaScript object that
  // contains the WebGL state machine adjusted by large sets of WebGL functions,
  // built-in variables & parameters, and member data. Every WebGL function call
  // will follow this format:  gl.WebGLfunctionName(args);

  // Create the the WebGL rendering context: one giant JavaScript object that
  // contains the WebGL state machine, adjusted by big sets of WebGL functions,
  // built-in variables & parameters, and member data. Every WebGL func. call
  // will follow this format:  gl.WebGLfunctionName(args);
  //SIMPLE VERSION:  gl = getWebGLContext(g_canvasID); 
  // Here's a BETTER version:
  gl = g_canvasID.getContext("webgl", { preserveDrawingBuffer: true});
	// This fancier-looking version disables HTML-5's default screen-clearing, so 
	// that our drawMain() 
	// function will over-write previous on-screen results until we call the 
	// gl.clear(COLOR_BUFFER_BIT); function. )
  if (!gl) {
    console.log('Failed to get the rendering context for WebGL');
    return;
  }
  gl.clearColor(0.2, 0.2, 0.2, 1);	  // RGBA color for clearing <canvas>

  gl.enable(gl.DEPTH_TEST);

  /*
//----------------SOLVE THE 'REVERSED DEPTH' PROBLEM:------------------------
  // IF the GPU doesn't transform our vertices by a 3D Camera Projection Matrix
  // (and it doesn't -- not until Project B) then the GPU will compute reversed 
  // depth values:  depth==0 for vertex z == -1;   (but depth = 0 means 'near') 
  //		    depth==1 for vertex z == +1.   (and depth = 1 means 'far').
  //
  // To correct the 'REVERSED DEPTH' problem, we could:
  //  a) reverse the sign of z before we render it (e.g. scale(1,1,-1); ugh.)
  //  b) reverse the usage of the depth-buffer's stored values, like this:
  gl.enable(gl.DEPTH_TEST); // enabled by default, but let's be SURE.

  gl.clearDepth(0.0);       // each time we 'clear' our depth buffer, set all
                            // pixel depths to 0.0  (1.0 is DEFAULT)
  gl.depthFunc(gl.GREATER); // draw a pixel only if its depth value is GREATER
                            // than the depth buffer's stored value.
                            // (gl.LESS is DEFAULT; reverse it!)
  //------------------end 'REVERSED DEPTH' fix---------------------------------
*/

  // Initialize each of our 'vboBox' objects: 
  worldBox.init(gl);		// VBO + shaders + uniforms + attribs for our 3D world,
                        // including ground-plane,                       
  gouraudBox.init(gl);		//  "		"		"  for 1st kind of shading & lighting
	phongBox.init(gl);    //  "   "   "  for 2nd kind of shading & lighting

    window.addEventListener("keydown", myKeyDown, false);
	window.addEventListener("keyup", myKeyUp, false);
    //setCamera();				// TEMPORARY: set a global camera used by ALL VBObox objects...
	
  gl.clearColor(0.2, 0.2, 0.2, 1);	  // RGBA color for clearing <canvas>
  
  // ==============ANIMATION=============
  // Quick tutorials on synchronous, real-time animation in JavaScript/HTML-5: 
  //    https://webglfundamentals.org/webgl/lessons/webgl-animation.html
  //  or
  //  	http://creativejs.com/resources/requestanimationframe/
  //		--------------------------------------------------------
  // Why use 'requestAnimationFrame()' instead of the simpler-to-use
  //	fixed-time setInterval() or setTimeout() functions?  Because:
  //		1) it draws the next animation frame 'at the next opportunity' instead 
  //			of a fixed time interval. It allows your browser and operating system
  //			to manage its own processes, power, & computing loads, and to respond 
  //			to on-screen window placement (to skip battery-draining animation in 
  //			any window that was hidden behind others, or was scrolled off-screen)
  //		2) it helps your program avoid 'stuttering' or 'jittery' animation
  //			due to delayed or 'missed' frames.  Your program can read and respond 
  //			to the ACTUAL time interval between displayed frames instead of fixed
  //		 	fixed-time 'setInterval()' calls that may take longer than expected.
  //------------------------------------
  var tick = function() {		    // locally (within main() only), define our 
                                // self-calling animation function. 
    requestAnimationFrame(tick, g_canvasID); // browser callback request; wait
                                // til browser is ready to re-draw canvas, then
    timerAll();  // Update all time-varying params, and
    //drawAll();                // Draw all the VBObox contents
	drawResize();   
	// console.log(g_eyex);
	// console.log(g_eyey);
	// console.log(g_eyez);
	// console.log(g_theta);
	// console.log(g_phi);
	};
  //------------------------------------
  tick();                       // do it again!

}

function timerAll() {
//=============================================================================
// Find new values for all time-varying parameters used for on-screen drawing
  // use local variables to find the elapsed time.
  var nowMS = Date.now();             // current time (in milliseconds)
  var elapsedMS = nowMS - g_lastMS;   // 
  g_lastMS = nowMS;                   // update for next webGL drawing.
  if(elapsedMS > 1000.0) {            
    // Browsers won't re-draw 'canvas' element that isn't visible on-screen 
    // (user chose a different browser tab, etc.); when users make the browser
    // window visible again our resulting 'elapsedMS' value has gotten HUGE.
    // Instead of allowing a HUGE change in all our time-dependent parameters,
    // let's pretend that only a nominal 1/30th second passed:
    elapsedMS = 1000.0/30.0;
    }
  // Find new time-dependent parameters using the current or elapsed time:
  // Continuous rotation:
  g_angleSphere = g_angleSphere + (controls.g_spinRate * elapsedMS) / 1000.0;
  g_angleSphere %= 360.0;   // keep angle >=0.0 and <360.0 degrees 

  g_anglebamboo = g_anglebamboo + (g_bamRate * elapsedMS) / 1000.0;
  g_anglebamboo %= 360.0;   // keep angle >=0.0 and <360.0 degrees 

	g_angleBalloon = g_angleBalloon + (g_angBalloRate * elapsedMS) / 1000.0;
	if (g_angleBalloon > 180.0) g_angleBalloon = g_angleBalloon - 360.0;
	if (g_angleBalloon < -180.0) g_angleBalloon = g_angleBalloon + 360.0;

	if (g_angleBalloon > 5.0 && g_angBalloRate > 0) g_angBalloRate *= -1.0;
	if (g_angleBalloon < -5.0 && g_angBalloRate < 0) g_angBalloRate *= -1.0;
	

	g_angleTetra = g_angleTetra + (g_angTetraRate * elapsedMS) / 1000.0;
	if (g_angleTetra > 180.0) g_angleTetra = g_angleTetra - 360.0;
	if (g_angleTetra < -180.0) g_angleTetra = g_angleTetra + 360.0;

	if (g_angleTetra > 3.0 && g_angTetraRate > 0) g_angTetraRate *= -1.0;
	if (g_angleTetra < -3.0 && g_angTetraRate < 0) g_angTetraRate *= -1.0;

	g_angleCloak = g_angleCloak + (g_cloakRate * elapsedMS) / 1000.0;
	if (g_angleCloak > 180.0) g_angleCloak = g_angleCloak - 360.0;
	if (g_angleCloak < -180.0) g_angleCloak = g_angleCloak + 360.0;

	if (g_angleCloak > 25.0 && g_cloakRate > 0) g_cloakRate *= -1.0;
	if (g_angleCloak < 0 && g_cloakRate < 0) g_cloakRate *= -1.0;

}

function drawAll() {
//=============================================================================
  // Clear on-screen HTML-5 <canvas> object:
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);


    setCamera();	
	draw3Dparts();
/* // ?How slow is our own code?  	
var aftrDraw = Date.now();
var drawWait = aftrDraw - b4Draw;
console.log("wait b4 draw: ", b4Wait, "drawWait: ", drawWait, "mSec");
*/
}

function draw3Dparts() {
    var b4Draw = Date.now();
var b4Wait = b4Draw - g_lastMS;

	if(g_axis == 1) {	// IF user didn't press HTML button to 'hide' VBO0:
	  worldBox.switchToMe();  // Set WebGL to render from this VBObox.
		worldBox.adjust();		  // Send new values for uniforms to the GPU, and
		worldBox.draw();			  // draw our VBO's contents using our shaders.
  }
  if(controls.g_ShadMet == 'Gouraud') { // IF user didn't press HTML button to 'hide' VBO1:
    gouraudBox.switchToMe();  // Set WebGL to render from this VBObox.
  	gouraudBox.adjust();		  // Send new values for uniforms to the GPU, and
  	gouraudBox.draw();			  // draw our VBO's contents using our shaders.
	  }
	if(controls.g_ShadMet == 'Phong') { // IF user didn't press HTML button to 'hide' VBO2:
	  phongBox.switchToMe();  // Set WebGL to render from this VBObox.
  	phongBox.adjust();		  // Send new values for uniforms to the GPU, and
  	phongBox.draw();			  // draw our VBO's contents using our shaders.
  	}
	
}

function setCamera() {
//============================================================================
// PLACEHOLDER:  sets a fixed camera at a fixed position for use by
// ALL VBObox objects.  REPLACE This with your own camera-control code.

     g_worldMat.setIdentity();
	//----------------------Create, fill Left viewport------------------------
	gl.viewport(        0,											// Viewport lower-left corner
	 					0, 			// location(in pixels)
  	 					g_canvasID.width, 				// viewport width,
  	 					g_canvasID.height);			// viewport height in pixels.

	var vpAspect = g_canvasID.width /			// On-screen aspect ratio for
								g_canvasID.height;	// this camera: width/height.

	//pushMatrix(g_worldMat);
	// For this viewport, set camera's eye point and the viewing volume:
	g_worldMat.setPerspective(30,			// fovy: y-axis field-of-view in degrees 	
												// (top <-> bottom in view frustum)
								vpAspect, 		// aspect ratio: width/height
								g_near, g_far);		// near, far (always >0).
	//lookAtpoint();
	vDirection = new Vector3([g_eyex-g_lookx, g_eyey-g_looky, g_eyez-g_lookz]);
	//console.log(vLast);
	//console.log(g_lookx,g_looky,g_lookz);
	g_worldMat.lookAt(	g_eyex, g_eyey, g_eyez, 				// 'Center' or 'Eye Point',
							g_lookx, g_looky, g_lookz, 				// look-At point,
  							0, 0, 1);				// View UP vector, all in 'world' coords.
    
	//g_worldMat = popMatrix();
	// READY to draw in the 'world' coordinate system.
//------------END COPY

}
//===================Keyboard event-handling Callbacks

function myKeyDown(kev) {
	
	//===============================================================================
	// Called when user presses down ANY key on the keyboard;
	//
	// For a light, easy explanation of keyboard events in JavaScript,
	// see:    http://www.kirupa.com/html5/keyboard_events_in_javascript.htm
	// For a thorough explanation of a mess of JavaScript keyboard event handling,
	// see:    http://javascript.info/tutorial/keyboard-events
	//
	// NOTE: Mozilla deprecated the 'keypress' event entirely, and in the
	//        'keydown' event deprecated several read-only properties I used
	//        previously, including kev.charCode, kev.keyCode. 
	//        Revised 2/2019:  use kev.key and kev.code instead.
	//
	// Report EVERYTHING in console:
	console.log("--kev.code:", kev.code, "\t\t--kev.key:", kev.key,
		"\n--kev.ctrlKey:", kev.ctrlKey, "\t--kev.shiftKey:", kev.shiftKey,
		"\n--kev.altKey:", kev.altKey, "\t--kev.metaKey:", kev.metaKey);

	// and report EVERYTHING on webpage:
	document.getElementById('KeyDownResult').innerHTML = ''; // clear old results
	document.getElementById('KeyModResult').innerHTML = '';
	// key details:
	document.getElementById('KeyModResult').innerHTML =
		"   --kev.code:" + kev.code + "      --kev.key:" + kev.key +
		"<br>--kev.ctrlKey:" + kev.ctrlKey + " --kev.shiftKey:" + kev.shiftKey +
		"<br>--kev.altKey:" + kev.altKey + "  --kev.metaKey:" + kev.metaKey;

	switch (kev.code) {
		case "KeyP":
			console.log("Pause/unPause!\n");                // print on console,
			document.getElementById('KeyDownResult').innerHTML =
				'myKeyDown() found p/P key. Pause/unPause!';   // print on webpage
			if (g_isRun == true) {
				g_isRun = false;    // STOP animation
			}
			else {
				g_isRun = true;     // RESTART animation
				tick();
			}
			break;
		//------------------Arrow navigation-----------------
		case "ArrowLeft":
			console.log(' left-arrow.');
			// and print on webpage in the <div> element with id='Result':
			document.getElementById('KeyDownResult').innerHTML =
				'myKeyDown(): Left Arrow=' + kev.keyCode;
			g_phi += 1;
			lookAtpoint();
			break;
		case "ArrowRight":
			console.log('right-arrow.');
			document.getElementById('KeyDownResult').innerHTML =
				'myKeyDown():Right Arrow:keyCode=' + kev.keyCode;
			g_phi -= 1;
			lookAtpoint();
			break;
		case "ArrowDown":
			kev.preventDefault();
			console.log(' down-arrow.');
			document.getElementById('KeyDownResult').innerHTML =
				'myKeyDown(): Down Arrow:keyCode=' + kev.keyCode;
			g_theta += 1;
			lookAtpoint();
			break;
		case "ArrowUp":
			kev.preventDefault();
			console.log('   up-arrow.');
			document.getElementById('KeyDownResult').innerHTML =
				'myKeyDown():   Up Arrow:keyCode=' + kev.keyCode;
			g_theta -= 1;
			lookAtpoint();
			break;
		
		//------------------QE navigation-----------------
		case "KeyQ":
			console.log("q/Q key: Up!\n");
			document.getElementById('KeyDownResult').innerHTML =
				'myKeyDown() found q/Q key. Go up!';
			g_eyez += 0.1;
			g_lookz += 0.1;
			//lookAtpoint();
			break;
		case "KeyE":
			console.log("e/E key: Down!\n");
			document.getElementById('KeyDownResult').innerHTML =
				'myKeyDown() found d/D key. Go down!';
			g_eyez -= 0.1;
			g_lookz -= 0.1;
			//lookAtpoint();
			break;
		//----------------WASD keys------------------------
		case "KeyA":
			console.log("a/A key: Strafe LEFT!\n");
			document.getElementById('KeyDownResult').innerHTML =
				'myKeyDown() found a/A key. Strafe LEFT!';
				//g_delta1 += 0.01;
				eyepointLeft();
			break;
		case "KeyD":
			console.log("d/D key: Strafe RIGHT!\n");
			document.getElementById('KeyDownResult').innerHTML =
				'myKeyDown() found d/D key. Strafe RIGHT!';
				eyepointRight();
			break;
		case "KeyW":
			console.log("w/W key: Move FWD!\n");
			document.getElementById('KeyDownResult').innerHTML =
				'myKeyDown() found w/W key. Move FWD!';
			eyepointFor();
			break;
		case "KeyS":
			console.log("s/S key: Move BACK!\n");
			document.getElementById('KeyDownResult').innerHTML =
				'myKeyDown() found s/Sa key. Move BACK.';
			eyepointBack();
			break;
		default:
			console.log("UNUSED!");
			document.getElementById('KeyDownResult').innerHTML =
				'myKeyDown(): UNUSED!';
			break;
	}
}

function myKeyUp(kev) {
	//===============================================================================
	// Called when user releases ANY key on the keyboard; captures scancodes well

	console.log('myKeyUp()--keyCode=' + kev.keyCode + ' released.');
}

// update look at point
function lookAtpoint(){
    g_lookx = g_eyex + g_r*Math.sin(g_theta*Math.PI/180)*Math.cos(g_phi*Math.PI/180);
    g_looky = g_eyey + g_r*Math.sin(g_theta*Math.PI/180)*Math.sin(g_phi*Math.PI/180);
    g_lookz = g_eyez + g_r*Math.cos(g_theta*Math.PI/180);
}

function eyepointFor(){
	g_eyex = g_eyex + g_delta*Math.sin(g_theta*Math.PI/180)*Math.cos(g_phi*Math.PI/180);
    g_eyey = g_eyey + g_delta*Math.sin(g_theta*Math.PI/180)*Math.sin(g_phi*Math.PI/180);
    g_eyez = g_eyez + g_delta*Math.cos(g_theta*Math.PI/180);
	lookAtpoint();
}

function eyepointBack(){
	g_eyex = g_eyex - g_delta*Math.sin(g_theta*Math.PI/180)*Math.cos(g_phi*Math.PI/180);
    g_eyey = g_eyey - g_delta*Math.sin(g_theta*Math.PI/180)*Math.sin(g_phi*Math.PI/180);
    g_eyez = g_eyez - g_delta*Math.cos(g_theta*Math.PI/180);
	lookAtpoint();
}

function eyepointRight(){
	g_eyex = g_eyex + g_delta*Math.sin(g_phi*Math.PI/180);
	g_eyey = g_eyey - g_delta*Math.cos(g_phi*Math.PI/180);
	lookAtpoint();
}

function eyepointLeft(){
	g_eyex = g_eyex - g_delta*Math.sin(g_phi*Math.PI/180);
	g_eyey = g_eyey + g_delta*Math.cos(g_phi*Math.PI/180);
	lookAtpoint();
}

//===================Resize canvas
function drawResize() {
	//==============================================================================
	// Called when user re-sizes their browser window , because our HTML file
	// contains:  <body onload="main()" onresize="winResize()">
	
		//Report our current browser-window contents:
	
		//console.log('g_Canvas width,height=', g_canvas.width, g_canvas.height);		
	 	//console.log('Browser window: innerWidth,innerHeight=', 
		//															innerWidth, innerHeight);	
																	// http://www.w3schools.com/jsref/obj_window.asp
	
		
		//Make canvas fill the top 3/4 of our browser window:
		var xtraMargin =40;    // keep a margin (otherwise, browser adds scroll-bars)
		g_canvasID.width = innerWidth - xtraMargin;
		g_canvasID.height = (innerHeight*2/3) - xtraMargin;
		// IMPORTANT!  Need a fresh drawing in the re-sized viewports.
		drawAll();				// draw in all viewports.
}