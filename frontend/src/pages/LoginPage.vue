<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { ArrowRight, ShieldCheck, ListChecks, Sparkles } from '@lucide/vue';
import { ApiError } from '../services/api';
import { useSession } from '../stores/session';
import BaseButton from '../components/atoms/BaseButton.vue';
import BaseInput from '../components/atoms/BaseInput.vue';
import ThemeSwitcher from '../components/molecules/ThemeSwitcher.vue';
import InfoDialog from '../components/molecules/InfoDialog.vue';
import BrandLogo from '../components/atoms/BrandLogo.vue';
const email = ref('');
const password = ref('');
const loading = ref(false);
const slowResponse = ref(false);
const connectionError = ref(false);
const error = ref('');
const inactiveAccountDialogOpen = ref(false);
const formInteracted = ref(false);
const showDemo = import.meta.env.DEV;
const demoAccounts = import.meta.env.DEV ? ['Admin: admin@demo.local / Admin123!', 'Usuário: usuario@demo.local / User123!'] : [];
const router = useRouter();
const session = useSession();
let slowResponseTimer: ReturnType<typeof setTimeout> | undefined;
let active = true;

watch(() => session.user, user => {
  if (user && !formInteracted.value && !email.value && !password.value) void router.replace('/');
});

onMounted(() => {
  // Restoring a session also starts the API while the visitor can already use the form.
  if (session.status === 'unknown') void session.restore();
});

onUnmounted(() => {
  active = false;
  clearTimeout(slowResponseTimer);
});

async function submit() {
  if (loading.value) return;

  formInteracted.value = true;
  error.value = '';
  connectionError.value = false;
  loading.value = true;
  slowResponseTimer = setTimeout(() => { slowResponse.value = true; }, 5000);

  try {
    await session.login(email.value, password.value);
    if (active) await router.replace('/');
  } catch (cause) {
    if (cause instanceof ApiError && cause.code === 'ACCOUNT_INACTIVE') {
      inactiveAccountDialogOpen.value = true;
    } else if (cause instanceof ApiError && (cause.status === 0 || cause.status >= 500)) {
      connectionError.value = true;
      error.value = 'Não foi possível conectar ao servidor. Tente novamente.';
    } else {
      error.value = cause instanceof Error ? cause.message : 'Não foi possível entrar.';
    }
  } finally {
    clearTimeout(slowResponseTimer);
    loading.value = false;
    slowResponse.value = false;
  }
}
</script>

<template>
  <div class="login-layout">
    <section class="login-feature">
      <BrandLogo class="login-brand" size="md" tone="inverse" />
      <div class="feature-copy">
        <span class="feature-kicker"><Sparkles :size="15" /> SEU ESPAÇO DE PRODUTIVIDADE</span>
        <h1>Organize o trabalho.<br /><em>Ganhe clareza.</em></h1>
        <p>Um lugar para acompanhar tarefas, colaborar com a equipe e avançar no que importa.</p>
        <div class="feature-list">
          <span><ListChecks :size="19" /> Tarefas sob controle</span>
          <span><ShieldCheck :size="19" /> Gestão com segurança</span>
        </div>
      </div>
      <div class="feature-footer">Menos ruído. Mais progresso.</div>
    </section>
    <section class="login-form-side">
      <div class="login-theme"><ThemeSwitcher /></div>
      <div class="login-card">
        <BrandLogo class="welcome-mark" variant="symbol" size="lg" />
        <p class="eyebrow">BEM-VINDO DE VOLTA</p>
        <h2>Entre na sua conta</h2>
        <p class="muted">Acesse seu espaço e continue de onde parou.</p>
        <form class="stack login-form" @focusin="formInteracted = true" @submit.prevent="submit">
          <BaseInput id="login-email" v-model="email" label="E-mail" type="email" placeholder="voce@exemplo.com" autocomplete="email" required />
          <BaseInput id="login-password" v-model="password" label="Senha" type="password" placeholder="Digite sua senha" autocomplete="current-password" required />
          <p v-if="error" class="error-text" role="alert">{{ error }}</p>
          <BaseButton type="submit" :loading="loading">
            {{ loading ? 'Entrando…' : connectionError ? 'Tentar novamente' : 'Entrar' }}
            <ArrowRight v-if="!loading" :size="17" />
          </BaseButton>
          <p class="muted login-status" role="status">{{ loading ? (slowResponse ? 'O servidor está demorando para responder.' : 'Conectando ao servidor…') : '' }}</p>
        </form>
        <div v-if="showDemo" class="demo-box">
          <strong>Explore a demonstração</strong>
          <span v-for="account in demoAccounts" :key="account">{{ account }}</span>
        </div>
      </div>
      <p class="login-copyright">© 2026 Fluxo. Gestão de tarefas.</p>
    </section>
  </div>
  <Transition name="fade">
    <InfoDialog v-if="inactiveAccountDialogOpen" title="Conta inativa" message="O acesso desta conta está inativo. Entre em contato com o administrador para verificar sua conta e solicitar a reativação do acesso." @close="inactiveAccountDialogOpen = false" />
  </Transition>
