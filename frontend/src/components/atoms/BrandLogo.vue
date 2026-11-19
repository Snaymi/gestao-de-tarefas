<script setup lang="ts">
withDefaults(defineProps<{
  variant?: 'full' | 'symbol';
  size?: 'sm' | 'md' | 'lg';
  tone?: 'default' | 'inverse';
  ariaLabel?: string;
}>(), {
  variant: 'full',
  size: 'md',
  tone: 'default',
  ariaLabel: 'Fluxo',
});
</script>

<template>
  <span
    class="brand-logo"
    :class="[`brand-logo--${size}`, `brand-logo--${tone}`, { 'brand-logo--symbol': variant === 'symbol' }]"
    role="img"
    :aria-label="ariaLabel"
  >
    <img class="brand-logo__symbol" src="/brand-symbol.png" alt="" aria-hidden="true" draggable="false" />
    <span v-if="variant === 'full'" class="brand-logo__wordmark" aria-hidden="true">fluxo<span>.</span></span>
  </span>
</template>

<style scoped>
.brand-logo {
  --logo-height: 35px;
  --wordmark-size: 26px;
  display: inline-flex;
  flex: none;
  align-items: center;
  gap: 8px;
  color: var(--text);
  line-height: 1;
  white-space: nowrap;
}

.brand-logo--sm {
  --logo-height: 24px;
  --wordmark-size: 18px;
  gap: 6px;
}

.brand-logo--lg {
  --logo-height: 48px;
  --wordmark-size: 35px;
}

.brand-logo--inverse {
  color: #fff;
}

.brand-logo--symbol {
  gap: 0;
}

.brand-logo__symbol {
  display: block;
  width: auto;
  height: var(--logo-height);
  max-width: none;
  object-fit: contain;
}

.brand-logo__wordmark {
  font-size: var(--wordmark-size);
  font-weight: 850;
  letter-spacing: -0.065em;
}
</style>
