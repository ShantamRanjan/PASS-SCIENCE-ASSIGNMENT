# API reference

Base URL: `http://127.0.0.1:7878`

- `GET /api/v1/health`
- `GET /api/v1/system`
- `GET /api/v1/modules`
- `GET /api/v1/thermal/defaults`
- `POST /api/v1/thermal/solve` JSON: `{ "elements": 10 }` plus optional physical parameters
- `POST /api/v1/performance/run` JSON: `{ "workload": 1000000, "workers": 2, "repetitions": 3 }`
- `GET /api/v1/hardware/devices`
- `POST /api/v1/hardware/connect` JSON: `{ "id": "mcu-01" }`
- `POST /api/v1/hardware/disconnect` JSON: `{ "id": "mcu-01" }`
- `POST /api/v1/ml/forward` JSON: `{ "input": 0.5 }`
- `POST /api/v1/ml/gradient-check` JSON: `{ "input": 0.5, "target": 1.0 }`

Errors use HTTP 400 and a JSON `error` or `message` field. Geometry parsers are available as C++ library functions; multipart upload routes are not included in this initial generator version.
