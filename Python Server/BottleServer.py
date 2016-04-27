from bottle import get, put, route, run, template

# Import the PCA9685 module
import Adafruit_PCA9685

# Initialize the PCA9685 using the default address (0x40)
pwm = Adafruit_PCA9685.PCA9685()

sensor_values = "{}"

servo_values = {}

# Set frequency to 60hz
pwm.set_pwm_freq(60)

@get('/sensor')
def getsensor():
    return sensor_values

@get('/sensor/<value>')
def set_sensor(value):
    global sensor_values
    sensor_values = value

@get('/servo/<channel>/<value>')
def set_servo(channel, value):
    servo_values[channel] = value
    # pwm.set_pwm(channel, 0, value)
    return "Running channel {0} with value {1}".format(channel, value)

@get('/servo/<channel>')
def get_servo(channel):
    if channel in servo_values:
        return str(servo_values[channel])
    else:
        return "0"

run(host='localhost', port=8085)
