<script setup lang="ts">
defineProps<{ label: string }>();
</script>

<template>
  <div class="responsive-data-table" role="region" :aria-label="label">
    <div class="responsive-data-table__desktop">
      <slot name="desktop" />
    </div>
    <div class="responsive-data-table__mobile">
      <slot name="mobile" />
    </div>
  </div>
</template>

<style scoped>
.responsive-data-table__mobile {
  display: none;
}

@media (max-width: 700px) {
  .responsive-data-table__desktop {
    display: none;
  }

  .responsive-data-table__mobile {
    display: block;
  }
}
</style>
