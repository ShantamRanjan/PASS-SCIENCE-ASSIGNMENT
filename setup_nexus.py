#!/usr/bin/env python3
"""
NEXUS backend bootstrapper.
Creates a modular C++17 backend without touching existing files unless --overwrite is supplied.
Run from the NEXUS project root: python setup_nexus.py
"""
from __future__ import annotations

import argparse
import sys
import textwrap
from pathlib import Path

FILES = {
"backend/CMakeLists.txt": r"""
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
""",
"backend/include/nexus/thermal/ThermalSolver.hpp": r"""
#pragma once
#include <vector>
#include <cstddef>

namespace nexus::thermal {
struct Parameters {
    double length = 1.0, area = 1.0e-4, conductivity = 10.0;
    double generation = 10000.0, leftTemperature = 100.0, rightTemperature = 20.0;
    std::size_t elements = 10;
};
struct Result {
    std::vector<double> x, fem, analytical;
    double maxAbsoluteError = 0.0, rmsError = 0.0, executionMilliseconds = 0.0;
};
double analyticalTemperature(double x, const Parameters& p);
Result solve(const Parameters& p);
std::vector<Result> convergence(const Parameters& p);
}
""",
"backend/src/thermal/ThermalSolver.cpp": r"""
#include "nexus/thermal/ThermalSolver.hpp"
#include <algorithm>
#include <chrono>
#include <cmath>
#include <stdexcept>
#include <vector>

namespace nexus::thermal {
double analyticalTemperature(double x, const Parameters& p) {
    return p.leftTemperature + (p.rightTemperature-p.leftTemperature)*x/p.length
         + p.generation/(2.0*p.conductivity)*x*(p.length-x);
}
static std::vector<double> gaussian(std::vector<std::vector<double>> a, std::vector<double> b) {
    const std::size_t n=b.size();
    for(std::size_t k=0;k<n;++k) {
        std::size_t pivot=k;
        for(std::size_t i=k+1;i<n;++i)
            if(std::abs(a[i][k])>std::abs(a[pivot][k])) pivot=i;
        if(std::abs(a[pivot][k])<1e-14) throw std::runtime_error("Singular thermal system");
        std::swap(a[k],a[pivot]); std::swap(b[k],b[pivot]);
        for(std::size_t i=k+1;i<n;++i) {
            const double f=a[i][k]/a[k][k];
            for(std::size_t j=k;j<n;++j) a[i][j]-=f*a[k][j];
            b[i]-=f*b[k];
        }
    }
    std::vector<double> x(n);
    for(std::size_t ii=n;ii-- > 0;) {
        double s=b[ii];
        for(std::size_t j=ii+1;j<n;++j) s-=a[ii][j]*x[j];
        x[ii]=s/a[ii][ii];
    }
    return x;
}
Result solve(const Parameters& p) {
    if(!(p.length>0 && p.area>0 && p.conductivity>0) || p.elements<1 || p.elements>10000)
        throw std::invalid_argument("Length, area and conductivity must be positive; elements must be 1..10000");
    const auto start=std::chrono::steady_clock::now();
    const std::size_t nodes=p.elements+1;
    const double h=p.length/static_cast<double>(p.elements);
    std::vector<std::vector<double>> K(nodes,std::vector<double>(nodes,0.0));
    std::vector<double> F(nodes,0.0);
    for(std::size_t e=0;e<p.elements;++e) {
        const double ke=p.conductivity*p.area/h;
        K[e][e]+=ke; K[e][e+1]-=ke; K[e+1][e]-=ke; K[e+1][e+1]+=ke;
        const double fe=p.generation*p.area*h/2.0;
        F[e]+=fe; F[e+1]+=fe;
    }
    // Eliminate prescribed-temperature DOFs while preserving their contribution.
    for(std::size_t i=1;i+1<nodes;++i) {
        F[i]-=K[i][0]*p.leftTemperature+K[i][nodes-1]*p.rightTemperature;
    }
    std::vector<std::vector<double>> reduced(nodes-2,std::vector<double>(nodes-2));
    std::vector<double> rhs(nodes-2);
    for(std::size_t i=1;i+1<nodes;++i) {
        rhs[i-1]=F[i];
        for(std::size_t j=1;j+1<nodes;++j) reduced[i-1][j-1]=K[i][j];
    }
    const auto interior=nodes>2 ? gaussian(reduced,rhs) : std::vector<double>{};
    Result out; out.x.resize(nodes); out.fem.resize(nodes); out.analytical.resize(nodes);
    out.fem.front()=p.leftTemperature; out.fem.back()=p.rightTemperature;
    for(std::size_t i=1;i+1<nodes;++i) out.fem[i]=interior[i-1];
    double sum=0;
    for(std::size_t i=0;i<nodes;++i) {
        out.x[i]=static_cast<double>(i)*h;
        out.analytical[i]=analyticalTemperature(out.x[i],p);
        const double err=std::abs(out.fem[i]-out.analytical[i]);
        out.maxAbsoluteError=std::max(out.maxAbsoluteError,err); sum+=err*err;
    }
    out.rmsError=std::sqrt(sum/static_cast<double>(nodes));
    out.executionMilliseconds=std::chrono::duration<double,std::milli>(std::chrono::steady_clock::now()-start).count();
    return out;
}
std::vector<Result> convergence(const Parameters& p) {
    std::vector<Result> results;
    for(std::size_t n : {10u,20u,40u,80u}) { auto q=p; q.elements=n; results.push_back(solve(q)); }
    return results;
}
}
""",
"backend/include/nexus/geometry/Geometry.hpp": r"""
#pragma once
#include <array>
#include <string>
#include <vector>
namespace nexus::geometry {
struct Triangle { std::array<std::array<double,3>,3> vertices{}; std::array<double,3> normal{}; };
struct Mesh { std::vector<Triangle> triangles; std::array<double,3> min{}, max{}; };
Mesh parseStl(const std::string& path);
struct CsvPoint { double x=0,y=0,z=0,temperature=0; };
std::vector<CsvPoint> parseTemperatureCsv(const std::string& path);
}
""",
"backend/src/geometry/Geometry.cpp": r"""
#include "nexus/geometry/Geometry.hpp"
#include <algorithm>
#include <cmath>
#include <cstdint>
#include <cstring>
#include <fstream>
#include <stdexcept>
#include <sstream>
#include <limits>

namespace nexus::geometry {
static float readFloat(const unsigned char* p) { float v; std::memcpy(&v,p,4); return v; }
Mesh parseStl(const std::string& path) {
    std::ifstream in(path,std::ios::binary);
    if(!in) throw std::runtime_error("Cannot open STL file");
    in.seekg(0,std::ios::end); const auto size=in.tellg(); in.seekg(0);
    if(size<0) throw std::runtime_error("Invalid STL size");
    std::vector<unsigned char> bytes(static_cast<std::size_t>(size));
    if(!bytes.empty()) in.read(reinterpret_cast<char*>(bytes.data()),static_cast<std::streamsize>(bytes.size()));
    Mesh mesh; mesh.min.fill(std::numeric_limits<double>::max()); mesh.max.fill(std::numeric_limits<double>::lowest());
    bool binary=false; std::uint32_t count=0;
    if(bytes.size()>=84) { std::memcpy(&count,bytes.data()+80,4); binary=(84ULL+50ULL*count==bytes.size()); }
    if(binary) {
        for(std::uint32_t i=0;i<count;++i) {
            const unsigned char* p=bytes.data()+84+50ULL*i; Triangle t;
            for(int d=0;d<3;++d) t.normal[d]=readFloat(p+4*d);
            p+=12;
            for(int v=0;v<3;++v) for(int d=0;d<3;++d) {
                t.vertices[v][d]=readFloat(p+4*(v*3+d));
                mesh.min[d]=std::min(mesh.min[d],t.vertices[v][d]); mesh.max[d]=std::max(mesh.max[d],t.vertices[v][d]);
            }
            mesh.triangles.push_back(t);
        }
    } else {
        std::string text(bytes.begin(),bytes.end()); std::istringstream ss(text); std::string word; Triangle t; int v=0;
        while(ss>>word) {
            if(word=="facet") { ss>>word; ss>>t.normal[0]>>t.normal[1]>>t.normal[2]; }
            else if(word=="vertex") {
                if(v<3) { ss>>t.vertices[v][0]>>t.vertices[v][1]>>t.vertices[v][2];
                    for(int d=0;d<3;++d) { mesh.min[d]=std::min(mesh.min[d],t.vertices[v][d]); mesh.max[d]=std::max(mesh.max[d],t.vertices[v][d]); } ++v; }
            } else if(word=="endfacet" && v==3) { mesh.triangles.push_back(t); v=0; }
        }
        if(v!=0) throw std::runtime_error("Malformed ASCII STL: incomplete facet");
    }
    if(mesh.triangles.empty()) throw std::runtime_error("STL contains no triangles or is malformed");
    return mesh;
}
std::vector<CsvPoint> parseTemperatureCsv(const std::string& path) {
    std::ifstream in(path); if(!in) throw std::runtime_error("Cannot open CSV file");
    std::string line; if(!std::getline(in,line)) throw std::runtime_error("CSV is empty");
    std::vector<std::string> headers; { std::stringstream s(line); std::string x; while(std::getline(s,x,',')) headers.push_back(x); }
    auto index=[&](const std::string& key)->std::size_t { auto it=std::find(headers.begin(),headers.end(),key); if(it==headers.end()) throw std::runtime_error("CSV requires x,y,z,temperature columns"); return static_cast<std::size_t>(it-headers.begin()); };
    const auto ix=index("x"), iy=index("y"), iz=index("z"), it=index("temperature");
    std::vector<CsvPoint> out;
    while(std::getline(in,line)) {
        if(line.empty()) continue; std::stringstream s(line); std::vector<std::string> c; std::string v;
        while(std::getline(s,v,',')) c.push_back(v);
        if(c.size()<=std::max({ix,iy,iz,it})) throw std::runtime_error("CSV row has missing columns");
        try { out.push_back({std::stod(c[ix]),std::stod(c[iy]),std::stod(c[iz]),std::stod(c[it])}); }
        catch(...) { throw std::runtime_error("CSV contains a non-numeric value"); }
    }
    return out;
}
}
""",
"backend/include/nexus/performance/Benchmark.hpp": r"""
#pragma once
#include <cstddef>
namespace nexus::performance {
struct Metrics { double serialMs=0, parallelMs=0, speedup=0, efficiency=0; unsigned workers=1; long long checksum=0; };
Metrics run(std::size_t workload, unsigned workers, unsigned repetitions=3);
}
""",
"backend/src/performance/Benchmark.cpp": r"""
#include "nexus/performance/Benchmark.hpp"
#include <algorithm>
#include <chrono>
#include <stdexcept>
#include <thread>
#include <vector>
namespace nexus::performance {
using Clock=std::chrono::steady_clock;
static long long work(std::size_t begin,std::size_t end) {
    long long sum=0; for(std::size_t i=begin;i<end;++i) sum+=static_cast<long long>((i*17u+3u)%997u); return sum;
}
Metrics run(std::size_t n,unsigned workers,unsigned reps) {
    if(n==0 || workers<1 || workers>4 || reps==0) throw std::invalid_argument("workload/repetitions must be positive and workers must be 1..4");
    std::vector<double> serial,parallel; long long checksum=0;
    for(unsigned r=0;r<reps;++r) {
        auto a=Clock::now(); auto s=work(0,n); auto b=Clock::now(); serial.push_back(std::chrono::duration<double,std::milli>(b-a).count());
        std::vector<std::thread> ts; std::vector<long long> sums(workers);
        a=Clock::now();
        for(unsigned w=0;w<workers;++w) { const auto lo=n*w/workers, hi=n*(w+1)/workers; ts.emplace_back([&,w,lo,hi]{sums[w]=work(lo,hi);}); }
        for(auto& t:ts)t.join(); b=Clock::now();
        long long p=0; for(auto x:sums)p+=x; if(p!=s) throw std::runtime_error("Serial/parallel checksum mismatch");
        checksum=p; parallel.push_back(std::chrono::duration<double,std::milli>(b-a).count());
    }
    auto med=[](std::vector<double> v){ std::sort(v.begin(),v.end()); return v[v.size()/2]; };
    Metrics m; m.serialMs=med(serial); m.parallelMs=med(parallel); m.workers=workers; m.checksum=checksum;
    m.speedup=m.parallelMs>0?m.serialMs/m.parallelMs:0; m.efficiency=m.speedup/workers; return m;
}
}
""",
"backend/include/nexus/hardware/Hardware.hpp": r"""
#pragma once
#include <string>
#include <vector>
namespace nexus::hardware {
struct Device { std::string id,type,state,firmware; double temperatureC=0,utilization=0; bool simulated=true; };
std::vector<Device> devices();
Device connect(const std::string& id);
Device disconnect(const std::string& id);
}
""",
"backend/src/hardware/Hardware.cpp": r"""
#include "nexus/hardware/Hardware.hpp"
#include <stdexcept>
namespace nexus::hardware {
static std::vector<Device> registry{{"mcu-01","Microcontroller","disconnected","sim-fw-1.0",34.2,12,true},
{"fpga-01","FPGA","disconnected","sim-bitstream-1.0",41.0,0,true},
{"jtag-01","JTAG Adapter","disconnected","sim-adapter-1.0",29.0,0,true}};
std::vector<Device> devices(){ return registry; }
Device connect(const std::string& id){ for(auto& d:registry)if(d.id==id){d.state="connected";return d;} throw std::invalid_argument("Unknown device id"); }
Device disconnect(const std::string& id){ for(auto& d:registry)if(d.id==id){d.state="disconnected";return d;} throw std::invalid_argument("Unknown device id"); }
}
""",
"backend/include/nexus/ml/NeuralNetwork.hpp": r"""
#pragma once
#include <vector>
namespace nexus::ml {
struct Check { double maxAbsoluteDifference=0; bool passed=false; };
class NeuralNetwork {
public:
    NeuralNetwork(double learningRate=0.1);
    double forward(double x);
    double train(double x,double target);
    Check gradientCheck(double x,double target,double epsilon=1e-5);
    double weight1() const { return w1_; }
    double weight2() const { return w2_; }
private:
    double w1_=0.4,b1_=0.1,w2_=-0.3,b2_=0.2,lr_;
};
}
""",
"backend/src/ml/NeuralNetwork.cpp": r"""
#include "nexus/ml/NeuralNetwork.hpp"
#include <algorithm>
#include <cmath>
namespace nexus::ml {
static double sig(double x){ return 1.0/(1.0+std::exp(-x)); }
NeuralNetwork::NeuralNetwork(double lr):lr_(lr){}
double NeuralNetwork::forward(double x){ return sig(w2_*sig(w1_*x+b1_)+b2_); }
double NeuralNetwork::train(double x,double y){
    const double h=sig(w1_*x+b1_), o=sig(w2_*h+b2_), loss=0.5*(o-y)*(o-y);
    const double dO=(o-y)*o*(1-o), dW2=dO*h, dB2=dO;
    const double dH=dO*w2_*h*(1-h), dW1=dH*x, dB1=dH;
    w2_-=lr_*dW2; b2_-=lr_*dB2; w1_-=lr_*dW1; b1_-=lr_*dB1; return loss;
}
Check NeuralNetwork::gradientCheck(double x,double y,double eps){
    // Compare analytical gradients for w1 against a central finite difference.
    const double h=sig(w1_*x+b1_),o=sig(w2_*h+b2_);
    const double analytical=(o-y)*o*(1-o)*w2_*h*(1-h)*x;
    auto loss=[&](double w){double hh=sig(w*x+b1_);double oo=sig(w2_*hh+b2_);return 0.5*(oo-y)*(oo-y);};
    const double numerical=(loss(w1_+eps)-loss(w1_-eps))/(2*eps);
    Check c; c.maxAbsoluteDifference=std::abs(analytical-numerical); c.passed=c.maxAbsoluteDifference<1e-5; return c;
}
}
""",
"backend/include/nexus/api/ApiServer.hpp": r"""
#pragma once
namespace nexus::api { bool runServer(const char* host, int port); }
""",
"backend/src/api/ApiServer.cpp": r"""
#include "nexus/api/ApiServer.hpp"
#include "nexus/thermal/ThermalSolver.hpp"
#include "nexus/geometry/Geometry.hpp"
#include "nexus/performance/Benchmark.hpp"
#include "nexus/hardware/Hardware.hpp"
#include "nexus/ml/NeuralNetwork.hpp"
#include "httplib.h"
#include <nlohmann/json.hpp>
#include <string>
using json=nlohmann::json;
namespace nexus::api {
static json deviceJson(const nexus::hardware::Device& d){return {{"id",d.id},{"type",d.type},{"state",d.state},{"firmware",d.firmware},{"temperatureC",d.temperatureC},{"utilization",d.utilization},{"simulated",d.simulated}};}
bool runServer(const char* host,int port){
    httplib::Server s;
    s.Get("/api/v1/health",[](const auto&,auto& r){r.set_content(json{{"status","ok"},{"application","NEXUS"},{"engine","C++17"},{"version",NEXUS_VERSION}}.dump(),"application/json");});
    s.Get("/api/v1/system",[](const auto&,auto& r){r.set_content(json{{"os",
#ifdef _WIN32
    "Windows"
#else
    "non-Windows"
#endif
    },{"cplusplus",__cplusplus},{"backend","nexus-core"}}.dump(),"application/json");});
    s.Get("/api/v1/modules",[](const auto&,auto& r){r.set_content(json{{"thermal","available"},{"geometry","available"},{"performance","available"},{"hardware","simulated"},{"ml","available"}}.dump(),"application/json");});
    s.Get("/api/v1/thermal/defaults",[](const auto&,auto& r){r.set_content(json{{"length",1.0},{"area",1e-4},{"conductivity",10.0},{"generation",10000.0},{"leftTemperature",100.0},{"rightTemperature",20.0},{"meshElements",{10,20,40,80}}}.dump(),"application/json");});
    s.Post("/api/v1/thermal/solve",[](const auto& q,auto& r){try{auto j=json::parse(q.body); nexus::thermal::Parameters p;
        p.length=j.value("length",p.length);p.area=j.value("area",p.area);p.conductivity=j.value("conductivity",p.conductivity);p.generation=j.value("generation",p.generation);p.leftTemperature=j.value("leftTemperature",p.leftTemperature);p.rightTemperature=j.value("rightTemperature",p.rightTemperature);p.elements=j.value("elements",p.elements);
        auto z=nexus::thermal::solve(p);json x={{"x",z.x},{"fem",z.fem},{"analytical",z.analytical},{"maxAbsoluteError",z.maxAbsoluteError},{"rmsError",z.rmsError},{"executionMilliseconds",z.executionMilliseconds}};r.set_content(x.dump(),"application/json");
    }catch(const std::exception&e){r.status=400;r.set_content(json{{"status","error"},{"message",e.what()}}.dump(),"application/json");}});
    s.Post("/api/v1/performance/run",[](const auto&q,auto&r){try{auto j=json::parse(q.body);auto m=nexus::performance::run(j.value("workload",1000000u),j.value("workers",2u),j.value("repetitions",3u));r.set_content(json{{"serialMs",m.serialMs},{"parallelMs",m.parallelMs},{"speedup",m.speedup},{"efficiency",m.efficiency},{"workers",m.workers},{"checksum",m.checksum}}.dump(),"application/json");}catch(const std::exception&e){r.status=400;r.set_content(json{{"error",e.what()}}.dump(),"application/json");}});
    s.Get("/api/v1/hardware/devices",[](const auto&,auto&r){json a=json::array();for(auto&d:nexus::hardware::devices())a.push_back(deviceJson(d));r.set_content(a.dump(),"application/json");});
    s.Post("/api/v1/hardware/connect",[](const auto&q,auto&r){try{auto j=json::parse(q.body);r.set_content(deviceJson(nexus::hardware::connect(j.at("id"))).dump(),"application/json");}catch(const std::exception&e){r.status=400;r.set_content(json{{"error",e.what()}}.dump(),"application/json");}});
    s.Post("/api/v1/hardware/disconnect",[](const auto&q,auto&r){try{auto j=json::parse(q.body);r.set_content(deviceJson(nexus::hardware::disconnect(j.at("id"))).dump(),"application/json");}catch(const std::exception&e){r.status=400;r.set_content(json{{"error",e.what()}}.dump(),"application/json");}});
    s.Post("/api/v1/ml/forward",[](const auto&q,auto&r){try{auto j=json::parse(q.body);nexus::ml::NeuralNetwork n;r.set_content(json{{"output",n.forward(j.at("input").get<double>())}}.dump(),"application/json");}catch(const std::exception&e){r.status=400;r.set_content(json{{"error",e.what()}}.dump(),"application/json");}});
    s.Post("/api/v1/ml/gradient-check",[](const auto&q,auto&r){try{auto j=json::parse(q.body);nexus::ml::NeuralNetwork n;auto c=n.gradientCheck(j.value("input",0.5),j.value("target",1.0));r.set_content(json{{"passed",c.passed},{"maxAbsoluteDifference",c.maxAbsoluteDifference}}.dump(),"application/json");}catch(const std::exception&e){r.status=400;r.set_content(json{{"error",e.what()}}.dump(),"application/json");}});
    return s.listen(host,port);
}
}
""",
"backend/src/main.cpp": r"""
#include "nexus/api/ApiServer.hpp"
#include <iostream>
#ifndef NEXUS_VERSION
#define NEXUS_VERSION "dev"
#endif
int main(int argc,char**argv){
    int port=7878; if(argc>1){try{port=std::stoi(argv[1]);}catch(...){std::cerr<<"Invalid port\n";return 2;}}
    std::cout<<"NEXUS C++17 backend "<<NEXUS_VERSION<<"\nListening on http://127.0.0.1:"<<port<<"\n";
    if(!nexus::api::runServer("127.0.0.1",port)){std::cerr<<"Could not start server (port may be in use).\n";return 1;} return 0;
}
""",
"backend/tests/test_main.cpp": r"""
#include <gtest/gtest.h>
#include "nexus/thermal/ThermalSolver.hpp"
#include "nexus/performance/Benchmark.hpp"
#include "nexus/ml/NeuralNetwork.hpp"
TEST(Thermal, BoundaryConditionsAndAccuracy) {
    nexus::thermal::Parameters p; p.elements=10; auto r=nexus::thermal::solve(p);
    EXPECT_DOUBLE_EQ(r.fem.front(),p.leftTemperature);
    EXPECT_DOUBLE_EQ(r.fem.back(),p.rightTemperature);
    EXPECT_LT(r.maxAbsoluteError,1e-8);
}
TEST(Performance, SerialParallelEquivalent) {
    auto m=nexus::performance::run(10000,2,1); EXPECT_GT(m.checksum,0);
}
TEST(ML, GradientCheck) {
    nexus::ml::NeuralNetwork n; EXPECT_TRUE(n.gradientCheck(0.5,1.0).passed);
}
""",
"backend/data/sample_csv/temperature_points.csv": "x,y,z,temperature\n0,0,0,100\n0.5,0,0,60\n1,0,0,20\n",
"backend/data/sample_models/README.txt": "Place sample ASCII or binary STL models in this directory.\n",
"backend/docs/ARCHITECTURE.md": "# NEXUS backend architecture\n\nThe C++17 backend exposes a loopback HTTP API. Numerical and parsing work belongs in the C++ library; the frontend is responsible for visualization.\n",
"backend/docs/THERMAL_FEA_MATHEMATICS.md": "# Thermal FEM\n\nThe solver uses linear two-node 1D elements, consistent element heat-generation loads, Dirichlet endpoint temperatures, and Gaussian elimination with partial pivoting. For constant properties and uniform generation, it compares nodal values with the analytical solution supplied in the project specification.\n",
"backend/docs/API_REFERENCE.md": "# API reference\n\nBase URL: `http://127.0.0.1:7878`\n\n- `GET /api/v1/health`\n- `GET /api/v1/system`\n- `GET /api/v1/modules`\n- `GET /api/v1/thermal/defaults`\n- `POST /api/v1/thermal/solve` JSON: `{ \"elements\": 10 }` plus optional physical parameters\n- `POST /api/v1/performance/run` JSON: `{ \"workload\": 1000000, \"workers\": 2, \"repetitions\": 3 }`\n- `GET /api/v1/hardware/devices`\n- `POST /api/v1/hardware/connect` JSON: `{ \"id\": \"mcu-01\" }`\n- `POST /api/v1/hardware/disconnect` JSON: `{ \"id\": \"mcu-01\" }`\n- `POST /api/v1/ml/forward` JSON: `{ \"input\": 0.5 }`\n- `POST /api/v1/ml/gradient-check` JSON: `{ \"input\": 0.5, \"target\": 1.0 }`\n\nErrors use HTTP 400 and a JSON `error` or `message` field. Geometry parsers are available as C++ library functions; multipart upload routes are not included in this initial generator version.\n",
"backend/docs/TESTING_REPORT.md": "# Testing\n\nGoogleTest covers thermal boundary conditions and analytical accuracy, serial/parallel checksum equivalence, and neural-network gradient checking. Run `ctest --test-dir <build-dir> --output-on-failure`. This file describes test coverage, not a claim that tests have already run on your machine.\n",
"backend/docs/BUILD_INSTRUCTIONS.md": "# Build instructions\n\nRequires CMake 3.20+, Git, and a C++17 compiler. CMake downloads pinned dependencies during configure, so the first configure needs network access.\n\n## MSVC (Developer PowerShell)\n\n```powershell\ncmake -S backend -B backend/build-msvc -G \"Visual Studio 17 2022\" -A x64\ncmake --build backend/build-msvc --config Release\nctest --test-dir backend/build-msvc -C Release --output-on-failure\n.\\backend\\build-msvc\\Release\\nexus-core.exe\n```\n\n## MinGW (MSYS2 UCRT64)\n\n```bash\ncmake -S backend -B backend/build-mingw -G Ninja -DCMAKE_BUILD_TYPE=Release -DCMAKE_CXX_COMPILER=g++\ncmake --build backend/build-mingw\nctest --test-dir backend/build-mingw --output-on-failure\n./backend/build-mingw/nexus-core.exe\n```\n",
"backend/README.md": "# NEXUS C++17 Backend\n\nThis backend provides a local HTTP API and C++ modules for thermal FEM, geometry file parsing, benchmarking, simulated hardware, and a small neural network.\n\nSee `docs/BUILD_INSTRUCTIONS.md` before building. The first CMake configure downloads pinned dependencies and therefore requires network access.\n\n**Scope notes:** hardware adapters are simulated. STL and CSV parsing are implemented as C++ library functions; this initial API does not expose file-upload endpoints. Experiment persistence, production authentication, Tauri sidecar packaging, and full training endpoints are not included yet. Do not present these as completed features.\n",
"backend/scripts/build-msvc.ps1": "cmake -S .. -B ../build-msvc -G \"Visual Studio 17 2022\" -A x64\nif ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }\ncmake --build ../build-msvc --config Release\nexit $LASTEXITCODE\n",
"backend/scripts/build-mingw.sh": "#!/usr/bin/env bash\nset -e\ncmake -S .. -B ../build-mingw -G Ninja -DCMAKE_BUILD_TYPE=Release -DCMAKE_CXX_COMPILER=g++\ncmake --build ../build-mingw\n"
}

