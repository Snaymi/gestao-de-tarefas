<script setup lang="ts">import BaseButton from '../components/atoms/BaseButton.vue';</script>
<template><main class="not-found"><div><p class="eyebrow">ERRO 404</p><h1>Página não encontrada</h1><p class="muted">O endereço que você procura não existe.</p><RouterLink to="/"><BaseButton>Voltar ao início</BaseButton></RouterLink></div></main></template>
<style scoped>.not-found{min-height:100vh;display:grid;place-items:center;text-align:center;padding:20px}.not-found h1{font-size:clamp(28px,5vw,45px);letter-spacing:-.04em}.not-found .btn{margin-top:16px}</style>
