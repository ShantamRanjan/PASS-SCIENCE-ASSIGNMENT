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
