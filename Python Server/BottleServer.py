from bottle import get, put, route, run, template

sensor_values = "hngdhgf"

@get('/sensor')
def getsensor():
	return sensor_values

@put('/sensor/<value>')
def set_sensor(value):
	global sensor_values
	sensor_values = value

run(host='localhost', port=8083)