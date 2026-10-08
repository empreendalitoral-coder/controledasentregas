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

- Community Premium access is enforced by database policies and `get_community_access_status`; UI checks only present the resulting state, preventing client bypass.
- Community message moderation runs through `moderate_community_message`, which derives the moderator from the authenticated session and preserves an admin-only audit record.
- Community participants read sanitized messages through `get_community_messages`; anonymous author IDs remain server-side and are exposed only to administrators for moderation.
- Backup restoration must use the authenticated `restore_entrega_pro_backup` database function so all imported records commit or roll back together.

- Multas are standalone user-owned records in the shared store and atomic backup RPC; never include them in profit calculations without explicit approval.
- AppShell conversation mode omits legal footer links so the community composer can remain adjacent to the transcript.
- Fiscal reports derive classification automatically from unified movement origin, never read or write legacy fiscal annotations, and never change operational profit; this removes per-record manual work.
- Unified financial reads select exactly one work-revenue basis: daily earnings for fiscal reports, actual settlements for cash flow (the default); this prevents counting the same work twice.
