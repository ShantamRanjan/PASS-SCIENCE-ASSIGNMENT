#define WIN32_LEAN_AND_MEAN
#include <windows.h>
#include <shellapi.h>
#include <string>

int WINAPI WinMain(HINSTANCE hInstance, HINSTANCE hPrevInstance, LPSTR lpCmdLine, int nCmdShow) {
    (void)hInstance; (void)hPrevInstance; (void)lpCmdLine; (void)nCmdShow;

    // 1. Get directory where Launch.exe resides
    char buffer[MAX_PATH];
    GetModuleFileNameA(NULL, buffer, MAX_PATH);
    std::string exePath(buffer);
    std::string dir = exePath.substr(0, exePath.find_last_of("\\/"));

    // 2. Start backend server: backend\build-msvc\Release\nexus-core.exe
    std::string backendExe = dir + "\\backend\\build-msvc\\Release\\nexus-core.exe";
    STARTUPINFOA siBackend = { sizeof(siBackend) };
    PROCESS_INFORMATION piBackend = { 0 };
    siBackend.dwFlags |= STARTF_USESHOWWINDOW;
    siBackend.wShowWindow = SW_HIDE;
    
    CreateProcessA(
        backendExe.c_str(), 
        NULL, 
        NULL, 
        NULL, 
        FALSE, 
        CREATE_NO_WINDOW, 
        NULL, 
        dir.c_str(), 
        &siBackend, 
        &piBackend
    );

    // 3. Start frontend preview server
    std::string frontendCmd = "cmd.exe /c \"cd /d \"" + dir + "\\frontend\\pixel-perfect-replay-45857-main\" && npx vite preview --port 5173\"";
    STARTUPINFOA siFrontend = { sizeof(siFrontend) };
    PROCESS_INFORMATION piFrontend = { 0 };
    siFrontend.dwFlags |= STARTF_USESHOWWINDOW;
    siFrontend.wShowWindow = SW_HIDE;

    CreateProcessA(
        NULL, 
        (char*)frontendCmd.c_str(), 
        NULL, 
        NULL, 
        FALSE, 
        CREATE_NO_WINDOW, 
        NULL, 
        dir.c_str(), 
        &siFrontend, 
        &piFrontend
    );

    // 4. Wait briefly for servers to listen, then open default web browser
    Sleep(2500);
    ShellExecuteA(NULL, "open", "http://localhost:5173", NULL, NULL, SW_SHOWNORMAL);

    return 0;
}
