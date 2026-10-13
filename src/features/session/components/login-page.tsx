import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { TextField } from '@/components/ui/text-field'
import { useMessage } from '@/i18n/messages'
import { CenteredLayout } from '@/features/session/components/centered-layout'
import { FormAlert } from '@/features/session/components/form-alert'
import { useErrorMessage } from '@/features/session/hooks/use-error-message'
import { login } from '@/features/session/lib/session'
import { loginSchema, type LoginForm } from '@/features/session/schemas/login-schema'

/** POST /v1/auth/login, then GET /v1/me; the route guard decides between the console and "no permission". */
export function LoginPage() {
  const { t } = useTranslation('auth')
  const msg = useMessage()
  const errorMessage = useErrorMessage()
  const mutation = useMutation({ mutationFn: login })
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema), defaultValues: { login: '', password: '' } })

  const onSubmit = handleSubmit((values) => mutation.mutate(values))
  const serverError = mutation.error ? errorMessage(mutation.error, { INVALID_CREDENTIALS: 'auth:errors.INVALID_CREDENTIALS' }) : null

  return (
    <CenteredLayout>
      <h1 className="text-headline-lg text-foreground">{t('login.title')}</h1>
      <p className="mt-1 text-body-md text-muted-foreground">{t('login.subtitle')}</p>
      <div className="mt-6">
        <FormAlert message={serverError} />
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
          <TextField
            label={t('login.loginLabel')}
            autoComplete="username"
            autoFocus
            error={msg(errors.login?.message)}
            {...register('login')}
          />
          <TextField
            label={t('login.passwordLabel')}
            autoComplete="current-password"
            revealLabels={{ show: t('password.show'), hide: t('password.hide') }}
            error={msg(errors.password?.message)}
            {...register('password')}
          />
          <Button type="submit" loading={mutation.isPending} className="mt-2 w-full">
            {mutation.isPending ? t('login.submitting') : t('login.submit')}
          </Button>
        </form>
      </div>
    </CenteredLayout>
  )
}
