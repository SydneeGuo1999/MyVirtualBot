//3456789_123456789_123456789_123456789_123456789_123456789_123456789_123456789_
// (JT: why the numbers? counts columns, helps me keep 80-char-wide listings)
//
// ControlMulti.js for EECS 351-1, 
//									Northwestern Univ. Jack Tumblin
// merged and modified to became:
// ProjectB  - A flying robot guarding the diamond in the garden, 
//									              by Xinyi Guo
//
// Vertex shader program----------------------------------
var VSHADER_SOURCE =
	'uniform mat4 u_MvpMatrix;\n' +
	'attribute vec4 a_Position;\n' +
	'attribute vec4 a_Color;\n' +
	'varying vec4 v_Color;\n' +
	'void main() {\n' +
	'  gl_Position = u_MvpMatrix * a_Position;\n' +
	'  gl_PointSize = 10.0;\n' +
	'  v_Color = a_Color;\n' +
	'}\n';

// Fragment shader program----------------------------------
var FSHADER_SOURCE =
	//  '#ifdef GL_ES\n' +
	'precision mediump float;\n' +
	//  '#endif GL_ES\n' +
	'varying vec4 v_Color;\n' +
	'void main() {\n' +
	'  gl_FragColor = v_Color;\n' +
	'}\n';

// Global Variables
// =========================
//------------For WebGL-----------------------------------------------
var gl;           // webGL Rendering Context. Set in main(), used everywhere.
var g_canvas = document.getElementById('webgl');
// our HTML-5 canvas object that uses 'gl' for drawing.

// ----------For tetrahedron & its matrix---------------------------------
var g_vertsMax = 0;                 // number of vertices held in the VBO 
// (global: replaces local 'n' variable)
var g_mvpMatrix = new Matrix4();  // Construct 4x4 matrix; contents get sent
// to the GPU/Shaders as a 'uniform' var.
var g_mvpMatLoc;                  // that uniform's location in the GPU

var floatsPerVertex = 7;	// # of Float32Array elements used for each vertex
// (x,y,z,w)position + (r,g,b)color
// Later, see if you can add:
// (x,y,z) surface normal + (tx,ty) texture addr.
//------------For Animation---------------------------------------------
var g_isRun = true;                 // run/stop for animation; used in tick().
var g_lastMS = Date.now();    			// Timestamp for most-recently-drawn image; 
// in milliseconds; used by 'animate()' fcn 
// (now called 'timerAll()' ) to find time
// elapsed since last on-screen image.
var g_angle01 = 0;                  // initial rotation angle
var g_angle01Rate = 180.0;           // rotation speed, in degrees/second 

var g_angle02 = 0;                  // initial rotation angle
var g_angle02Rate = 40.0;           // rotation speed, in degrees/second 

var g_angle03 = 0;                  // initial rotation angle
var g_angle03Rate = 5.0;           // rotation speed, in degrees/second 

var g_angle04 = 0;                  // initial rotation angle
//var g_angle04Rate = 20.0;           // rotation speed, in degrees/second 

//var g_cloakLength = 1.5;
var g_cloakRate = 1;

var g_posX = 0;
var g_posY = 0;
var g_posZ = 0; //CVV coordinates of robot  

var g_posXtree = 0;
var g_posYtree = 0; //CVV coordinates of tree

var g_newposX = 0;
var g_newposY = 0; 

var g_posXrate = 0;
var g_posYrate = 0;

//------------For projection matrix: -------------------------------
var g_near = 1;
var g_far = 10;
var g_fov = 35;
var g_top = Math.tan(g_fov/2*Math.PI/180)*(g_near+(g_far-g_near)/3);
//console.log(g_top);

//------------For view matrix: -------------------------------
var g_eyex = 3.2;
var g_eyey = 0;
var g_eyez = 0.5;
var g_theta =90;
var g_phi = 180;
var g_r = 1
g_lookx = g_eyex + g_r*Math.sin(g_theta*Math.PI/180)*Math.cos(g_phi*Math.PI/180);
g_looky = g_eyey + g_r*Math.sin(g_theta*Math.PI/180)*Math.sin(g_phi*Math.PI/180);
g_lookz = g_eyez + g_r*Math.cos(g_theta*Math.PI/180);
//var vDirection = new Vector3(g_lookx-g_eyex,g_looky-g_eyey,g_lookz-g_eyez);
// var g_theta = 126.87;
// var g_phi = -138.6;
//var g_r = Math.sqrt(Math.pow(g_lookx-g_eyex,2)+Math.pow(g_looky-g_eyey,2)+Math.pow(g_lookz-g_eyez,2));
var g_delta1 = 0;
var g_delta2 = 0;
var g_delta = 0.05;
//------------For mouse click-and-drag: -------------------------------
var g_isDrag = false;		// mouse-drag: true when user holds down mouse button
var g_xMclik = 0.0;			// last mouse button-down position (in CVV coords)
var g_yMclik = 0.0;
var g_xMdragTot = 0.0;	// total (accumulated) mouse-drag amounts (in CVV coords).
var g_yMdragTot = 0.0;
var g_digits = 5;			// DIAGNOSTICS: # of digits to print in console.log (
//    console.log('xVal:', xVal.toFixed(g_digits)); // print 5 digits	
//Quaternio control
var qNew = new Quaternion(0,0,0,1); // most-recent mouse drag's rotation
var qTot = new Quaternion(0,0,0,1);	// 'current' orientation (made from qNew)
var g_quatMatrix = new Matrix4();				// rotation matrix, made from latest qTot
//----------- Gui control:------------------------------------
var controls = new function() {
	this.g_angle01Rate = 180;
	this.g_angle02Rate = 40.0;
	this.g_angle03Rate = 5.0;
	this.g_angle04 = 0;
	this.g_cloakLength = 1;
	//this.color = 0;
  };

 var gui = new dat.GUI();
 gui.add(controls, 'g_angle01Rate', 0, 1000).name("Bamboo Dragonfly Rate");
 gui.add(controls, 'g_angle03Rate', 0, 5).name("Tree Swing Rate");
 gui.add(controls, 'g_angle02Rate', 0, 40).name("Cloak Swing Rate");
 gui.add(controls, 'g_cloakLength', 0.01, 5).name("Cloak Length");
 gui.add(controls, 'g_angle04', 0, 180).name("Tree Direction");
 //gui.add(controls, 'color', 0, 1);
function main() {
	//==============================================================================
	// Get gl, the rendering context for WebGL, from our 'g_canvas' object
	gl = getWebGLContext(g_canvas);
	if (!gl) {
		console.log('Failed to get the rendering context for WebGL');
		return;
	}
	gl.enable(gl.DEPTH_TEST);
//==============================================================================
//  REMOVE This "reversed-depth correction"
//       when you apply any of the 3D camera-lens transforms: 
//      (e.g. Matrix4 member functions 'perspective(), frustum(), ortho() ...)
/*
	gl.enable(gl.DEPTH_TEST); // enabled by default, but let's be SURE.
	gl.clearDepth(0.0); // each time we 'clear' our depth buffer, set all
	// pixel depths to 0.0 (1.0 is DEFAULT)
	gl.depthFunc(gl.GREATER); // (gl.LESS is DEFAULT; reverse it!)
*/
	// Initialize shaders
	if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
		console.log('Failed to intialize shaders.');
		return;
	}

	// Initialize a Vertex Buffer in the graphics system to hold our vertices
	g_maxVerts = initVertexBuffer(gl);
	if (g_maxVerts < 0) {
		console.log('Failed to set the vertex information');
		return;
	}

	// Register the Keyboard & Mouse Event-handlers------------------------------
	// KEYBOARD:

	window.addEventListener("keydown", myKeyDown, false);
	window.addEventListener("keyup", myKeyUp, false);

	// MOUSE:
/*
	window.addEventListener("mousedown", myMouseDown);
	window.addEventListener("mousemove", myMouseMove);
	window.addEventListener("mouseup", myMouseUp);
	window.addEventListener("click", myMouseClick);
	window.addEventListener("dblclick", myMouseDblClick);
*/
g_canvas.onmousedown	=	function(ev){myMouseDown( ev, gl, g_canvas) }; 
// when user's mouse button goes down, call mouseDown() function
g_canvas.onmousemove = 	function(ev){myMouseMove( ev, gl, g_canvas) };
					  // when the mouse moves, call mouseMove() function					
g_canvas.onmouseup = 		function(ev){myMouseUp(   ev, gl, g_canvas)};
	// END Keyboard & Mouse Event-Handlers---------------------------------------

	// Specify the color for clearing <canvas>
	//gl.clearColor(238/255, 229/255, 248/255, 1.0);
	//gl.clearColor(201/255, 192/255, 211/255, 1.0);
	//gl.clearColor(255/255, 192/255, 203/255, 1.0);
	gl.clearColor(249/255, 205/255, 173/255, 1.0);

	// Get handle to graphics system's storage location of u_MvpMatrix
	g_mvpMatLoc = gl.getUniformLocation(gl.program, 'u_MvpMatrix');
	if (!g_mvpMatLoc) {
		console.log('Failed to get the storage location of u_MvpMatrix');
		return;
	}

	// ANIMATION: create 'tick' variable whose value is this function:
	//----------------- 
	setRobpos();
	var tick = function () {
		requestAnimationFrame(tick, g_canvas);

		animate();   // Update the rotation angle
		//drawAll();   // Draw all parts
		drawResize();
		//console.log(g_newposX, g_newposY,g_posX,g_posY);
        if (Math.abs(Math.sqrt(Math.pow(g_posX-g_newposX,2)+Math.pow(g_posY-g_newposY,2)+Math.pow(g_posZ-g_newposZ,2)))<0.001 ||
		Math.abs(Math.sqrt(Math.pow(g_posX-g_newposX,2)+Math.pow(g_posY-g_newposY,2)+Math.pow(g_posZ-g_newposZ,2)))>2)

		    {
				setRobpos();
			};
	};
	tick();							// start (and continue) animation: draw current image
	
}

function initVertexBuffer() {
	//==============================================================================
	// NOTE!  'gl' is now a global variable -- no longer needed as fcn argument!
	makeCube();
	makeCylinder1();
	makeBamboo();
	makeCloak();
	makeLeaf();
	makeCylinder2();
    makeGroundGrid();	
	makeDiamond();
	makeAxes();
	makeTorus();
	//console.log(g_vertsMax);

	// how many floats total needed to store all shapes?
	var mySiz = (cubeVerts.length + cylVerts.length + bambooVerts.length + cloakVerts.length + 
		leafVerts.length + cyl2Verts.length + gndVerts.length + diaVerts.length + axesVerts.length + torVerts.length);
	// g_vertsMax = 36;		// 12 tetrahedron vertices.
	// we can also draw any subset of these we wish,
	// such as the last 3 vertices.(onscreen at upper right)
	// How many vertices total?
	g_vertsMax = mySiz / floatsPerVertex;

	// console.log('g_vertsMax is', g_vertsMax, 'mySiz is', mySiz, 'floatsPerVertex is', floatsPerVertex);
	// Copy all shapes into one big Float32 array:
	var colorShapes = new Float32Array(mySiz);

	// Copy them:  remember where to start for each shape:
	cubeStart = 0;							// we stored the cylinder first.
	for (i = 0, j = 0; j < cubeVerts.length; i++, j++) {
		colorShapes[i] = cubeVerts[j];
	}
	cylStart = i;						// next, we'll store the sphere;
	for (j = 0; j < cylVerts.length; i++, j++) {// don't initialize i -- reuse it!
		colorShapes[i] = cylVerts[j];
	}
	bambooStart = i;
	for (j = 0; j < bambooVerts.length; i++, j++) {// don't initialize i -- reuse it!
		colorShapes[i] = bambooVerts[j];
	}
	cloakStart = i;
	for (j = 0; j < cloakVerts.length; i++, j++) {// don't initialize i -- reuse it!
		colorShapes[i] = cloakVerts[j];
	}
	leafStart = i;
	for (j = 0; j < leafVerts.length; i++, j++) {// don't initialize i -- reuse it!
		colorShapes[i] = leafVerts[j];
	}
	cyl2Start = i;						// next, we'll store the sphere;
	for (j = 0; j < cyl2Verts.length; i++, j++) {// don't initialize i -- reuse it!
		colorShapes[i] = cyl2Verts[j];
	}
	gndStart = i;
    for(j=0; j< gndVerts.length; i++, j++) {
		colorShapes[i] = gndVerts[j];
		}
	diaStart = i;
	for (j = 0; j < diaVerts.length; i++,j++){
		colorShapes[i] = diaVerts[j];
	}
	axesStart = i;
	for (j = 0; j < axesVerts.length; i++,j++){
		colorShapes[i] = axesVerts[j];
	}
	torStart =  i;
	for (j = 0; j < torVerts.length; i++,j++){
		colorShapes[i] = torVerts[j];
	}

	// Create a buffer object
	var shapeBufferHandle = gl.createBuffer();
	if (!shapeBufferHandle) {
		console.log('Failed to create the shape buffer object');
		return false;
	}

	// Bind the the buffer object to target:
	gl.bindBuffer(gl.ARRAY_BUFFER, shapeBufferHandle);
	// Transfer data from Javascript array colorShapes to Graphics system VBO
	// (Use sparingly--may be slow if you transfer large shapes stored in files)
	gl.bufferData(gl.ARRAY_BUFFER, colorShapes, gl.STATIC_DRAW);

	var FSIZE = colorShapes.BYTES_PER_ELEMENT; // how many bytes per stored value?

	//Get graphics system's handle for our Vertex Shader's position-input variable: 
	var a_Position = gl.getAttribLocation(gl.program, 'a_Position');
	if (a_Position < 0) {
		console.log('Failed to get the storage location of a_Position');
		return -1;
	}
	// Use handle to specify how to retrieve position data from our VBO:
	gl.vertexAttribPointer(
		a_Position, 	// choose Vertex Shader attribute to fill with data
		4, 						// how many values? 1,2,3 or 4.  (we're using x,y,z,w)
		gl.FLOAT, 		// data type for each value: usually gl.FLOAT
		false, 				// did we supply fixed-point data AND it needs normalizing?
		FSIZE * floatsPerVertex, 		// Stride -- how many bytes used to store each vertex?
		// (x,y,z,w, r,g,b) * bytes/value
		0);						// Offset -- now many bytes from START of buffer to the
	// value we will actually use?
	gl.enableVertexAttribArray(a_Position);
	// Enable assignment of vertex buffer object's position data

	// Get graphics system's handle for our Vertex Shader's color-input variable;
	var a_Color = gl.getAttribLocation(gl.program, 'a_Color');
	if (a_Color < 0) {
		console.log('Failed to get the storage location of a_Color');
		return -1;
	}
	// Use handle to specify how to retrieve color data from our VBO:
	gl.vertexAttribPointer(
		a_Color, 				// choose Vertex Shader attribute to fill with data
		3, 							// how many values? 1,2,3 or 4. (we're using R,G,B)
		gl.FLOAT, 			// data type for each value: usually gl.FLOAT
		false, 					// did we supply fixed-point data AND it needs normalizing?
		FSIZE * 7, 			// Stride -- how many bytes used to store each vertex?
		// (x,y,z,w, r,g,b) * bytes/value
		FSIZE * 4);			// Offset -- how many bytes from START of buffer to the
	// value we will actually use?  Need to skip over x,y,z,w

	gl.enableVertexAttribArray(a_Color);
	// Enable assignment of vertex buffer object's position data

	//--------------------------------DONE!
	// Unbind the buffer object 
	gl.bindBuffer(gl.ARRAY_BUFFER, null);

	/* REMOVED -- global 'g_vertsMax' means we don't need it anymore
	  return nn;
	*/
}

