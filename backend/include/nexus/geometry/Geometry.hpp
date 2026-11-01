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
