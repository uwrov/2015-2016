
(function() {
	"use strict";

	//Indices of the Xbox gamepad buttons
	var BUTTON = {
		a: 0,			//A
		b: 1,			//B
		x: 2,			//X
		y: 3,			//Y
		lb: 4,			//Left Bumper
		rb: 5,			//Right Bumper
		lt: 6,			//Left Trigger
		rt: 7,			//Right Trigger
		back: 8,		//Back
		start: 9,		//Start
		lstick: 10,		//Left Stick Click
		rstick: 11,		//Right Stick Click
		dup: 12,		//D-pad up
		ddown: 13,		//D-pad down
		dleft: 14,		//D-pad left
		dright: 15,		//D-pad right
		xb: 16			//Xbox button
	}

	//Delay between sensor update (milliseconds)
	var SENSOR_UPDATE_DELAY = 10;
	//Main camera port (for config)
	var CAMERA_PORT = "8080";

	var MAX_BRIGHTNESS = 255;
	var MAX_CONTRAST = 255;

	//Window dimensions (for config purposes)
	var WIDTH = window.innerWidth;
	var HEIGHT = window.innerHeight;
	//Main layout config settings (TODO: Refactor redundancy and magic numbers)
	var MAIN_LAYOUT_SETTINGS = {
		defaults: {
			applyDefaultStyles: true,
			spacing_open: 12,
			togglerLength_open: 75,
			togglerLength_closed: 75,
			minSize: WIDTH * 0.2,
			maxSize: WIDTH * 0.8,

			onresize_end: resizeAllCams
		},
		north: {
			initClosed: true,
			size: HEIGHT * 0.3,
			minSize: HEIGHT * 0.3
		},
		south: {
			initClosed: true,
			size: HEIGHT * 0.25,
			minSize: HEIGHT * 0.25
		},
		center: {
			minHeight: HEIGHT * 0.1
		}
	};
	//Secondary layout config settings
	var SECONDARY_LAYOUT_SETTINGS = jQuery.extend({}, MAIN_LAYOUT_SETTINGS);
	SECONDARY_LAYOUT_SETTINGS.north = {
		initClosed: false,
		size: 0.3,
		minSize: HEIGHT * 0.1
	}
	SECONDARY_LAYOUT_SETTINGS.south = {
		initClosed: false,
		size: HEIGHT * 0.3,
		minSize: HEIGHT * 0.1
	}

	//Data for button mappings
	var buttonMappings = [];
	//Whether gamepad events are available
	var haveEvents = 'ongamepadconnected' in window;
	//All currently connected controllers
	var controllers = {};

	//IP of cameras
	var cameraIP;

	$(document).ready(function () {
		var mainLayout = $("body").layout(MAIN_LAYOUT_SETTINGS);
		$("#secondary-display").layout(SECONDARY_LAYOUT_SETTINGS);

		//Have camera feeds resize when they load
		$(".cam").each(function() {
			$(this).load(function() {
				resizeCam(this); //Resize this camera feed
				$(this).show(); //Show this camera feed
				hideLoading(this); //Hide loading spinner
			});
		});

		//Set to initial IP
		cameraIP = $("#cam-ip").val();

		//Checkbox to toggle camera label overlay
		$("#cam-labels-checkbox").change(function() {
			$(".cam-text").each(function() {
				$(this).toggle();
			});
		});

		//Switch cams with mouse
		$("#main-display").dblclick(switchCams);
		//Set IPs when button is clicked
		$("#set-ips").click(setIPs);
		setIPs();

		//Set camera action button functions
		$("#cam1-quit").click(function() { camAction(1, "quit"); });
		$("#cam2-quit").click(function() { camAction(2, "quit"); });
		$("#cam3-quit").click(function() { camAction(3, "quit"); });
		$("#cam1-restart").click(function() { camAction(1, "restart"); });
		$("#cam2-restart").click(function() { camAction(2, "restart"); });
		$("#cam3-restart").click(function() { camAction(3, "restart"); });

		$("#brightness-slider").change(updateBrightness);
		$("#contrast-slider").change(updateContrast);

		$("#controller-display").css("background-color", "gray");

		//Regularly update sensor values
		setInterval(updateSensors, SENSOR_UPDATE_DELAY);
		//TODO tmp: For some reason cameras don't resize on initial load
		setInterval(resizeAllCams, 1000);

		//Add gamepad connection listeners
		window.addEventListener("gamepadconnected", connecthandler);
		window.addEventListener("gamepaddisconnected", disconnecthandler);
	});

	/*
	 * Resizes all camera feeds such that they fill the area they are in
	 * without stretching or overflowing the area borders.
	 */
	 function resizeAllCams() {
	 	var cams = document.querySelectorAll(".cam");

	 	for(var i = 0; i < cams.length; i++) {
	 		resizeCam(cams[i]);
	 	}
	 }

	/*
	 * Resizes a given camera img feed such that it fills the area it is in
	 * without stretching or overflowing the area borders.
	 * 
	 * @param {img DOM Element} cam An HTML img tag to resize
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
		var panel = cam.parentNode.parentNode;
		if(panel.offsetHeight < panel.scrollHeight) {
			cam.style.height = "100%";
			cam.style.width = "auto";
		}
		if(panel.offsetWidth < panel.offsetWidth) {
			cam.style.width = "100%";
			cam.style.height = "auto";
		}
	}

	/*
	 * Cycles the camera feeds (1st becomes 3rd, 3rd becomes 2nd, 2nd becomes 1st)
	 */
	 function switchCams() {
	 	var cam1 = document.getElementById("cam-one-area");
	 	var cam2 = document.getElementById("cam-two-area");
	 	var cam3 = document.getElementById("cam-three-area");

	 	var cam1Parent = cam1.parentNode;
	 	var cam2Parent = cam2.parentNode;
	 	var cam3Parent = cam3.parentNode;

	 	cam1Parent.insertBefore(cam2, cam1Parent.childNodes[0]);
	 	cam2Parent.insertBefore(cam3, cam2Parent.childNodes[0]);
	 	cam3Parent.insertBefore(cam1, cam3Parent.childNodes[0]);

	 	resizeAllCams();
	 }

	/*
	 * Show the loading spinner for a camera
	 *
	 * @param {DOM Element} cam The camera feed to show the loading spinner for
	 */
	 function showLoading(cam) {
	 	$(cam).parent().find(".loading").show();
	 }

	/*
	 * Hide the loading spinner for a camera
	 *
	 * @param {DOM Element} cam The camera feed to hide the loading spinner for
	 */
	 function hideLoading(cam) {
	 	$(cam).parent().find(".loading").hide();
	 }

	/*
	 * Set the IP's of each camera feed to the values in the config options.
	 * Hides all camera feeds and shows all loading spinners.
	 */
	 function setIPs() {
	 	cameraIP = $("#cam-ip").val();
	 	var cam1ip = cameraIP + ":" + $("#cam1port").val();
	 	var cam2ip = cameraIP + ":" + $("#cam2port").val();
	 	var cam3ip = cameraIP + ":" + $("#cam3port").val();

		//Set new camera feed ip sources
		$("#cam-one").attr("src", "http://" + cam1ip);
		$("#cam-two").attr("src", "http://" + cam2ip);
		$("#cam-three").attr("src", "http://" + cam3ip);

		//Set config links
		var configUrlStart = "http://" + cameraIP + ":" + CAMERA_PORT + "/";
		var configUrlEnd = "/config/list";
		$("#cam1-config").attr("href", configUrlStart + "1" + configUrlEnd);
		$("#cam2-config").attr("href", configUrlStart + "2" + configUrlEnd);
		$("#cam3-config").attr("href", configUrlStart + "3" + configUrlEnd);

		//Show hide camera feeds and show loading spinners
		$(".cam").each(function() { $(this).hide(); })
		$(".loading").each(function() { $(this).show(); });
	}

	/*
	 * Sends a HTTP GET request to a given URL.
	 * 
	 * @param {String} url The URL to send the request to
	 */
	 function httpGet(url) {
	 	var xmlHttp = new XMLHttpRequest();
	 	xmlHttp.open("GET", url, true);
	 	xmlHttp.send();
	 }

	/*
	 * Sends a HTTP GET request with a given motion action for a given camera.
	 * 
	 * @param {Number} camNum The number of the camera
	 * @param {String} action The motion action of the camera (e.g. quit, restart)
	 */
	 function camAction(camNum, action) {
	 	var url = "http://" + cameraIP + ":" + CAMERA_PORT + "/" + camNum + "/action/" + action;
	 	httpGet(url);
	 }

	 /*
	  * Sends a HTTP GET request to set a given config option to a given value
	  * for a given camera.
	  * 
	  * @param {Number} camNum The number of the camera
	  * @param {String} option The name of the config option to set
	  * @param {Number} value The value to set the config option to
	  */
	  function camConfig(camNum, option, value) {
	  	var url = "http://" + cameraIP + ":" + CAMERA_PORT + "/" + camNum + "/config/set?" + option + "=" + value;
	  	httpGet(url);
	  }

	 /*
	  * Updates the brightness of all cameras based on the brightness config
	  * slider value. Also updates the percentage brightness display.
	  */
	  function updateBrightness() {
	  	var val = $("#brightness-slider").val();
	  	$("#brightness-config").html(Math.round(val / MAX_BRIGHTNESS * 100) + "%");

	  	for(var i = 1; i <= document.querySelectorAll(".cam").length; i++) {
	  		camConfig(i, "brightness", val);
	  	}
	  }

	 /*
	  * Updates the contrast of all cameras based on the contrast config
	  * slider value. Also updates the percentage contrast display.
	  */
	  function updateContrast() {
	  	var val = $("#contrast-slider").val();
	  	$("#contrast-config").html(Math.round(val / MAX_CONTRAST * 100) + "%");

	  	for(var i = 1; i <= document.querySelectorAll(".cam").length; i++) {
	  		camConfig(i, "contrast", val);
	  	}
	  }

	/*
	 * Updates and displays the sensor values.
	 */
	 function updateSensors() {
		//TODO
	}

	////////////////////////////////////////////////////////////////////////////
	// GAMEPAD HANDLING
	////////////////////////////////////////////////////////////////////////////

	if (!haveEvents) {
		setInterval(scangamepads, 500);
	}

	/*
	 * Adds a gamepad. Called when a gamepad is connected.
	 */
	 function connecthandler(e) {
	 	addgamepad(e.gamepad);
	 	$("controller-display").css("background-color", "white");
	 }

	/*
	 * Removes a gamepad. Called when a gamepad is disconnected.
	 */
	 function disconnecthandler(e) {
	 	removegamepad(e.gamepad);
	 }

	/*
	 * Adds a gamepad, creating a display for it and mapping its buttons to
	 * functions.
	 */
	 function addgamepad(gamepad) {
	 	$("#controller-display").css("background-color", "white");

	 	controllers[gamepad.index] = gamepad;

	 	//Create div to show output values for this gamepad
	 	var d = document.createElement("div");
	 	d.setAttribute("id", "controller" + gamepad.index);

	 	//Display gamepad's information
	 	var t = document.createElement("h2");
	 	t.appendChild(document.createTextNode("gamepad: " + gamepad.id));
	 	d.appendChild(t);

	 	//For each of the gamepad's buttons, create a mapping and display
	 	var b = document.createElement("div");
	 	b.className = "buttons";
	 	for (var i = 0; i < gamepad.buttons.length; i++) {
	 		var e = document.createElement("span");
	 		//Set the button's data
	 		buttonMappings[i] = {
	 			prevState: false,
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
   			// p.id = "a" + i;
   			p.setAttribute("max", "2");
   			p.setAttribute("value", "1");
   			p.innerHTML = i;
   			a.appendChild(p);
   		}
   		d.appendChild(a);

   		//Add controller display to its panel
   		$("#controller-display").append(d);

	  	//Map buttons to functions
	  	buttonMappings[BUTTON.back].func = switchCams;

	  	requestAnimationFrame(updateStatus);
	  }

	/*
	 * Removes the gamepad display for the given gamepad.
	 */
	 function removegamepad(gamepad) {
	 	var d = document.getElementById("controller" + gamepad.index);
	 	d.parentNode.removeChild(d);
	 	delete controllers[gamepad.index];

	 	//Gray-out the controller display panel
	 	$("#controller-display").css("background-color", "gray");
	 }

	/*
	 * Updates using the connected gamepads' states. Updates display, button and
	 * axis states, and handles button and axis input.
	 */
	 function updateStatus() {
	 	if (!haveEvents) {
	 		scangamepads();
	 	}

	 	var i = 0;
	 	var j;

	 	//For each connected controller...
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

	 			//Button values
	 			var pct = Math.round(val * 100) + "%";
	 			b.style.backgroundSize = pct + " " + pct;
	 			//Label button values with button names
	 			for(name in BUTTON) {
	 				if(BUTTON[name] == i) {
	 					b.innerHTML = name + ":" + pct + " // ";
	 				}
	 			}

	 			//If the button is pressed...
	 			if (pressed) {
	 				b.className = "button pressed";

	 				if(!buttonMappings[i].prevState){
	 					//Call the function that button is mapped to
	 					if(buttonMappings[i].func != null) {
	 						buttonMappings[i].func();
	 					}
	 				}
	 			} else {
	 				b.className = "button";
	 			}
	 			buttonMappings[i].prevState = pressed;
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
	 * Searches for gamepads. If any are found, adds them to the controller list.
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