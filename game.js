var gl;

function initWebGLContext(aname) {
  gl = null;
  var canvas = document.getElementById(aname);
  try {
    // Try to grab the standard context. If it fails, fallback to experimental.
    gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
  }
  catch(e) {}
  
  // If we don't have a GL context, give up now
  if (!gl) {
    alert("Unable to initialize WebGL. Your browser may not support it.");
    gl = null;
  }
  gl.viewportWidth = canvas.width;
  gl.viewportHeight = canvas.height;
  return gl;
}
// define the function to initial WebGL and Setup Geometry Objects
function initGLScene()
{
    // Initialize the WebGL Context - the gl engine for drawing things.
    var gl = initWebGLContext("graphicsCanvas"); // The id of the Canvas Element
        if (!gl) // if fails simply return
     {
          return;
     }
     // succeeded in initializing WebGL system
     return gl;     
}


function getShader(gl, id) 
{
	var shaderScript = document.getElementById(id);
	if (!shaderScript) {
		return null;
	}

	var str = "";
	var k = shaderScript.firstChild;
	while (k) {
		if (k.nodeType == 3) {
			str += k.textContent;
		}
		k = k.nextSibling;
	}

	var shader;
	if (shaderScript.type == "x-shader/x-fragment") {
		shader = gl.createShader(gl.FRAGMENT_SHADER);
	} else if (shaderScript.type == "x-shader/x-vertex") {
		shader = gl.createShader(gl.VERTEX_SHADER);
	} else {
		return null;
	}

	gl.shaderSource(shader, str);
	gl.compileShader(shader);

	if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
		alert(gl.getShaderInfoLog(shader));
		return null;
	}

	return shader;
}


var shaderProgram;

function initShaders() 
{
	
	var fragmentShader = getShader(gl, "shader-fs");
	var vertexShader = getShader(gl, "shader-vs");

	shaderProgram = gl.createProgram();
	gl.attachShader(shaderProgram, vertexShader);
	gl.attachShader(shaderProgram, fragmentShader);
	gl.linkProgram(shaderProgram);

	if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
		alert("Could not initialise shaders");
	}

	gl.useProgram(shaderProgram);

	shaderProgram.vertexPositionAttribute = gl.getAttribLocation(shaderProgram, "aVertexPosition");		
	gl.enableVertexAttribArray(shaderProgram.vertexPositionAttribute);
	
	shaderProgram.vertexNormalAttribute = gl.getAttribLocation(shaderProgram, "aVertexNormal");
	gl.enableVertexAttribArray(shaderProgram.vertexNormalAttribute);
	
	shaderProgram.textureCoordAttribute = gl.getAttribLocation(shaderProgram, "aTextureCoord");
	gl.enableVertexAttribArray(shaderProgram.textureCoordAttribute);

	shaderProgram.pMatrixUniform = gl.getUniformLocation(shaderProgram, "uPMatrix");
	shaderProgram.mvMatrixUniform = gl.getUniformLocation(shaderProgram, "uMVMatrix");
	shaderProgram.nMatrixUniform = gl.getUniformLocation(shaderProgram, "uNMatrix");
	shaderProgram.samplerUniform = gl.getUniformLocation(shaderProgram, "uSampler");
	shaderProgram.ambientColorUniform = gl.getUniformLocation(shaderProgram, "uAmbientColor");
	shaderProgram.lightingDirectionUniform = gl.getUniformLocation(shaderProgram, "uLightingDirection");
	shaderProgram.directionalColorUniform = gl.getUniformLocation(shaderProgram, "uDirectionalColor");
}



// create our basic model and view matrix
var mvMatrix = mat4.create();
var mvMatrixStack = [];
// create our projection matrix for projecting from 3D to 2D.
var pMatrix = mat4.create();

function mvPushMatrix() 
{
	var copy = mat4.create();
	mat4.set(mvMatrix, copy);
	mvMatrixStack.push(copy);
}

function mvPopMatrix() 
{
	if (mvMatrixStack.length == 0) 
	{
		throw "Invalid popMatrix!";
	}
	mvMatrix = mvMatrixStack.pop();
}

