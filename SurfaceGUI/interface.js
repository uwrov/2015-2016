
(function() {
	"use strict";

	//Delay between sensor update (milliseconds)
	var SENSOR_UPDATE_DELAY = 10;
	//Minimum percentage of the window size a display section can be resized to
	var MIN_RESIZE = 0.2;
	//Maximum percentage of the window size a display section can be resized to
	var MAX_RESIZE = 0.8;

	//Previous dimensions of the window
	var prevDim = {
		x: window.innerWidth,
		y: window.innerHeight
	};

	//Previous States of Gamepad Buttons
	var prevButtonStates = {};

	//
	var buttonMappings = {};

	//Whether gamepad events are available
	var haveEvents = 'ongamepadconnected' in window;
	//All currently connected controllers
	var controllers = {};

	/*
	 * Initializes the GUI, interface controls, and sensor update loop.
	 */
	 window.onload = function() {
		//Set camera feeds to automatically maximize their sizes
		document.getElementById("cam-one").onload = resizeAllCams;
		document.getElementById("cam-two").onload = resizeAllCams;
		document.getElementById("cam-three").onload = resizeAllCams;
		resizeAllCams();

		//Resize cameras if the window is
		window.addEventListener("resize", resizeAllCams, true);
		//Resize display panels if the window is
		window.addEventListener("resize", resizeDisplays, true);

		//Regularly update sensor values
		setInterval(updateSensors, SENSOR_UPDATE_DELAY);

		//Switch cameras
		document.getElementById("main-display").onclick = switchCams;

		//Add listeners for HORIZONTAL display-resizing slider
		document.getElementById('hoz-display-slider').addEventListener('mousedown', function() { mouseDown(hozSliderMove); }, false);
		window.addEventListener('mouseup', function() { mouseUp(hozSliderMove); }, false);
		//Add listeners for VERTICAL display-resizing slider
		document.getElementById('vert-display-slider').addEventListener('mousedown', function() { mouseDown(vertSliderMove); }, false);
		window.addEventListener('mouseup', function() { mouseUp(vertSliderMove); }, false);

		//Add gamepad connection listeners
		window.addEventListener("gamepadconnected", connecthandler);
		window.addEventListener("gamepaddisconnected", disconnecthandler);
	}

	/*
	 * Resizes all camera feeds such that they fill the area they are in
	 * without stretching or overflowing the area borders.
	 */
	 function resizeAllCams() {
	 	resizeCam(document.getElementById("cam-one"));
	 	resizeCam(document.getElementById("cam-two"));
	 	resizeCam(document.getElementById("cam-three"));

	 }

	/*
	 * Resizes a given camera img feed such that it fills the area it is in
	 * without stretching or overflowing the area borders.
	 * 
	 * @param {img} cam An HTML img tag to resize
	 */
	 function resizeCam(cam) {
		//Set the larger dimension to be maximized
		if(cam.naturalWidth > cam.naturalHeight) {
			cam.style.width = "100%";
			cam.style.height = "auto";
		} else {
			cam.style.height = "100%";
			cam.style.width = "auto";
		}

		//If the small dimension overflows the border, maximize it instead
		var parentStyle = window.getComputedStyle(cam.parentNode);
		var camStyle = window.getComputedStyle(cam);
		if(parseInt(camStyle.height) > parseInt(parentStyle.height)) {
			cam.style.height = "100%";
			cam.style.width = "auto";
		}
		if(parseInt(camStyle.width) > parseInt(parentStyle.width)) {
			cam.style.width = "100%";
			cam.style.height = "auto";
		}
	}

	/*
	 * Updates the positions of the display areas and resizing sliders based on
	 * window resizing such that their positions do not become offscreen.
	 */
	 function resizeDisplays() {
	 	var mainDisplay = document.getElementById("main-display");
	 	var camTwoArea = document.getElementById("cam-two-area");
	 	var camThreeArea = document.getElementById("cam-three-area");
	 	var hozSlider = document.getElementById("hoz-display-slider");
	 	var vertSlider = document.getElementById("vert-display-slider");

	 	/////TODO/////
	 	// if(parseInt(window.getComputedStyle(mainDisplay).width) > window.innerWidth * 0.8) {
	 	// 	window.style.width = window.innerWidth * 0.8;
	 	// }
	 	//////////////

		//Pixel change in window dimensions
		var dx = window.innerWidth - prevDim.x;
		var dy = window.innerHeight - prevDim.y;

		//Change display panel areas and slider positions by dimension change
		mainDisplay.style.width = parseInt(window.getComputedStyle(mainDisplay).width) + dx + "px";
		camTwoArea.style.height = parseInt(window.getComputedStyle(camTwoArea).height) + dy + "px";
		var splitPos = parseInt(window.getComputedStyle(mainDisplay).width) + "px";
		hozSlider.style.left = splitPos;
		vertSlider.style.left = splitPos;
		vertSlider.style.top = parseInt(window.getComputedStyle(camTwoArea).height) + "px";

		//Update previous window dimensions to current ones
		prevDim.x = window.innerWidth;
		prevDim.y = window.innerHeight;
	}

	/*
	 * Switches the main and secondary camera feeds so that each displays
	 * the other.
	 */
	 function switchCams() {
	 	var cam1 = document.getElementById("cam-one");
	 	var cam2 = document.getElementById("cam-two");
	 	var cam3 = document.getElementById("cam-three")

		//Switch the src's of the cams
		var cam1src = cam1.src;
		cam1.src = cam2.src;
		cam2.src = cam3.src;
		cam3.src = cam1src;

		resizeAllCams();
	}

	/*
	 * Updates and displays the sensor values.
	 */
	 function updateSensors() {
	 	//TODO
	 }

	 /*
	  * Removes the mouse movement event listener for a given function.
	  * 
	  * @param {Function} func The function to be called when the mouse moved
	  */
	  function mouseUp(func) {
	  	window.removeEventListener("mousemove", func, true);
	  }

	 /*
	  * Adds a mouse movement event listener for a given function.
	  * 
	  * @param {Function} func The function to call when the mouse moves
	  */
	  function mouseDown(func) {
	  	window.addEventListener("mousemove", func, true);
	  }

	 /*
	  * Moves the horizontal slider separating the main and secondary display
	  * areas according to the mouse's movement, resizing both.
	  * 
	  * @param {MouseEvent} e Mouse movement event of the slider
	  */
	  function hozSliderMove(e) {
	  	var slider = document.getElementById("hoz-display-slider");
	  	var x = e.clientX;

	 	//Only resize if it wouldn't exceed the max/min boundaries
	 	if(x > window.innerWidth * MIN_RESIZE && x < window.innerWidth * MAX_RESIZE) {
	 		slider.style.left = x + "px";

	 		//Realign the vertical slider
	 		var vertSlider = document.getElementById("vert-display-slider");
	 		vertSlider.style.left = x + "px";
	 		vertSlider.style.width = window.innerWidth - x + "px";
	 		//Resize main display area
	 		document.getElementById("main-display").style.width = x + "px";
	 		resizeAllCams();
	 	}
	 }

	 /*
	  * Moves the vertical slider separating the secondary camera and sensor
	  * display areas according to the mouse's movement, resizing both.
	  * 
	  * @param {MouseEvent} e Mouse movement event of the slider
	  */
	  function vertSliderMove(e) {
	  	var slider = document.getElementById("vert-display-slider");
	  	var y = e.clientY;

	 	//Only resize if it wouldn't exceed the max/min boundaries
	 	if(y > window.innerHeight * MIN_RESIZE && y < window.innerHeight * MAX_RESIZE) {
	 		slider.style.top = y + "px";

	 		//Resize secondary cam
	 		document.getElementById("cam-two-area").style.height = y + "px";
	 		resizeAllCams();
	 	}
	 }

	//////////////////////////////////////////////////////////////////////

	if (!haveEvents) {
		setInterval(scangamepads, 500);
	}

	/*
	 * 
	 * 
	 * 
	 */
	 function connecthandler(e) {
	 	addgamepad(e.gamepad);
	 }

	/*
	 * 
	 * 
	 * 
	 */
	 function disconnecthandler(e) {
	 	removegamepad(e.gamepad);
	 }

	/*
	 * 
	 * 
	 * 
	 */
	 function addgamepad(gamepad) {
	 	controllers[gamepad.index] = gamepad;

	 	//Create div to show output values for this gamepad
	 	var d = document.createElement("div");
	 	d.setAttribute("id", "controller" + gamepad.index);

	 	//Display gamepad's information
	 	var t = document.createElement("h1");
	 	t.appendChild(document.createTextNode("gamepad: " + gamepad.id));
	 	d.appendChild(t);

	 	//For each of the gamepad's buttons, create a display
	 	var b = document.createElement("div");
	 	b.className = "buttons";
	 	for (var i = 0; i < gamepad.buttons.length; i++) {
	 		var e = document.createElement("span");
	 		buttonMappings[i] = {
				prevState:false,
				func: null
			};
	 		e.className = "button";
    		//e.id = "b" + i;
    		e.innerHTML = i + " ";
    		b.appendChild(e);
    	}
    	d.appendChild(b);

    	//Create display for the controller's joysticks
    	var a = document.createElement("div");
    	a.className = "axes";

    	for (var i = 0; i < gamepad.axes.length; i++) {
    		var p = document.createElement("progress");
    		p.className = "axis";
   			 //p.id = "a" + i;
   			 p.setAttribute("max", "2");
   			 p.setAttribute("value", "1");
   			 p.innerHTML = i;
   			 a.appendChild(p);
   			}

   			d.appendChild(a);

  		document.body.appendChild(d);
  		
  		//Button Mappings To Functions
  		buttonMappings[3].func = switchCams;

  		requestAnimationFrame(updateStatus);
  	}

	/*
	 * Removes the gamepad display for the given gamepad.
	 * 
	 * 
	 */
	 function removegamepad(gamepad) {
	 	var d = document.getElementById("controller" + gamepad.index);
	 	document.body.removeChild(d);
	 	delete controllers[gamepad.index];
	 }

	/*
	 * 
	 * 
	 * 
	 */
	 function updateStatus() {
	 	if (!haveEvents) {
	 		scangamepads();
	 	}

	 	var i = 0;
	 	var j;

	 	for (j in controllers) {
	 		var controller = controllers[j];
	 		var d = document.getElementById("controller" + j);
	 		var buttons = d.getElementsByClassName("button");

	 		//Update controller button displays
	 		for (i = 0; i < controller.buttons.length; i++) {
	 			var b = buttons[i];
	 			var val = controller.buttons[i];
	 			var pressed = val == 1.0;
	 			if (typeof(val) == "object") {
	 				pressed = val.pressed;
	 				val = val.value;
	 			}

	 			var pct = Math.round(val * 100) + "%";
	 			b.style.backgroundSize = pct + " " + pct;
  				b.innerHTML = i + ":" + pct + " "; //TODO

  				if (pressed) {
  					b.className = "button pressed";
  					
  					if(!buttonMappings[i].prevState){
  						if(buttonMappings[i].func != null) {
  							buttonMappings[i].func();
  						}
  					}
  				} else {
  					b.className = "button";
  				}
  				buttonMappings[i].prevState = pressed;
  				prevButtonStates[i] = val;
  			}

  			//Update controller joystick displays
  			var axes = d.getElementsByClassName("axis");
  			for (i = 0; i < controller.axes.length; i++) {
  				var a = axes[i];
  				a.innerHTML = i + ": " + controller.axes[i].toFixed(4);
  				a.setAttribute("value", controller.axes[i] + 1);
  			}
  		}

  		requestAnimationFrame(updateStatus);
  	}

	/*
	 * 
	 * 
	 * 
	 */
	 function scangamepads() {
	 	var gamepads = navigator.getGamepads ? navigator.getGamepads() : (navigator.webkitGetGamepads ? navigator.webkitGetGamepads() : []);

	 	for (var i = 0; i < gamepads.length; i++) {
	 		if (gamepads[i]) {
	 			if (gamepads[i].index in controllers) {
	 				controllers[gamepads[i].index] = gamepads[i];
	 			} else {
	 				addgamepad(gamepads[i]);
	 			}
	 		}
	 	}
	 }

	}) ();