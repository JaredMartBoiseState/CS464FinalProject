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


var trackShader;
var playerModelShader;

function initShaders() 
{
	initTrackShader();
	initPlayerModelShader();

}

function initPlayerModelShader()
{
	var fragmentShader = getShader(gl, "shader-playerModelFS");
	var vertexShader = getShader(gl, "shader-playerModelVS");

	playerModelShader = gl.createProgram();
	gl.attachShader(playerModelShader, vertexShader);
	gl.attachShader(playerModelShader, fragmentShader);
	gl.linkProgram(playerModelShader);

	if (!gl.getProgramParameter(playerModelShader, gl.LINK_STATUS)) {
		alert("Could not initialise shaders");
	}

	playerModelShader.vertexPositionAttribute = gl.getAttribLocation(playerModelShader, "aVertexPosition");		
	gl.enableVertexAttribArray(playerModelShader.vertexPositionAttribute);
	
	playerModelShader.vertexColorAttribute = gl.getAttribLocation(playerModelShader, "aVertexColor");
	gl.enableVertexAttribArray(playerModelShader.vertexColorAttribute);

	playerModelShader.pMatrixUniform = gl.getUniformLocation(playerModelShader, "uPMatrix");
	playerModelShader.mvMatrixUniform = gl.getUniformLocation(playerModelShader, "uMVMatrix");
}

function initTrackShader()
{
	var fragmentShader = getShader(gl, "shader-fs");
	var vertexShader = getShader(gl, "shader-vs");

	trackShader = gl.createProgram();
	gl.attachShader(trackShader, vertexShader);
	gl.attachShader(trackShader, fragmentShader);
	gl.linkProgram(trackShader);

	if (!gl.getProgramParameter(trackShader, gl.LINK_STATUS)) {
		alert("Could not initialise shaders");
	}

	trackShader.vertexPositionAttribute = gl.getAttribLocation(trackShader, "aVertexPosition");		
	gl.enableVertexAttribArray(trackShader.vertexPositionAttribute);
	
	trackShader.vertexNormalAttribute = gl.getAttribLocation(trackShader, "aVertexNormal");
	gl.enableVertexAttribArray(trackShader.vertexNormalAttribute);
	
	trackShader.textureCoordAttribute = gl.getAttribLocation(trackShader, "aTextureCoord");
	gl.enableVertexAttribArray(trackShader.textureCoordAttribute);

	trackShader.pMatrixUniform = gl.getUniformLocation(trackShader, "uPMatrix");
	trackShader.mvMatrixUniform = gl.getUniformLocation(trackShader, "uMVMatrix");
	trackShader.nMatrixUniform = gl.getUniformLocation(trackShader, "uNMatrix");
	trackShader.samplerUniform = gl.getUniformLocation(trackShader, "uSampler");
	trackShader.ambientColorUniform = gl.getUniformLocation(trackShader, "uAmbientColor");
	trackShader.lightingDirectionUniform = gl.getUniformLocation(trackShader, "uLightingDirection");
	trackShader.directionalColorUniform = gl.getUniformLocation(trackShader, "uDirectionalColor");
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
    gl.uniformMatrix4fv(trackShader.pMatrixUniform, false, pMatrix);
    gl.uniformMatrix4fv(trackShader.mvMatrixUniform, false, mvMatrix);
	
	var normalMatrix = mat3.create();
	mat4.toInverseMat3(mvMatrix, normalMatrix);
	mat3.transpose(normalMatrix);
	gl.uniformMatrix3fv(trackShader.nMatrixUniform, false, normalMatrix);
}


// create and initialize our geometry objects
var gridPointPositionBuffer;
var gridPointTextureCoordBuffer;
var gridPointIndexBuffer;
var gridPointNormalBuffer;

function initTrackGeometry()
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
			vertexNormals[1 + arrayOffset] = 1;
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

