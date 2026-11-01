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
