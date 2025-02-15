<script lang="ts">
  import {
    IconLayoutSidebarRightCollapse,
    IconLayoutSidebarRightExpand,
  } from "@tabler/icons-svelte";
  import ChannelIcon from "channels/ChannelIcon.svelte";
  import { UseTypingState } from "Client";
  import { channelContext, showOptionContext } from "contextmenu/ContextMenus";
  import Loader from "Loader.svelte";
  import Markdown from "markdown/Markdown.svelte";
  import { ModalStack } from "modals/ModalStack";
  import type { BaseMessage, Channel } from "revkit";
  import {
    ChannelTops,
    MembersCollapsed,
    MessageOffset,
    MessageState,
    MobileLayout,
    SelectedChannel,
  } from "State";
  import { onDestroy, onMount, tick } from "svelte";
  import { Theme } from "Theme";
  import { ulid } from "ulid";
  import { MSG_PER_PAGE, scrollTo } from "utils";
  import MessageItem from "./MessageItem.svelte";
  import Textbox from "./Textbox.svelte";

  export let channel: Channel;

  const barHeight = 40;

  let messages: BaseMessage[] = [],
    messageIndex = 0,
    useMessages: BaseMessage[] = [];
  $: {
    $MessageState;
    // reverse so newest is first
    messages = channel.messages.ordered.reverse();
    messageIndex = (
      channel.messages.get($MessageOffset) // if the offset isnt arbitrary (not a real message)
        ? messages.map((m) => m.id) // we can just get the messages
        : // otherwise we need to factor in the arbitrary offset and re-sort
          [...messages.map((m) => m.id), $MessageOffset].sort().reverse()
    ).indexOf($MessageOffset);
    // use the messages from the offset (arbitrary offsets will still work)
    useMessages = messages.slice(messageIndex, messageIndex + MSG_PER_PAGE);
  }

  let MessageList: HTMLDivElement,
    i: NodeJS.Timer,
    fetching: 1 | 0 | -1 = 0;

  onMount(() => {
    i = setInterval(async () => {
      if (fetching) return; // don't fire if we are already fetching messages
      // be within 30px of the top of the scroll container
      const isUp =
        -(MessageList.scrollHeight - MessageList.offsetHeight) >= MessageList.scrollTop - 30;
      const isDown = MessageList.scrollTop >= -15;
      if (isUp || isDown) {
        // get the first "reference" message
        // (the message at the top/bottom of the scroll container)
        const first = useMessages[isUp ? useMessages.length - 1 : 0];
        if (
          first &&
          (isUp ? ChannelTops[channel.id] == first.id : channel.lastMessageID == first.id)
        )
          return; // there's no (more) messages in the channel
        fetching = isUp ? 1 : -1; // block future fetches
        const fetched = await channel.messages.fetchMultiple({
          limit: MSG_PER_PAGE,
          include_users: true,
          ...(first ? { [isUp ? "before" : "after"]: first.id } : {}),
        });
        // add an offset so there's still messages below the reference (1/4 of the total per page)
        // (use 1/2 of the page for scrolling back down)
        const newOff = useMessages.slice(
          first && fetched.length ? -Math.round(MSG_PER_PAGE / 2) : 0
        )[0];
        if (newOff) MessageOffset.set(newOff.id);
        await tick(); // wait for DOM update
        // prevent repeat requests
        if (fetched.length && !useMessages.length) MessageOffset.set(ulid());
        await tick();
        if (first) {
          if (MessageList) {
            const ref = document.getElementById(first.id);
            // scroll the message list back to the reference message
            scrollTo(
              (ref?.offsetTop || 0) + (isUp ? 0 : MessageList.offsetHeight) - barHeight,
              true
            );
          }
          // mark the channel as done
          if (!fetched.length && isUp) ChannelTops[channel.id] = first.id;
          if (!fetched.length && isDown) channel.update({ last_message_id: first.id });
        } else {
          scrollTo("bottom", true);
        }
        fetching = 0;
      }
    }, 3);
  });
  onDestroy(() => clearInterval(i));
</script>

<div
  class="flex items-center px-3 {channel.description ? 'cursor-pointer' : ''}"
  style:background={$Theme["secondary-background"]}
  style:height="{barHeight}px"
  on:click={() =>
    channel.description &&
    ModalStack.push({
      type: "markdown",
      title: channel.name,
      content: channel.description,
    })}
  on:contextmenu={(e) => showOptionContext(e, channelContext(channel))}
>
  <ChannelIcon {channel} />
  <div class="text-lg ml-1 pointer-events-none">{channel.name}</div>
  {#if channel.description}
    <div class="text-lg opacity-30 ml-2 pointer-events-none">&bull;</div>
    <div class="mx-2 text-sm flex-1 overflow-hidden pointer-events-none">
      <Markdown text={channel.description} line />
    </div>
  {/if}
  {#if !$MobileLayout}
    <div
      class="ml-auto hover:brightness-75 cursor-pointer"
      on:click={() => ($MembersCollapsed = !$MembersCollapsed)}
      style:color={$Theme["secondary-foreground"]}
    >
      {#if $MembersCollapsed}
        <IconLayoutSidebarRightExpand size={20} />
      {:else}
        <IconLayoutSidebarRightCollapse size={20} />
      {/if}
    </div>
  {/if}
</div>
<div
  class="overflow-y-auto flex-1 p-1.5 pb-1 flex flex-col-reverse {fetching !== 1 ? 'pt-8' : ''}"
  style:padding-bottom={$UseTypingState && $SelectedChannel?.typing?.length ? "" : "1.75rem"}
  id="MessageList"
  bind:this={MessageList}
>
  {#if fetching == -1}
    <div class="w-full flex items-center justify-center h-8">
      <Loader size={24} />
    </div>
  {/if}
  <div class="flex flex-col-reverse">
    {#each useMessages as message (message.id)}
      <MessageItem {message} />
    {/each}
  </div>
  {#if fetching == 1}
    <div class="w-full flex items-center justify-center h-8">
      <Loader size={24} />
    </div>
  {/if}
</div>
<Textbox />
