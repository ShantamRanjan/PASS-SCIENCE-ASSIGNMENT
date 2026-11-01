cmake_minimum_required(VERSION 3.20)
project(NEXUS_Backend VERSION 1.0.0 LANGUAGES CXX)

option(NEXUS_BUILD_TESTS "Build NEXUS unit tests" ON)
include(FetchContent)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

FetchContent_Declare(httplib
  GIT_REPOSITORY https://github.com/yhirose/cpp-httplib.git
  GIT_TAG v0.18.3 GIT_SHALLOW TRUE)
FetchContent_Declare(json
  GIT_REPOSITORY https://github.com/nlohmann/json.git
  GIT_TAG v3.11.3 GIT_SHALLOW TRUE)
FetchContent_MakeAvailable(httplib json)

add_library(nexus_lib
  src/thermal/ThermalSolver.cpp
  src/geometry/Geometry.cpp
  src/performance/Benchmark.cpp
  src/hardware/Hardware.cpp
  src/ml/NeuralNetwork.cpp
  src/api/ApiServer.cpp)
target_include_directories(nexus_lib PUBLIC include)
target_link_libraries(nexus_lib PUBLIC httplib::httplib nlohmann_json::nlohmann_json)
target_compile_definitions(nexus_lib PUBLIC NEXUS_VERSION="${PROJECT_VERSION}")
target_compile_definitions(nexus_lib PRIVATE NEXUS_VERSION="${PROJECT_VERSION}")
if(WIN32)
  target_link_libraries(nexus_lib PUBLIC ws2_32)
endif()
if(MSVC)
  target_compile_options(nexus_lib PRIVATE /W4 /permissive-)
else()
  target_compile_options(nexus_lib PRIVATE -Wall -Wextra -Wpedantic)
  find_package(Threads REQUIRED)
  target_link_libraries(nexus_lib PUBLIC Threads::Threads)
endif()

add_executable(nexus-core src/main.cpp)
target_link_libraries(nexus-core PRIVATE nexus_lib)
target_compile_definitions(nexus-core PRIVATE NEXUS_VERSION="${PROJECT_VERSION}")

if(NEXUS_BUILD_TESTS)
  enable_testing()
  FetchContent_Declare(googletest
    GIT_REPOSITORY https://github.com/google/googletest.git
    GIT_TAG v1.15.2 GIT_SHALLOW TRUE)
  FetchContent_MakeAvailable(googletest)
  add_executable(nexus-tests tests/test_main.cpp)
  target_link_libraries(nexus-tests PRIVATE nexus_lib GTest::gtest_main)
  include(GoogleTest)
  gtest_discover_tests(nexus-tests)
endif()
