import { useActionState, useId } from "react"
import { useNavigate } from "@tanstack/react-router"
import { useServerFn } from "@tanstack/react-start"

import { repositoryFrom } from "@workspace/github/address"
import { Button } from "@workspace/ui/components/shadcn-ui/button"
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@workspace/ui/components/shadcn-ui/field"
import { Input } from "@workspace/ui/components/shadcn-ui/input"
import { Spinner } from "@workspace/ui/components/shadcn-ui/spinner"

import { submitRepository } from "@/lib/analyses.functions"

type FormState = { error?: string }

/**
 * A repository's address in, its analysis out (spec 008, FR-001, FR-002):
 * a new analysis starts its run, and one the organization already has is
 * opened as it is. The address is checked here with the server's own
 * rules, so a refusal is immediate, and again on the server.
 */
export function AddressForm() {
  const id = useId()
  const navigate = useNavigate()
  const submit = useServerFn(submitRepository)
  const [state, action, pending] = useActionState(
    async (_previous: FormState, form: FormData): Promise<FormState> => {
      const address = String(form.get("address") ?? "")
      const read = repositoryFrom(address)
      if ("refusal" in read) return { error: read.refusal }
      try {
        const result = await submit({ data: { address } })
        if ("refusal" in result) return { error: result.refusal }
        await navigate({
          to: "/analyses/$analysisId",
          params: { analysisId: result.analysisId },
        })
        return {}
      } catch {
        return { error: "The analysis didn't start. Try again." }
      }
    },
    {}
  )
  const invalid = state.error !== undefined

  return (
    <form action={action} className="flex max-w-xl flex-col gap-3">
      <Field data-invalid={invalid}>
        <FieldLabel htmlFor={`${id}-address`}>Repository</FieldLabel>
        <Input
          id={`${id}-address`}
          name="address"
          type="text"
          inputMode="url"
          required
          autoComplete="off"
          spellCheck={false}
          placeholder="https://github.com/owner/name"
          aria-invalid={invalid}
          // The refusal is read with the field, not only announced once.
          aria-describedby={invalid ? `${id}-help ${id}-error` : `${id}-help`}
        />
        <FieldDescription id={`${id}-help`}>
          A public GitHub repository of TypeScript or JavaScript. Its default
          branch is mapped.
        </FieldDescription>
        {invalid && <FieldError id={`${id}-error`}>{state.error}</FieldError>}
      </Field>
      <Button type="submit" disabled={pending} className="self-start">
        {pending && <Spinner />}
        Map it
      </Button>
    </form>
  )
}
