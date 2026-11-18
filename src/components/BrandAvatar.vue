<script setup>
defineProps({
  src: { type: String, default: '' },
  alt: { type: String, default: '' }
})
</script>

<template>
  <span class="avatar" :class="{ 'avatar--empty': !src }">
    <img v-if="src" :src="src" :alt="alt" class="avatar__image" />
    <span v-else class="avatar__initials">MC</span>
  </span>
</template>

<style scoped>
/* Размер задаётся из родителя: --avatar-size */
.avatar {
  display: grid;
  place-items: center;
  flex: 0 0 auto;
  width: var(--avatar-size, 40px);
  height: var(--avatar-size, 40px);
  overflow: hidden;
  border-radius: calc(var(--avatar-size, 40px) * 0.32);
  background: linear-gradient(135deg, #9146ff, #25c8ff);
  color: #fff;
  font-weight: 800;
  font-size: calc(var(--avatar-size, 40px) * 0.3);
  letter-spacing: 0.04em;
  box-shadow: 0 8px 20px -12px rgba(145, 70, 255, 0.9);
}

.avatar__image {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar__initials {
  user-select: none;
}
</style>
