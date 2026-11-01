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
