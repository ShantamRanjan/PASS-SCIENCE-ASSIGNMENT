<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## NEXUS architecture rules
- All backend calls go through `src/services/api.ts` returning `ApiResult<T>`; it will later swap to Tauri IPC, so pages never call fetch directly.
- Engineering math lives in the C++ engine only; the frontend renders `src/types/api.ts` contracts and never fabricates results.
- Preview data lives in `src/lib/demo-data.ts` and must always render next to `<DemoBadge />`.
- Shared layout (sidebar/header) is `src/components/nexus/AppShell.tsx`, mounted in `__root.tsx`; one route file per module.
- Dashboard system fields use `src/lib/system-information.ts` with confirmed native health data only; optional fields support engine versions that do not report OS or CPU yet.
- Geometry import quick actions use validated search parameters to focus the existing file selectors; native file dialogs remain user-initiated.
