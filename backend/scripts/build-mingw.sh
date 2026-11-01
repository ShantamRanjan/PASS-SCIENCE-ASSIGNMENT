#!/usr/bin/env bash
set -e
cmake -S .. -B ../build-mingw -G Ninja -DCMAKE_BUILD_TYPE=Release -DCMAKE_CXX_COMPILER=g++
cmake --build ../build-mingw