function setMatrixUniforms()
{
    gl.uniformMatrix4fv(shaderProgram.pMatrixUniform, false, pMatrix);
    gl.uniformMatrix4fv(shaderProgram.mvMatrixUniform, false, mvMatrix);
	
	var normalMatrix = mat3.create();
	mat4.toInverseMat3(mvMatrix, normalMatrix);
	mat3.transpose(normalMatrix);
	gl.uniformMatrix3fv(shaderProgram.nMatrixUniform, false, normalMatrix);
}


// create and initialize our geometry objects
var gridPointPositionBuffer;
var gridPointTextureCoordBuffer;
var gridPointIndexBuffer;
var gridPointNormalBuffer;

function initGeometry()
{
	//create the vertices and give them normals		
	var vertices = [];
	var vertexNormals = [];
	
	let gridSize = 100; //the size of the point grid
	var arrayOffset = 0; //the current offset into the arrays
	
	for (i = 0; i < gridSize; i++)
	{
		for (j = 0; j < gridSize; j++)
		{
			//in order to index properly into the array, we need to compensate for the offset
			vertices[0 + arrayOffset] = ((j * 1.0) / (gridSize / 2)) - 1.0; //vary X values from -1.0 to 1.0
			vertices[1 + arrayOffset] = (Math.random() * 2) - 1.0; //set Y value to random number between -1.0 and 1.0
			vertices[2 + arrayOffset] = ((i * 1.0) / (gridSize / 2)) - 1.0; //vary Z values from -1.0 to 1.0
			
			//normal for each vertex for lighting using the Y coordinate as a simple vector [0,Y,0]
			vertexNormals[0 + arrayOffset] = 0.0;
			vertexNormals[1 + arrayOffset] = vertices[1 + arrayOffset];
			vertexNormals[2 + arrayOffset] = 0.0;
			
			arrayOffset = arrayOffset + 3;
		}
	}
	
	gridPointPositionBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, gridPointPositionBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
	gridPointPositionBuffer.itemSize = 3;
	gridPointPositionBuffer.numItems = gridSize * gridSize;
	
	gridPointNormalBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, gridPointNormalBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertexNormals), gl.STATIC_DRAW);
	gridPointNormalBuffer.itemSize = 3;
	gridPointNormalBuffer.numItems = gridSize * gridSize;	
	
	
	//give the vertices texture coordinates		
	var textureCoords = []; //texture coordinate array
	var texCoordOffset = 0; //offset into the texture coordinate array
	
	for (i = 0; i < gridSize; i++)
	{
		for (j = 0; j < gridSize; j++)
		{
			textureCoords[texCoordOffset++] = 0.0 + (j * 1.0) / gridSize;
			textureCoords[texCoordOffset++] = 0.0 + (i * 1.0) / gridSize;
		}
	}

	gridPointTextureCoordBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, gridPointTextureCoordBuffer);	
	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(textureCoords), gl.STATIC_DRAW);
	gridPointTextureCoordBuffer.itemSize = 2;
	gridPointTextureCoordBuffer.numItems = texCoordOffset / 2;
	
	
	//index for triangles		
	var gridPointIndices = [];
	var pointIndicesOffset = 0;
	
	for (i = 0; i < gridSize - 1; i++)
	{
		for (j = 0; j < gridSize - 1; j++)
		{
			//create the triangles for each quad of the grid
			gridPointIndices[pointIndicesOffset++] = (i * 100) + j + 0; //bot-left lower triangle
			gridPointIndices[pointIndicesOffset++] = (i * 100) + j + 1; //bot-right lower triangle
			gridPointIndices[pointIndicesOffset++] = ((i + 1) * 100) + j + 0; //top-left lower triangle
			
			gridPointIndices[pointIndicesOffset++] = ((i + 1) * 100) + j + 0; //top-left upper triangle
			gridPointIndices[pointIndicesOffset++] = (i * 100) + j + 1; //bot-right upper triangle
			gridPointIndices[pointIndicesOffset++] = ((i + 1) * 100) + j + 1; //top-right upper triangle
			
		}
	}

	gridPointIndexBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gridPointIndexBuffer);
	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(gridPointIndices), gl.STATIC_DRAW);
	gridPointIndexBuffer.itemSize = 1;
	gridPointIndexBuffer.numItems = pointIndicesOffset;
}


// Initialize our texture data and prepare it for rendering
var exTexture;
var pixelColors;

