#include "nexus/ml/NeuralNetwork.hpp"
#include <algorithm>
#include <cmath>
namespace nexus::ml {
static double sig(double x){ return 1.0/(1.0+std::exp(-x)); }
NeuralNetwork::NeuralNetwork(double lr):lr_(lr){}
double NeuralNetwork::forward(double x){ return sig(w2_*sig(w1_*x+b1_)+b2_); }
double NeuralNetwork::train(double x,double y){
    const double h=sig(w1_*x+b1_), o=sig(w2_*h+b2_), loss=0.5*(o-y)*(o-y);
    const double dO=(o-y)*o*(1-o), dW2=dO*h, dB2=dO;
    const double dH=dO*w2_*h*(1-h), dW1=dH*x, dB1=dH;
    w2_-=lr_*dW2; b2_-=lr_*dB2; w1_-=lr_*dW1; b1_-=lr_*dB1; return loss;
}
Check NeuralNetwork::gradientCheck(double x,double y,double eps){
    // Compare analytical gradients for w1 against a central finite difference.
    const double h=sig(w1_*x+b1_),o=sig(w2_*h+b2_);
    const double analytical=(o-y)*o*(1-o)*w2_*h*(1-h)*x;
    auto loss=[&](double w){double hh=sig(w*x+b1_);double oo=sig(w2_*hh+b2_);return 0.5*(oo-y)*(oo-y);};
    const double numerical=(loss(w1_+eps)-loss(w1_-eps))/(2*eps);
    Check c; c.maxAbsoluteDifference=std::abs(analytical-numerical); c.passed=c.maxAbsoluteDifference<1e-5; return c;
}
}
