import { useActionState, useId } from "react"
import { useServerFn } from "@tanstack/react-start"

import { Button } from "@workspace/ui/components/shadcn-ui/button"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@workspace/ui/components/shadcn-ui/field"
import { Input } from "@workspace/ui/components/shadcn-ui/input"
import { Spinner } from "@workspace/ui/components/shadcn-ui/spinner"

import { refusalReason } from "@/lib/invitations"
import { inviteMember } from "@/lib/invitations.functions"

/**
 * What the form shows after a submission. React resets a form once its
 * action ends, and the field takes `email` back as its default value, so a
 * refusal keeps the address and a sent invitation clears it.
 */
type FormState = { sent?: string; error?: string; email?: string }

/**
 * An admin's invitation form (spec 006, FR-007): an email address in, an
 * invitation out, leading to this app's sign-in (FR-008). The field resets
 * once an invitation is sent; what happened is announced either way.
 */
export function InviteForm({ organization }: { organization: string }) {
  const id = useId()
  const invite = useServerFn(inviteMember)
  const [state, action, pending] = useActionState(
    async (_previous: FormState, form: FormData): Promise<FormState> => {
      const email = String(form.get("email") ?? "").trim()
      try {
        const result = await invite({ data: { email } })
        return result.sent ? { sent: email } : { error: result.reason, email }
      } catch {
        return { error: refusalReason(undefined), email }
      }
    },
    {}
  )
  const invalid = state.error !== undefined

  return (
    <form action={action} className="flex max-w-md flex-col gap-3">
      <Field data-invalid={invalid}>
        <FieldLabel htmlFor={`${id}-email`}>Email address</FieldLabel>
        <Input
          id={`${id}-email`}
          name="email"
          type="email"
          defaultValue={state.email}
          required
          autoComplete="off"
          aria-invalid={invalid}
          // The refusal is read with the field, not only announced once.
          aria-describedby={invalid ? `${id}-help ${id}-error` : `${id}-help`}
        />
        <FieldDescription id={`${id}-help`}>
          They&apos;ll get an email inviting them into {organization} as a
          member.
        </FieldDescription>
        {invalid && <FieldError id={`${id}-error`}>{state.error}</FieldError>}
      </Field>
      <Button type="submit" disabled={pending} className="self-start">
        {pending && <Spinner />}
        Send invitation
      </Button>
      {/* Always present, so the sentence is announced when it appears. */}
      <p role="status" className="text-sm text-muted-foreground">
        {state.sent !== undefined && `Invitation sent to ${state.sent}.`}
      </p>
    </form>
  )
}
