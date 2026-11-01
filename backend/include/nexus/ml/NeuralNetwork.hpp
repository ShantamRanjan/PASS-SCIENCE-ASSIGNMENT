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
