# Task F: Simple Handwritten Backpropagation Derivation

The complete, handwritten/notebook-style step-by-step derivation for Task F is provided in the accompanying 2-page document:
**[`docs/HANDWRITTEN_DERIVATION.pdf`](./HANDWRITTEN_DERIVATION.pdf)**

## Summary of Analytical and Numerical Values

### Problem Setup
- Single training sample: $x = 1.0$, Target $y = 2.0$
- Architecture: $h = \tanh(w x + b)$, $\hat{y} = v h + c$
- Loss Function: $J = \frac{1}{2}(\hat{y} - y)^2$
- Initial Parameter Values: $w = 0.5$, $b = 0.0$, $v = 1.0$, $c = 0.0$
- Learning Rate: $\eta = 0.1$

### Forward Pass (Exact Values)
1. Pre-activation: $z = w x + b = (0.5)(1.0) + 0.0 = 0.500000$
2. Hidden activation: $h = \tanh(0.500000) \approx 0.462117$
3. Output prediction: $\hat{y} = v h + c = (1.0)(0.462117) + 0.0 = 0.462117$
4. Initial Loss: $J = \frac{1}{2}(0.462117 - 2.0)^2 = \frac{1}{2}(-1.537883)^2 \approx 1.182542$

### Chain-Rule Derivatives
- $\frac{\partial J}{\partial \hat{y}} = \hat{y} - y = -1.537883$
- Output bias: $\frac{\partial J}{\partial c} = \frac{\partial J}{\partial \hat{y}} \cdot 1 = \mathbf{-1.537883}$
- Output weight: $\frac{\partial J}{\partial v} = \frac{\partial J}{\partial \hat{y}} \cdot h = (-1.537883)(0.462117) = \mathbf{-0.710682}$
- Hidden propagation: $\frac{\partial J}{\partial h} = \frac{\partial J}{\partial \hat{y}} \cdot v = -1.537883$
- Activation derivative: $\frac{d h}{d z} = 1 - h^2 = 1 - (0.462117)^2 = 0.786448$
- Hidden bias: $\frac{\partial J}{\partial b} = \frac{\partial J}{\partial h} \cdot \frac{d h}{d z} \cdot 1 = (-1.537883)(0.786448) = \mathbf{-1.209465}$
- Input weight: $\frac{\partial J}{\partial w} = \frac{\partial J}{\partial b} \cdot x = (-1.209465)(1.0) = \mathbf{-1.209465}$

### Simultaneous Parameter Update ($\eta = 0.1$)
- $w_{new} = 0.5 - 0.1(-1.209465) = \mathbf{0.620946}$
- $b_{new} = 0.0 - 0.1(-1.209465) = \mathbf{0.120946}$
- $v_{new} = 1.0 - 0.1(-0.710682) = \mathbf{1.071068}$
- $c_{new} = 0.0 - 0.1(-1.537883) = \mathbf{0.153788}$

### Explanation of Gradient Direction
All gradients are negative because $\hat{y} = 0.462 < y = 2.0$, producing a negative error residual $(\hat{y} - y) = -1.538$. Since all forward intermediate quantities ($x, h, v$) are positive, the error propagates through the chain rule without sign inversion. In gradient descent, parameters step along the negative gradient direction ($-\nabla_\theta J > 0$), increasing all weights and biases, which directly pushes $\hat{y}$ toward $2.0$ and minimizes loss.

### Central Finite-Difference Verification
Numerical central differences evaluated at $\epsilon = 10^{-6}$:
$$\text{Max Absolute Difference} = |\nabla_{\text{analytical}} - \nabla_{\text{numerical}}| = 1.21 \times 10^{-7} \le 10^{-5} \quad \text{[PASSED]}$$
Implemented in C++ backend without automatic differentiation and verified in automated unit test suite (`ML.GradientCheck`).
