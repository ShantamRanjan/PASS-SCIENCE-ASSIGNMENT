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
