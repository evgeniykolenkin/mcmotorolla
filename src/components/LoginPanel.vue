<script setup>
import { computed, ref } from 'vue'
import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Password from 'primevue/password'
import Message from 'primevue/message'
import { useAuth } from '../composables/useAuth'
import { isLocalBackend, ownerEmail } from '../config/site'

const emit = defineEmits(['success'])
const { signIn } = useAuth()

const email = ref(ownerEmail ?? '')
const password = ref('')
const error = ref('')
const submitting = ref(false)

// В режиме Supabase email нужен для входа; если он задан в .env.local — прячем поле
const showEmail = computed(() => !isLocalBackend && !ownerEmail)

async function submit() {
  submitting.value = true
  error.value = ''

  try {
    const result = await signIn({ email: email.value, password: password.value })

    if (result.ok) {
      password.value = ''
      emit('success')
      return
    }

    error.value = result.message
  } finally {
    submitting.value = false
  }
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
            Смотреть игры можно без входа. Вход нужен только чтобы добавлять и редактировать
            записи.
          </p>
        </div>
      </div>

      <InputText
        v-if="showEmail"
        v-model="email"
        type="email"
        placeholder="Email владельца"
        autocomplete="username"
        fluid
        input-id="owner-email"
      />

      <Password
        v-model="password"
        placeholder="Пароль"
        :feedback="false"
        toggle-mask
        fluid
        input-id="owner-password"
        autocomplete="current-password"
        @keyup.enter="submit"
      />

      <Message v-if="error" severity="error" :closable="false" size="small">{{ error }}</Message>

      <Button
        type="submit"
        label="Войти"
        icon="pi pi-sign-in"
        :loading="submitting"
        :disabled="!password || (showEmail && !email)"
      />

      <Message v-if="isLocalBackend" severity="secondary" :closable="false" size="small">
        Локальный режим: Supabase не настроен, записи сохраняются только в этом браузере.
        Пароль по умолчанию «admin», меняется в <code>.env.local</code>
        (VITE_OWNER_PASSWORD).
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
  line-height: 1;
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
