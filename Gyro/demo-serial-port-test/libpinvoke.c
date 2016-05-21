#include <linux/i2c-dev.h>
#include <sys/ioctl.h>
#include <errno.h>

int invoke_ioctl(int fd, unsigned long req) {
  int result = ioctl(fd, I2C_SLAVE, req);
  if (result == 0) return 0;
  return errno;
}
