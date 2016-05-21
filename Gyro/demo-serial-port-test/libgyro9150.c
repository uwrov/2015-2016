#include <linux/i2c-dev.h>
#include <sys/ioctl.h>
#include <sys/time.h>
#include <errno.h>
#include <stdio.h>
#include <stdlib.h>
#include <fcntl.h>
#include <stdbool.h>
#include <stdint.h>
#include <unistd.h>

typedef int i2c_bus;

typedef struct {
  short x, y, z; 
} gyro_values;

bool try_i2c_init(i2c_bus* pBus) {
  int bus = open("/dev/i2c-1", O_RDWR);
  if (bus < 0) {
    printf("Failed to open i2c bus\n");
    return false;
  }

  *pBus = bus;
  return true;
}

bool try_i2c_read(i2c_bus* pBus, uint8_t device_addr, uint8_t offset, uint8_t length, uint8_t* dest_buffer) {
  int addr = device_addr;
  if (ioctl(*pBus, I2C_SLAVE, addr) != 0) {
    printf("Failed at ioctl\n");
    return false;
  }

  uint8_t write_buffer[1];
  write_buffer[0] = offset;

  if (write(*pBus, write_buffer, 1) != 1) {
    printf("Write error\n");
    return false;
  }
  
  int n = 6;
  if (read(*pBus, dest_buffer, length) != length) {
    printf("read err\n");
    return false;
  }

  return true;
}

short read_bigendian_short(uint8_t* buffer) {
  return (short)buffer[0] * 255 + (short)buffer[1];
}

bool try_gyro_read(i2c_bus* pBus, gyro_values* out_values) {
  uint8_t buffer[6];
  if (!try_i2c_read(pBus, 0x68, 0x43, 6, buffer)) {
    return false;
  }
  out_values->x = read_bigendian_short(buffer);
  out_values->y = read_bigendian_short(buffer + 2);
  out_values->z = read_bigendian_short(buffer + 4);
  return true;
}

gyro_values multisample_gyro_read(i2c_bus* pBus, int n) {
  int64_t tareSamples[3] = {0};
  for (int i = 0; i < n; i++) {
    gyro_values values;
    if (!try_gyro_read(pBus, &values)) {
      printf("Gyro read failed!\n");
      exit(1);
    }
    tareSamples[0] += values.x;
    tareSamples[1] += values.y;
    tareSamples[2] += values.z;
  }

  short tareOffsets[3] = {0};
  for (int i = 0; i < 3; i++) {
    tareOffsets[i] = tareSamples[i] / n;
  }

  gyro_values result;
  result.x = tareOffsets[0];  
  result.y = tareOffsets[1];  
  result.z = tareOffsets[2];  
  return result;
}


int main() {
  i2c_bus bus;
  if (!try_i2c_init(&bus)) return 1;
 
  gyro_values tare = multisample_gyro_read(&bus, 1000); 

  printf("Tare Offsets: %d %d %d\n", tare.x, tare.y, tare.z);

  double accumulator[3] = { 0.0f };

  struct timeval tv;
  gettimeofday(&tv,NULL);
  unsigned long t_initial = 1000000 * tv.tv_sec + tv.tv_usec;

  for (int tick = 0;; tick++) {
    gyro_values values = multisample_gyro_read(&bus, 10);
  
    int x_adj = values.x - tare.x;
    int y_adj = values.y - tare.y;
    int z_adj = values.z - tare.z;
    //printf("%d %d %d\n", x_adj, y_adj, z_adj);

    gettimeofday(&tv,NULL);
    uint64_t t_now = 1000000 * tv.tv_sec + tv.tv_usec;
    uint64_t t_elapsed_micros = t_now - t_initial;
    double t_elapsed_s = t_elapsed_micros / 1000000.0;
    t_initial = t_now;

    double kScale = 90.0 / 11611.1111;
    accumulator[0] += x_adj * t_elapsed_s * kScale;
    accumulator[1] += y_adj * t_elapsed_s * kScale;
    accumulator[2] += z_adj * t_elapsed_s * kScale;

    if (tick % 10 == 0)
      printf("%6f %6f %6f\n", accumulator[0], accumulator[1], accumulator[2]);
    
    usleep(3000);
  }
  return 0;
}
