import os
import zipfile

def make_archive(zip_path, root_dir):
    print(f"Creating archive {zip_path}...")
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
        # 1. Top-level files
        for fname in ["Launch.exe", "launcher.cpp", "CMakeLists.txt", "README.md", "COMMIT_LOG.txt", "submission.bundle", "setup_nexus.py"]:
            if os.path.exists(fname):
                zf.write(fname, fname)
        
        # 2. Specific directories to include
        include_dirs = ["data", "docs", "results", "src", "tests", ".vscode"]
        for d in include_dirs:
            if os.path.exists(d):
                for root, _, files in os.walk(d):
                    for f in files:
                        p = os.path.join(root, f)
                        rel = os.path.relpath(p, root_dir)
                        zf.write(p, rel)
                        
        # 3. Backend files (include, src, tests, scripts, CMakeLists, and Release binaries)
        backend_subdirs = ["backend/include", "backend/src", "backend/tests", "backend/scripts"]
        for d in backend_subdirs:
            if os.path.exists(d):
                for root, _, files in os.walk(d):
                    for f in files:
                        p = os.path.join(root, f)
                        rel = os.path.relpath(p, root_dir)
                        zf.write(p, rel)
        for f in ["backend/CMakeLists.txt", "backend/README.md"]:
            if os.path.exists(f):
                zf.write(f, f)
        # Release binaries
        rel_dir = "backend/build-msvc/Release"
        if os.path.exists(rel_dir):
            for f in os.listdir(rel_dir):
                if f.endswith(".exe"):
                    p = os.path.join(rel_dir, f)
                    rel = os.path.relpath(p, root_dir)
                    zf.write(p, rel)

        # 4. Frontend files (src, public, configs, .output production build, excluding node_modules)
        f_base = "frontend/pixel-perfect-replay-45857-main"
        for sub in ["src", "public", ".output"]:
            d = os.path.join(f_base, sub)
            if os.path.exists(d):
                for root, _, files in os.walk(d):
                    for f in files:
                        p = os.path.join(root, f)
                        rel = os.path.relpath(p, root_dir)
                        zf.write(p, rel)
        for f in os.listdir(f_base):
            if f.endswith((".json", ".ts", ".js", ".md", ".toml", ".lock")) and not os.path.isdir(os.path.join(f_base, f)):
                p = os.path.join(f_base, f)
                rel = os.path.relpath(p, root_dir)
                zf.write(p, rel)

    size_mb = os.path.getsize(zip_path) / (1024 * 1024)
    print(f"Archive created: {zip_path} ({size_mb:.2f} MB)")

root = os.getcwd()
make_archive("CandidateID_Workbench.zip", root)
make_archive("ShantamRanjan_Workbench.zip", root)
print("All archives packaged successfully!")