function drawAll() {
	//==============================================================================
	// Clear <canvas>  colors AND the depth buffer
	gl.clear(gl.CLEAR_COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	gl.clear(gl.COLOR_BUFFER_BIT); 

	g_mvpMatrix.setIdentity();
	//----------------------Create, fill Left viewport------------------------
	gl.viewport(        0,											// Viewport lower-left corner
						0, 			// location(in pixels)
  						g_canvas.width/2, 				// viewport width,
  						g_canvas.height);			// viewport height in pixels.

	var vpAspect = (g_canvas.width/2) /			// On-screen aspect ratio for
								g_canvas.height;	// this camera: width/height.

	pushMatrix(g_mvpMatrix);
	// For this viewport, set camera's eye point and the viewing volume:
	g_mvpMatrix.setPerspective(35,			// fovy: y-axis field-of-view in degrees 	
												// (top <-> bottom in view frustum)
								vpAspect, 		// aspect ratio: width/height
								g_near, g_far);		// near, far (always >0).
	//lookAtpoint();
	vDirection = new Vector3([g_eyex-g_lookx, g_eyey-g_looky, g_eyez-g_lookz]);
	//console.log(vLast);
	//console.log(g_lookx,g_looky,g_lookz);
	g_mvpMatrix.lookAt(	g_eyex, g_eyey, g_eyez, 				// 'Center' or 'Eye Point',
							g_lookx, g_looky, g_lookz, 				// look-At point,
  							0, 0, 1);				// View UP vector, all in 'world' coords.
	draw3Dparts();
	g_mvpMatrix = popMatrix();
	
	//----------------------Create, fill Right viewport------------------------
	gl.viewport(        g_canvas.width/2,											 	// Viewport lower-left corner
						0, 								// location(in pixels)
  						g_canvas.width/2, 				// viewport width,
  						g_canvas.height);			  	// viewport height in pixels.

	vpAspect = g_canvas.width/2/					 	// On-screen aspect ratio for
						(g_canvas.height);				// this camera: width/height.
	pushMatrix(g_mvpMatrix);
    // For this viewport, set camera's eye point and the viewing volume:
  	// g_modelMatrix.setOrtho(-vpAspect*Math.tan(17.5*Math.PI/180)*(1+(g_far-g_near)/3), vpAspect*Math.tan(17.5*Math.PI/180)*(1+(g_far-g_near)/3), 					// left,right;
	// -Math.tan(17.5*Math.PI/180)*(1+(g_far-g_near)/3), Math.tan(17.5*Math.PI/180)*(1+(g_far-g_near)/3), 					// bottom, top;
  	// 					g_near, g_far);				// near, far; (always >=0)

	g_mvpMatrix.setOrtho(-vpAspect*g_top, vpAspect*g_top, 					// left,right;
							-g_top, g_top, 					// bottom, top;
							g_near, g_far);				// near, far; (always >=0)
 	g_mvpMatrix.lookAt(	g_eyex, g_eyey, g_eyez, 				// 'Center' or 'Eye Point',
  						g_lookx, g_looky, g_lookz, 				// look-At point,
  						0, 0, 1);				// View UP vector, all in 'world' coords.
	draw3Dparts();
	g_mvpMatrix = popMatrix();
									
  // Pass the model view projection matrix to graphics hardware thru u_MvpMatrix
	
}

function draw3Dparts(){


	//===========================================================
	//g_modelMatrix.setIdentity();
    pushMatrix(g_mvpMatrix);  // SAVE world drawing coords.
    //---------Draw Ground Plane, without spinning.
    // position it.
    g_mvpMatrix.translate( 0.4, -0.4, 0.0);	
    g_mvpMatrix.scale(0.1, 0.1, 0.1);				// shrink by 10X:

    // Drawing:
    // Pass our current matrix to the vertex shaders:
    gl.uniformMatrix4fv(g_mvpMatLoc, false, g_mvpMatrix.elements);
    // Draw just the ground-plane's vertices
    gl.drawArrays(gl.LINES, 								// use this drawing primitive, and
                            gndStart/floatsPerVertex,	// start at this vertex number, and
                            gndVerts.length/floatsPerVertex);	// draw this many vertices.
	g_mvpMatrix = popMatrix();  // RESTORE 'world' drawing coords.
    //===========================================================

	//tree
	pushMatrix(g_mvpMatrix);
		g_mvpMatrix.rotate(90,0,0,1);
		g_mvpMatrix.rotate(90,1,0,0);
		pushMatrix(g_mvpMatrix);
		
		g_mvpMatrix.translate(0.5, 0.54, 0.0);
		g_mvpMatrix.rotate(controls.g_angle04,0,1,0);
		drawTree();
		g_mvpMatrix = popMatrix();
		pushMatrix(g_mvpMatrix);
		
		g_mvpMatrix.translate(-0.5, 0.54, 0.0);
		g_mvpMatrix.rotate(controls.g_angle04,0,1,0);
		drawTree2();
				    //axes
					//g_mvpMatrix.scale(0.1, 0.1, 0.1);
					//gl.uniformMatrix4fv(g_mvpMatLoc, false, g_mvpMatrix.elements);
					//gl.drawArrays(gl.LINES, axesStart / floatsPerVertex, axesVerts.length / floatsPerVertex);
		g_mvpMatrix = popMatrix();
			//pushMatrix(g_mvpMatrix);
			//g_mvpMatrix.rotate(90,1,0,0);
			//g_mvpMatrix = popMatrix();
	g_mvpMatrix = popMatrix();
	

	//diamond
	pushMatrix(g_mvpMatrix);
	g_mvpMatrix.translate(0.8,0,0.4);
	g_mvpMatrix.scale(0.15,0.15,0.15);
	g_quatMatrix.setFromQuat(qTot.x, qTot.y, qTot.z, qTot.w);	// Quaternion-->Matrix
	g_mvpMatrix.concat(g_quatMatrix);	// apply that matrix.
	gl.uniformMatrix4fv(g_mvpMatLoc, false, g_mvpMatrix.elements);
	gl.drawArrays(gl.TRIANGLES, diaStart / floatsPerVertex, diaVerts.length / floatsPerVertex);
	gl.drawArrays(gl.LINES, axesStart / floatsPerVertex, axesVerts.length / floatsPerVertex);
	g_mvpMatrix = popMatrix();

	//platform
	pushMatrix(g_mvpMatrix);
	g_mvpMatrix.translate(0.8,0,0.1);
	g_mvpMatrix.scale(0.05,0.05,0.1);
	gl.uniformMatrix4fv(g_mvpMatLoc, false, g_mvpMatrix.elements);
	gl.drawArrays(gl.TRIANGLE_STRIP, cylStart / floatsPerVertex, cylVerts.length / floatsPerVertex);
    g_mvpMatrix.scale(2,2,0.1);
    g_mvpMatrix.translate(0,0,10);
	gl.uniformMatrix4fv(g_mvpMatLoc, false, g_mvpMatrix.elements);
	gl.drawArrays(gl.TRIANGLE_STRIP, cylStart / floatsPerVertex, cylVerts.length / floatsPerVertex);
	g_mvpMatrix = popMatrix();

	// world coordinate
	pushMatrix(g_mvpMatrix);
	//g_mvpMatrix.translate(-1,-1,0);
	gl.uniformMatrix4fv(g_mvpMatLoc, false, g_mvpMatrix.elements);
	gl.drawArrays(gl.LINES, axesStart / floatsPerVertex, axesVerts.length / floatsPerVertex);
	g_mvpMatrix = popMatrix();

	//gate
	pushMatrix(g_mvpMatrix);
	g_mvpMatrix.rotate(90,0,0,1);
	g_mvpMatrix.rotate(90,1,0,0);
	g_mvpMatrix.translate(0,0.28,-1);
	g_mvpMatrix.rotate(-28,0,0,1);
	gl.uniformMatrix4fv(g_mvpMatLoc, false, g_mvpMatrix.elements);
	gl.drawArrays(gl.TRIANGLE_STRIP, 				// use this drawing primitive, and
					  torStart/floatsPerVertex,	// start at this vertex number, and
					  torVerts.length/floatsPerVertex);	// draw this many vertices.
	g_mvpMatrix = popMatrix();

	//robot
	pushMatrix(g_mvpMatrix);
	g_mvpMatrix.rotate(-60,0,0,1);
	g_mvpMatrix.translate(0,0,0.53);
	g_mvpMatrix.rotate(90,0,0,1);
	g_mvpMatrix.rotate(90,1,0,0);
	drawRobot();
	g_mvpMatrix = popMatrix();
}

function setRobpos(){
	g_newposX = Math.random()*2-1;
	g_newposY = Math.random(); 
	g_newposZ = Math.random()*2-1; 
	g_posXrate = (g_newposX - g_posX)/100;
	g_posYrate = (g_newposY - g_posY)/100;
	g_posZrate = (g_newposZ - g_posZ)/100;
}

//------------For drawing 3D parts: -------------------------------
function drawTree(){
	//tree
    pushMatrix(g_mvpMatrix);
	
	g_mvpMatrix.scale(1, 0.7, 1);
		//trunk
		g_mvpMatrix.scale(1.7, 1, 1);
		drawLongtrunk();

			//tree1
			pushMatrix(g_mvpMatrix);
			g_mvpMatrix.translate(0, 0.525, 0.02);
			g_mvpMatrix.scale(1.3, 1.3, 1.3);
			g_mvpMatrix.rotate(g_angle03, 0, 0, 1);
			drawLeaves();
			g_mvpMatrix = popMatrix();
			//branch1	
			g_mvpMatrix.rotate(g_angle03, 0, 0, 1);
			pushMatrix(g_mvpMatrix);
			    g_mvpMatrix.translate(0.3, 0.2, 0.0);
				g_mvpMatrix.rotate(-50, 0, 0, 1);
				g_mvpMatrix.translate(0, -0.45, 0.0);
				drawBranch();
				g_mvpMatrix.translate(0, 0.6, 0.02);
				drawLeaves();
			g_mvpMatrix = popMatrix();
			//branch2	
			g_mvpMatrix.rotate(g_angle03, 0, 0, 1);
			pushMatrix(g_mvpMatrix);
				pushMatrix(g_mvpMatrix);
				g_mvpMatrix.translate(-0.23, 0.1, 0);
				g_mvpMatrix.rotate(35, 0, 0, 1);
				g_mvpMatrix.translate(0, -0.44, 0.0);
				drawBranch();
					//tree3
					g_mvpMatrix.translate(0, 0.6, 0.02);
					drawLeaves();
					g_mvpMatrix = popMatrix();

			g_mvpMatrix = popMatrix();
	g_mvpMatrix = popMatrix();
}
function drawTree2(){
	//tree
    pushMatrix(g_mvpMatrix);
	
	g_mvpMatrix.scale(1, 0.7, 1);
		//trunk
		g_mvpMatrix.scale(1.7, 1, 1);
		drawLongtrunk();

			//tree1
			pushMatrix(g_mvpMatrix);
			g_mvpMatrix.translate(0, 0.525, 0.02);
			g_mvpMatrix.scale(1.3, 1.3, 1.3);
			g_mvpMatrix.rotate(g_angle03, 0, 0, 1);
			drawLeaves();
			g_mvpMatrix = popMatrix();
			//branch1	
			g_mvpMatrix.rotate(g_angle03, 0, 0, 1);
			pushMatrix(g_mvpMatrix);
			    g_mvpMatrix.translate(0.3, 0.2, 0.0);
				g_mvpMatrix.rotate(-50, 0, 0, 1);
				g_mvpMatrix.translate(0, -0.45, 0.0);
				drawBranch();
				g_mvpMatrix.translate(0, 0.6, 0.02);
				drawLeaves();
			g_mvpMatrix = popMatrix();
			//branch2	
			g_mvpMatrix.rotate(g_angle03, 0, 0, 1);
			pushMatrix(g_mvpMatrix);
				pushMatrix(g_mvpMatrix);
				g_mvpMatrix.translate(-0.23, 0.1, 0);
				g_mvpMatrix.rotate(35, 0, 0, 1);
				g_mvpMatrix.translate(0, -0.44, 0.0);
				drawBranch();
					//tree3
					g_mvpMatrix.translate(0, 0.6, 0.02);
					drawLeaves();
					pushMatrix(g_mvpMatrix);
					g_mvpMatrix.rotate(-90,1,0,0);
					g_mvpMatrix.rotate(-90,0,0,1);
					g_mvpMatrix.scale(0.4,0.4,0.4);
					gl.uniformMatrix4fv(g_mvpMatLoc, false, g_mvpMatrix.elements);
					gl.drawArrays(gl.LINES, axesStart / floatsPerVertex, axesVerts.length / floatsPerVertex);
					g_mvpMatrix = popMatrix();
					g_mvpMatrix = popMatrix();        
			g_mvpMatrix = popMatrix();
			//axes

	g_mvpMatrix = popMatrix();
}

function drawBranch(){
	pushMatrix(g_mvpMatrix);
	//g_modelMatrix.rotate(g_angle03, 0, 0, 1);
	drawTrunk2();
	g_mvpMatrix.translate(0.0, 0.15, 0.0);
	g_mvpMatrix.scale(0.8, 0.8, 1);
	//g_modelMatrix.rotate(g_angle03, 0, 0, 1);
	drawTrunk2();

	g_mvpMatrix.translate(0.0, 0.15, 0.0);
	g_mvpMatrix.scale(0.8, 1, 1);
	//g_modelMatrix.rotate(g_angle03, 0, 0, 1);
	drawTrunk2();
	//g_modelMatrix.rotate(35, 0, 0, 1);
	//g_modelMatrix.scale(1, 1, 2);
	//g_modelMatrix.translate(0, 0.1, 0);
	g_mvpMatrix = popMatrix();
}
function drawLongtrunk(){
	g_mvpMatrix.translate(0.0, -0.7, 0.0);
	g_mvpMatrix.translate(0.0, -0.20, 0.0);
	g_mvpMatrix.scale(0.8, 1, 1);
	g_mvpMatrix.rotate(g_angle03, 0, 0, 1);
	drawTrunk();
	g_mvpMatrix.translate(0.0, 0.20, 0.0);
	g_mvpMatrix.scale(0.8, 1, 1);
	g_mvpMatrix.rotate(g_angle03, 0, 0, 1);
	drawTrunk();
    g_mvpMatrix.translate(0.0, 0.20, 0.0);
	g_mvpMatrix.scale(0.8, 1, 1);
	g_mvpMatrix.rotate(g_angle03, 0, 0, 1);
	drawTrunk();
	g_mvpMatrix.translate(0.0, 0.20, 0.0);
	g_mvpMatrix.scale(0.8, 1, 1);
	g_mvpMatrix.rotate(g_angle03, 0, 0, 1);
	
	drawTrunk();
}
function drawTrunk(){
	pushMatrix(g_mvpMatrix); 
	g_mvpMatrix.rotate(90, 0, 1, 0);
	g_mvpMatrix.rotate(270, 1, 0, 0);
	g_mvpMatrix.rotate(180, 1, 0, 0);
	g_mvpMatrix.translate(0.0, 0.0, -0.23);
	g_mvpMatrix.scale(0.04, 0.04, 0.1);
	//g_modelMatrix.rotate(g_angle03, 1, 0, 0);
	gl.uniformMatrix4fv(g_mvpMatLoc, false, g_mvpMatrix.elements);
	gl.drawArrays(gl.TRIANGLE_STRIP, cyl2Start / floatsPerVertex, cyl2Verts.length / floatsPerVertex);
	g_mvpMatrix = popMatrix();
	
}

function drawTrunk2(){
	pushMatrix(g_mvpMatrix); 
	g_mvpMatrix.scale(0.5, 0.8, 1);
	g_mvpMatrix.rotate(90, 0, 1, 0);
	g_mvpMatrix.rotate(270, 1, 0, 0);
	g_mvpMatrix.rotate(180, 1, 0, 0);
	g_mvpMatrix.translate(0.0, 0.0, -0.23);
	g_mvpMatrix.scale(0.04, 0.04, 0.1);
	//g_modelMatrix.rotate(g_angle03, 1, 0, 0);
	gl.uniformMatrix4fv(g_mvpMatLoc, false, g_mvpMatrix.elements);
	gl.drawArrays(gl.TRIANGLE_STRIP, cyl2Start / floatsPerVertex, cyl2Verts.length / floatsPerVertex);
	g_mvpMatrix = popMatrix();
}

function drawLeaves(){
	pushMatrix(g_mvpMatrix); 
	g_mvpMatrix.scale(0.5,0.5,0.5);
	g_mvpMatrix.rotate(45, 0, 0, 1);
	drawLeaf();
	g_mvpMatrix.rotate(90, 0, 0, 1);
	drawLeaf();
	g_mvpMatrix.rotate(90, 0, 0, 1);
	drawLeaf();
	g_mvpMatrix.rotate(90, 0, 0, 1);
	drawLeaf();
	g_mvpMatrix = popMatrix();
}

function drawRobot(){
	
	pushMatrix(g_mvpMatrix); 			// SAVE them,
		g_mvpMatrix.translate(g_posX, g_posY, g_posZ);
		//robot
		//head--------------------------
		g_mvpMatrix.scale(0.7, 0.7, 0.7);	
			pushMatrix(g_mvpMatrix); 			// SAVE them,
			// NEXT, create different drawing axes, and...
			g_mvpMatrix.translate(0.0, 0.0, 0.0);  // 'set' means DISCARD old matrix,
			g_mvpMatrix.scale(0.1, 0.1, 0.1);				// Make it smaller.
			gl.uniformMatrix4fv(g_mvpMatLoc, false, g_mvpMatrix.elements);
			// draw cube
			gl.drawArrays(gl.TRIANGLES, cubeStart / floatsPerVertex, cubeVerts.length / floatsPerVertex);
			g_mvpMatrix = popMatrix();		// RESTORE them.
		//------------------------------

			//neck--------------------------
			pushMatrix(g_mvpMatrix); 			// SAVE them,
			g_mvpMatrix.translate(0.0, -0.13, 0.0);  // 'set' means DISCARD old matrix,
			g_mvpMatrix.scale(0.03, 0.03, 0.03);				// Make it smaller.
			gl.uniformMatrix4fv(g_mvpMatLoc, false, g_mvpMatrix.elements);
			// draw cube
			gl.drawArrays(gl.TRIANGLES, cubeStart / floatsPerVertex, cubeVerts.length / floatsPerVertex);
			g_mvpMatrix = popMatrix();		// RESTORE them.
			//----------------------------

			//body------------------------
			pushMatrix(g_mvpMatrix); 			// SAVE them,
			g_mvpMatrix.translate(0.0, -0.32, 0.0);
			g_mvpMatrix.scale(0.18, 0.18, 0.09);	// Make it smaller.
			gl.uniformMatrix4fv(g_mvpMatLoc, false, g_mvpMatrix.elements);
			// draw cube
			gl.drawArrays(gl.TRIANGLES, cubeStart / floatsPerVertex, cubeVerts.length / floatsPerVertex);
			g_mvpMatrix = popMatrix();		// RESTORE them.
			//----------------------------

			//left hand------------------------
			pushMatrix(g_mvpMatrix); 			// SAVE them,
			g_mvpMatrix.translate(0.23, -0.29, 0.0);
			g_mvpMatrix.scale(0.06, 0.15, 0.09);	// Make it smaller.
			gl.uniformMatrix4fv(g_mvpMatLoc, false, g_mvpMatrix.elements);
			// draw cube
			gl.drawArrays(gl.TRIANGLES, cubeStart / floatsPerVertex, cubeVerts.length / floatsPerVertex);
			g_mvpMatrix = popMatrix();		// RESTORE them.
			//----------------------------

			//hand hand------------------------
			pushMatrix(g_mvpMatrix); 			// SAVE them,
			g_mvpMatrix.translate(-0.23, -0.29, 0.0);
			g_mvpMatrix.scale(0.06, 0.15, 0.09);	// Make it smaller.
			gl.uniformMatrix4fv(g_mvpMatLoc, false, g_mvpMatrix.elements);
			// draw cube
			gl.drawArrays(gl.TRIANGLES, cubeStart / floatsPerVertex, cubeVerts.length / floatsPerVertex);
			g_mvpMatrix = popMatrix();		// RESTORE them.
			//----------------------------

			//left foot------------------------
			pushMatrix(g_mvpMatrix); 			// SAVE them,
			g_mvpMatrix.translate(-0.08, -0.6, 0.0);
			g_mvpMatrix.scale(0.07, 0.18, 0.08);	// Make it smaller.
			gl.uniformMatrix4fv(g_mvpMatLoc, false, g_mvpMatrix.elements);
			// draw cube
			gl.drawArrays(gl.TRIANGLES, cubeStart / floatsPerVertex, cubeVerts.length / floatsPerVertex);
			g_mvpMatrix = popMatrix();		// RESTORE them.
			//----------------------------

			//left foot------------------------
			pushMatrix(g_mvpMatrix); 			// SAVE them,
			g_mvpMatrix.translate(0.08, -0.6, 0.0);
			g_mvpMatrix.scale(0.07, 0.18, 0.08);	// Make it smaller.
			gl.uniformMatrix4fv(g_mvpMatLoc, false, g_mvpMatrix.elements);
			// draw cube
			gl.drawArrays(gl.TRIANGLES, cubeStart / floatsPerVertex, cubeVerts.length / floatsPerVertex);
			g_mvpMatrix = popMatrix();		// RESTORE them.
		//----------------------------
		// g_modelMatrix = popMatrix();		// RESTORE them.
		//----------------
		pushMatrix(g_mvpMatrix);
			//cylinder
			pushMatrix(g_mvpMatrix);
			g_mvpMatrix.rotate(90, 0, 1, 0);
			g_mvpMatrix.rotate(270, 1, 0, 0);
			g_mvpMatrix.translate(0.0, 0.0, 0.1);
			g_mvpMatrix.scale(0.01, 0.01, 0.1);
			gl.uniformMatrix4fv(g_mvpMatLoc, false, g_mvpMatrix.elements);
			gl.drawArrays(gl.TRIANGLE_STRIP, cylStart / floatsPerVertex, cylVerts.length / floatsPerVertex);
			g_mvpMatrix = popMatrix();

			//bamboo-copter
			pushMatrix(g_mvpMatrix);
			g_mvpMatrix.translate(0.0, 0.2, 0.0);
			g_mvpMatrix.scale(0.2, 0.2, 0.2);
			g_mvpMatrix.rotate(g_angle01, 0, 1, 0);
			gl.uniformMatrix4fv(g_mvpMatLoc, false, g_mvpMatrix.elements);
			gl.drawArrays(gl.TRIANGLES, bambooStart / floatsPerVertex, bambooVerts.length / floatsPerVertex);
			g_mvpMatrix = popMatrix();

			pushMatrix(g_mvpMatrix);
			g_mvpMatrix.scale(0.2, 0.12, 0.2);
			g_mvpMatrix.translate(0.0,-1.5,-0.4)
			g_mvpMatrix.scale(1, 1, controls.g_cloakLength);
				pushMatrix(g_mvpMatrix);
				drawCloak();
				g_mvpMatrix.translate(0.0,-1,0.0)
				drawCloak();
				g_mvpMatrix.translate(0.0,-1,0.0)
				drawCloak();
				g_mvpMatrix.translate(0.0,-1,0.0)
				drawCloak();
				g_mvpMatrix.translate(0.0,-1,0.0)
				drawCloak();
				g_mvpMatrix = popMatrix();
			g_mvpMatrix = popMatrix();
		g_mvpMatrix = popMatrix();
	g_mvpMatrix = popMatrix();
}

function drawCloak(){
	g_mvpMatrix.rotate(g_angle02, 1, 0, 0);
	gl.uniformMatrix4fv(g_mvpMatLoc, false, g_mvpMatrix.elements);
	gl.drawArrays(gl.TRIANGLES, cloakStart / floatsPerVertex, cloakVerts.length / floatsPerVertex);
}

function drawLeaf(){
	//g_modelMatrix.translate(0.5,0.5,0);
	//g_modelMatrix.scale(0.1,0.1,0.1);
	//g_modelMatrix.rotate(g_angle02, 1, 0, 0);
	gl.uniformMatrix4fv(g_mvpMatLoc, false, g_mvpMatrix.elements);
	gl.drawArrays(gl.TRIANGLES, leafStart / floatsPerVertex, leafVerts.length / floatsPerVertex);
	
}

function makeTorus() {
	//==============================================================================
	var rbend = 0.6;										// Radius of circle formed by torus' bent bar
	var rbar = 0.02;											// radius of the bar we bent to form torus
	var barSlices = 23;									// # of bar-segments in the torus: >=3 req'd;
																			// more segments for more-circular torus
	var barSides = 13;										// # of sides of the bar (and thus the 
																			// number of vertices in its cross-section)
	 torVerts = new Float32Array(floatsPerVertex*(2*barSides*barSlices +2));
	
	var phi=0, theta=0;										// begin torus at angles 0,0
	var thetaStep = 1.3*Math.PI/barSlices;	// theta angle between each bar segment
	var phiHalfStep = Math.PI/barSides;		// half-phi angle between each side of bar
																				// (WHY HALF? 2 vertices per step in phi)
		// s counts slices of the bar; v counts vertices within one slice; j counts
		// array elements (Float32) (vertices*#attribs/vertex) put in torVerts array.
		for(s=0,j=0; s<barSlices; s++) {		// for each 'slice' or 'ring' of the torus:
			for(v=0; v< 2*barSides; v++, j+=7) {		// for each vertex in this slice:
				if(v%2==0)	{	// even #'d vertices at bottom of slice,
					torVerts[j  ] = (rbend + rbar*Math.cos((v)*phiHalfStep)) * 
																							 Math.cos((s)*thetaStep);
								  //	x = (rbend + rbar*cos(phi)) * cos(theta)
					torVerts[j+1] = (rbend + rbar*Math.cos((v)*phiHalfStep)) *
																							 Math.sin((s)*thetaStep);
									//  y = (rbend + rbar*cos(phi)) * sin(theta) 
					torVerts[j+2] = -rbar*Math.sin((v)*phiHalfStep);
									//  z = -rbar  *   sin(phi)
					torVerts[j+3] = 1.0;		// w
				}
				else {				// odd #'d vertices at top of slice (s+1);
											// at same phi used at bottom of slice (v-1)
					torVerts[j  ] = (rbend + rbar*Math.cos((v-1)*phiHalfStep)) * 
																							 Math.cos((s+1)*thetaStep);
								  //	x = (rbend + rbar*cos(phi)) * cos(theta)
					torVerts[j+1] = (rbend + rbar*Math.cos((v-1)*phiHalfStep)) *
																							 Math.sin((s+1)*thetaStep);
									//  y = (rbend + rbar*cos(phi)) * sin(theta) 
					torVerts[j+2] = -rbar*Math.sin((v-1)*phiHalfStep);
									//  z = -rbar  *   sin(phi)
					torVerts[j+3] = 1.0;		// w
				}
				torVerts[j+4] =  Math.random();		// random color 0.0 <= R < 1.0
				torVerts[j+5] = 0.99;		// random color 0.0 <= G < 1.0
				torVerts[j+6] = Math.random();		// random color 0.0 <= B < 1.0
			}
		}
		// Repeat the 1st 2 vertices of the triangle strip to complete the torus:
				torVerts[j  ] = rbend + rbar;	// copy vertex zero;
							  //	x = (rbend + rbar*cos(phi==0)) * cos(theta==0)
				torVerts[j+1] = 0.0;
								//  y = (rbend + rbar*cos(phi==0)) * sin(theta==0) 
				torVerts[j+2] = 0.0;
								//  z = -rbar  *   sin(phi==0)
				torVerts[j+3] = 1.0;		// w
				torVerts[j+4] =  Math.random();		// random color 0.0 <= R < 1.0
				torVerts[j+5] = 0.99;		// random color 0.0 <= G < 1.0
				torVerts[j+6] = Math.random();		// random color 0.0 <= B < 1.0
				j+=7; // go to next vertex:
				torVerts[j  ] = (rbend + rbar) * Math.cos(thetaStep);
							  //	x = (rbend + rbar*cos(phi==0)) * cos(theta==thetaStep)
				torVerts[j+1] = (rbend + rbar) * Math.sin(thetaStep);
								//  y = (rbend + rbar*cos(phi==0)) * sin(theta==thetaStep) 
				torVerts[j+2] = 0.0;
								//  z = -rbar  *   sin(phi==0)
				torVerts[j+3] = 1.0;		// w
				torVerts[j+4] = Math.random();		// random color 0.0 <= R < 1.0
				torVerts[j+5] = 0.99;		// random color 0.0 <= G < 1.0
				torVerts[j+6] = Math.random();		// random color 0.0 <= B < 1.0
}


// Last time that this function was called:  (used for animation timing)
var g_last = Date.now();
//------------For make vertex: -------------------------------

function animate() {
	//==============================================================================
	// Calculate the elapsed time
	var now = Date.now();
	var elapsed = now - g_last;
	g_last = now;

	// Update the current rotation angle (adjusted by the elapsed time)
	//  limit the angle to move smoothly between +120 and -85 degrees:
	//  if(angle >  120.0 && g_angle01Rate > 0) g_angle01Rate = -g_angle01Rate;
	//  if(angle <  -85.0 && g_angle01Rate < 0) g_angle01Rate = -g_angle01Rate;

	g_angle01 = g_angle01 + (controls.g_angle01Rate * elapsed) / 1000.0;
	if (g_angle01 > 180.0) g_angle01 = g_angle01 - 360.0;
	if (g_angle01 < -180.0) g_angle01 = g_angle01 + 360.0;

	g_angle02 = g_angle02 + (controls.g_angle02Rate * elapsed) / 1000.0;
	if (g_angle02 > 180.0) g_angle02 = g_angle02 - 360.0;
	if (g_angle02 < -180.0) g_angle02 = g_angle02 + 360.0;

	if (g_angle02 > 25.0 && controls.g_angle02Rate > 0) controls.g_angle02Rate *= -1.0;
	if (g_angle02 < 0.0 && controls.g_angle02Rate < 0) controls.g_angle02Rate *= -1.0;

	g_angle03 = g_angle03 + (controls.g_angle03Rate * elapsed) / 1000.0;
	if (g_angle03 > 180.0) g_angle03 = g_angle03 - 360.0;
	if (g_angle03 < -180.0) g_angle03 = g_angle03 + 360.0;

	if (g_angle03 > 2.0 && controls.g_angle03Rate > 0) controls.g_angle03Rate *= -1.0;
	if (g_angle03 < -2.0 && controls.g_angle03Rate < 0) controls.g_angle03Rate *= -1.0;

	g_posX += g_posXrate;
	g_posY += g_posYrate;
	g_posZ +=g_posZrate;
}

function makeCube() {

	cubeVerts = new Float32Array([

		// +x face
		1.0, -1.0, -1.0, 1.0, 254/255, 67/255, 101/255,	// Node 3
		1.0, 1.0, -1.0, 1.0, 252/255, 157/255, 154/255,	// Node 2
		1.0, 1.0, 1.0, 1.0, 249/255, 205/255, 173/255,  // Node 4

		1.0, 1.0, 1.0, 1.0, 200/255, 200/255, 169/255,	// Node 4
		1.0, -1.0, 1.0, 1.0, 131/255, 175/255, 155/255,	// Node 7
		1.0, -1.0, -1.0, 1.0, 209/255, 73/255, 78/255,	// Node 3

		// +y face
		-1.0, 1.0, -1.0, 1.0, 199/255, 237/255, 233/255,	// Node 1
		-1.0, 1.0, 1.0, 1.0, 175/255, 215/255, 237/255,	// Node 5
		1.0, 1.0, 1.0, 1.0, 92/255, 167/255, 186/255,	// Node 4

		1.0, 1.0, 1.0, 1.0, 189/255, 172/255, 156/255,	// Node 4
		1.0, 1.0, -1.0, 1.0, 220/255, 162/255, 151/255,	// Node 2 
		-1.0, 1.0, -1.0, 1.0, 151/255, 173/255, 172/255,	// Node 1

		// +z face:
		-1.0, 1.0, 1.0, 1.0, 173/255, 137/255, 118/255,	// Node 5
		-1.0, -1.0, 1.0, 1.0, 255/255, 150/255, 129/255,	// Node 6
		1.0, -1.0, 1.0, 1.0, 255/255, 34/255, 40/255,	// Node 7

		1.0, -1.0, 1.0, 1.0, 255/255, 94/255, 72/255,	// Node 7
		1.0, 1.0, 1.0, 1.0, 199/255, 237/255, 233/255,	// Node 4
		-1.0, 1.0, 1.0, 1.0,92/255, 167/255, 186/255,	// Node 5

		// -x face: CYAN
		-1.0, -1.0, 1.0, 1.0, 225/255, 238/255, 210/255,	// Node 6	
		-1.0, 1.0, 1.0, 1.0, 219/255, 208/255, 167/255,	// Node 5 
		-1.0, 1.0, -1.0, 1.0, 230/255, 155/255, 3/255,	// Node 1

		-1.0, 1.0, -1.0, 1.0, 209/255, 73/255, 78/255,	// Node 1
		-1.0, -1.0, -1.0, 1.0, 85/255, 170/255, 173/255,	// Node 0  
		-1.0, -1.0, 1.0, 1.0, 229/255, 190/255, 157/255,	// Node 6  

		// -y face: MAGENTA
		1.0, -1.0, -1.0, 1.0, 151/255, 173/255, 172/255,	// Node 3
		1.0, -1.0, 1.0, 1.0, 137/255, 157/255, 192/255,	// Node 7
		-1.0, -1.0, 1.0, 1.0, 1.0/255, 0.0/255, 1.0/255,	// Node 6

		-1.0, -1.0, 1.0, 1.0, 250/255, 227/255, 113/255,	// Node 6
		-1.0, -1.0, -1.0, 1.0, 92/255, 167/255, 186/255,	// Node 0
		1.0, -1.0, -1.0, 1.0, 1.0/255, 0.1/255, 1.0/255,	// Node 3

		// -z face: YELLOW
		1.0, 1.0, -1.0, 1.0, 255/255, 66/255, 93/255,	// Node 2
		1.0, -1.0, -1.0, 1.0, 147/255, 225/255, 255/255,	// Node 3
		-1.0, -1.0, -1.0, 1.0, 217/255, 116/255, 43/255,	// Node 0		

		-1.0, -1.0, -1.0, 1.0, 192/255, 194/255, 154/255,	// Node 0
		-1.0, 1.0, -1.0, 1.0, 29/255, 131/255, 8/255,	// Node 1
		1.0, 1.0, -1.0, 1.0, 220/255, 87/255, 18/255,	// Node 2

	]);
}

function makeCylinder1() {
	//==============================================================================
	// Make a cylinder shape from one TRIANGLE_STRIP drawing primitive, using the
	// 'stepped spiral' design (Method 2) described in the class lecture notes.
	// Cylinder center at origin, encircles z axis, radius 1, top/bottom at z= +/-1.
	//
/*
	var topColr = new Float32Array([0.8, 0.8, 0.0]);	// light yellow top,
	var walColr = new Float32Array([0.2, 0.6, 0.2]);	// dark green walls,
	var botColr = new Float32Array([0.2, 0.3, 0.7]);	// light blue bottom,
	var ctrColr = new Float32Array([0.1, 0.1, 0.1]); // near black end-cap centers,
	var errColr = new Float32Array([1.0, 0.2, 0.2]);	// Bright-red trouble color.
*/
	var capVerts = 10;	// # of vertices around the topmost 'cap' of the shape
	var topRadius = 1;		// radius of top of cylinder (bottom is always 1.0)

	// Create a (global) array to hold all of this cylinder's vertices;
	cylVerts = new Float32Array(((capVerts * 6) - 2) * floatsPerVertex);
	// # of vertices * # of elements needed to store them. How many vertices?
	// Cylinder bottom end-cap:   (2*capVerts) -1  vertices;
	// (includes blue transition-edge that links end-cap & wall);
	// + Cylinder wall requires   (2*capVerts) vertices;
	// + Cylinder top end-cap:    (2*capVerts) -1 vertices
	// (includes green transition-edge that links wall & endcap).

	// Create circle-shaped bottom cap of cylinder at z=-1.0, radius 1.0,
	// with (capVerts*2)-1 vertices, BUT STOP before you create it's last vertex.
	// That last vertex forms the 'transition' edge from the bottom cap to the 
	// wall (shown in blue in lecture notes), & we make it in the next for() loop.
	// 
	// v counts vertices: j counts array elements (vertices * elements per vertex)
	for (v = 0, j = 0; v < (2 * capVerts) - 1; v++, j += floatsPerVertex) {
		// START at vertex v = 0; on x-axis on end-cap's outer edge, at xyz = 1,0,-1.
		// END at the vertex 2*(capVerts-1), the last outer-edge vertex before 
		// we reach the starting vertex at 1,0,-1. 
		if (v % 2 == 0) {				// put even# vertices around bottom cap's outer edge,starting at v=0.
			// visit each outer-edge location only once; don't return to 
			// to the location of the v=0 vertex (at 1,0,-1).
			// x,y,z,w == cos(theta),sin(theta),-1.0, 1.0, 
			// 		where	theta = 2*PI*((v/2)/capVerts) = PI*v/capVerts
			cylVerts[j] = Math.cos(Math.PI * v / capVerts);			// x
			cylVerts[j + 1] = Math.sin(Math.PI * v / capVerts);			// y
			//	(Why not 2*PI? because 0 < =v < 2*capVerts,
			//	 so we can simplify cos(2*PI * (v/(2*capVerts))
			cylVerts[j + 2] = -1.0;	// z
			cylVerts[j + 3] = 1.0;	// w.
			// r,g,b = botColr[] 
			cylVerts[j + 4] = 0.9;
			cylVerts[j + 5] = Math.random();
			cylVerts[j + 6] = Math.random();
		}
		else {	// put odd# vertices at center of cylinder's bottom cap:
			cylVerts[j] = 0.0; 			// x,y,z,w == 0,0,-1,1; centered on z axis at -1.
			cylVerts[j + 1] = 0.0;
			cylVerts[j + 2] = -1.0;
			cylVerts[j + 3] = 1.0;			// r,g,b = ctrColr[]
			cylVerts[j + 4] = 0.9;
			cylVerts[j + 5] = Math.random();
			cylVerts[j + 6] = Math.random();
		}
	}
	// Create the cylinder side walls, made of 2*capVerts vertices.
	// v counts vertices within the wall; j continues to count array elements
	// START with the vertex at 1,0,-1 (completes the cylinder's bottom cap;
	// completes the 'transition edge' drawn in blue in lecture notes).
	for (v = 0; v < 2 * capVerts; v++, j += floatsPerVertex) {
		if (v % 2 == 0)	// count verts from zero again, 
		// and put all even# verts along outer edge of bottom cap:
		{
			cylVerts[j] = Math.cos(Math.PI * (v) / capVerts);		// x
			cylVerts[j + 1] = Math.sin(Math.PI * (v) / capVerts);		// y
			cylVerts[j + 2] = -1.0;	// ==z  BOTTOM cap,
			cylVerts[j + 3] = 1.0;	// w.
			// r,g,b = walColr[]				
			cylVerts[j + 4] = 0.9;
			cylVerts[j + 5] = Math.random();
			cylVerts[j + 6] = Math.random();
			if (v == 0) {		// UGLY TROUBLESOME vertex--shares its 1 color with THREE
				// triangles; 1 in cap, 1 in step, 1 in wall.
				cylVerts[j + 4] = 0.9;
				cylVerts[j + 5] = Math.random();
				cylVerts[j + 6] = Math.random();		// (make it red; see lecture notes)
			}
		}
		else		// position all odd# vertices along the top cap (not yet created)
		{
			cylVerts[j] = topRadius * Math.cos(Math.PI * (v - 1) / capVerts);		// x
			cylVerts[j + 1] = topRadius * Math.sin(Math.PI * (v - 1) / capVerts);		// y
			cylVerts[j + 2] = 1.0;	// == z TOP cap,
			cylVerts[j + 3] = 1.0;	// w.
			// r,g,b = walColr;
			cylVerts[j + 4] = 0.9;
			cylVerts[j + 5] = Math.random();
			cylVerts[j + 6] = Math.random();
		}
	}
	// Complete the cylinder with its top cap, made of 2*capVerts -1 vertices.
	// v counts the vertices in the cap; j continues to count array elements.
	for (v = 0; v < (2 * capVerts - 1); v++, j += floatsPerVertex) {
		// count vertices from zero again, and
		if (v % 2 == 0) {	// position even #'d vertices around top cap's outer edge.
			cylVerts[j] = topRadius * Math.cos(Math.PI * (v) / capVerts);		// x
			cylVerts[j + 1] = topRadius * Math.sin(Math.PI * (v) / capVerts);		// y
			cylVerts[j + 2] = 1.0;	// z
			cylVerts[j + 3] = 1.0;	// w.
			// r,g,b = topColr[]
			cylVerts[j + 4] = 0.9;
			cylVerts[j + 5] = Math.random();
			cylVerts[j + 6] = Math.random();
			if (v == 0) {	// UGLY TROUBLESOME vertex--shares its 1 color with THREE
				// triangles; 1 in cap, 1 in step, 1 in wall.
				cylVerts[j + 4] = 0.9;
				cylVerts[j + 5] = Math.random();
				cylVerts[j + 6] = Math.random();		// (make it red; see lecture notes)
			}
		}
		else {				// position odd#'d vertices at center of the top cap:
			cylVerts[j] = 0.0; 			// x,y,z,w == 0,0,-1,1
			cylVerts[j + 1] = 0.0;
			cylVerts[j + 2] = 1.0;
			cylVerts[j + 3] = 1.0;
			// r,g,b = topColr[]
			cylVerts[j + 4] = 0.9;
			cylVerts[j + 5] = Math.random();
			cylVerts[j + 6] = Math.random();
		}
	}
}

function makeCylinder2() {
	//==============================================================================
	// Make a cylinder shape from one TRIANGLE_STRIP drawing primitive, using the
	// 'stepped spiral' design (Method 2) described in the class lecture notes.
	// Cylinder center at origin, encircles z axis, radius 1, top/bottom at z= +/-1.
	//

	// var topColr = new Float32Array([0.8, 0.8, 0.0]);	// light yellow top,
	// var walColr = new Float32Array([0.2, 0.6, 0.2]);	// dark green walls,
	// var botColr = new Float32Array([0.2, 0.3, 0.7]);	// light blue bottom,
	// var ctrColr = new Float32Array([0.1, 0.1, 0.1]); // near black end-cap centers,
	// var errColr = new Float32Array([1.0, 0.2, 0.2]);	// Bright-red trouble color.

	var capVerts = 5;	// # of vertices around the topmost 'cap' of the shape
	var topRadius = 1.25;		// radius of top of cylinder (bottom is always 1.0)

	// Create a (global) array to hold all of this cylinder's vertices;
	cyl2Verts = new Float32Array(((capVerts * 6) - 2) * floatsPerVertex);
	// # of vertices * # of elements needed to store them. How many vertices?
	// Cylinder bottom end-cap:   (2*capVerts) -1  vertices;
	// (includes blue transition-edge that links end-cap & wall);
	// + Cylinder wall requires   (2*capVerts) vertices;
	// + Cylinder top end-cap:    (2*capVerts) -1 vertices
	// (includes green transition-edge that links wall & endcap).

	// Create circle-shaped bottom cap of cylinder at z=-1.0, radius 1.0,
	// with (capVerts*2)-1 vertices, BUT STOP before you create it's last vertex.
	// That last vertex forms the 'transition' edge from the bottom cap to the 
	// wall (shown in blue in lecture notes), & we make it in the next for() loop.
	// 
	// v counts vertices: j counts array elements (vertices * elements per vertex)
	for (v = 0, j = 0; v < (2 * capVerts) - 1; v++, j += floatsPerVertex) {
		// START at vertex v = 0; on x-axis on end-cap's outer edge, at xyz = 1,0,-1.
		// END at the vertex 2*(capVerts-1), the last outer-edge vertex before 
		// we reach the starting vertex at 1,0,-1. 
		if (v % 2 == 0) {				// put even# vertices around bottom cap's outer edge,starting at v=0.
			// visit each outer-edge location only once; don't return to 
			// to the location of the v=0 vertex (at 1,0,-1).
			// x,y,z,w == cos(theta),sin(theta),-1.0, 1.0, 
			// 		where	theta = 2*PI*((v/2)/capVerts) = PI*v/capVerts
			cyl2Verts[j] = Math.cos(Math.PI * v / capVerts);			// x
			cyl2Verts[j + 1] = Math.sin(Math.PI * v / capVerts);			// y
			//	(Why not 2*PI? because 0 < =v < 2*capVerts,
			//	 so we can simplify cos(2*PI * (v/(2*capVerts))
			cyl2Verts[j + 2] = -1.0;	// z
			cyl2Verts[j + 3] = 1.0;	// w.
			// r,g,b = botColr[] 
			cyl2Verts[j + 4] = Math.random();
			cyl2Verts[j + 5] = Math.random();
			cyl2Verts[j + 6] = Math.random();
		}
		else {	// put odd# vertices at center of cylinder's bottom cap:
			cyl2Verts[j] = 0.0; 			// x,y,z,w == 0,0,-1,1; centered on z axis at -1.
			cyl2Verts[j + 1] = 0.0;
			cyl2Verts[j + 2] = -1.0;
			cyl2Verts[j + 3] = 1.0;			// r,g,b = ctrColr[]
			cyl2Verts[j + 5] = Math.random();
			cyl2Verts[j + 4] = Math.random();
			cyl2Verts[j + 6] = Math.random();
		}
	}
	// Create the cylinder side walls, made of 2*capVerts vertices.
	// v counts vertices within the wall; j continues to count array elements
	// START with the vertex at 1,0,-1 (completes the cylinder's bottom cap;
	// completes the 'transition edge' drawn in blue in lecture notes).
	for (v = 0; v < 2 * capVerts; v++, j += floatsPerVertex) {
		if (v % 2 == 0)	// count verts from zero again, 
		// and put all even# verts along outer edge of bottom cap:
		{
			cyl2Verts[j] = Math.cos(Math.PI * (v) / capVerts);		// x
			cyl2Verts[j + 1] = Math.sin(Math.PI * (v) / capVerts);		// y
			cyl2Verts[j + 2] = -1.0;	// ==z  BOTTOM cap,
			cyl2Verts[j + 3] = 1.0;	// w.
			// r,g,b = walColr[]				
			cyl2Verts[j + 4] = Math.random();
			cyl2Verts[j + 5] = Math.random();
			cyl2Verts[j + 6] = Math.random();
			if (v == 0) {		// UGLY TROUBLESOME vertex--shares its 1 color with THREE
				// triangles; 1 in cap, 1 in step, 1 in wall.
				cyl2Verts[j + 4] = Math.random();
				cyl2Verts[j + 5] = Math.random();
				cyl2Verts[j + 6] = Math.random();		// (make it red; see lecture notes)
			}
		}
		else		// position all odd# vertices along the top cap (not yet created)
		{
			cyl2Verts[j] = topRadius * Math.cos(Math.PI * (v - 1) / capVerts);		// x
			cyl2Verts[j + 1] = topRadius * Math.sin(Math.PI * (v - 1) / capVerts);		// y
			cyl2Verts[j + 2] = 1.0;	// == z TOP cap,
			cyl2Verts[j + 3] = 1.0;	// w.
			// r,g,b = walColr;
			cyl2Verts[j + 4] = Math.random();
			cyl2Verts[j + 5] = Math.random();
			cyl2Verts[j + 6] = Math.random();
		}
	}
	// Complete the cylinder with its top cap, made of 2*capVerts -1 vertices.
	// v counts the vertices in the cap; j continues to count array elements.
	for (v = 0; v < (2 * capVerts - 1); v++, j += floatsPerVertex) {
		// count vertices from zero again, and
		if (v % 2 == 0) {	// position even #'d vertices around top cap's outer edge.
			cyl2Verts[j] = topRadius * Math.cos(Math.PI * (v) / capVerts);		// x
			cyl2Verts[j + 1] = topRadius * Math.sin(Math.PI * (v) / capVerts);		// y
			cyl2Verts[j + 2] = 1.0;	// z
			cyl2Verts[j + 3] = 1.0;	// w.
			// r,g,b = topColr[]
			// cyl2Verts[j + 4] = topColr[0];
			// cyl2Verts[j + 5] = topColr[1];
			// cyl2Verts[j + 6] = topColr[2];
			cyl2Verts[j + 4] = Math.random();
		    cyl2Verts[j + 5] = Math.random();
		    cyl2Verts[j + 6] = Math.random();
			if (v == 0) {	// UGLY TROUBLESOME vertex--shares its 1 color with THREE
				// triangles; 1 in cap, 1 in step, 1 in wall.
				cyl2Verts[j + 4] = Math.random();
				cyl2Verts[j + 5] = Math.random();
				cyl2Verts[j + 6] = Math.random();		// (make it red; see lecture notes)
			}
		}
		else {				// position odd#'d vertices at center of the top cap:
			cyl2Verts[j] = 0.0; 			// x,y,z,w == 0,0,-1,1
			cyl2Verts[j + 1] = 0.0;
			cyl2Verts[j + 2] = 1.0;
			cyl2Verts[j + 3] = 1.0;
			// r,g,b = topColr[]
			cyl2Verts[j + 4] = Math.random();
			cyl2Verts[j + 5] = Math.random();
			cyl2Verts[j + 6] = Math.random();
		}
	}
}

function makeBamboo() {
	bambooVerts = new Float32Array([
		0.0, 0.0, 0.0, 1.0, -0.0, 1.0, 0.0,
		1.0, 0.0, 0.19999999999999996, 1.0, -0.0, 1.0, 0.0,
		1.0, 0.0, -0.19999999999999996, 1.0, -0.0, 1.0, 0.0,
		0.0, 0.0, 0.0, 1.0, -0.14002800840280094, 0.7001400420140049, 0.7001400420140049,
		1.0, 0.0, 0.19999999999999996, 1.0, -0.14002800840280094, 0.7001400420140049, 0.7001400420140049,
		1.0, 0.19999999999999996, 0.0, 1.0, -0.14002800840280094, 0.7001400420140049, 0.7001400420140049,
		1.0, 0.0, 0.19999999999999996, 1.0, 1.0, -0.0, 0.0,
		1.0, 0.0, -0.19999999999999996, 1.0, 1.0, -0.0, 0.0,
		1.0, 0.19999999999999996, 0.0, 1.0, 1.0, -0.0, 0.0,
		0.0, 0.0, 0.0, 1.0, -0.14002800840280094, 0.7001400420140049, -0.7001400420140049,
		1.0, 0.19999999999999996, 0.0, 1.0, -0.14002800840280094, 0.7001400420140049, -0.7001400420140049,
		1.0, 0.0, -0.19999999999999996, 1.0, -0.14002800840280094, 0.7001400420140049, -0.7001400420140049,
		0.0, 0.0, 0.0, 1.0, 0.0, 1.0, 0.0,
		0.19999999999999996, 0.0, -1.0, 1.0, 0.0, 1.0, 0.0,
		-0.19999999999999996, 0.0, -1.0, 1.0, 0.0, 1.0, 0.0,
		0.0, 0.0, 0.0, 1.0, 0.7001400420140049, 0.7001400420140049, 0.14002800840280094,
		0.19999999999999996, 0.0, -1.0, 1.0, 0.7001400420140049, 0.7001400420140049, 0.14002800840280094,
		0.0, 0.19999999999999996, -1.0, 1.0, 0.7001400420140049, 0.7001400420140049, 0.14002800840280094,
		0.19999999999999996, 0.0, -1.0, 1.0, 0.0, 0.0, -1.0,
		-0.19999999999999996, 0.0, -1.0, 1.0, 0.0, 0.0, -1.0,
		0.0, 0.19999999999999996, -1.0, 1.0, 0.0, 0.0, -1.0,
		0.0, 0.0, 0.0, 1.0, -0.7001400420140049, 0.7001400420140049, 0.14002800840280094,
		0.0, 0.19999999999999996, -1.0, 1.0, -0.7001400420140049, 0.7001400420140049, 0.14002800840280094,
		-0.19999999999999996, 0.0, -1.0, 1.0, -0.7001400420140049, 0.7001400420140049, 0.14002800840280094,
		0.0, 0.0, 0.0, 1.0, -0.0, -1.0, -0.0,
		-1.0, 0.0, 0.19999999999999996, 1.0, -0.0, -1.0, -0.0,
		-1.0, 0.0, -0.19999999999999996, 1.0, -0.0, -1.0, -0.0,
		0.0, 0.0, 0.0, 1.0, -0.14002800840280094, -0.7001400420140049, -0.7001400420140049,
		-1.0, 0.0, 0.19999999999999996, 1.0, -0.14002800840280094, -0.7001400420140049, -0.7001400420140049,
		-1.0, 0.19999999999999996, 0.0, 1.0, -0.14002800840280094, -0.7001400420140049, -0.7001400420140049,
		-1.0, 0.0, 0.19999999999999996, 1.0, 1.0, -0.0, 0.0,
		-1.0, 0.0, -0.19999999999999996, 1.0, 1.0, -0.0, 0.0,
		-1.0, 0.19999999999999996, 0.0, 1.0, 1.0, -0.0, 0.0,
		0.0, 0.0, 0.0, 1.0, -0.14002800840280094, -0.7001400420140049, 0.7001400420140049,
		-1.0, 0.19999999999999996, 0.0, 1.0, -0.14002800840280094, -0.7001400420140049, 0.7001400420140049,
		-1.0, 0.0, -0.19999999999999996, 1.0, -0.14002800840280094, -0.7001400420140049, 0.7001400420140049,
		0.0, 0.0, 0.0, 1.0, 0.0, -1.0, 0.0,
		0.19999999999999996, 0.0, 1.0, 1.0, 0.0, -1.0, 0.0,
		-0.19999999999999996, 0.0, 1.0, 1.0, 0.0, -1.0, 0.0,
		0.0, 0.0, 0.0, 1.0, -0.7001400420140049, -0.7001400420140049, 0.14002800840280094,
		0.19999999999999996, 0.0, 1.0, 1.0, -0.7001400420140049, -0.7001400420140049, 0.14002800840280094,
		0.0, 0.19999999999999996, 1.0, 1.0, -0.7001400420140049, -0.7001400420140049, 0.14002800840280094,
		0.19999999999999996, 0.0, 1.0, 1.0, 0.0, 0.0, -1.0,
		-0.19999999999999996, 0.0, 1.0, 1.0, 0.0, 0.0, -1.0,
		0.0, 0.19999999999999996, 1.0, 1.0, 0.0, 0.0, -1.0,
		0.0, 0.0, 0.0, 1.0, 0.7001400420140049, -0.7001400420140049, 0.14002800840280094,
		0.0, 0.19999999999999996, 1.0, 1.0, 0.7001400420140049, -0.7001400420140049, 0.14002800840280094,
		-0.19999999999999996, 0.0, 1.0, 1.0, 0.7001400420140049, -0.7001400420140049, 0.14002800840280094

	]);

}

function makeCloak() {

	cloakVerts = new Float32Array([

		// +x face
		1.0, -1.0, -0.1, 1.0, 254/255, 67/255, 101/255,	// Node 3
		1.0, 0, -0.1, 1.0, 252/255, 157/255, 154/255,	// Node 2
		1.0, 0.0, 0.0, 1.0, 249/255, 205/255, 173/255,  // Node 4

		1.0, 0, 0, 1.0, 249/255, 205/255, 173/255,	// Node 4
		1.0, -1.0, 0, 1.0, 131/255, 175/255, 155/255,	// Node 7
		1.0, -1.0, -0.1, 1.0, 254/255, 67/255, 101/255,	// Node 3

		// +y face
		-1.0, 0, -0.1,1.0, 175/255, 215/255, 237/255,	// Node 1
		-1.0, 0, 0, 1.0, 92/255, 167/255, 186/255,	// Node 5
		1.0, 0, 0, 1.0, 249/255, 205/255, 173/255,	// Node 4

		1.0, 0.0, 0.0, 1.0, 249/255, 205/255, 173/255,	// Node 4
		1.0, 0, -0.1, 1.0, 252/255, 157/255, 154/255,	// Node 2
		-1.0, 0, -0.1,1.0, 175/255, 215/255, 237/255,	// Node 1

		// +z face
		-1.0, 0, 0, 1.0, 92/255, 167/255, 186/255,	// Node 5
		-1.0, -1.0, 0, 1.0, 147/255, 244/255, 255/255,	// Node 6
		1.0, -1.0, 0, 1.0, 131/255, 175/255, 155/255,	// Node 7

		1.0, -1.0, 0, 1.0, 131/255, 175/255, 155/255,	// Node 7
		1.0, 0.0, 0.0, 1.0,249/255, 205/255, 173/255,	// Node 4
		-1.0, 0, 0, 1.0, 92/255, 167/255, 186/255,	// Node 5

		// -x face
		-1.0, -1.0, 0, 1.0, 147/255, 244/255, 255/255,	// Node 6
		-1.0, 0, 0, 1.0, 92/255, 167/255, 186/255,	// Node 5
		-1.0, 0, -0.1,1.0, 175/255, 215/255, 237/255,	// Node 1

		-1.0, 0, -0.1,1.0, 175/255, 215/255, 237/255,	// Node 1
		-1.0, -1.0, -0.1, 1.0, 199/255, 237/255, 233/255,	// Node 0  
		-1.0, -1.0, 0, 1.0, 147/255, 244/255, 255/255,	// Node 6

		// -y face
		1.0, -1.0, -0.1, 1.0, 254/255, 67/255, 101/255,	// Node 3
		1.0, -1.0, 0, 1.0, 131/255, 175/255, 155/255,	// Node 7
		-1.0, -1.0, 0, 1.0, 147/255, 244/255, 255/255,	// Node 6

		-1.0, -1.0, 0, 1.0, 147/255, 244/255, 255/255,	// Node 6
		-1.0, -1.0, -0.1, 1.0, 199/255, 237/255, 233/255,	// Node 0
		1.0, -1.0, -0.1, 1.0, 254/255, 67/255, 101/255,	// Node 3

		// -z face
		1.0, 0, -0.1, 1.0, 252/255, 157/255, 154/255,	// Node 2
		1.0, -1.0, -0.1, 1.0, 254/255, 67/255, 101/255,	// Node 3
		-1.0, -1.0, -0.1, 1.0, 199/255, 237/255, 233/255,	// Node 0  	

		-1.0, -1.0, -0.1, 1.0, 199/255, 237/255, 233/255,	// Node 0  
		-1.0, 0, -0.1,1.0, 175/255, 215/255, 237/255,	// Node 1
		1.0, 0, -0.1, 1.0, 252/255, 157/255, 154/255,	// Node 2

	]);
}

function makeLeaf() {

	leafVerts = new Float32Array([
    
		0.0 ,0.0 ,0,1,0/255,255/255,127/255,//1
		0.2 ,0.2 ,0,1.0,0/255,238/255,118/255,//2
		0.2 ,0.3 ,0,1.0,34/255,139/255,34/255,//3

		0.0 ,0.0 ,0,1,0/255,255/255,127/255,//1
		0.2 ,0.3 ,0,1.0,34/255,139/255,34/255,//3
		0.1 ,0.4 ,0,1.0,0/255,139/255,69/255,//4

		0.0 ,0.0 ,0,1,0/255,255/255,127/255,//1
		0.1 ,0.4 ,0,1.0,0/255,139/255,69/255,//4
		-0.1, 0.4, 0,1.0,154/255,255/255,154/255,//5

		0.0 ,0.0 ,0,1,0/255,255/255,127/255,//1
		-0.1, 0.4, 0,1.0,154/255,255/255,154/255,//5
		-0.2, 0.3, 0,1.0,133/255,238/255,144/255,//6

		0.0 ,0.0 ,0,1,0/255,255/255,127/255,//1
		-0.2, 0.3, 0,1.0,133/255,238/255,144/255,//6
		-0.2, 0.2, 0,1.0,0/255,205/255,0/255,//7

		0.0 ,0.0 ,-0.1,1.0,0/255,128/255,0/255,//8
		-0.2, 0.2, -0.1,1.0,102/255,205/255,155/255,//14
		-0.2, 0.3, -0.1,1.0,118/255,255/255,212/255,//13

		0.0 ,0.0 ,-0.1,1.0,0/255,128/255,0/255,//8
		-0.2, 0.3, -0.1,1.0,118/255,255/255,212/255,//13
		-0.1, 0.4, -0.1,1.0,118/255,238/255,198/255,//12

		0.0 ,0.0 ,-0.1,1.0,0/255,128/255,0/255,//8
		-0.1, 0.4, -0.1,1.0,118/255,238/255,198/255,//12
		0.1 ,0.4 ,-0.1,1.0,84/255,139/255,84/255,//11

		0.0 ,0.0 ,-0.1,1.0,0/255,128/255,0/255,//8
		0.1 ,0.4 ,-0.1,1.0,84/255,139/255,84/255,//11
		0.2 ,0.3 ,-0.1,1.0,67/255,205/255,124/255,//10

		0.0 ,0.0 ,-0.1,1.0,0/255,128/255,0/255,//8
		0.2 ,0.3 ,-0.1,1.0,67/255,205/255,124/255,//10
		0.2 ,0.2 ,-0.1,1.0,78/255,238/255,148/255,//9

		0.0 ,0.0 ,0,1,0/255,255/255,127/255,//1
		0.0 ,0.0 ,-0.1,1.0,0/255,128/255,0/255,//8
		0.2 ,0.2 ,-0.1,1.0,78/255,238/255,148/255,//9

		0.0 ,0.0 ,0,1,0/255,255/255,127/255,//1
		0.2 ,0.2 ,-0.1,1.0,78/255,238/255,148/255,//9
		0.2 ,0.2 ,0,1.0,0/255,238/255,118/255,//2

		0.2 ,0.2 ,-0.1,1.0,78/255,238/255,148/255,//9
		0.2 ,0.3 ,-0.1,1.0,67/255,205/255,124/255,//10
		0.2 ,0.3 ,0,1.0,34/255,139/255,34/255,//3

		0.2 ,0.2 ,0,1.0,0/255,238/255,118/255,//2
		0.2 ,0.2 ,-0.1,1.0,78/255,238/255,148/255,//9
		0.2 ,0.3 ,0,1.0,34/255,139/255,34/255,//3

		0.2 ,0.3 ,-0.1,1.0,67/255,205/255,124/255,//10
		0.1 ,0.4 ,-0.1,1.0,84/255,139/255,84/255,//11
		0.1 ,0.4 ,0,1.0,0/255,139/255,69/255,//4

		0.2 ,0.3 ,0,1.0,34/255,139/255,34/255,//3
		0.2 ,0.3 ,-0.1,1.0,67/255,205/255,124/255,//10
		0.1 ,0.4 ,0,1.0,0/255,139/255,69/255,//4

		0.1 ,0.4 ,0,1.0,0/255,139/255,69/255,//4
		-0.1, 0.4, -0.1,1.0,118/255,238/255,198/255,//12
		-0.1, 0.4, 0,1.0,154/255,255/255,154/255,//5

		0.1 ,0.4 ,-0.1,1.0,84/255,139/255,84/255,//11
		-0.1, 0.4, -0.1,1.0,118/255,238/255,198/255,//12
		0.1 ,0.4 ,0,1.0,0/255,139/255,69/255,//4

		-0.1, 0.4, -0.1,1.0,118/255,238/255,198/255,//12
		-0.2, 0.3, -0.1,1.0,118/255,255/255,212/255,//13
		-0.2, 0.3, 0,1.0,133/255,238/255,144/255,//6

		-0.1, 0.4, 0,1.0,154/255,255/255,154/255,//5
		-0.1, 0.4, -0.1,1.0,118/255,238/255,198/255,//12
		-0.2, 0.3, 0,1.0,133/255,238/255,144/255,//6

		-0.2, 0.3, 0,1.0,133/255,238/255,144/255,//6
		-0.2, 0.2, -0.1,1.0,102/255,205/255,155/255,//14
		-0.2, 0.2, 0,1.0,0/255,205/255,0/255,//7

		-0.2, 0.3, -0.1,1.0,118/255,255/255,212/255,//13
		-0.2, 0.2, -0.1,1.0,102/255,205/255,155/255,//14
		-0.2, 0.3, 0,1.0,133/255,238/255,144/255,//6

		-0.2, 0.2, 0,1.0,0/255,205/255,0/255,//7
		-0.2, 0.2, -0.1,1.0,102/255,205/255,155/255,//14
		0.0 ,0.0 ,-0.1,1.0,0/255,128/255,0/255,//8

		-0.2, 0.2, 0,1.0,0/255,205/255,0/255,//7
		0.0 ,0.0 ,-0.1,1.0,0/255,128/255,0/255,//8
		0.0 ,0.0 ,0,1,0/255,255/255,127/255,//1
		

	]);
}

function makeGroundGrid() {
    //==============================================================================
    // Create a list of vertices that create a large grid of lines in the x,y plane
    // centered at x=y=z=0.  Draw this shape using the GL_LINES primitive.
    
        var xcount = 100;			// # of lines to draw in x,y to make the grid.
        var ycount = 100;		
        var xymax	= 50.0;			// grid size; extends to cover +/-xymax in x and y.
         var xColr = new Float32Array([1.0, 1.0, 0.3]);	// bright yellow
         var yColr = new Float32Array([0.5, 1.0, 0.5]);	// bright green.
         
        // Create an (global) array to hold this ground-plane's vertices:
        gndVerts = new Float32Array(floatsPerVertex*2*(xcount+ycount));
                            // draw a grid made of xcount+ycount lines; 2 vertices per line.
                            
        var xgap = xymax/(xcount-1);		// HALF-spacing between lines in x,y;
        var ygap = xymax/(ycount-1);		// (why half? because v==(0line number/2))
        
        // First, step thru x values as we make vertical lines of constant-x:
        for(v=0, j=0; v<2*xcount; v++, j+= floatsPerVertex) {
            if(v%2==0) {	// put even-numbered vertices at (xnow, -xymax, 0)
                gndVerts[j  ] = -xymax + (v  )*xgap;	// x
                gndVerts[j+1] = -xymax;								// y
                gndVerts[j+2] = 0.0;									// z
                gndVerts[j+3] = 1.0;									// w.
            }
            else {				// put odd-numbered vertices at (xnow, +xymax, 0).
                gndVerts[j  ] = -xymax + (v-1)*xgap;	// x
                gndVerts[j+1] = xymax;								// y
                gndVerts[j+2] = 0.0;									// z
                gndVerts[j+3] = 1.0;									// w.
            }
            gndVerts[j+4] = xColr[0];			// red
            gndVerts[j+5] = xColr[1];			// grn
            gndVerts[j+6] = xColr[2];			// blu
        }
        // Second, step thru y values as wqe make horizontal lines of constant-y:
        // (don't re-initialize j--we're adding more vertices to the array)
        for(v=0; v<2*ycount; v++, j+= floatsPerVertex) {
            if(v%2==0) {		// put even-numbered vertices at (-xymax, ynow, 0)
                gndVerts[j  ] = -xymax;								// x
                gndVerts[j+1] = -xymax + (v  )*ygap;	// y
                gndVerts[j+2] = 0.0;									// z
                gndVerts[j+3] = 1.0;									// w.
            }
            else {					// put odd-numbered vertices at (+xymax, ynow, 0).
                gndVerts[j  ] = xymax;								// x
                gndVerts[j+1] = -xymax + (v-1)*ygap;	// y
                gndVerts[j+2] = 0.0;									// z
                gndVerts[j+3] = 1.0;									// w.
            }
            gndVerts[j+4] = yColr[0];			// red
            gndVerts[j+5] = yColr[1];			// grn
            gndVerts[j+6] = yColr[2];			// blu
        }
    }

function makeDiamond(){
    diaVerts = new Float32Array([
		0.0,  0.0, 0.78, 1.0,Math.random(),Math.random(),Math.random(),  // v1
		0.45, -0.45, 0.0, 1.0, Math.random(),Math.random(),Math.random(),  // v3
		0.45,  0.45, 0.0, 1.0, Math.random(),Math.random(),Math.random(),	// v2

		0.0,  0.0, 0.78, 1.0, Math.random(),Math.random(),Math.random(),	  // v1
		0.45,  0.45, 0.0, 1.0, Math.random(),Math.random(),Math.random(),	// v2
		-0.45, 0.45, 0.0, 1.0, Math.random(),Math.random(),Math.random(),	// v5

		0.0,  0.0, 0.78, 1.0, Math.random(),Math.random(),Math.random(),	  // v1
		-0.45, 0.45, 0.0, 1.0, Math.random(),Math.random(),Math.random(),	// v5
		-0.45, -0.45, 0.0, 1.0, Math.random(),Math.random(),Math.random(), // v4

		0.0,  0.0, 0.78, 1.0, Math.random(),Math.random(),Math.random(),	  // v1
		-0.45, -0.45, 0.0, 1.0, Math.random(),Math.random(),Math.random(), // v4
		0.45, -0.45, 0.0, 1.0, Math.random(),Math.random(),Math.random(),  // v3

		0.45, -0.45, 0.0, 1.0, Math.random(),Math.random(),Math.random(),  // v3
		0.0,  0.0, -0.78, 1.0, Math.random(),Math.random(),Math.random(),  // v6
		0.45,  0.45, 0.0, 1.0, Math.random(),Math.random(),Math.random(),	// v2

		0.45,  0.45, 0.0, 1.0, Math.random(),Math.random(),Math.random(),	// v2		
		0.0,  0.0, -0.78, 1.0, Math.random(),Math.random(),Math.random(),  // v6
		-0.45, 0.45, 0.0, 1.0, Math.random(),Math.random(),Math.random(),	// v5
		
		-0.45, 0.45, 0.0, 1.0, Math.random(),Math.random(),Math.random(),	// v5
		0.0,  0.0, -0.78, 1.0, Math.random(),Math.random(),Math.random(),  // v6
		-0.45, -0.45, 0.0, 1.0, Math.random(),Math.random(),Math.random(), // v4

		-0.45, -0.45, 0.0, 1.0, Math.random(),Math.random(),Math.random(), // v4
		0.0,  0.0, -0.78, 1.0, Math.random(),Math.random(),Math.random(),  // v6
		0.45, -0.45, 0.0, 1.0, Math.random(),Math.random(),Math.random(),  // v3
	
	  ]);
}

function makeAxes(){
	axesVerts = new Float32Array([
		// +x axis RED; +y axis GREEN; +z axis BLUE; origin: GRAY
		0.0,  0.0,  0.0, 1.0,		0.3,  0.3,  0.3,	// X axis line (origin: gray)
		1.3,  0.0,  0.0, 1.0,		1.0,  0.3,  0.3,	// 						 (endpoint: red)
		
		0.0,  0.0,  0.0, 1.0,    0.3,  0.3,  0.3,	// Y axis line (origin: white)
		0.0,  1.3,  0.0, 1.0,		0.3,  1.0,  0.3,	//						 (endpoint: green)

		0.0,  0.0,  0.0, 1.0,		0.3,  0.3,  0.3,	// Z axis line (origin:white)
		0.0,  0.0,  1.3, 1.0,		0.3,  0.3,  1.0,	//						 (endpoint: blue)
	
	  ]);
}
    
//==================HTML Button Callbacks======================


// function angleSubmit() {
// 	// Called when user presses 'Submit' button on our webpage
// 	//		HOW? Look in HTML file (e.g. ControlMulti.html) to find
// 	//	the HTML 'input' element with id='usrAngle'.  Within that
// 	//	element you'll find a 'button' element that calls this fcn.

// 	// Read HTML edit-box contents:
// 	var UsrTxt = document.getElementById('usrAngle').value;
// 	// Display what we read from the edit-box: use it to fill up
// 	// the HTML 'div' element with id='editBoxOut':
// 	document.getElementById('EditBoxOut').innerHTML = 'You Typed: ' + UsrTxt;
// 	console.log('angleSubmit: UsrTxt:', UsrTxt); // print in console, and
// 	g_angle04 = parseFloat(UsrTxt);     // convert string to float number 
// };

function clearDrag() {
	// Called when user presses 'Clear' button in our webpage
	g_xMdragTot = 0.0;
	g_yMdragTot = 0.0;
}

function spinUp() {
	// Called when user presses the 'Spin >>' button on our webpage.
	// ?HOW? Look in the HTML file (e.g. ControlMulti.html) to find
	// the HTML 'button' element with onclick='spinUp()'.
	g_angle01Rate += 25;
}

function spinDown() {
	// Called when user presses the 'Spin <<' button
	g_angle01Rate -= 25;
}

function runStop() {
	// Called when user presses the 'Run/Stop' button
	if (g_angle01Rate * g_angle01Rate > 1) {  // if nonzero rate,
		myTmp = g_angle01Rate;  // store the current rate,
		g_angle01Rate = 0;      // and set to zero.
	}
	else {    // but if rate is zero,
		g_angle01Rate = myTmp;  // use the stored rate.
	}
}

// function clearMouse() {
// 	// Called when user presses 'Clear' button on our webpage, just below the 
// 	// 'xMdragTot,yMdragTot' display.
// 		g_xMdragTot = 0.0;
// 		g_yMdragTot = 0.0;
// 		document.getElementById('MouseText').innerHTML=
// 				'Mouse Drag totals (CVV x,y coords):\t'+
// 				 g_xMdragTot.toFixed(5)+', \t'+
// 				 g_yMdragTot.toFixed(5);	
// }
	
function resetQuat() {
	// Called when user presses 'Reset' button on our webpage, just below the 
	// 'Current Quaternion' display.
	  var res=5;
		qTot.clear();
		document.getElementById('QuatValue').innerHTML= 
															 '\t X=' +qTot.x.toFixed(res)+
															'i\t Y=' +qTot.y.toFixed(res)+
															'j\t Z=' +qTot.z.toFixed(res)+
															'k\t W=' +qTot.w.toFixed(res)+
															'<br>length='+qTot.length().toFixed(res);
}

//===================Mouse and Keyboard event-handling Callbacks

function myMouseDown(ev, gl, g_canvas) {
	//==============================================================================
	// Called when user PRESSES down any mouse button;
	// 									(Which button?    console.log('ev.button='+ev.button);   )
	// 		ev.clientX, ev.clientY == mouse pointer location, but measured in webpage 
	//		pixels: left-handed coords; UPPER left origin; Y increases DOWNWARDS (!)  
	
	// Create right-handed 'pixel' coords with origin at WebGL canvas LOWER left;
	  var rect = ev.target.getBoundingClientRect();	// get canvas corners in pixels
	  var xp = ev.clientX - rect.left;									// x==0 at canvas left edge
	  var yp = g_canvas.height - (ev.clientY - rect.top);	// y==0 at canvas bottom edge
	//  console.log('myMouseDown(pixel coords): xp,yp=\t',xp,',\t',yp);
	  
		// Convert to Canonical View Volume (CVV) coordinates too:
	  var x = (xp - g_canvas.width/2)  / 		// move origin to center of canvas and
							   (g_canvas.width/2);			// normalize canvas to -1 <= x < +1,
		var y = (yp - g_canvas.height/2) /		//										 -1 <= y < +1.
								 (g_canvas.height/2);
	//	console.log('myMouseDown(CVV coords  ):  x, y=\t',x,',\t',y);
		
		g_isDrag = true;											// set our mouse-dragging flag
		g_xMclik = x;													// record where mouse-dragging began
		g_yMclik = y;
};
	
	
function myMouseMove(ev, gl, canvas) {
//==============================================================================
// Called when user MOVES the mouse with a button already pressed down.
// 									(Which button?   console.log('ev.button='+ev.button);    )
// 		ev.clientX, ev.clientY == mouse pointer location, but measured in webpage 
//		pixels: left-handed coords; UPPER left origin; Y increases DOWNWARDS (!)  

	if(g_isDrag==false) return;				// IGNORE all mouse-moves except 'dragging'

	// Create right-handed 'pixel' coords with origin at WebGL canvas LOWER left;
	var rect = ev.target.getBoundingClientRect();	// get canvas corners in pixels
	var xp = ev.clientX - rect.left;									// x==0 at canvas left edge
	var yp = canvas.height - (ev.clientY - rect.top);	// y==0 at canvas bottom edge
//  console.log('myMouseMove(pixel coords): xp,yp=\t',xp,',\t',yp);
	
	// Convert to Canonical View Volume (CVV) coordinates too:
	var x = (xp - canvas.width/2)  / 		// move origin to center of canvas and
							(canvas.width/2);			// normalize canvas to -1 <= x < +1,
	var y = (yp - canvas.height/2) /		//										 -1 <= y < +1.
								(canvas.height/2);

	// find how far we dragged the mouse:
	g_xMdragTot += (x - g_xMclik);					// Accumulate change-in-mouse-position,&
	g_yMdragTot += (y - g_yMclik);
	// AND use any mouse-dragging we found to update quaternions qNew and qTot.
	dragQuat(x - g_xMclik, y - g_yMclik);
	
	g_xMclik = x;													// Make NEXT drag-measurement from here.
	g_yMclik = y;
	
	// // Show it on our webpage, in the <div> element named 'MouseText':
	// document.getElementById('MouseText').innerHTML=
	// 		'Mouse Drag totals (CVV x,y coords):\t'+
	// 			g_xMdragTot.toFixed(5)+', \t'+
	// 			g_yMdragTot.toFixed(5);	
};

function myMouseUp(ev, gl, canvas) {
//==============================================================================
// Called when user RELEASES mouse button pressed previously.
// 									(Which button?   console.log('ev.button='+ev.button);    )
// 		ev.clientX, ev.clientY == mouse pointer location, but measured in webpage 
//		pixels: left-handed coords; UPPER left origin; Y increases DOWNWARDS (!)  

// Create right-handed 'pixel' coords with origin at WebGL canvas LOWER left;
	var rect = ev.target.getBoundingClientRect();	// get canvas corners in pixels
	var xp = ev.clientX - rect.left;									// x==0 at canvas left edge
	var yp = canvas.height - (ev.clientY - rect.top);	// y==0 at canvas bottom edge
//  console.log('myMouseUp  (pixel coords): xp,yp=\t',xp,',\t',yp);
	
	// Convert to Canonical View Volume (CVV) coordinates too:
	var x = (xp - canvas.width/2)  / 		// move origin to center of canvas and
							(canvas.width/2);			// normalize canvas to -1 <= x < +1,
	var y = (yp - canvas.height/2) /		//										 -1 <= y < +1.
								(canvas.height/2);
//	console.log('myMouseUp  (CVV coords  ):  x, y=\t',x,',\t',y);
	
	g_isDrag = false;											// CLEAR our mouse-dragging flag, and
	// accumulate any final bit of mouse-dragging we did:
	g_xMdragTot += (x - g_xMclik);
	g_yMdragTot += (y - g_yMclik);
//	console.log('myMouseUp: xMdragTot,yMdragTot =',xMdragTot,',\t',yMdragTot);

	// AND use any mouse-dragging we found to update quaternions qNew and qTot;
	dragQuat(x - g_xMclik, y - g_yMclik);

	// Show it on our webpage, in the <div> element named 'MouseText':
	// document.getElementById('MouseText').innerHTML=
	// 		'Mouse Drag totals (CVV x,y coords):\t'+
	// 			g_xMdragTot.toFixed(5)+', \t'+
	// 			g_yMdragTot.toFixed(5);	
};

function dragQuat(xdrag, ydrag) {
//==============================================================================
// Called when user drags mouse by 'xdrag,ydrag' as measured in CVV coords.
// We find a rotation axis perpendicular to the drag direction, and convert the 
// drag distance to an angular rotation amount, and use both to set the value of 
// the quaternion qNew.  We then combine this new rotation with the current 
// rotation stored in quaternion 'qTot' by quaternion multiply.  Note the 
// 'draw()' function converts this current 'qTot' quaternion to a rotation 
// matrix for drawing. 
var res = 5;
var qTmp = new Quaternion(0,0,0,1);
var vNewX = new Vector3([-Math.cos((g_phi+90)*Math.PI/180),-Math.sin((g_phi+90)*Math.PI/180),0]);
var vNewY = new Vector3([Math.cos(g_phi*Math.PI/180)*Math.sin(g_theta*Math.PI/180),
						Math.sin(g_phi*Math.PI/180)*Math.sin(g_theta*Math.PI/180),
						Math.cos(g_theta*Math.PI/180)]);
						var vNewZ = vNewX.cross(vNewY);
var dist = Math.sqrt(xdrag*xdrag + ydrag*ydrag);
// console.log('xdrag,ydrag=',xdrag.toFixed(5),ydrag.toFixed(5),'dist=',dist.toFixed(5));

//qNew.setFromAxisAngle(Math.cos((g_phi+90)*Math.PI/180)*ydrag+0.0001, Math.sin((g_phi+90)*Math.PI/180)*ydrag + 0.0001, xdrag, dist*150.0);
qNew.setFromAxisAngle(	-ydrag*vNewX.elements[0]+xdrag*vNewZ.elements[0]+0.0001,
						-ydrag*vNewX.elements[1]+xdrag*vNewZ.elements[1]+0.0001,
						-ydrag*vNewX.elements[2]+xdrag*vNewZ.elements[2]+0.0001,
						dist*100.0)
//qNew.setFromAxisAngle(-Math.cos(90-g_phi*Math.PI/180)*xdrag+Math.sin(g_phi*Math.PI/180)*ydrag+0.0001,
                      // -Math.sin(g_phi*Math.PI/180)*xdrag-Math.cos(g_phi*Math.PI/180)*ydrag + 0.0001, Math.sin(g_theta*Math.PI/180)*xdrag, dist*150.0);
// console.log(g_theta);
// console.log(g_phi);
// (why add tiny 0.0001? To ensure we never have a zero-length rotation axis)
						// why axis (x,y,z) = (-yMdrag,+xMdrag,0)? 
						// -- to rotate around +x axis, drag mouse in -y direction.
						// -- to rotate around +y axis, drag mouse in +x direction.
						
qTmp.multiply(qNew,qTot);			// apply new rotation to current rotation. 
//--------------------------
// IMPORTANT! Why qNew*qTot instead of qTot*qNew? (Try it!)
// ANSWER: Because 'duality' governs ALL transformations, not just matrices. 
// If we multiplied in (qTot*qNew) order, we would rotate the drawing axes
// first by qTot, and then by qNew--we would apply mouse-dragging rotations
// to already-rotated drawing axes.  Instead, we wish to apply the mouse-drag
// rotations FIRST, before we apply rotations from all the previous dragging.
//------------------------
// IMPORTANT!  Both qTot and qNew are unit-length quaternions, but we store 
// them with finite precision. While the product of two (EXACTLY) unit-length
// quaternions will always be another unit-length quaternion, the qTmp length
// may drift away from 1.0 if we repeat this quaternion multiply many times.
// A non-unit-length quaternion won't work with our quaternion-to-matrix fcn.
// Matrix4.prototype.setFromQuat().
//	qTmp.normalize();						// normalize to ensure we stay at length==1.0.
qTot.copy(qTmp);
// show the new quaternion qTot on our webpage in the <div> element 'QuatValue'
document.getElementById('QuatValue').innerHTML= 
													 '\t X=' +qTot.x.toFixed(res)+
													'i\t Y=' +qTot.y.toFixed(res)+
													'j\t Z=' +qTot.z.toFixed(res)+
													'k\t W=' +qTot.w.toFixed(res)+
													'<br>length='+qTot.length().toFixed(res);
};

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
			console.log("a/A key: Strafe LEFT!\n");
			document.getElementById('KeyDownResult').innerHTML =
				'myKeyDown() found a/A key. Strafe LEFT!';
			g_phi += 1;
			lookAtpoint();
			break;
		case "ArrowRight":
			console.log("d/D key: Strafe RIGHT!\n");
			document.getElementById('KeyDownResult').innerHTML =
				'myKeyDown() found d/D key. Strafe RIGHT!';
			g_phi -= 1;
			lookAtpoint();
			break;
		case "ArrowDown":
			kev.preventDefault();
			console.log("s/S key: Move BACK!\n");
			document.getElementById('KeyDownResult').innerHTML =
				'myKeyDown() found s/Sa key. Move BACK.';
			g_theta += 1;
			lookAtpoint();
			break;
		case "ArrowUp":
			kev.preventDefault();
			console.log("w/W key: Move FWD!\n");
			document.getElementById('KeyDownResult').innerHTML =
				'myKeyDown() found w/W key. Move FWD!';
			g_theta -= 1;
			lookAtpoint();
			break;
		
		//------------------QE navigation-----------------
		case "KeyQ":
			console.log("a/A key: Strafe LEFT!\n");
			document.getElementById('KeyDownResult').innerHTML =
				'myKeyDown() found a/A key. Strafe LEFT!';
			g_eyez += 0.1;
			g_lookz += 0.1;
			//lookAtpoint();
			break;
		case "KeyE":
			console.log("d/D key: Strafe RIGHT!\n");
			document.getElementById('KeyDownResult').innerHTML =
				'myKeyDown() found d/D key. Strafe RIGHT!';
			g_eyez -= 0.1;
			g_lookz -= 0.1;
			//lookAtpoint();
			break;
		//----------------WASD keys------------------------
		case "KeyA":
			console.log(' left-arrow.');
			// and print on webpage in the <div> element with id='Result':
			document.getElementById('KeyDownResult').innerHTML =
				'myKeyDown(): Left Arrow=' + kev.keyCode;
				//g_delta1 += 0.01;
				eyepointLeft();
			break;
		case "KeyD":
			console.log('right-arrow.');
			document.getElementById('KeyDownResult').innerHTML =
				'myKeyDown():Right Arrow:keyCode=' + kev.keyCode;
				//g_delta2 += 0.01;
				eyepointRight();
			break;
		case "KeyW":
			console.log('   up-arrow.');
			document.getElementById('KeyDownResult').innerHTML =
				'myKeyDown():   Up Arrow:keyCode=' + kev.keyCode;
			//g_delta -= 0.05;
			eyepointFor();
			break;
		case "KeyS":
			console.log(' down-arrow.');
			document.getElementById('KeyDownResult').innerHTML =
				'myKeyDown(): Down Arrow:keyCode=' + kev.keyCode;
			//g_delta += 0.05;
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
		g_canvas.width = innerWidth - xtraMargin;
		g_canvas.height = (innerHeight*2/3) - xtraMargin;
		// IMPORTANT!  Need a fresh drawing in the re-sized viewports.
		drawAll();				// draw in all viewports.
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