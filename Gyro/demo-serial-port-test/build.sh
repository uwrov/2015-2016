gcc -c libpinvoke.c && gcc -shared -o libpinvoke.dll libpinvoke.o
gcc -std=gnu11 -Wall -o libgyro9150 libgyro9150.c
