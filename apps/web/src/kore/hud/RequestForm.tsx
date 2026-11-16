import { useState } from "react";

import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Textarea } from "../../components/ui/textarea";
import type { PendingQuestion, PendingRequest, Resolution } from "../core/contract";

type Send = (resolution: Resolution) => void;

function PromptText(props: { readonly text: string }) {
  return (
    <pre className="max-h-48 overflow-auto whitespace-pre-wrap break-words rounded-md border bg-muted/40 p-2 font-mono text-xs">
      {props.text}
    </pre>
  );
}

function ApprovalForm(props: {
  readonly request: Extract<PendingRequest, { kind: "approval" }>;
  readonly sending: boolean;
  readonly onSend: Send;
}) {
  const [note, setNote] = useState("");
  const trimmed = note.trim();
  return (
    <div className="flex flex-col gap-3">
      <PromptText text={props.request.prompt} />
      {props.request.acceptsNote ? (
        <Textarea
          aria-label="Note for the agent"
          placeholder="Optional note, sent with Deny"
          size="sm"
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
      ) : null}
      <div className="flex gap-2">
        <Button disabled={props.sending} onClick={() => props.onSend({ kind: "approve" })}>
          Approve
        </Button>
        <Button
          variant="destructive-outline"
          disabled={props.sending}
          onClick={() =>
            props.onSend(trimmed.length > 0 ? { kind: "deny", note: trimmed } : { kind: "deny" })
          }
        >
          Deny
        </Button>
      </div>
    </div>
  );
}

function answerFor(
  question: PendingQuestion,
  picked: ReadonlyArray<string>,
  typed: string,
): string | ReadonlyArray<string> | null {
  const text = typed.trim();
  if (question.multiSelect) {
    const values = text.length > 0 ? [...picked, text] : picked;
    return values.length > 0 ? values : null;
  }
  return text.length > 0 ? text : (picked[0] ?? null);
}

function QuestionForm(props: {
  readonly request: Extract<PendingRequest, { kind: "question" }>;
  readonly sending: boolean;
  readonly onSend: Send;
}) {
  const { questions } = props.request;
  const [picked, setPicked] = useState<Readonly<Record<string, ReadonlyArray<string>>>>({});
  const [typed, setTyped] = useState<Readonly<Record<string, string>>>({});
  const answers = Object.fromEntries(
    questions.flatMap((question) => {
      const answer = answerFor(question, picked[question.id] ?? [], typed[question.id] ?? "");
      return answer === null ? [] : [[question.id, answer] as const];
    }),
  );
  const complete = questions.every((question) => Object.hasOwn(answers, question.id));
  // One single-choice question answers on the click, as the harness view does.
  const answersOnPick = questions.length === 1 && !questions[0]!.multiSelect;

  const pick = (question: PendingQuestion, value: string) => {
    if (answersOnPick) {
      props.onSend({ kind: "answer", answers: { [question.id]: value } });
      return;
    }
    setPicked((current) => {
      const previous = current[question.id] ?? [];
      const next = !question.multiSelect
        ? [value]
        : previous.includes(value)
          ? previous.filter((entry) => entry !== value)
          : [...previous, value];
      return { ...current, [question.id]: next };
    });
  };

  return (
    <div className="flex flex-col gap-4">
      {questions.map((question) => (
        <fieldset key={question.id} className="flex flex-col gap-2">
          <legend className="mb-1 font-medium text-muted-foreground text-xs uppercase">
            {question.header}
          </legend>
          <p className="text-sm">{question.question}</p>
          {question.options.map((option) => {
            const selected = (picked[question.id] ?? []).includes(option.value);
            return (
              <div key={option.value} className="flex flex-col gap-1">
                <Button
                  className="w-full"
                  variant={selected ? "default" : "outline"}
                  size="sm"
                  aria-pressed={answersOnPick ? undefined : selected}
                  disabled={props.sending}
                  onClick={() => pick(question, option.value)}
                >
                  {option.label}
                </Button>
                <p className="text-muted-foreground text-xs">{option.description}</p>
              </div>
            );
          })}
          {question.allowCustomAnswer ? (
            <Input
              aria-label={`Your own answer to ${question.header}`}
              placeholder="Or type your own answer"
              size="sm"
              value={typed[question.id] ?? ""}
              onChange={(event) =>
                setTyped((current) => ({ ...current, [question.id]: event.target.value }))
              }
            />
          ) : null}
        </fieldset>
      ))}
      {answersOnPick && !questions[0]!.allowCustomAnswer ? null : (
        <Button
          disabled={props.sending || !complete}
          onClick={() => props.onSend({ kind: "answer", answers })}
        >
          Send answer
        </Button>
      )}
    </div>
  );
}

/** Answers the focused session's open request in place. */
export function RequestForm(props: {
  readonly request: PendingRequest;
  readonly onResolve: (requestId: string, resolution: Resolution) => Promise<void>;
}) {
  const { request } = props;
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = async (resolution: Resolution) => {
    setSending(true);
    setError(null);
    const failure = await props.onResolve(request.requestId, resolution).then(
      () => null,
      (cause: unknown) => (cause instanceof Error ? cause.message : "The answer was not sent."),
    );
    setSending(false);
    setError(failure);
  };

  if (!request.answerable) {
    return (
      <div className="flex flex-col gap-2">
        {request.kind === "approval" ? <PromptText text={request.prompt} /> : null}
        <p className="text-muted-foreground text-sm">
          This request can no longer be answered here. Open the session in the console.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {request.kind === "approval" ? (
        <ApprovalForm request={request} sending={sending} onSend={(r) => void send(r)} />
      ) : (
        <QuestionForm request={request} sending={sending} onSend={(r) => void send(r)} />
      )}
      {error === null ? null : (
        <p role="alert" className="text-destructive-foreground text-sm">
          {error}
        </p>
      )}
    </div>
  );
}
