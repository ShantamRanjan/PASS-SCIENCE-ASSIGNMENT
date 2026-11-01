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
