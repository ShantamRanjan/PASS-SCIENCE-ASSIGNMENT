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