function initTextures()
{
    exTexture = gl.createTexture();
    exTexture.image = new Image();
    exTexture.image.onload = function() {
      handleLoadedTexture(exTexture)
    }

    exTexture.image.src = "Textures/heightmap.png";
  }

function handleLoadedTexture(texture)
{
	gl.bindTexture(gl.TEXTURE_2D, texture);
	gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
	gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, texture.image);

	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
	gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
	gl.bindTexture(gl.TEXTURE_2D, null);

	// allocate the array for holding the RGBA pixel data
	var width = texture.image.width;
	var height = texture.image.height;
	pixelColors = new Uint8Array(4 * width * height);

	// here we use a framebuffer as an offscreen render object
	// draw the texture into it and then copy the pixel values into a local array.
	var framebuffer = gl.createFramebuffer();
	gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
	gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
	if (gl.checkFramebufferStatus(gl.FRAMEBUFFER) == gl.FRAMEBUFFER_COMPLETE) {
		 gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixelColors);
	}

	// unbind this framebuffer so its memory can be reclaimed.
	gl.bindFramebuffer(gl.FRAMEBUFFER, null);

}
  
function changeTexture(texture)
{
	exTexture.image.src = texture;
	handleLoadedTexture(exTexture);
}
  
  
  
//Initialize everything for starting up a simple webGL application
function launchGraphics()
{
   // attach 'Handler' functions to handle events generated by the canvas.
   // for when the browser is resized or closed.

   // first initialize webgl components 
   var gl = initGLScene();
   
   // now build basic geometry objects.
   initShaders();
   initGeometry();
   initTextures();
   
   var canvas = document.getElementById("graphicsCanvas");
   canvas.onmousedown = handleMouseDown;
   document.onmouseup = handleMouseUp;
   document.onmousemove = handleMouseMove;
   
   gl.clearColor(0.1,0.1,0.1,1.0);
   gl.enable(gl.DEPTH_TEST);
   // Draw the Scene
   Frames();
   // If doing an animation need to add code to rotate our geometry
   
}

var currMouseX = 0.0;
var currMouseY = 0.0;
var rotateScaleFactor = 3; 
var mouseDown = false;

var tankSpeed = 0; //speed of the tank over terrain
var speedScaleFactor = 100000; //division factor to reduce drastic speed changes from small mouse movements
var tankPos = vec3.create([0,0.5,0]); //tank position: 0,0,0
var viewDirection = vec3.create([0,0,-1]); //direction the tank is looking, default to straight at the z axis
var viewMatrix = mat4.create();
mat4.identity(viewMatrix);
var tankAngle = 0.0; //angle the tank is facing, degrees off of the y-axis
var tankRotationScaleFactor = 5; //division factor to reduce drastic tank directions from small mouse movements
var tankUpVector = vec3.create([0,1,0]);
var target = vec3.create();
var rotationMatrix = mat4.create();
mat4.identity(rotationMatrix);

function getViewMatrix()
{
	setViewDirection(); //get the rotational direction of the tank
	//console.log("viewDirection: " + viewDirection);
	tankPos = getTankPos();
	//console.log("tankpos: " + tankPos);
	target = getTarget();
	//console.log("target: " + target);
	tankUpVector = getUpVector();
	//console.log("tankupvector: " + tankUpVector);
	
	//now generate the view matrix
	mat4.identity(mvMatrix);
	mat4.lookAt(tankPos, target, tankUpVector, mvMatrix);
}

function setViewDirection()
{
	viewDirection = mat4.multiplyVec3(rotationMatrix, vec3.create([0,0,-1]), viewDirection);
	vec3.normalize(viewDirection, viewDirection);
}

function getTankPos()
{
	var newTankPosOffset = vec3.create(); //distance to the new pos
	var newTankPos = vec3.create(); //the new pos
	vec3.scale(viewDirection, tankSpeed, newTankPosOffset); //multiply the direction by the speed to get the offset distance
	vec3.add(tankPos, newTankPosOffset, newTankPos); //add the offset to the current position to get the new one
	
	newTankPos[1] = getPixelHeight(newTankPos[0], newTankPos[2]); //set the tank's height based on the terrain, add a little bit to be above the terrain
	
	//handle out of bounds driving by resetting location to 0,0
	var newX = newTankPos[0];
	var newY = newTankPos[1];
	var newZ = newTankPos[2];
	if (newX > 1.0 || newX < -1.0 || newZ > 1.0 || newZ < -1.0) //tank is out of bounds
	{
		newTankPos = vec3.create([0, getPixelHeight(0,0), 0]);
	}	
	
	return newTankPos;
}

