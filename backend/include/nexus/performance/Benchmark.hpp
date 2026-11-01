#pragma once
#include <cstddef>
namespace nexus::performance {
struct Metrics { double serialMs=0, parallelMs=0, speedup=0, efficiency=0; unsigned workers=1; long long checksum=0; };
Metrics run(std::size_t workload, unsigned workers, unsigned repetitions=3);
}
