# NEXUS setup script

1. Save `setup_nexus.py` in your NEXUS project root.
2. Open PowerShell in that directory.
3. Run `python setup_nexus.py`.
4. Existing files are preserved by default. To replace generated backend files deliberately, run `python setup_nexus.py --overwrite`.
5. Review `backend/README.md` and `backend/docs/BUILD_INSTRUCTIONS.md`.

The script creates C++ source files; it does not compile C++. Build and test locally using the generated instructions.

Scope notes: hardware adapters are simulated. STL and CSV parsing are implemented as C++ library functions, but file-upload HTTP endpoints are not included. Experiment persistence, production authentication, and Tauri sidecar packaging remain future work.