function initPlayerModelGeometry()
{
	    //create the vertices
        var vertices = 
		[
            // Front face
            -1.0, -1.0,  1.0,
             1.0, -1.0,  1.0,
             1.0,  1.0,  1.0,
            -1.0,  1.0,  1.0,

            // Back face
            -1.0, -1.0, -1.0,
            -1.0,  1.0, -1.0,
             1.0,  1.0, -1.0,
             1.0, -1.0, -1.0,

            // Top face
            -1.0,  1.0, -1.0,
            -1.0,  1.0,  1.0,
             1.0,  1.0,  1.0,
             1.0,  1.0, -1.0,

            // Bottom face
            -1.0, -1.0, -1.0,
             1.0, -1.0, -1.0,
             1.0, -1.0,  1.0,
            -1.0, -1.0,  1.0,

            // Right face
             1.0, -1.0, -1.0,
             1.0,  1.0, -1.0,
             1.0,  1.0,  1.0,
             1.0, -1.0,  1.0,

            // Left face
            -1.0, -1.0, -1.0,
            -1.0, -1.0,  1.0,
            -1.0,  1.0,  1.0,
            -1.0,  1.0, -1.0
		];
		
		cubeVertexPositionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, cubeVertexPositionBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
        cubeVertexPositionBuffer.itemSize = 3;
        cubeVertexPositionBuffer.numItems = 24;
		
		//vertex colors
		var cubeVertexColors = 
		[
			//front face
			1.0, 0.0, 0.0, 1.0,
			0.0, 1.0, 0.0, 1.0,
			0.0, 0.0, 1.0, 1.0,
			1.0, 0.0, 1.0, 1.0,
			
			//back face
			1.0, 0.0, 0.0, 1.0,
			0.0, 1.0, 0.0, 1.0,
			0.0, 0.0, 1.0, 1.0,
			1.0, 0.0, 1.0, 1.0,
			
			//top face
			1.0, 0.0, 0.0, 1.0,
			0.0, 1.0, 0.0, 1.0,
			0.0, 0.0, 1.0, 1.0,
			1.0, 0.0, 1.0, 1.0,
			
			//bottom face
			1.0, 0.0, 0.0, 1.0,
			0.0, 1.0, 0.0, 1.0,
			0.0, 0.0, 1.0, 1.0,
			1.0, 0.0, 1.0, 1.0,
			
			//left face
			1.0, 0.0, 0.0, 1.0,
			0.0, 1.0, 0.0, 1.0,
			0.0, 0.0, 1.0, 1.0,
			1.0, 0.0, 1.0, 1.0,
			
			//right face
			1.0, 0.0, 0.0, 1.0,
			0.0, 1.0, 0.0, 1.0,
			0.0, 0.0, 1.0, 1.0,
			1.0, 0.0, 1.0, 1.0			
		];
		cubeVertexColorBuffer = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, cubeVertexColorBuffer);
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(cubeVertexColors), gl.STATIC_DRAW);
		cubeVertexColorBuffer.itemSize = 4;
		cubeVertexColorBuffer.numItems = 24;
		
		//index for triangles		
		var cubeVertexIndices = 
		[
			0, 1, 2,      0, 2, 3,    // Front face
            4, 5, 6,      4, 6, 7,    // Back face
            8, 9, 10,     8, 10, 11,  // Top face
            12, 13, 14,   12, 14, 15, // Bottom face
            16, 17, 18,   16, 18, 19, // Right face
            20, 21, 22,   20, 22, 23  // Left face
		];

		cubeVertexIndexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cubeVertexIndexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(cubeVertexIndices), gl.STATIC_DRAW);
        cubeVertexIndexBuffer.itemSize = 1;
        cubeVertexIndexBuffer.numItems = 36;
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

    exTexture.image.src = "Textures/track1.png";
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
   initTrackGeometry();
   initPlayerModelGeometry();
   initTextures();
   
   var canvas = document.getElementById("graphicsCanvas");
   window.addEventListener("keydown", handleKeyPressed, false);
   
   gl.clearColor(0.1,0.1,0.1,1.0);
   gl.enable(gl.DEPTH_TEST);
   // Draw the Scene
   Frames();
   // If doing an animation need to add code to rotate our geometry
   
}