</template>

<style scoped>
.login-status {
  font-size: 13px;
  margin: 0;
}
.login-status:empty {
  position: absolute;
}
</style>
<style scoped>.login-layout{min-height:100vh;display:grid;grid-template-columns:1fr 1fr}.login-feature{background:var(--login-brand-surface);color:white;padding:46px clamp(35px,6vw,90px);display:flex;flex-direction:column;justify-content:space-between;position:relative;overflow:hidden}.login-feature::before,.login-feature::after{content:"";position:absolute;border:1px solid rgba(255,255,255,.14);border-radius:50%;pointer-events:none}.login-feature::before{width:650px;height:650px;right:-330px;top:10%}.login-feature::after{width:460px;height:460px;right:-220px;top:25%}.login-brand{z-index:1}.feature-copy{z-index:1;max-width:500px}.feature-kicker{display:inline-flex;align-items:center;gap:8px;font-size:11px;letter-spacing:.13em;font-weight:800;color:rgba(255,255,255,.75);margin-bottom:23px}.feature-copy h1{font-size:clamp(40px,4.5vw,67px);letter-spacing:-.065em;line-height:1.09;margin-bottom:22px}.feature-copy h1 em{font-style:normal;color:var(--brand-highlight)}.feature-copy p{font-size:17px;line-height:1.65;color:rgba(255,255,255,.8)}.feature-list{display:grid;gap:17px;margin-top:38px;font-size:14px;font-weight:600}.feature-list span{display:flex;align-items:center;gap:10px}.feature-footer{font-size:12px;color:rgba(255,255,255,.68);z-index:1}.login-form-side{display:flex;align-items:center;justify-content:center;padding:42px;position:relative}.login-theme{position:absolute;top:26px;right:28px}.login-card{width:min(100%,410px)}.welcome-mark{margin-bottom:30px}.login-card h2{font-size:31px;letter-spacing:-.04em;margin-bottom:8px}.login-card>.muted{font-size:14px;margin-bottom:32px}.login-form{gap:18px}.login-form .btn{width:100%;margin-top:4px}.demo-box{display:grid;gap:7px;background:var(--surface-muted);border:1px solid var(--border);border-radius:13px;padding:16px;margin-top:30px;font-size:12px;color:var(--text-muted);overflow-wrap:anywhere}.demo-box strong{color:var(--text);font-size:13px;margin-bottom:3px}.login-copyright{position:absolute;bottom:23px;color:var(--text-muted);font-size:11px}@media(max-width:850px){.login-layout{grid-template-columns:1fr}.login-feature{min-height:180px;padding:24px}.feature-copy,.feature-footer{display:none}.login-form-side{min-height:calc(100vh - 180px);padding:60px 24px}.login-theme{top:15px;right:16px}}@media(max-width:500px){.login-feature{min-height:100px}.login-form-side{min-height:calc(100vh - 100px);align-items:flex-start;padding:35px 20px 70px}.welcome-mark{margin-bottom:20px}.login-card h2{font-size:28px}}</style>