function getPixelHeight(x, z)
{
	var pixelHeight = 0.5;
	
	if (pixelColors)
	{	
		var pixelArrayOffset = 0;
		var xOffset = Math.round(((x + 1.0) / 2) * exTexture.image.width);
		var yOffset = Math.round(((z + 1.0) / 2) * exTexture.image.height);
		//console.log("xOffset: " + xOffset + " yOffset: " + yOffset);
	
		pixelArrayOffset = (yOffset * exTexture.image.width * 4) + (4 * xOffset);
		
		var red = pixelColors[pixelArrayOffset + 0] / 255.0;
		var green = pixelColors[pixelArrayOffset + 1] / 255.0;
		var blue = pixelColors[pixelArrayOffset + 2] / 255.0;
		
		pixelHeight = Math.sqrt(red * red + green * green + blue * blue); //height is between 0 and sqrt(3)
		pixelHeight	= (pixelHeight * (2 / Math.sqrt(3))) - 1.0; //scale to -1 to 1
		pixelHeight = pixelHeight + 0.15;
		//console.log(pixelHeight);
	}
	
	return pixelHeight;
}

function getTarget()
{
	
	var targetDistance = 0.1; //the distance to the target
	var newTargetOffset = vec3.create(); //the offset to the next point (vector of offsets)
	var newTarget = vec3.create(); //the target point
	
	vec3.scale(viewDirection, targetDistance, newTargetOffset); //scale the viewDirection to the size of a pixel to find the target offset
	vec3.add(tankPos, newTargetOffset, newTarget); //add the offset to the current location to find the target

	newTarget[1] = getPixelHeight(newTarget[0], newTarget[2]); //make sure the y value of the new point is correct
	
	
	return newTarget;
}

function getUpVector()
{
	var newNormal = vec3.create([0,1,0]);
		
	//make a triangle out of the current position, and one pixel higher in the x-axis, and one pixel higher in the z-axis
	var tankX = tankPos[0];
	var tankY = tankPos[1]; 
	var tankZ = tankPos[2]; 
	var onePixel = 0.1; //2 / exTexture.image.width; //one pixel distance (causes strange things)
	//console.log("onePixel: " + onePixel);
	
	
	var point1 = vec3.create([tankX, tankY, tankZ]);
	var point2 = vec3.create([tankX + onePixel, getPixelHeight(tankX + onePixel, tankZ), tankZ]);
	var point3 = vec3.create([tankX, getPixelHeight(tankX, tankZ + onePixel), tankZ + onePixel]);
	
	var pt1 = vec3.create([toInt(point1[0]), toInt(point1[1]), toInt(point1[2])]);
	var pt2 = vec3.create([toInt(point2[0]), toInt(point2[1]), toInt(point2[2])]);
	var pt3 = vec3.create([toInt(point3[0]), toInt(point3[1]), toInt(point3[2])]);
	//console.log("point1: " + pt1 + " point2: " + pt2 + " point3: " + pt3);
	
	generateNormal(pt1, pt2, pt3, newNormal);
	vec3.normalize(newNormal, newNormal);
	//console.log("newNormal: " + newNormal);
		
	return newNormal;
}

function toInt(num)
{
	return Math.round((num / 2) * exTexture.image.width);
}

function generateNormal(pt1, pt2, pt3, out)
{
	var V = vec3.create();
	var W = vec3.create();
	//console.log("pt1: " + pt1);
	//console.log("pt2: " + pt2);
	//console.log("pt3: " + pt3);
	vec3.subtract(pt2,pt1,V); //V = pt2 - pt1
	//console.log("V: " + V);
	vec3.subtract(pt3, pt1, W); //W = pt3 - pt1
	//console.log("W: " + W);
	
	vec3.cross(V,W,out); //normal is cross product of V and W	
	vec3.negate(out, out); //negate the vector so it isnt upside down
	vec3.normalize(out, out);
	
	return out;
}



function handleMouseDown()
{
	mouseDown = true;
	currMouseX = event.clientX;
	currMouseY = event.clientY;
	
}

