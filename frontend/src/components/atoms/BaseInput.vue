<script setup lang="ts">
withDefaults(defineProps<{ modelValue: string; id: string; label: string; type?: string; placeholder?: string; required?: boolean; autocomplete?: string }>(), { type: 'text' });
defineEmits<{ 'update:modelValue': [value: string] }>();
</script>
<template><div class="field"><label :for="id">{{ label }}</label><input :id="id" class="input" :type="type" :value="modelValue" :placeholder="placeholder" :required="required" :autocomplete="autocomplete" @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)" /></div></template>
