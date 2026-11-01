# Build instructions

Requires CMake 3.20+, Git, and a C++17 compiler. CMake downloads pinned dependencies during configure, so the first configure needs network access.

## MSVC (Developer PowerShell)

```powershell
cmake -S backend -B backend/build-msvc -G "Visual Studio 17 2022" -A x64
cmake --build backend/build-msvc --config Release
ctest --test-dir backend/build-msvc -C Release --output-on-failure
.\backend\build-msvc\Release\nexus-core.exe
```

## MinGW (MSYS2 UCRT64)

```bash
cmake -S backend -B backend/build-mingw -G Ninja -DCMAKE_BUILD_TYPE=Release -DCMAKE_CXX_COMPILER=g++
cmake --build backend/build-mingw
ctest --test-dir backend/build-mingw --output-on-failure
./backend/build-mingw/nexus-core.exe
```
