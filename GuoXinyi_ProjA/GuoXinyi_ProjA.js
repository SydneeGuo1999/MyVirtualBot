//3456789_123456789_123456789_123456789_123456789_123456789_123456789_123456789_
// (JT: why the numbers? counts columns, helps me keep 80-char-wide listings)
//
// ControlMulti.js for EECS 351-1, 
//									Northwestern Univ. Jack Tumblin
// merged and modified to became:
// Project A - A Flying Robot with A Tree Swaying in the Wind, 
//									              by Xinyi Guo
//
// Vertex shader program----------------------------------
var VSHADER_SOURCE =
	'uniform mat4 u_ModelMatrix;\n' +
	'attribute vec4 a_Position;\n' +
	'attribute vec4 a_Color;\n' +
	'varying vec4 v_Color;\n' +
	'void main() {\n' +
	'  gl_Position = u_ModelMatrix * a_Position;\n' +
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
var g_modelMatrix = new Matrix4();  // Construct 4x4 matrix; contents get sent
// to the GPU/Shaders as a 'uniform' var.
var g_modelMatLoc;                  // that uniform's location in the GPU

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
var g_angle04Rate = 20.0;           // rotation speed, in degrees/second 

var g_posX = 0;
var g_posY = 0; //CVV coordinates of robot  

var g_posXtree = 0;
var g_posYtree = 0; //CVV coordinates of tree

var g_newposX = 0;
var g_newposY = 0; 

var g_posXrate = 0;
var g_posYrate = 0;

//------------For mouse click-and-drag: -------------------------------
var g_isDrag = false;		// mouse-drag: true when user holds down mouse button
var g_xMclik = 0.0;			// last mouse button-down position (in CVV coords)
var g_yMclik = 0.0;
var g_xMdragTot = 0.0;	// total (accumulated) mouse-drag amounts (in CVV coords).
var g_yMdragTot = 0.0;
var g_digits = 5;			// DIAGNOSTICS: # of digits to print in console.log (
//    console.log('xVal:', xVal.toFixed(g_digits)); // print 5 digits								 
var controls = new function() {
	this.g_angle02Rate = 40.0;
	this.g_angle03Rate = 5.0;

	this.color = 0;
  };

 var gui = new dat.GUI();
 gui.add(controls, 'g_angle02Rate', 0, 40);
 gui.add(controls, 'g_angle03Rate', 0, 5);
 //gui.add(controls, 'color', 0, 1);
