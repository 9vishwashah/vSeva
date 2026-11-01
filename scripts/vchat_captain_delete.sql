-- VChat: "Delete for everyone" for the Captain.
--   * A Captain may delete any message in their own group's VChat (members still delete only their own).
--     Groups the Captain merely follows are not affected.
--   * Every delete is broadcast to the chat's realtime channel, so the message disappears for everyone
--     who has VChat open, and the bell notifications that quoted it are removed too.
-- Additive: the existing "delete own message" policy is unchanged.

create policy "channel_posts_delete_captain_own_group" on public.channel_posts
  for delete to authenticated
  using (is_org_admin() and organization_id = get_my_org_id());

create or replace function public.broadcast_channel_post_deleted()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  -- the message's bell / push notifications (they quote its text)
  delete from public.notifications
   where type = 'channel_message' and payload->>'post_id' = old.id::text;

  perform realtime.send(
    jsonb_build_object('id', old.id, 'organization_id', old.organization_id),
    'DELETE',
    'channel:org:' || old.organization_id::text,
    true
  );
  return old;
end;
$function$;

drop trigger if exists trg_broadcast_channel_post_deleted on public.channel_posts;
create trigger trg_broadcast_channel_post_deleted
  after delete on public.channel_posts
  for each row execute function public.broadcast_channel_post_deleted();