function handleMouseUp()
{
	mouseDown = false;
}

function handleMouseMove()
{
	if (!mouseDown)
	{
		return;
	}
	
	var newMouseX = event.clientX;
	var newMouseY = event.clientY;
	
	var newRotationMatrix = mat4.create();
	mat4.identity(newRotationMatrix);
	
	//set the rotation of the view direction
	var deltaX = newMouseX - currMouseX; //record the change in x
	tankAngle = -(deltaX / tankRotationScaleFactor); //scale the change in x in pixels to get a relative angle to rotate
	mat4.rotate(newRotationMatrix, degToRad(tankAngle), vec3.create([0,1,0])); //create a new rotation matrix using the angle and the tank's up vector
	mat4.multiply(newRotationMatrix, rotationMatrix, rotationMatrix); //multiply the existing rotation matrix by the new one
	
	var deltaY = newMouseY - currMouseY;
	tankSpeed -= deltaY / speedScaleFactor;
	//console.log("speed: " + tankSpeed);
	
	currMouseX = newMouseX;
	currMouseY = newMouseY;
}

function degToRad(deg) 
{
    return deg * Math.PI / 180;
}

// This function draws a basic webGL scene
// first it clears the framebuffer.
// then we define our View positions for our camera using WebGL matrices.
// OpenGL has convenience methods for this such as glPerspective().
// finally we call the gl draw methods to draw our defined geometry objects.

var zoomLevel = -5.0;

function changeZoom(newZoom)
{
	zoomLevel = newZoom;
}
    
function drawScene() {
	gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

	mat4.perspective(45, gl.viewportWidth / gl.viewportHeight, 0.1, 100.0, pMatrix);
	
	getViewMatrix();
	
	//mat4.translate(mvMatrix, [0.0, 0.0, zoomLevel]);
	//console.log(mvMatrix);
	
	gl.bindBuffer(gl.ARRAY_BUFFER, gridPointPositionBuffer);
	gl.vertexAttribPointer(shaderProgram.vertexPositionAttribute, gridPointPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);

	gl.bindBuffer(gl.ARRAY_BUFFER, gridPointTextureCoordBuffer);
	gl.vertexAttribPointer(shaderProgram.textureCoordAttribute, gridPointTextureCoordBuffer.itemSize, gl.FLOAT, false, 0, 0);
	
	gl.bindBuffer(gl.ARRAY_BUFFER, gridPointNormalBuffer);
	gl.vertexAttribPointer(shaderProgram.vertexNormalAttribute, gridPointNormalBuffer.itemSize, gl.FLOAT, false, 0, 0);

	gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_2D, exTexture);
	gl.uniform1i(shaderProgram.samplerUniform, 0);

	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gridPointIndexBuffer);
	setMatrixUniforms();
	gl.drawElements(gl.TRIANGLES, gridPointIndexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
	
	//lighting code
	var ambientR = parseFloat(document.getElementById("ambientR").value);
	var ambientG = parseFloat(document.getElementById("ambientG").value);
	var ambientB = parseFloat(document.getElementById("ambientB").value);
	
	var lightDirectionX = parseFloat(document.getElementById("lightDirectionX").value);
	var lightDirectionY = parseFloat(document.getElementById("lightDirectionY").value);
	var lightDirectionZ = parseFloat(document.getElementById("lightDirectionZ").value);
	
	var directionalR = parseFloat(document.getElementById("directionalR").value);
	var directionalG = parseFloat(document.getElementById("directionalG").value);
	var directionalB = parseFloat(document.getElementById("directionalB").value);
	
	var lightingDirection = [lightDirectionX, lightDirectionY, lightDirectionZ];
	var adjustedLightingDirection = vec3.create();
	
	vec3.normalize(lightingDirection, adjustedLightingDirection);
	vec3.scale(adjustedLightingDirection, -1);
	gl.uniform3f(shaderProgram.ambientColorUniform, ambientR, ambientG, ambientB);
	gl.uniform3fv(shaderProgram.lightingDirectionUniform, adjustedLightingDirection);
	
	gl.uniform3f(shaderProgram.directionalColorUniform, directionalR, directionalG, directionalB);
	
}	


function Frames() {
	requestAnimFrame(Frames);
	drawScene();
}