DIRS = [
"backend/include/nexus/core","backend/include/nexus/api","backend/include/nexus/thermal",
"backend/include/nexus/geometry","backend/include/nexus/performance","backend/include/nexus/hardware",
"backend/include/nexus/ml","backend/src/core","backend/src/api","backend/src/thermal",
"backend/src/geometry","backend/src/performance","backend/src/hardware","backend/src/ml",
"backend/tests/thermal","backend/tests/geometry","backend/tests/performance",
"backend/tests/hardware","backend/tests/ml","backend/tests/api","backend/data/sample_models",
"backend/data/sample_csv","backend/docs","backend/scripts","results","docs"
]

def main() -> int:
    parser = argparse.ArgumentParser(description="Create the NEXUS C++17 backend.")
    parser.add_argument("--overwrite", action="store_true",
                        help="replace files generated by this script if they already exist")
    parser.add_argument("--root", type=Path, default=Path.cwd(),
                        help="NEXUS project root (default: current directory)")
    args = parser.parse_args()
    root = args.root.expanduser().resolve()
    created, existing, failed = [], [], []
    print(f"NEXUS setup root: {root}")
    try:
        root.mkdir(parents=True, exist_ok=True)
        for relative in DIRS:
            path = root / relative
            path.mkdir(parents=True, exist_ok=True)
        print(f"[OK] Ensured {len(DIRS)} directories.")
    except OSError as exc:
        print(f"[ERROR] Could not create directory: {exc}", file=sys.stderr)
        return 1

    for relative, content in FILES.items():
        target = root / relative
        try:
            target.parent.mkdir(parents=True, exist_ok=True)
            if target.exists() and not args.overwrite:
                existing.append(relative)
                print(f"[KEEP] {relative}")
                continue
            target.write_text(textwrap.dedent(content).lstrip("\n"), encoding="utf-8", newline="\n")
            created.append(relative)
            print(f"[WRITE] {relative}")
        except OSError as exc:
            failed.append((relative, str(exc)))
            print(f"[ERROR] {relative}: {exc}", file=sys.stderr)

    print("\n========== NEXUS SETUP REPORT ==========")
    print(f"Created/replaced: {len(created)}")
    print(f"Already existed and preserved: {len(existing)}")
    print(f"Failed: {len(failed)}")
    if failed:
        for name, error in failed:
            print(f" - {name}: {error}")
        return 1
    print("Setup completed. C++ compilation has NOT been performed by this script.")
    print("Next: read backend/README.md and backend/docs/BUILD_INSTRUCTIONS.md.")
    return 0

if __name__ == "__main__":
    raise SystemExit(main())
