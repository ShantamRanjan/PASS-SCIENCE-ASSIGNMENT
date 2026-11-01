cmake -S .. -B ../build-msvc -G "Visual Studio 17 2022" -A x64
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
cmake --build ../build-msvc --config Release
exit $LASTEXITCODE
