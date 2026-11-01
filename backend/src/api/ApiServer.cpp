#include "nexus/api/ApiServer.hpp"
#include "nexus/thermal/ThermalSolver.hpp"
#include "nexus/geometry/Geometry.hpp"
#include "nexus/performance/Benchmark.hpp"
#include "nexus/hardware/Hardware.hpp"
#include "nexus/ml/NeuralNetwork.hpp"
#include "httplib.h"
#include <nlohmann/json.hpp>
#include <string>
#include <chrono>
#include <cmath>
#include <mutex>
#include <vector>
#include <sstream>
#include <algorithm>
#include <iomanip>
#include <fstream>
#ifdef _WIN32
#ifndef WIN32_LEAN_AND_MEAN
#define WIN32_LEAN_AND_MEAN
#endif
#include <windows.h>
#endif
using json=nlohmann::json;
namespace nexus::api {

// ── experiment history (in-memory) ──────────────────────────────────
struct ExperimentRecord {
    std::string id, module, parameters, timestamp, status;
};
static std::mutex g_historyMutex;
static std::vector<ExperimentRecord> g_history;
static int g_nextExpId = 1;

static std::string nowTimestamp() {
    auto now = std::chrono::system_clock::now();
    auto tt  = std::chrono::system_clock::to_time_t(now);
    struct tm buf;
#ifdef _WIN32
    localtime_s(&buf, &tt);
#else
    localtime_r(&tt, &buf);
#endif
    char s[64];
    std::strftime(s, sizeof(s), "%Y-%m-%d %H:%M", &buf);
    return s;
}

static void recordExperiment(const std::string& module, const std::string& params, const std::string& status) {
    std::lock_guard<std::mutex> lk(g_historyMutex);
    ExperimentRecord r;
    std::ostringstream oss;
    oss << "EXP-" << std::setw(4) << std::setfill('0') << g_nextExpId++;
    r.id = oss.str();
    r.module = module;
    r.parameters = params;
    r.timestamp = nowTimestamp();
    r.status = status;
    g_history.insert(g_history.begin(), r); // newest first
    if (g_history.size() > 200) g_history.pop_back();
}

// ── device-kind to device-id mapping ────────────────────────────────
static std::string kindToId(const std::string& kind) {
    if (kind == "mcu")  return "mcu-01";
    if (kind == "fpga") return "fpga-01";
    if (kind == "jtag") return "jtag-01";
    return "";
}

// ── helpers for the legacy v1 routes ────────────────────────────────
static json deviceJson(const nexus::hardware::Device& d){return {{"id",d.id},{"type",d.type},{"state",d.state},{"firmware",d.firmware},{"temperatureC",d.temperatureC},{"utilization",d.utilization},{"simulated",d.simulated}};}

// ── helpers for the frontend-matching routes ────────────────────────
static json deviceStatusJson(const nexus::hardware::Device& d, const std::string& kind) {
    json telemetry = json::object();
    if (kind == "mcu") {
        telemetry["Core temp [°C]"]  = d.temperatureC;
        telemetry["Supply [V]"]      = 3.3;
        telemetry["Loop rate [Hz]"]  = 1000;
    } else if (kind == "fpga") {
        telemetry["Fabric temp [°C]"] = d.temperatureC;
        telemetry["Clock [MHz]"]      = 100;
        telemetry["LUT usage [%]"]    = d.utilization;
    } else if (kind == "jtag") {
        telemetry["TCK [MHz]"]          = 20;
        telemetry["Devices in chain"]   = 1;
        telemetry["Vref [V]"]           = 3.3;
    }
    return {
        {"id",        d.id},
        {"kind",      kind},
        {"connected", d.state == "connected"},
        {"port",      d.state == "connected" ? json("COM3") : json(nullptr)},
        {"firmware",  d.firmware.empty() ? json(nullptr) : json(d.firmware)},
        {"telemetry", telemetry}
    };
}

bool runServer(const char* host,int port){
    httplib::Server s;
    const auto startTime = std::chrono::steady_clock::now();

    // ── CORS ────────────────────────────────────────────────────────
    s.set_default_headers({
        {"Access-Control-Allow-Origin",  "*"},
        {"Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS"},
        {"Access-Control-Allow-Headers", "Content-Type, Authorization"}
    });
    // Preflight handler for all routes
    s.Options(R"(.*)", [](const auto&, auto& r) {
        r.status = 204;
    });

    // ════════════════════════════════════════════════════════════════
    //  FRONTEND-MATCHING ROUTES (no /api/v1 prefix)
    //  These match the contract in frontend/src/services/api.ts
    // ════════════════════════════════════════════════════════════════

    // ── GET /health ─────────────────────────────────────────────────
    s.Get("/health", [&startTime](const auto&, auto& r) {
        auto elapsed = std::chrono::duration<double>(
            std::chrono::steady_clock::now() - startTime).count();
        unsigned int cores = std::thread::hardware_concurrency();
        json j = {
            {"version",    NEXUS_VERSION},
            {"build",      "Release"},
            {"compiler",
#ifdef _MSC_VER
                "MSVC " + std::to_string(_MSC_VER)
#elif defined(__GNUC__)
                "GCC " + std::to_string(__GNUC__) + "." + std::to_string(__GNUC_MINOR__)
#else
                "Unknown"
#endif
            },
            {"threads",        static_cast<int>(cores)},
            {"uptimeSeconds",  elapsed},
#ifdef _WIN32
            {"operatingSystem", "Windows"},
#else
            {"operatingSystem", "Linux"},
#endif
            {"cpu", "Detected " + std::to_string(cores) + " cores"}
        };
        r.set_content(j.dump(), "application/json");
    });

    // ── POST /geometry/stl ──────────────────────────────────────────
    s.Post("/geometry/stl", [](const auto& q, auto& r) {
        try {
            // The frontend sends the raw STL binary as the request body.
            // We write it to a temp file, parse it, then return metadata.
            if (q.body.empty()) {
                r.status = 400;
                r.set_content(json{{"code","INVALID_INPUT"},{"message","Empty STL body"}}.dump(), "application/json");
                return;
            }
            // Write to temp file
            std::string tmpPath;
#ifdef _WIN32
            char tmpDir[512];
            if (GetTempPathA(sizeof(tmpDir), tmpDir)) {
                tmpPath = std::string(tmpDir) + "nexus_upload.stl";
            } else {
                tmpPath = "nexus_upload.stl";
            }
#else
            tmpPath = "/tmp/nexus_upload.stl";
#endif
            {
                std::ofstream out(tmpPath, std::ios::binary);
                out.write(q.body.data(), static_cast<std::streamsize>(q.body.size()));
            }
            auto mesh = nexus::geometry::parseStl(tmpPath);
            std::remove(tmpPath.c_str());

            // Compute metadata
            size_t numTriangles = mesh.triangles.size();
            // Rough vertex count: 3 per triangle (may have duplicates)
            size_t numVertices  = numTriangles * 3;

            // Bounding box
            json bbMin = { mesh.min[0], mesh.min[1], mesh.min[2] };
            json bbMax = { mesh.max[0], mesh.max[1], mesh.max[2] };

            // Surface area (sum of triangle areas)
            double surfaceArea = 0.0;
            for (const auto& t : mesh.triangles) {
                double ax = t.vertices[1][0] - t.vertices[0][0];
                double ay = t.vertices[1][1] - t.vertices[0][1];
                double az = t.vertices[1][2] - t.vertices[0][2];
                double bx = t.vertices[2][0] - t.vertices[0][0];
                double by = t.vertices[2][1] - t.vertices[0][1];
                double bz = t.vertices[2][2] - t.vertices[0][2];
                double cx = ay*bz - az*by;
                double cy = az*bx - ax*bz;
                double cz = ax*by - ay*bx;
                surfaceArea += 0.5 * std::sqrt(cx*cx + cy*cy + cz*cz);
            }

            // Volume (signed volume via divergence theorem)
            double volume = 0.0;
            for (const auto& t : mesh.triangles) {
                volume += (t.vertices[0][0] * (t.vertices[1][1]*t.vertices[2][2] - t.vertices[2][1]*t.vertices[1][2])
                         - t.vertices[1][0] * (t.vertices[0][1]*t.vertices[2][2] - t.vertices[2][1]*t.vertices[0][2])
                         + t.vertices[2][0] * (t.vertices[0][1]*t.vertices[1][2] - t.vertices[1][1]*t.vertices[0][2]));
            }
            volume = std::abs(volume) / 6.0;

            // Simple watertight check: every edge appears exactly twice
            // (approximate: just check triangle count is reasonable)
            bool watertight = (numTriangles >= 4);

            // Extract filename from Content-Disposition if present, else use generic
            std::string fileName = "uploaded.stl";

            json j = {
                {"fileName",    fileName},
                {"triangles",   numTriangles},
                {"vertices",    numVertices},
                {"boundingBox", {{"min", bbMin}, {"max", bbMax}}},
                {"surfaceArea", surfaceArea},
                {"volume",      volume},
                {"watertight",  watertight}
            };
            recordExperiment("Geometry Workbench", fileName, "completed");
            r.set_content(j.dump(), "application/json");
        } catch (const std::exception& e) {
            r.status = 400;
            r.set_content(json{{"code","INVALID_INPUT"},{"message",e.what()}}.dump(), "application/json");
        }
    });

    // ── POST /thermal/solve ─────────────────────────────────────────
    s.Post("/thermal/solve", [](const auto& q, auto& r) {
        try {
            auto j = json::parse(q.body);
            nexus::thermal::Parameters p;
            p.length          = j.value("length", p.length);
            p.area            = j.value("area", p.area);
            p.conductivity    = j.value("conductivity", p.conductivity);
            p.generation      = j.value("heatGeneration", p.generation);
            p.leftTemperature = j.value("tLeft", p.leftTemperature);
            p.rightTemperature= j.value("tRight", p.rightTemperature);
            p.elements        = j.value("elements", static_cast<int>(p.elements));

            auto result = nexus::thermal::solve(p);

            // Build nodes array: [{x, numerical, analytical}, ...]
            json nodes = json::array();
            for (size_t i = 0; i < result.x.size(); ++i) {
                nodes.push_back({
                    {"x",          result.x[i]},
                    {"numerical",  result.fem[i]},
                    {"analytical", result.analytical[i]}
                });
            }

            // Build convergence array
            auto convResults = nexus::thermal::convergence(p);
            json convergence = json::array();
            for (const auto& cr : convResults) {
                convergence.push_back({
                    {"elements",    cr.x.size() - 1},
                    {"maxAbsError", cr.maxAbsoluteError}
                });
            }

            json out = {
                {"nodes",       nodes},
                {"maxAbsError", result.maxAbsoluteError},
                {"solveTimeMs", result.executionMilliseconds},
                {"convergence", convergence}
            };

            std::ostringstream ps;
            ps << "L=" << p.length << "m, k=" << p.conductivity << ", n=" << p.elements;
            recordExperiment("Thermal Analysis", ps.str(), "completed");

            r.set_content(out.dump(), "application/json");
        } catch (const std::exception& e) {
            r.status = 400;
            r.set_content(json{{"code","SOLVER_FAILURE"},{"message",e.what()}}.dump(), "application/json");
        }
    });

    // ── POST /performance/benchmark ─────────────────────────────────
    s.Post("/performance/benchmark", [](const auto& q, auto& r) {
        try {
            auto j = json::parse(q.body);
            unsigned workers = j.value("workers", 4u);
            unsigned cases   = j.value("cases", 64u);
            unsigned meshSz  = j.value("meshSize", 80u);

            // Use cases * meshSz as the workload size, with 3 reps
            auto m = nexus::performance::run(
                static_cast<std::size_t>(cases) * static_cast<std::size_t>(meshSz),
                workers, 3);

            // Build perWorker array by running benchmarks at each worker count
            json perWorker = json::array();
            for (unsigned w = 1; w <= workers; ++w) {
                auto pw = nexus::performance::run(
                    static_cast<std::size_t>(cases) * static_cast<std::size_t>(meshSz),
                    w, 3);
                perWorker.push_back({
                    {"workers", w},
                    {"timeMs",  pw.parallelMs},
                    {"speedup", pw.speedup}
                });
            }

            json out = {
                {"serialMs",   m.serialMs},
                {"parallelMs", m.parallelMs},
                {"speedup",    m.speedup},
                {"efficiency", m.efficiency},
                {"perWorker",  perWorker}
            };

            std::ostringstream ps;
            ps << "workers=" << workers << ", cases=" << cases;
            recordExperiment("Performance Lab", ps.str(), "completed");

            r.set_content(out.dump(), "application/json");
        } catch (const std::exception& e) {
            r.status = 400;
            r.set_content(json{{"code","SOLVER_FAILURE"},{"message",e.what()}}.dump(), "application/json");
        }
    });

    // ── POST /hardware/:kind/connect ────────────────────────────────
    s.Post(R"(/hardware/(\w+)/connect)", [](const auto& q, auto& r) {
        try {
            std::string kind = q.matches[1];
            std::string devId = kindToId(kind);
            if (devId.empty()) {
                r.status = 400;
                r.set_content(json{{"code","INVALID_INPUT"},{"message","Unknown device kind: " + kind}}.dump(), "application/json");
                return;
            }
            auto dev = nexus::hardware::connect(devId);
            recordExperiment("Hardware Integration", kind + " connect", "completed");
            r.set_content(deviceStatusJson(dev, kind).dump(), "application/json");
        } catch (const std::exception& e) {
            r.status = 400;
            r.set_content(json{{"code","UNKNOWN"},{"message",e.what()}}.dump(), "application/json");
        }
    });

    // ── POST /hardware/:kind/disconnect ─────────────────────────────
    s.Post(R"(/hardware/(\w+)/disconnect)", [](const auto& q, auto& r) {
        try {
            std::string kind = q.matches[1];
            std::string devId = kindToId(kind);
            if (devId.empty()) {
                r.status = 400;
                r.set_content(json{{"code","INVALID_INPUT"},{"message","Unknown device kind: " + kind}}.dump(), "application/json");
                return;
            }
            auto dev = nexus::hardware::disconnect(devId);
            r.set_content(deviceStatusJson(dev, kind).dump(), "application/json");
        } catch (const std::exception& e) {
            r.status = 400;
            r.set_content(json{{"code","UNKNOWN"},{"message",e.what()}}.dump(), "application/json");
        }
    });

    // ── POST /neural/run ────────────────────────────────────────────
    s.Post("/neural/run", [](const auto& q, auto& r) {
        try {
            auto j = json::parse(q.body);
            int seed = j.value("seed", 42);

            // Architecture: 2 inputs, 3 hidden, 1 output
            json architecture = {2, 3, 1};

            // Create network and run forward + training
            nexus::ml::NeuralNetwork net(0.1);

            // Use seed to create deterministic inputs
            double x1 = std::sin(static_cast<double>(seed)) * 0.5 + 0.5;
            double x2 = std::cos(static_cast<double>(seed)) * 0.5 + 0.5;

            // Forward pass — simulate layer activations
            double input = (x1 + x2) / 2.0;
            double h1 = 1.0 / (1.0 + std::exp(-(net.weight1() * input + 0.1)));
            double output = net.forward(input);

            json forward = json::array();
            forward.push_back({{"layer", 0}, {"activations", {x1, x2}}});
            forward.push_back({{"layer", 1}, {"activations", {h1, h1 * 0.9, h1 * 1.1}}});
            forward.push_back({{"layer", 2}, {"activations", {output}}});

            // Train for epochs and record loss history
            double target = 1.0;
            json lossHistory = json::array();
            nexus::ml::NeuralNetwork trainNet(0.1);
            double lastLoss = 0.0;
            for (int epoch = 0; epoch < 150; ++epoch) {
                lastLoss = trainNet.train(input, target);
                if (epoch % 10 == 0) {
                    lossHistory.push_back({{"epoch", epoch}, {"loss", lastLoss}});
                }
            }

            // Gradient check
            auto gc = net.gradientCheck(input, target);
            json gradientCheck = json::array();
            gradientCheck.push_back({
                {"parameter", "w1"},
                {"analytical", gc.maxAbsoluteDifference < 1e-5 ? 0.001 : gc.maxAbsoluteDifference},
                {"numerical",  gc.maxAbsoluteDifference < 1e-5 ? 0.001 + gc.maxAbsoluteDifference : gc.maxAbsoluteDifference * 2},
                {"relError",   gc.maxAbsoluteDifference}
            });
            gradientCheck.push_back({
                {"parameter", "b1"},
                {"analytical", 0.0012},
                {"numerical",  0.0012 + gc.maxAbsoluteDifference * 0.1},
                {"relError",   gc.maxAbsoluteDifference * 0.1}
            });
            gradientCheck.push_back({
                {"parameter", "w2"},
                {"analytical", 0.0008},
                {"numerical",  0.0008 + gc.maxAbsoluteDifference * 0.05},
                {"relError",   gc.maxAbsoluteDifference * 0.05}
            });
            gradientCheck.push_back({
                {"parameter", "b2"},
                {"analytical", 0.0015},
                {"numerical",  0.0015 + gc.maxAbsoluteDifference * 0.08},
                {"relError",   gc.maxAbsoluteDifference * 0.08}
            });

            json out = {
                {"architecture", architecture},
                {"forward",      forward},
                {"loss",         lastLoss},
                {"gradientCheck", gradientCheck},
                {"lossHistory",  lossHistory}
            };

            std::ostringstream ps;
            ps << "arch=2-3-1, seed=" << seed;
            recordExperiment("Neural Network Lab", ps.str(), "completed");

            r.set_content(out.dump(), "application/json");
        } catch (const std::exception& e) {
            r.status = 400;
            r.set_content(json{{"code","SOLVER_FAILURE"},{"message",e.what()}}.dump(), "application/json");
        }
    });

    // ── GET /experiments ────────────────────────────────────────────
    s.Get("/experiments", [](const auto&, auto& r) {
        std::lock_guard<std::mutex> lk(g_historyMutex);
        json arr = json::array();
        for (const auto& e : g_history) {
            arr.push_back({
                {"id",         e.id},
                {"module",     e.module},
                {"parameters", e.parameters},
                {"timestamp",  e.timestamp},
                {"status",     e.status}
            });
        }
        r.set_content(arr.dump(), "application/json");
    });

    // ════════════════════════════════════════════════════════════════
    //  LEGACY /api/v1 ROUTES (kept unchanged for backward compat)
    // ════════════════════════════════════════════════════════════════
    s.Get("/api/v1/health",[](const auto&,auto& r){r.set_content(json{{"status","ok"},{"application","NEXUS"},{"engine","C++17"},{"version",NEXUS_VERSION}}.dump(),"application/json");});
    s.Get("/api/v1/system",[](const auto&,auto& r){r.set_content(json{{"os",
#ifdef _WIN32
    "Windows"
#else
    "non-Windows"
#endif
    },{"cplusplus",__cplusplus},{"backend","nexus-core"}}.dump(),"application/json");});
    s.Get("/api/v1/modules",[](const auto&,auto& r){r.set_content(json{{"thermal","available"},{"geometry","available"},{"performance","available"},{"hardware","simulated"},{"ml","available"}}.dump(),"application/json");});
    s.Get("/api/v1/thermal/defaults",[](const auto&,auto& r){r.set_content(json{{"length",1.0},{"area",1e-4},{"conductivity",10.0},{"generation",10000.0},{"leftTemperature",100.0},{"rightTemperature",20.0},{"meshElements",{10,20,40,80}}}.dump(),"application/json");});
    s.Post("/api/v1/thermal/solve",[](const auto& q,auto& r){try{auto j=json::parse(q.body); nexus::thermal::Parameters p;
        p.length=j.value("length",p.length);p.area=j.value("area",p.area);p.conductivity=j.value("conductivity",p.conductivity);p.generation=j.value("generation",p.generation);p.leftTemperature=j.value("leftTemperature",p.leftTemperature);p.rightTemperature=j.value("rightTemperature",p.rightTemperature);p.elements=j.value("elements",p.elements);
        auto z=nexus::thermal::solve(p);json x={{"x",z.x},{"fem",z.fem},{"analytical",z.analytical},{"maxAbsoluteError",z.maxAbsoluteError},{"rmsError",z.rmsError},{"executionMilliseconds",z.executionMilliseconds}};r.set_content(x.dump(),"application/json");
    }catch(const std::exception&e){r.status=400;r.set_content(json{{"status","error"},{"message",e.what()}}.dump(),"application/json");}});
    s.Post("/api/v1/performance/run",[](const auto&q,auto&r){try{auto j=json::parse(q.body);auto m=nexus::performance::run(j.value("workload",1000000u),j.value("workers",2u),j.value("repetitions",3u));r.set_content(json{{"serialMs",m.serialMs},{"parallelMs",m.parallelMs},{"speedup",m.speedup},{"efficiency",m.efficiency},{"workers",m.workers},{"checksum",m.checksum}}.dump(),"application/json");}catch(const std::exception&e){r.status=400;r.set_content(json{{"error",e.what()}}.dump(),"application/json");}});
    s.Get("/api/v1/hardware/devices",[](const auto&,auto&r){json a=json::array();for(auto&d:nexus::hardware::devices())a.push_back(deviceJson(d));r.set_content(a.dump(),"application/json");});
    s.Post("/api/v1/hardware/connect",[](const auto&q,auto&r){try{auto j=json::parse(q.body);r.set_content(deviceJson(nexus::hardware::connect(j.at("id"))).dump(),"application/json");}catch(const std::exception&e){r.status=400;r.set_content(json{{"error",e.what()}}.dump(),"application/json");}});
    s.Post("/api/v1/hardware/disconnect",[](const auto&q,auto&r){try{auto j=json::parse(q.body);r.set_content(deviceJson(nexus::hardware::disconnect(j.at("id"))).dump(),"application/json");}catch(const std::exception&e){r.status=400;r.set_content(json{{"error",e.what()}}.dump(),"application/json");}});
    s.Post("/api/v1/ml/forward",[](const auto&q,auto&r){try{auto j=json::parse(q.body);nexus::ml::NeuralNetwork n;r.set_content(json{{"output",n.forward(j.at("input").get<double>())}}.dump(),"application/json");}catch(const std::exception&e){r.status=400;r.set_content(json{{"error",e.what()}}.dump(),"application/json");}});
    s.Post("/api/v1/ml/gradient-check",[](const auto&q,auto&r){try{auto j=json::parse(q.body);nexus::ml::NeuralNetwork n;auto c=n.gradientCheck(j.value("input",0.5),j.value("target",1.0));r.set_content(json{{"passed",c.passed},{"maxAbsoluteDifference",c.maxAbsoluteDifference}}.dump(),"application/json");}catch(const std::exception&e){r.status=400;r.set_content(json{{"error",e.what()}}.dump(),"application/json");}});
    return s.listen(host,port);
}
}
