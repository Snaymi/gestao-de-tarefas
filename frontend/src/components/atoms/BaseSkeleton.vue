<script setup lang="ts">withDefaults(defineProps<{ height?: string; width?: string }>(), { height: '20px', width: '100%' });</script>
<template><div class="skeleton" :style="{ height, width }" aria-hidden="true"></div></template>
