<script lang="ts">
  import {
    IconDownload,
    IconFileMusic,
    IconPlayerPause,
    IconPlayerPlay,
    IconReload,
    IconVolume,
    IconVolume2,
    IconVolume3
  } from "@tabler/icons-svelte";
  import byteSize from "byte-size";
  import { mediaContext, showOptionContext } from "contextmenu/ContextMenus";
  import type { Attachment } from "revkit";
  import { MobileLayout } from "State";
  import { onDestroy, onMount } from "svelte";
  import { Theme } from "Theme";
  import { clickoutside, downloadFile, formatDuration } from "utils";
  import Slider from "./Slider.svelte";

  export let src: Attachment;
  export let style = "";

  let hasFocus = false,
    isPlaying = false,
    didEnd = false,
    seekTime = 0,
    duration = 0,
    shouldReplay = false,
    isMuted = false,
    originalVolume = 1,
    volume = 1,
    speed = 1,
    speedHover = false,
    speedDrag = false;

  let audio: HTMLAudioElement, player: HTMLDivElement;

  $: {
    duration = Math.round(duration * 100) / 100;
    seekTime = Math.round(seekTime * 100) / 100;
    didEnd = seekTime == duration;
    volume = Math.round(volume * 10) / 10;
    speed = Math.round(speed * 10) / 10;
  }

  function playClick() {
    if (didEnd) {
      audio.currentTime = 0;
      audio.play();
    } else if (isPlaying) audio.pause();
    else audio.play();
  }

  function handleKey(e: KeyboardEvent) {
    if (!hasFocus) return;
    let didKey = true;
    switch (e.code) {
      case "Escape":
        hasFocus = false;
        break;
      case "Space":
      case "KeyK":
        playClick();
        break;
      case "ArrowUp":
        volume = Math.min(1, volume + 0.1);
        break;
      case "ArrowDown":
        volume = Math.max(0, volume - 0.1);
        break;
      case "ArrowLeft":
        seekTime = Math.max(0, seekTime - (e.shiftKey ? 5 : 1));
        break;
      case "ArrowRight":
        seekTime = Math.min(duration, seekTime + (e.shiftKey ? 5 : 1));
        break;
      default:
        didKey = false;
    }
    if (didKey) {
      e.preventDefault();
      return false;
    }
  }
  onMount(() => {
    window.addEventListener("keydown", handleKey);
  });
  onDestroy(() => {
    window.removeEventListener("keydown", handleKey);
  });
</script>

<div
  class="rounded-2xl overflow-hidden flex flex-col select-none max-w-[25rem] px-3 py-2 gap-2"
  {style}
  bind:this={player}
  on:click={() => (hasFocus = true)}
  use:clickoutside={() => (hasFocus = false)}
  style:background={$Theme["secondary-background"]}
  on:contextmenu|stopPropagation|preventDefault={(e) =>
    typeof src !== "string" && showOptionContext(e, mediaContext(src))}
>
  <audio
    class="hidden"
    src={src.generateURL()}
    bind:this={audio}
    on:play={() => ((isPlaying = true), (didEnd = false))}
    on:pause={() => (isPlaying = false)}
    on:ended={() => (isPlaying = false)}
    on:click={playClick}
    bind:currentTime={seekTime}
    bind:duration
    bind:volume
    bind:playbackRate={speed}
  />
  <div class="flex items-center gap-1.5 font-semibold">
    <div class="-mr-0.5"><IconFileMusic size={18} /></div>
    <div>{src.name}</div>
    <div class="ml-auto flex items-center gap-1" style:color={$Theme["tertiary-foreground"]}>
      <div class="text-xs">
        {byteSize(src.size).toString().toUpperCase()}
      </div>
      <div
        class="cursor-pointer hover:brightness-150"
        on:click={() => downloadFile(src.generateURL(), src.name)}
        data-clickable
      >
        <IconDownload size={20} />
      </div>
    </div>
  </div>
  <div class="flex items-center gap-1">
    <div class="cursor-pointer hover:brightness-75" on:click={playClick} data-clickable>
      {#if didEnd}
        <IconReload size={20} />
      {:else if isPlaying}
        <IconPlayerPause size={20} />
      {:else}
        <IconPlayerPlay size={20} />
      {/if}
    </div>
    <div
      class="flex items-center gap-0.5"
      on:mouseenter={() => (speedHover = true)}
      on:mouseleave={() => (speedHover = false)}
    >
      <div
        class="text-xs brightness-75 font-mono cursor-pointer hover:brightness-50"
        on:click={() => (speed = 1)}
        data-clickable
      >
        {speed.toFixed(1)}x
      </div>
      {#if speedHover || speedDrag}
        <Slider
          max={1.5}
          step={0.1}
          value={speed - 0.5}
          className="w-20"
          on:dragstart={() => (speedDrag = true)}
          on:dragend={() => (speedDrag = false)}
          on:change={({ detail: v }) => (speed = v + 0.5)}
        />
      {/if}
    </div>
    {#if !speedHover && !speedDrag}
      <div
        class="text-xs font-mono w-[5.625rem] text-center"
        style:color={$Theme["tertiary-foreground"]}
      >
        {formatDuration(seekTime)}<span class="mx-[1px]">/</span>{formatDuration(duration)}
      </div>
    {/if}
    <div class="flex-1">
      <Slider
        max={duration}
        bind:value={seekTime}
        step={0.01}
        on:dragstart={() => ((shouldReplay = isPlaying), audio.pause())}
        on:dragend={() => shouldReplay && audio.play()}
      />
    </div>
    <div class="flex items-center gap-0.5">
      <div
        class="cursor-pointer hover:brightness-75"
        on:click={() => {
          if (isMuted || !originalVolume || !volume) {
            volume = originalVolume || 1;
            isMuted = false;
          } else {
            originalVolume = volume;
            volume = 0;
            isMuted = true;
          }
        }}
        data-clickable
      >
        {#if volume > 0.5}
          <IconVolume size={20} />
        {:else if volume > 0}
          <IconVolume2 size={20} />
        {:else}
          <IconVolume3 size={20} />
        {/if}
      </div>
      {#if !$MobileLayout}
        <Slider max={1} step={0.1} bind:value={volume} className="w-16" />
      {/if}
    </div>
  </div>
</div>