var tankSpeed = 0; //speed of the tank over terrain
var speedScaleFactor = 100000; //division factor to reduce drastic speed changes from small mouse movements
var playerModelPos = vec3.create([0.0, 1.0 , 0.0]); //tank position: 0,0,0
var viewDirection = vec3.create([0,0, 1]); //direction the tank is looking, default to straight at the z axis
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
	//setViewDirection(); //get the rotational direction of the tank
	//console.log("viewDirection: " + viewDirection);
	//playerModelPos = getPlayerModelPos();
	//console.log("playerModelPos: " + playerModelPos);
	//target = getTarget();
	//console.log("target: " + target);
	//tankUpVector = getUpVector();
	//console.log("tankupvector: " + tankUpVector);
	
	//now generate the view matrix
	mat4.identity(mvMatrix);
	//mat4.lookAt(playerModelPos, target, tankUpVector, mvMatrix);
	mat4.lookAt(vec3.create([playerModelPos[0], playerModelPos[1] + 1.0, playerModelPos[2] - 1.0]), playerModelPos, vec3.create([0.0, 1.0, 0.0]), mvMatrix);
}

function getTrackViewMatrix()
{
	mat4.identity(mvMatrix);
	playerModelPos = getPlayerModelPos();
	//console.log(playerModelPos);
	mat4.lookAt(vec3.create([playerModelPos[0], playerModelPos[1] + 0.05, playerModelPos[2] - 0.25]), playerModelPos, vec3.create([0.0, 1.0, 0.0]), mvMatrix);
	//mat4.multiply(mvMatrix, rotationMatrix);
}

function getPlayerModelViewMatrix()
{
	mat4.identity(mvMatrix);
	//var rotationMatrix = mat4.create();
	//mat4.rotate(rotationMatrix, degToRad(45), [1,0,0]);
	//mat4.multiply(mvMatrix, rotationMatrix);
	mat4.translate(mvMatrix, vec3.create([0.0, 0.0, -20.0]));
}

function setViewDirection()
{
	viewDirection = mat4.multiplyVec3(rotationMatrix, vec3.create([0,0, 1]), viewDirection);
	vec3.normalize(viewDirection, viewDirection);
}

function getPlayerModelPos()
{
	var newPlayerModelPos = playerModelPos; //the new pos
	newPlayerModelPos[0] += xSpeed;
	newPlayerModelPos[2] += zSpeed;
	
	newPlayerModelPos[1] = getPixelHeight(newPlayerModelPos[0], newPlayerModelPos[2]); //set the tank's height based on the terrain, add a little bit to be above the terrain
	
	if (newPlayerModelPos[1] < 0)
	{
		newPlayerModelPos = vec3.create([0, getPixelHeight(0,0), 0]);
		xSpeed = 0;
		zSpeed = 0;
		lose();
	}
	
	newPlayerModelPos[1] = 0.0;
	
	//handle out of bounds driving by resetting location to 0,0
	var newX = newPlayerModelPos[0];
	var newY = newPlayerModelPos[1];
	var newZ = newPlayerModelPos[2];
	if (newX > 1.0 || newX < -1.0 || newZ > 1.0 || newZ < -1.0) //tank is out of bounds
	{
		newPlayerModelPos = vec3.create([0, getPixelHeight(0,0), 0]);
	}	
	
	return newPlayerModelPos;
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
		//console.log(pixelHeight);
	}
	
	return pixelHeight;
}

function getUpVector()
{
	var newNormal = vec3.create([0,1,0]);
		
	return newNormal;
}

function lose()
{
	alert("You lose");
}

