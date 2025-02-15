<script lang="ts">
  import { IconCrown, IconRobot } from "@tabler/icons-svelte";
  import { floatingMenu } from "contextmenu/FloatingMenu";
  import Indicator from "extra/Indicator.svelte";
  import { ModalStack } from "modals/ModalStack";
  import { Member, Role } from "revkit";
  import { AppHeight, AppWidth } from "State";
  import { onDestroy, onMount } from "svelte";
  import { tippy } from "svelte-tippy";
  import { Theme } from "Theme";
  import { MemberDetails, StatusColor, UserColor, UserDetails } from "utils";

  export let item: [Role, number] | Member;
  let BarItem: HTMLDivElement;

  function update() {
    item = item;
  }
  onMount(() => {
    if (item instanceof Member) {
      item.onUpdate(update);
      item.user.onUpdate(update);
    } else item[0].onUpdate(update);
  });
  onDestroy(() => {
    if (item instanceof Member) {
      item.offUpdate(update);
      item.user.offUpdate(update);
    } else item[0].offUpdate(update);
  });

  function handleClick(e: MouseEvent) {
    if (!(item instanceof Member)) return;
    const rect = BarItem.getBoundingClientRect(),
      isTop = rect.top + rect.height / 2 <= $AppHeight / 2;
    floatingMenu.set({
      type: "member",
      member: item,
      pos: {
        [isTop ? "top" : "bottom"]: isTop ? rect.top + 2 : $AppHeight - rect.bottom + 2,
        right: $AppWidth - BarItem.getBoundingClientRect().left + 6,
      },
      target: e.target,
      bar: true,
    });
  }
</script>

{#if item instanceof Member}
  <div
    class="relative [--d:none] hover:[--d:block] rounded-md overflow-hidden px-1.5 cursor-pointer"
    bind:this={BarItem}
    on:click={handleClick}
    on:dblclick={(e) => {
      if (!(item instanceof Member)) return;
      if ($floatingMenu) floatingMenu.set(null);
      ModalStack.push({ type: "user", id: item.id });
      e.preventDefault();
      e.stopPropagation();
      return false;
    }}
  >
    <div
      class="absolute top-0 left-0 w-full h-full opacity-20"
      style:background={MemberDetails(item).color || "currentColor"}
      style:display={$floatingMenu?.type == "member" &&
      $floatingMenu.member.id == item.user?.id &&
      $floatingMenu.bar
        ? "block"
        : "var(--d)"}
    />
    <div
      class="inline-flex gap-1.5 w-full items-center my-1 relative"
      style:opacity={UserDetails(item.user).online ? "1" : "0.5"}
    >
      <div class="relative h-11 w-11 shrink-0">
        <img
          class="rounded-full h-full w-full object-cover"
          src={MemberDetails(item).avatar}
          alt={item.user?.username}
          style:background-color={$Theme["secondary-background"]}
          style:border="3px solid {$Theme["secondary-background"]}"
        />
        {#if UserDetails(item.user).online}
          <Indicator
            pos="bottomRight"
            bg={$Theme["secondary-background"]}
            color={$Theme[StatusColor(item.user)]}
            isSelected
          />
        {/if}
      </div>
      <div class="flex flex-col" style:width="calc(100% - 2.5rem - 0.375rem)">
        <div
          class="font-semibold overflow-hidden whitespace-nowrap overflow-ellipsis inline-flex items-center gap-0.5"
        >
          <div
            class="overflow-hidden overflow-ellipsis"
            style={UserColor(MemberDetails(item).color || "inherit")}
          >
            {MemberDetails(item).name}
          </div>
          {#if item.user?.bot}
            <div
              use:tippy={{
                content: "Bot",
                placement: "left",
              }}
            >
              <IconRobot size={16} color={$Theme["accent"]} />
            </div>
          {/if}
          {#if item.id == item.server?.ownerID}
            <div
              use:tippy={{
                content: "Server Owner",
                placement: "left",
              }}
            >
              <IconCrown size={16} color="gold" fill="gold" stroke={1} />
            </div>
          {/if}
        </div>
        {#if item.user?.status && UserDetails(item.user).online}
          <div
            class="text-xs w-full overflow-hidden whitespace-nowrap overflow-ellipsis mt-[-0.1rem]"
            style:color={$Theme["tertiary-foreground"]}
          >
            {item.user.status}
          </div>
        {/if}
      </div>
    </div>
  </div>
{:else}
  <div
    class="block mb-0.5 px-1 font-bold overflow-hidden whitespace-nowrap overflow-ellipsis"
    style={UserColor(item[0].color || "inherit")}
  >
    {item[0].name}{item[1] > 1 ? ` - ${item[1].toLocaleString()}` : ""}
  </div>
{/if}
