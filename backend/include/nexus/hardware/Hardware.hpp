#pragma once
#include <string>
#include <vector>
namespace nexus::hardware {
struct Device { std::string id,type,state,firmware; double temperatureC=0,utilization=0; bool simulated=true; };
std::vector<Device> devices();
Device connect(const std::string& id);
Device disconnect(const std::string& id);
}