function main() {
	//==============================================================================
	// Get gl, the rendering context for WebGL, from our 'g_canvas' object
	gl = getWebGLContext(g_canvas);
	if (!gl) {
		console.log('Failed to get the rendering context for WebGL');
		return;
	}

	gl.enable(gl.DEPTH_TEST); // enabled by default, but let's be SURE.
	gl.clearDepth(0.0); // each time we 'clear' our depth buffer, set all
	// pixel depths to 0.0 (1.0 is DEFAULT)
	gl.depthFunc(gl.GREATER); // (gl.LESS is DEFAULT; reverse it!)

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

	window.addEventListener("mousedown", myMouseDown);
	window.addEventListener("mousemove", myMouseMove);
	window.addEventListener("mouseup", myMouseUp);
	window.addEventListener("click", myMouseClick);
	window.addEventListener("dblclick", myMouseDblClick);
	// END Keyboard & Mouse Event-Handlers---------------------------------------

	// Specify the color for clearing <canvas>
	//gl.clearColor(238/255, 229/255, 248/255, 1.0);
	//gl.clearColor(201/255, 192/255, 211/255, 1.0);
	//gl.clearColor(255/255, 192/255, 203/255, 1.0);
	gl.clearColor(249/255, 205/255, 173/255, 1.0);

	// Get handle to graphics system's storage location of u_ModelMatrix
	g_modelMatLoc = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
	if (!g_modelMatLoc) {
		console.log('Failed to get the storage location of u_ModelMatrix');
		return;
	}

	// ANIMATION: create 'tick' variable whose value is this function:
	//----------------- 
	setRobpos();
	var tick = function () {
		requestAnimationFrame(tick, g_canvas);

		animate();   // Update the rotation angle
		drawAll();   // Draw all parts
		console.log(g_newposX, g_newposY,g_posX,g_posY);
        if (Math.abs(Math.sqrt(Math.pow(g_posX-g_newposX,2)+Math.pow(g_posY-g_newposY,2)))<0.001 ||
		Math.abs(Math.sqrt(Math.pow(g_posX-g_newposX,2)+Math.pow(g_posY-g_newposY,2)))>2)
		    {
				setRobpos();
				console.log(g_posX, g_posY);
			};
		//    console.log('g_angle01=',g_angle01.toFixed(g_digits)); // put text in console.

		//	Show some always-changing text in the webpage :  
		//		--find the HTML element called 'CurAngleDisplay' in our HTML page,
		//			 	(a <div> element placed just after our WebGL 'canvas' element)
		// 				and replace it's internal HTML commands (if any) with some
		//				on-screen text that reports our current angle value:
		//		--HINT: don't confuse 'getElementByID() and 'getElementById()
		document.getElementById('CurAngleDisplay').innerHTML =
			'g_angle01= ' + g_angle01.toFixed(g_digits);
		// Also display our current mouse-dragging state:
		document.getElementById('Mouse').innerHTML =
			'Mouse Drag totals (CVV coords):\t' +
			g_xMdragTot.toFixed(5) + ', \t' + g_yMdragTot.toFixed(g_digits);
		//--------------------------------

		// Request that the browser re-draw the webpage
		// (causes webpage to endlessly re-draw itself)
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
	console.log(g_vertsMax);

	// how many floats total needed to store all shapes?
	var mySiz = (cubeVerts.length + cylVerts.length + bambooVerts.length + cloakVerts.length + leafVerts.length + cyl2Verts.length);
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
	g_modelMatrix.setIdentity();
	// clrColr = new Float32Array(4);
	// clrColr = gl.getParameter(gl.COLOR_CLEAR_VALUE);
	//g_modelMatrix.translate(0.5, 0.5, 0.5);
	var dist = Math.sqrt(g_xMdragTot * g_xMdragTot + g_yMdragTot * g_yMdragTot);
	g_modelMatrix.rotate(dist * 120.0, -g_yMdragTot + 0.0001, g_xMdragTot + 0.0001, 0.0);
    drawRobot();

	g_modelMatrix.setIdentity();
	g_modelMatrix.rotate(g_angle04,0,1,0);

	g_modelMatrix.translate(g_posXtree, g_posYtree, 0.0);
	drawTree();

}

function setRobpos(){
	g_newposX = Math.random()*2-1;
	g_newposY = Math.random()*2-1; 
	g_posXrate = (g_newposX - g_posX)/100;
	g_posYrate = (g_newposY - g_posY)/100;
}
function drawTree(){
	//tree
    pushMatrix(g_modelMatrix);
		//trunk
		//pushMatrix(g_modelMatrix);
		g_modelMatrix.scale(1.7, 1, 1);
		drawLongtrunk();
			//tree1
			pushMatrix(g_modelMatrix);
			g_modelMatrix.translate(0, 0.525, 0.02);
			g_modelMatrix.scale(1.3, 1.3, 1.3);
			g_modelMatrix.rotate(g_angle03, 0, 0, 1);
			drawLeaves();
			g_modelMatrix = popMatrix();
		//g_modelMatrix = popMatrix();
			//branch1	
			g_modelMatrix.rotate(g_angle03, 0, 0, 1);
			pushMatrix(g_modelMatrix);
			    g_modelMatrix.translate(0.3, 0.2, 0.0);
				g_modelMatrix.rotate(-50, 0, 0, 1);
				//pushMatrix(g_modelMatrix);
				//g_modelMatrix.translate(0.14, -0.10, 0.0);
				//g_modelMatrix.scale(0.5, 0.7, 1.0);
				//g_modelMatrix.rotate(-50, 0, 0, 1);
				g_modelMatrix.translate(0, -0.45, 0.0);
				drawBranch();
				//g_modelMatrix = popMatrix();
					//tree2
					//pushMatrix(g_modelMatrix);				
					//g_modelMatrix.translate(0.35, 0.1, 0.5);
					//g_modelMatrix.rotate(-50, 0, 0, 1);
					g_modelMatrix.translate(0, 0.6, 0.02);
					drawLeaves();
					//g_modelMatrix = popMatrix();
			g_modelMatrix = popMatrix();
			//branch2	
			g_modelMatrix.rotate(g_angle03, 0, 0, 1);
			pushMatrix(g_modelMatrix);
			    //g_modelMatrix.translate(-0.05, -0.1, -0.02);
				pushMatrix(g_modelMatrix);
				g_modelMatrix.translate(-0.23, 0.1, 0);
				//g_modelMatrix.scale(0.5, 0.7, 1.0);
				g_modelMatrix.rotate(35, 0, 0, 1);
				g_modelMatrix.translate(0, -0.44, 0.0);
				drawBranch();
				//g_modelMatrix = popMatrix();
					//tree3
					//pushMatrix(g_modelMatrix);
					//g_modelMatrix.translate(-0.32, 0.35, 0.5);
					//g_modelMatrix.rotate(0, 0, 0, 1);
					//g_modelMatrix.scale(1, 1, 2);
					g_modelMatrix.translate(0, 0.6, 0.02);
					drawLeaves();
					g_modelMatrix = popMatrix();
			g_modelMatrix = popMatrix();
		g_modelMatrix = popMatrix();
	g_modelMatrix = popMatrix();
}

function drawBranch(){
	pushMatrix(g_modelMatrix);
	//g_modelMatrix.rotate(g_angle03, 0, 0, 1);
	drawTrunk2();
	g_modelMatrix.translate(0.0, 0.15, 0.0);
	g_modelMatrix.scale(0.8, 0.8, 1);
	//g_modelMatrix.rotate(g_angle03, 0, 0, 1);
	drawTrunk2();

	g_modelMatrix.translate(0.0, 0.15, 0.0);
	g_modelMatrix.scale(0.8, 1, 1);
	//g_modelMatrix.rotate(g_angle03, 0, 0, 1);
	drawTrunk2();
	//g_modelMatrix.rotate(35, 0, 0, 1);
	//g_modelMatrix.scale(1, 1, 2);
	//g_modelMatrix.translate(0, 0.1, 0);
	g_modelMatrix = popMatrix();
}
function drawLongtrunk(){
	g_modelMatrix.translate(0.0, -0.7, 0.0);
	g_modelMatrix.translate(0.0, -0.20, 0.0);
	g_modelMatrix.scale(0.8, 1, 1);
	g_modelMatrix.rotate(g_angle03, 0, 0, 1);
	drawTrunk();
    g_modelMatrix.translate(0.0, 0.20, 0.0);
	g_modelMatrix.scale(0.8, 1, 1);
	g_modelMatrix.rotate(g_angle03, 0, 0, 1);
	drawTrunk();
	g_modelMatrix.translate(0.0, 0.20, 0.0);
	g_modelMatrix.scale(0.8, 1, 1);
	g_modelMatrix.rotate(g_angle03, 0, 0, 1);
	drawTrunk();
}
function drawTrunk(){
	pushMatrix(g_modelMatrix); 
	g_modelMatrix.rotate(90, 0, 1, 0);
	g_modelMatrix.rotate(270, 1, 0, 0);
	g_modelMatrix.rotate(180, 1, 0, 0);
	g_modelMatrix.translate(0.0, 0.0, -0.23);
	g_modelMatrix.scale(0.04, 0.04, 0.1);
	//g_modelMatrix.rotate(g_angle03, 1, 0, 0);
	gl.uniformMatrix4fv(g_modelMatLoc, false, g_modelMatrix.elements);
	gl.drawArrays(gl.TRIANGLE_STRIP, cyl2Start / floatsPerVertex, cyl2Verts.length / floatsPerVertex);
	g_modelMatrix = popMatrix();
	
}

function drawTrunk2(){
	pushMatrix(g_modelMatrix); 
	g_modelMatrix.scale(0.5, 0.8, 1);
	g_modelMatrix.rotate(90, 0, 1, 0);
	g_modelMatrix.rotate(270, 1, 0, 0);
	g_modelMatrix.rotate(180, 1, 0, 0);
	g_modelMatrix.translate(0.0, 0.0, -0.23);
	g_modelMatrix.scale(0.04, 0.04, 0.1);
	//g_modelMatrix.rotate(g_angle03, 1, 0, 0);
	gl.uniformMatrix4fv(g_modelMatLoc, false, g_modelMatrix.elements);
	gl.drawArrays(gl.TRIANGLE_STRIP, cyl2Start / floatsPerVertex, cyl2Verts.length / floatsPerVertex);
	g_modelMatrix = popMatrix();
}

function drawLeaves(){
	pushMatrix(g_modelMatrix); 
	g_modelMatrix.scale(0.5,0.5,0.5);
	g_modelMatrix.rotate(45, 0, 0, 1);
	drawLeaf();
	g_modelMatrix.rotate(90, 0, 0, 1);
	drawLeaf();
	g_modelMatrix.rotate(90, 0, 0, 1);
	drawLeaf();
	g_modelMatrix.rotate(90, 0, 0, 1);
	drawLeaf();
	g_modelMatrix = popMatrix();
}

function drawRobot(){
	
	pushMatrix(g_modelMatrix); 			// SAVE them,
		// pushMatrix(g_modelMatrix);
		g_modelMatrix.translate(g_posX, g_posY, 0.0);
		//robot
		//head--------------------------
		g_modelMatrix.scale(0.7, 0.7, 0.7);	
			pushMatrix(g_modelMatrix); 			// SAVE them,
			// NEXT, create different drawing axes, and...
			g_modelMatrix.translate(0.0, 0.0, 0.0);  // 'set' means DISCARD old matrix,
			g_modelMatrix.scale(0.1, 0.1, 0.1);				// Make it smaller.
			gl.uniformMatrix4fv(g_modelMatLoc, false, g_modelMatrix.elements);
			// draw cube
			gl.drawArrays(gl.TRIANGLES, cubeStart / floatsPerVertex, cubeVerts.length / floatsPerVertex);
			g_modelMatrix = popMatrix();		// RESTORE them.
		//------------------------------

			//neck--------------------------
			pushMatrix(g_modelMatrix); 			// SAVE them,
			g_modelMatrix.translate(0.0, -0.13, 0.0);  // 'set' means DISCARD old matrix,
			g_modelMatrix.scale(0.03, 0.03, 0.03);				// Make it smaller.
			gl.uniformMatrix4fv(g_modelMatLoc, false, g_modelMatrix.elements);
			// draw cube
			gl.drawArrays(gl.TRIANGLES, cubeStart / floatsPerVertex, cubeVerts.length / floatsPerVertex);
			g_modelMatrix = popMatrix();		// RESTORE them.
			//----------------------------

			//body------------------------
			pushMatrix(g_modelMatrix); 			// SAVE them,
			g_modelMatrix.translate(0.0, -0.32, 0.0);
			g_modelMatrix.scale(0.18, 0.18, 0.09);	// Make it smaller.
			gl.uniformMatrix4fv(g_modelMatLoc, false, g_modelMatrix.elements);
			// draw cube
			gl.drawArrays(gl.TRIANGLES, cubeStart / floatsPerVertex, cubeVerts.length / floatsPerVertex);
			g_modelMatrix = popMatrix();		// RESTORE them.
			//----------------------------

			//left hand------------------------
			pushMatrix(g_modelMatrix); 			// SAVE them,
			g_modelMatrix.translate(0.23, -0.29, 0.0);
			g_modelMatrix.scale(0.06, 0.15, 0.09);	// Make it smaller.
			gl.uniformMatrix4fv(g_modelMatLoc, false, g_modelMatrix.elements);
			// draw cube
			gl.drawArrays(gl.TRIANGLES, cubeStart / floatsPerVertex, cubeVerts.length / floatsPerVertex);
			g_modelMatrix = popMatrix();		// RESTORE them.
			//----------------------------

			//hand hand------------------------
			pushMatrix(g_modelMatrix); 			// SAVE them,
			g_modelMatrix.translate(-0.23, -0.29, 0.0);
			g_modelMatrix.scale(0.06, 0.15, 0.09);	// Make it smaller.
			gl.uniformMatrix4fv(g_modelMatLoc, false, g_modelMatrix.elements);
			// draw cube
			gl.drawArrays(gl.TRIANGLES, cubeStart / floatsPerVertex, cubeVerts.length / floatsPerVertex);
			g_modelMatrix = popMatrix();		// RESTORE them.
			//----------------------------

			//left foot------------------------
			pushMatrix(g_modelMatrix); 			// SAVE them,
			g_modelMatrix.translate(-0.08, -0.6, 0.0);
			g_modelMatrix.scale(0.07, 0.18, 0.08);	// Make it smaller.
			gl.uniformMatrix4fv(g_modelMatLoc, false, g_modelMatrix.elements);
			// draw cube
			gl.drawArrays(gl.TRIANGLES, cubeStart / floatsPerVertex, cubeVerts.length / floatsPerVertex);
			g_modelMatrix = popMatrix();		// RESTORE them.
			//----------------------------

			//left foot------------------------
			pushMatrix(g_modelMatrix); 			// SAVE them,
			g_modelMatrix.translate(0.08, -0.6, 0.0);
			g_modelMatrix.scale(0.07, 0.18, 0.08);	// Make it smaller.
			gl.uniformMatrix4fv(g_modelMatLoc, false, g_modelMatrix.elements);
			// draw cube
			gl.drawArrays(gl.TRIANGLES, cubeStart / floatsPerVertex, cubeVerts.length / floatsPerVertex);
			g_modelMatrix = popMatrix();		// RESTORE them.
		//----------------------------
		// g_modelMatrix = popMatrix();		// RESTORE them.
		//----------------
		pushMatrix(g_modelMatrix);
		//cylinder
		pushMatrix(g_modelMatrix);
		g_modelMatrix.rotate(90, 0, 1, 0);
		g_modelMatrix.rotate(270, 1, 0, 0);
		g_modelMatrix.translate(0.0, 0.0, 0.1);
		g_modelMatrix.scale(0.01, 0.01, 0.1);
		gl.uniformMatrix4fv(g_modelMatLoc, false, g_modelMatrix.elements);
		gl.drawArrays(gl.TRIANGLE_STRIP, cylStart / floatsPerVertex, cylVerts.length / floatsPerVertex);
		g_modelMatrix = popMatrix();

		//bamboo-copter
		pushMatrix(g_modelMatrix);
		g_modelMatrix.translate(0.0, 0.2, 0.0);
		g_modelMatrix.scale(0.2, 0.2, 0.2);
		g_modelMatrix.rotate(g_angle01, 0, 1, 0);
		gl.uniformMatrix4fv(g_modelMatLoc, false, g_modelMatrix.elements);
		gl.drawArrays(gl.TRIANGLES, bambooStart / floatsPerVertex, bambooVerts.length / floatsPerVertex);
		g_modelMatrix = popMatrix();

		pushMatrix(g_modelMatrix);
		g_modelMatrix.scale(0.2, 0.12, 0.2);
		g_modelMatrix.translate(0.0,-1.5,-0.4)
		drawCloak();
		g_modelMatrix.translate(0.0,-1,0.0)
		drawCloak();
		g_modelMatrix.translate(0.0,-1,0.0)
		drawCloak();
		g_modelMatrix.translate(0.0,-1,0.0)
		drawCloak();
		g_modelMatrix = popMatrix();
		g_modelMatrix = popMatrix();
}

function drawCloak(){
	g_modelMatrix.rotate(g_angle02, 1, 0, 0);
	gl.uniformMatrix4fv(g_modelMatLoc, false, g_modelMatrix.elements);
	gl.drawArrays(gl.TRIANGLES, cloakStart / floatsPerVertex, cloakVerts.length / floatsPerVertex);
}

function drawLeaf(){
	//g_modelMatrix.translate(0.5,0.5,0);
	//g_modelMatrix.scale(0.1,0.1,0.1);
	//g_modelMatrix.rotate(g_angle02, 1, 0, 0);
	gl.uniformMatrix4fv(g_modelMatLoc, false, g_modelMatrix.elements);
	gl.drawArrays(gl.TRIANGLES, leafStart / floatsPerVertex, leafVerts.length / floatsPerVertex);
}

// Last time that this function was called:  (used for animation timing)
var g_last = Date.now();

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

	g_angle01 = g_angle01 + (g_angle01Rate * elapsed) / 1000.0;
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

	// g_angle04 = g_angle04 + (g_angle04Rate * elapsed) / 1000.0;
	// if (g_angle04 > 180.0) g_angle04 = g_angle04 - 360.0;
	// if (g_angle04 < -180.0) g_angle04 = g_angle04 + 360.0;

	// if (g_angle04 > 1.0 && g_angle04Rate > 0) g_angle04Rate *= -1.0;
	// if (g_angle04 < -1.0 && g_angle04Rate < 0) g_angle04Rate *= -1.0;

	g_posX += g_posXrate;
	g_posY += g_posYrate;
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

	var topColr = new Float32Array([0.8, 0.8, 0.0]);	// light yellow top,
	var walColr = new Float32Array([0.2, 0.6, 0.2]);	// dark green walls,
	var botColr = new Float32Array([0.2, 0.3, 0.7]);	// light blue bottom,
	var ctrColr = new Float32Array([0.1, 0.1, 0.1]); // near black end-cap centers,
	var errColr = new Float32Array([1.0, 0.2, 0.2]);	// Bright-red trouble color.

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
			cylVerts[j + 4] = botColr[0];
			cylVerts[j + 5] = botColr[1];
			cylVerts[j + 6] = botColr[2];
		}
		else {	// put odd# vertices at center of cylinder's bottom cap:
			cylVerts[j] = 0.0; 			// x,y,z,w == 0,0,-1,1; centered on z axis at -1.
			cylVerts[j + 1] = 0.0;
			cylVerts[j + 2] = -1.0;
			cylVerts[j + 3] = 1.0;			// r,g,b = ctrColr[]
			cylVerts[j + 4] = ctrColr[0];
			cylVerts[j + 5] = ctrColr[1];
			cylVerts[j + 6] = ctrColr[2];
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
			cylVerts[j + 4] = walColr[0];
			cylVerts[j + 5] = walColr[1];
			cylVerts[j + 6] = walColr[2];
			if (v == 0) {		// UGLY TROUBLESOME vertex--shares its 1 color with THREE
				// triangles; 1 in cap, 1 in step, 1 in wall.
				cylVerts[j + 4] = errColr[0];
				cylVerts[j + 5] = errColr[1];
				cylVerts[j + 6] = errColr[2];		// (make it red; see lecture notes)
			}
		}
		else		// position all odd# vertices along the top cap (not yet created)
		{
			cylVerts[j] = topRadius * Math.cos(Math.PI * (v - 1) / capVerts);		// x
			cylVerts[j + 1] = topRadius * Math.sin(Math.PI * (v - 1) / capVerts);		// y
			cylVerts[j + 2] = 1.0;	// == z TOP cap,
			cylVerts[j + 3] = 1.0;	// w.
			// r,g,b = walColr;
			cylVerts[j + 4] = walColr[0];
			cylVerts[j + 5] = walColr[1];
			cylVerts[j + 6] = walColr[2];
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
			cylVerts[j + 4] = topColr[0];
			cylVerts[j + 5] = topColr[1];
			cylVerts[j + 6] = topColr[2];
			if (v == 0) {	// UGLY TROUBLESOME vertex--shares its 1 color with THREE
				// triangles; 1 in cap, 1 in step, 1 in wall.
				cylVerts[j + 4] = errColr[0];
				cylVerts[j + 5] = errColr[1];
				cylVerts[j + 6] = errColr[2];		// (make it red; see lecture notes)
			}
		}
		else {				// position odd#'d vertices at center of the top cap:
			cylVerts[j] = 0.0; 			// x,y,z,w == 0,0,-1,1
			cylVerts[j + 1] = 0.0;
			cylVerts[j + 2] = 1.0;
			cylVerts[j + 3] = 1.0;
			// r,g,b = topColr[]
			cylVerts[j + 4] = ctrColr[0];
			cylVerts[j + 5] = ctrColr[1];
			cylVerts[j + 6] = ctrColr[2];
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
			cyl2Verts[j + 4] = Math.random();
			cyl2Verts[j + 5] = Math.random();
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
//==================HTML Button Callbacks======================


function angleSubmit() {
	// Called when user presses 'Submit' button on our webpage
	//		HOW? Look in HTML file (e.g. ControlMulti.html) to find
	//	the HTML 'input' element with id='usrAngle'.  Within that
	//	element you'll find a 'button' element that calls this fcn.

	// Read HTML edit-box contents:
	var UsrTxt = document.getElementById('usrAngle').value;
	// Display what we read from the edit-box: use it to fill up
	// the HTML 'div' element with id='editBoxOut':
	document.getElementById('EditBoxOut').innerHTML = 'You Typed: ' + UsrTxt;
	console.log('angleSubmit: UsrTxt:', UsrTxt); // print in console, and
	g_angle04 = parseFloat(UsrTxt);     // convert string to float number 
};

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

//===================Mouse and Keyboard event-handling Callbacks

function myMouseDown(ev) {
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
	var x = (xp - g_canvas.width / 2) / 		// move origin to center of canvas and
		(g_canvas.width / 2);			// normalize canvas to -1 <= x < +1,
	var y = (yp - g_canvas.height / 2) /		//										 -1 <= y < +1.
		(g_canvas.height / 2);
	//	console.log('myMouseDown(CVV coords  ):  x, y=\t',x,',\t',y);

	g_isDrag = true;											// set our mouse-dragging flag
	g_xMclik = x;													// record where mouse-dragging began
	g_yMclik = y;
	// report on webpage
	document.getElementById('MouseAtResult').innerHTML =
		'Mouse At: ' + x.toFixed(g_digits) + ', ' + y.toFixed(g_digits);
};


function myMouseMove(ev) {
	//==============================================================================
	// Called when user MOVES the mouse with a button already pressed down.
	// 									(Which button?   console.log('ev.button='+ev.button);    )
	// 		ev.clientX, ev.clientY == mouse pointer location, but measured in webpage 
	//		pixels: left-handed coords; UPPER left origin; Y increases DOWNWARDS (!)  

	if (g_isDrag == false) return;				// IGNORE all mouse-moves except 'dragging'

	// Create right-handed 'pixel' coords with origin at WebGL canvas LOWER left;
	var rect = ev.target.getBoundingClientRect();	// get canvas corners in pixels
	var xp = ev.clientX - rect.left;									// x==0 at canvas left edge
	var yp = g_canvas.height - (ev.clientY - rect.top);	// y==0 at canvas bottom edge
	//  console.log('myMouseMove(pixel coords): xp,yp=\t',xp,',\t',yp);

	// Convert to Canonical View Volume (CVV) coordinates too:
	var x = (xp - g_canvas.width / 2) / 		// move origin to center of canvas and
		(g_canvas.width / 2);		// normalize canvas to -1 <= x < +1,
	var y = (yp - g_canvas.height / 2) /		//									-1 <= y < +1.
		(g_canvas.height / 2);
	//	console.log('myMouseMove(CVV coords  ):  x, y=\t',x,',\t',y);

	// find how far we dragged the mouse:
	g_xMdragTot += (x - g_xMclik);			// Accumulate change-in-mouse-position,&
	g_yMdragTot += (y - g_yMclik);
	// Report new mouse position & how far we moved on webpage:
	document.getElementById('MouseAtResult').innerHTML =
		'Mouse At: ' + x.toFixed(g_digits) + ', ' + y.toFixed(g_digits);
	document.getElementById('MouseDragResult').innerHTML =
		'Mouse Drag: ' + (x - g_xMclik).toFixed(g_digits) + ', '
		+ (y - g_yMclik).toFixed(g_digits);

	g_xMclik = x;											// Make next drag-measurement from here.
	g_yMclik = y;
};

function myMouseUp(ev) {
	//==============================================================================
	// Called when user RELEASES mouse button pressed previously.
	// 									(Which button?   console.log('ev.button='+ev.button);    )
	// 		ev.clientX, ev.clientY == mouse pointer location, but measured in webpage 
	//		pixels: left-handed coords; UPPER left origin; Y increases DOWNWARDS (!)  

	// Create right-handed 'pixel' coords with origin at WebGL canvas LOWER left;
	var rect = ev.target.getBoundingClientRect();	// get canvas corners in pixels
	var xp = ev.clientX - rect.left;									// x==0 at canvas left edge
	var yp = g_canvas.height - (ev.clientY - rect.top);	// y==0 at canvas bottom edge
	//  console.log('myMouseUp  (pixel coords):\n\t xp,yp=\t',xp,',\t',yp);

	// Convert to Canonical View Volume (CVV) coordinates too:
	var x = (xp - g_canvas.width / 2) / 		// move origin to center of canvas and
		(g_canvas.width / 2);			// normalize canvas to -1 <= x < +1,
	var y = (yp - g_canvas.height / 2) /		//										 -1 <= y < +1.
		(g_canvas.height / 2);
	console.log('myMouseUp  (CVV coords  ):\n\t x, y=\t', x, ',\t', y);

	g_isDrag = false;											// CLEAR our mouse-dragging flag, and
	// accumulate any final bit of mouse-dragging we did:
	g_xMdragTot += (x - g_xMclik);
	g_yMdragTot += (y - g_yMclik);
	// Report new mouse position:
	document.getElementById('MouseAtResult').innerHTML =
		'Mouse At: ' + x.toFixed(g_digits) + ', ' + y.toFixed(g_digits);
	console.log('myMouseUp: g_xMdragTot,g_yMdragTot =',
		g_xMdragTot.toFixed(g_digits), ',\t', g_yMdragTot.toFixed(g_digits));
};

function myMouseClick(ev) {
	//=============================================================================
	// Called when user completes a mouse-button single-click event 
	// (e.g. mouse-button pressed down, then released)
	// 									   
	//    WHICH button? try:  console.log('ev.button='+ev.button); 
	// 		ev.clientX, ev.clientY == mouse pointer location, but measured in webpage 
	//		pixels: left-handed coords; UPPER left origin; Y increases DOWNWARDS (!) 
	//    See myMouseUp(), myMouseDown() for conversions to  CVV coordinates.

	// STUB
	console.log("myMouseClick() on button: ", ev.button);
}

function myMouseDblClick(ev) {
	//=============================================================================
	// Called when user completes a mouse-button double-click event 
	// 									   
	//    WHICH button? try:  console.log('ev.button='+ev.button); 
	// 		ev.clientX, ev.clientY == mouse pointer location, but measured in webpage 
	//		pixels: left-handed coords; UPPER left origin; Y increases DOWNWARDS (!) 
	//    See myMouseUp(), myMouseDown() for conversions to  CVV coordinates.

	// STUB
	console.log("myMouse-DOUBLE-Click() on button: ", ev.button);
}

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
		//------------------WASD navigation-----------------
		case "KeyA":
			console.log("a/A key: Strafe LEFT!\n");
			document.getElementById('KeyDownResult').innerHTML =
				'myKeyDown() found a/A key. Strafe LEFT!';
			g_posXtree -= 0.01;
			break;
		case "KeyD":
			console.log("d/D key: Strafe RIGHT!\n");
			document.getElementById('KeyDownResult').innerHTML =
				'myKeyDown() found d/D key. Strafe RIGHT!';
			g_posXtree += 0.01;
			break;
		case "KeyS":
			console.log("s/S key: Move BACK!\n");
			document.getElementById('KeyDownResult').innerHTML =
				'myKeyDown() found s/Sa key. Move BACK.';
			g_posYtree -= 0.01
			break;
		case "KeyW":
			console.log("w/W key: Move FWD!\n");
			document.getElementById('KeyDownResult').innerHTML =
				'myKeyDown() found w/W key. Move FWD!';
			g_posYtree += 0.01;
			break;
		//----------------Arrow keys------------------------
		case "ArrowLeft":
			console.log(' left-arrow.');
			// and print on webpage in the <div> element with id='Result':
			document.getElementById('KeyDownResult').innerHTML =
				'myKeyDown(): Left Arrow=' + kev.keyCode;
			break;
		case "ArrowRight":
			console.log('right-arrow.');
			document.getElementById('KeyDownResult').innerHTML =
				'myKeyDown():Right Arrow:keyCode=' + kev.keyCode;
			break;
		case "ArrowUp":
			console.log('   up-arrow.');
			document.getElementById('KeyDownResult').innerHTML =
				'myKeyDown():   Up Arrow:keyCode=' + kev.keyCode;
			g_angle01Rate += 25;
			break;
		case "ArrowDown":
			console.log(' down-arrow.');
			document.getElementById('KeyDownResult').innerHTML =
				'myKeyDown(): Down Arrow:keyCode=' + kev.keyCode;
			g_angle01Rate -= 25;
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