var xSpeed = 0.0;
var zSpeed = 0.0;
var speedChange = 0.001;
function handleKeyPressed(key)
{
	if (key.code == "ArrowLeft")
	{
		//console.log("left");
		xSpeed += speedChange;
	}
	if (key.code == "ArrowUp")
	{
		//console.log("up");
		zSpeed += speedChange;
	}
	if (key.code == "ArrowRight")
	{
		//console.log("right");
		xSpeed -= speedChange;
	}
	if (key.code == "ArrowDown")
	{
		//console.log("down");
		zSpeed -= speedChange;
	}
//	console.log("xSpeed: " + xSpeed);
	//console.log("zSpeed: " + zSpeed);
	//console.log(key);
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

    
function drawTrack() 
{
	getTrackViewMatrix();
	
	//mat4.translate(mvMatrix, [0.0, 0.0, zoomLevel]);
	//console.log(mvMatrix);
	
	gl.bindBuffer(gl.ARRAY_BUFFER, gridPointPositionBuffer);
	gl.vertexAttribPointer(trackShader.vertexPositionAttribute, gridPointPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);

	gl.bindBuffer(gl.ARRAY_BUFFER, gridPointTextureCoordBuffer);
	gl.vertexAttribPointer(trackShader.textureCoordAttribute, gridPointTextureCoordBuffer.itemSize, gl.FLOAT, false, 0, 0);
	
	gl.bindBuffer(gl.ARRAY_BUFFER, gridPointNormalBuffer);
	gl.vertexAttribPointer(trackShader.vertexNormalAttribute, gridPointNormalBuffer.itemSize, gl.FLOAT, false, 0, 0);

	gl.activeTexture(gl.TEXTURE0);
	gl.bindTexture(gl.TEXTURE_2D, exTexture);
	gl.uniform1i(trackShader.samplerUniform, 0);

	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gridPointIndexBuffer);
	setMatrixUniforms();
	gl.drawElements(gl.TRIANGLES, gridPointIndexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
	
	//lighting code
	var ambientR = 0.5;//parseFloat(document.getElementById("ambientR").value);
	var ambientG = 0.5;//parseFloat(document.getElementById("ambientG").value);
	var ambientB = 0.5;//parseFloat(document.getElementById("ambientB").value);
	
	var lightDirectionX = 0.0;//parseFloat(document.getElementById("lightDirectionX").value);
	var lightDirectionY = -1.0;//parseFloat(document.getElementById("lightDirectionY").value);
	var lightDirectionZ = 0.0;//parseFloat(document.getElementById("lightDirectionZ").value);
	
	var directionalR = 1.0;//parseFloat(document.getElementById("directionalR").value);
	var directionalG = 1.0;//parseFloat(document.getElementById("directionalG").value);
	var directionalB = 1.0;//parseFloat(document.getElementById("directionalB").value);
	
	var lightingDirection = [lightDirectionX, lightDirectionY, lightDirectionZ];
	var adjustedLightingDirection = vec3.create();
	
	vec3.normalize(lightingDirection, adjustedLightingDirection);
	vec3.scale(adjustedLightingDirection, -1);
	gl.uniform3f(trackShader.ambientColorUniform, ambientR, ambientG, ambientB);
	gl.uniform3fv(trackShader.lightingDirectionUniform, adjustedLightingDirection);
	
	gl.uniform3f(trackShader.directionalColorUniform, directionalR, directionalG, directionalB);
	
}	

function drawPlayerModel()
{
	//set up the model view matrix
	getPlayerModelViewMatrix();

	gl.bindBuffer(gl.ARRAY_BUFFER, cubeVertexPositionBuffer);
	gl.vertexAttribPointer(playerModelShader.vertexPositionAttribute, cubeVertexPositionBuffer.itemSize, gl.FLOAT, false, 0, 0);

	gl.bindBuffer(gl.ARRAY_BUFFER, cubeVertexColorBuffer);
	gl.vertexAttribPointer(playerModelShader.vertexColorAttribute, cubeVertexColorBuffer.itemSize, gl.FLOAT, false, 0, 0);

	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cubeVertexIndexBuffer);
	gl.drawElements(gl.TRIANGLES, cubeVertexIndexBuffer.numItems, gl.UNSIGNED_SHORT, 0);
	
	gl.uniformMatrix4fv(playerModelShader.pMatrixUniform, false, pMatrix);
	gl.uniformMatrix4fv(playerModelShader.mvMatrixUniform, false, mvMatrix);
}

function drawScene()
{
	gl.viewport(0, 0, gl.viewportWidth, gl.viewportHeight);
	gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
	
	mat4.perspective(45, gl.viewportWidth / gl.viewportHeight, 0.1, 100.0, pMatrix);
	
	gl.useProgram(trackShader);
	drawTrack();
	
	gl.useProgram(playerModelShader);
	drawPlayerModel();
}

function Frames() {
	requestAnimFrame(Frames);
	drawScene();
}

