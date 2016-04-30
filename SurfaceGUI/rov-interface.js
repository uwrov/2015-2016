
(function() {
	"use strict";

	//Delay between sensor update (milliseconds)
	var SENSOR_UPDATE_DELAY = 10;

	var WIDTH = window.innerWidth;
	var HEIGHT = window.innerHeight;
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
			size: HEIGHT * 0.25,
			minSize: HEIGHT * 0.25
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
	var buttonMappings = {};
	//Whether gamepad events are available
	var haveEvents = 'ongamepadconnected' in window;
	//All currently connected controllers
	var controllers = {};

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

		//Switch cams with mouse
		$("#main-display").dblclick(switchCams);
		//Set IPs when button is clicked
		$("#set-ips").click(setIPS);

		$("#cam1-quit").click(function() { camAction(1, "quit"); });
		$("#cam2-quit").click(function() { camAction(2, "quit"); });
		$("#cam3-quit").click(function() { camAction(3, "quit"); });
		$("#cam1-restart").click(function() { camAction(1, "restart"); });
		$("#cam2-restart").click(function() { camAction(2, "restart"); });
		$("#cam3-restart").click(function() { camAction(3, "restart"); });

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
	 * Cycles the camera feeds (1st becomes 3rd, 3rd becomes 2nd, 2nd becomes
	 * 1st)
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
	 function setIPS() {
	 	cameraIP = $("#cam-ip").val();
	 	var cam1ip = cameraIP + ":" + $("#cam1port").val();
	 	var cam2ip = cameraIP + ":" + $("#cam2port").val();
	 	var cam3ip = cameraIP + ":" + $("#cam3port").val();

		//Set new camera feed ip sources
		$("#cam-one").attr("src", "http://" + cam1ip);
		$("#cam-two").attr("src", "http://" + cam2ip);
		$("#cam-three").attr("src", "http://" + cam3ip);

		//Show hide camera feeds and show loading spinners
		$(".cam").each(function() { $(this).hide(); })
		$(".loading").each(function() { $(this).show(); });
	}

	/*
	 * Sends a HTTP GET request with a given motion action for a given camera.
	 * 
	 * @param {Number} camNum The number of the camera
	 * @param {String} action The motion action of the camera (e.g. quit,
	 *        restart)
	 */
	function camAction(camNum, action) {
		var xmlHttp = new XMLHttpRequest();
		var url = "http://" + cameraIP + ":8080" + "/" + camNum + "/action/" + action;
		xmlHttp.open("GET", url, true);
		xmlHttp.send();
	}

	/*
	 * Updates and displays the sensor values.
	 */
	 function updateSensors() {
	 	//TODO
	 }

	////////////////////////////////////////////////////////////////////////

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
	 	var t = document.createElement("h2");
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

   			$("#controller-display").append(d);
   			// document.body.appendChild(d);
   			
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
  				b.innerHTML = i + ":" + pct + " // "; //TODO

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