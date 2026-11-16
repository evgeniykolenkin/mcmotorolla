<script setup>
import { ref } from 'vue'
import Button from 'primevue/button'
import Password from 'primevue/password'
import Message from 'primevue/message'
import { useAuth } from '../composables/useAuth'
import { isDemoBackend } from '../config/site'

const emit = defineEmits(['success'])
const { signIn } = useAuth()

const password = ref('')
const error = ref('')

function submit() {
  const result = signIn(password.value)

  if (result.ok) {
    password.value = ''
    error.value = ''
    emit('success')
    return
  }

  error.value = result.message
}
</script>

<template>
  <div class="login-wrap">
    <form class="login surface" @submit.prevent="submit">
      <div class="login__head">
        <i class="pi pi-lock login__icon" />
        <div>
          <h2 class="login__title">Вход для владельца</h2>
          <p class="muted login__subtitle">
            Смотреть игры можно без входа. Пароль нужен только чтобы добавлять и редактировать
            записи.
          </p>
        </div>
      </div>

      <Password
        v-model="password"
        placeholder="Пароль"
        :feedback="false"
        toggle-mask
        fluid
        input-id="owner-password"
        @keyup.enter="submit"
      />

      <Message v-if="error" severity="error" :closable="false" size="small">{{ error }}</Message>

      <Button type="submit" label="Войти" icon="pi pi-sign-in" :disabled="!password" />

      <Message v-if="isDemoBackend" severity="secondary" :closable="false" size="small">
        Демо-режим этапа 0: пароль по умолчанию «admin», меняется в
        <code>.env.local</code> (VITE_OWNER_PASSWORD). Настоящая авторизация — этап 2.
      </Message>
    </form>
  </div>
</template>

<style scoped>
.login-wrap {
  display: flex;
  justify-content: center;
  padding: 24px 0;
}

.login {
  display: flex;
  flex-direction: column;
  gap: 14px;
  width: min(440px, 100%);
  padding: 28px;
}

.login__head {
  display: flex;
  gap: 14px;
  align-items: flex-start;
}

.login__icon {
  display: grid;
  place-items: center;
  width: 42px;
  height: 42px;
  border-radius: 13px;
  background: var(--app-accent-soft);
  color: var(--app-accent);
  flex: 0 0 auto;
}

.login__title {
  font-size: 1.2rem;
  margin-bottom: 4px;
}

.login__subtitle {
  font-size: 0.85rem;
}

code {
  font-size: 0.8rem;
  padding: 1px 5px;
  border-radius: 6px;
  background: var(--app-surface-2);
}
</style>
