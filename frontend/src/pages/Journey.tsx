import { type FormEvent, useId, useState } from "react";
import { Link } from "react-router-dom";
import { useCompleteMission, useJourney, useMissions } from "../hooks/useGamification";
import type { Achievement, Mission, MissionResult, ScoreEvent } from "../types";
import "./Journey.css";

function Summary({
  balance,
  missions,
  contributions,
}: {
  balance: number;
  missions: string;
  contributions: { label: string; value: number }[];
}) {
  return (
    <section className="journey-summary" aria-label="Resumo da participação">
      <div className="card">
        <strong>{balance}</strong>
        <span>pontos de participação</span>
      </div>
      <div className="card">
        <strong>{missions}</strong>
        <span>missões concluídas</span>
      </div>
      {contributions.map((c) => (
        <div className="card" key={c.label}>
          <strong>{c.value}</strong>
          <span>{c.label}</span>
        </div>
      ))}
    </section>
  );
}

function AchievementCard({ achievement }: { achievement: Achievement }) {
  return (
    <li className={`card journey-achievement${achievement.unlocked ? " unlocked" : ""}`}>
      <span aria-hidden="true" className="journey-medal">
        {achievement.unlocked ? "🏅" : "🔒"}
      </span>
      <div>
        <h4>{achievement.title}</h4>
        <p>{achievement.description}</p>
        <progress
          max={achievement.goal}
          value={achievement.progress}
          aria-label={`Progresso de ${achievement.title}`}
        />
        <small>
          {achievement.unlocked ? "Conquistada" : `${achievement.progress} de ${achievement.goal}`}
        </small>
      </div>
    </li>
  );
}

function resultMessage(result: MissionResult) {
  if (!result.passed)
    return "Algumas respostas precisam de revisão. Releia o conteúdo e tente de novo.";
  if (result.already_completed) return "Você já tinha concluído esta missão.";
  return `Missão concluída! +${result.points_awarded} pontos.`;
}

function MissionCard({ mission }: { mission: Mission }) {
  const formId = useId();
  const [open, setOpen] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const complete = useCompleteMission();
  const result = complete.data;
  const incorrect = new Set(result?.incorrect_question_ids ?? []);
  const allAnswered = mission.questions.every((q) => answers[q.id]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    complete.mutate({ key: mission.key, answers });
  };

  return (
    <li className="card journey-mission">
      <div className="journey-mission-head">
        <div>
          <h4>{mission.title}</h4>
          <p>{mission.summary}</p>
        </div>
        {mission.completed ? (
          <span className="badge badge-resolved">Concluída</span>
        ) : (
          <span className="badge badge-pending">+{mission.points} pontos</span>
        )}
      </div>
      <button
        type="button"
        className="btn btn-sm btn-outline"
        aria-expanded={open}
        aria-controls={formId}
        onClick={() => setOpen((v) => !v)}
      >
        {open ? "Fechar" : mission.completed ? "Rever conteúdo" : "Começar missão"}
      </button>

      {open && (
        <form id={formId} onSubmit={submit} className="journey-quiz">
          {mission.content.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
          {mission.questions.map((q) => {
            const hintId = `${formId}-${q.id}-hint`;
            const wrong = incorrect.has(q.id);
            return (
              <fieldset
                key={q.id}
                aria-invalid={wrong || undefined}
                aria-describedby={wrong ? hintId : undefined}
              >
                <legend>{q.prompt}</legend>
                {q.options.map((o) => (
                  <label key={o.id}>
                    <input
                      type="radio"
                      name={`${formId}-${q.id}`}
                      value={o.id}
                      checked={answers[q.id] === o.id}
                      onChange={() => setAnswers((a) => ({ ...a, [q.id]: o.id }))}
                    />
                    {o.text}
                  </label>
                ))}
                {wrong && (
                  <p id={hintId} className="journey-hint">
                    Revise esta resposta.
                  </p>
                )}
              </fieldset>
            );
          })}
          {!mission.completed && (
            <button
              type="submit"
              className="btn btn-primary btn-sm"
              disabled={!allAnswered || complete.isPending}
            >
              {complete.isPending ? "Enviando…" : "Enviar respostas"}
            </button>
          )}
          <p role="status" className={result?.passed ? "journey-ok" : "journey-hint"}>
            {complete.isError && "Não foi possível enviar suas respostas. Tente novamente."}
            {result && resultMessage(result)}
          </p>
        </form>
      )}
    </li>
  );
}

function HistoryItem({ event }: { event: ScoreEvent }) {
  const revoked = event.revoked_at !== null;
  return (
    <li className={revoked ? "revoked" : undefined}>
      <span>
        {event.description}
        {revoked && " (pontuação revogada após nova revisão)"}
      </span>
      <span className="journey-history-meta">
        <time dateTime={event.created_at}>
          {new Date(event.created_at).toLocaleDateString("pt-BR")}
        </time>
        <strong>{revoked ? <s>+{event.points}</s> : `+${event.points}`}</strong>
      </span>
    </li>
  );
}

export default function Journey() {
  const journey = useJourney();
  const missions = useMissions();

  if (journey.isLoading || missions.isLoading) {
    return (
      <div className="page">
        <p className="journey-muted">Carregando…</p>
      </div>
    );
  }
  if (journey.isError || missions.isError || !journey.data) {
    return (
      <div className="page">
        <p role="alert">Não foi possível carregar sua jornada.</p>
      </div>
    );
  }

  const j = journey.data;
  return (
    <div className="page">
      <div className="journey-page">
        <h2 className="page-title">Minha jornada</h2>
        <p className="journey-intro">
          Aprenda sobre o descarte de eletrônicos e contribua com o mapa. Os pontos reconhecem sua
          participação no EcoLixo: não medem quantidade reciclada nem certificam locais. Cadastros
          de pontos de coleta só pontuam depois de revisados e aprovados pela gestão.
        </p>

        <Summary
          balance={j.balance}
          missions={`${j.missions_completed}/${j.missions_total}`}
          contributions={[
            { label: "contribuições aprovadas", value: j.contributions.approved ?? 0 },
            { label: "aguardando revisão", value: j.contributions.pending ?? 0 },
          ]}
        />

        <section aria-labelledby="journey-missions">
          <h3 id="journey-missions">Missões educativas</h3>
          <ul className="journey-list">
            {(missions.data ?? []).map((m) => (
              <MissionCard key={m.key} mission={m} />
            ))}
          </ul>
        </section>

        <section aria-labelledby="journey-achievements">
          <h3 id="journey-achievements">Conquistas</h3>
          <ul className="journey-achievements">
            {j.achievements.map((a) => (
              <AchievementCard key={a.key} achievement={a} />
            ))}
          </ul>
        </section>

        <section aria-labelledby="journey-history">
          <h3 id="journey-history">Histórico de pontos</h3>
          {j.history.length === 0 ? (
            <p className="journey-muted">
              Nenhum ponto ainda. Conclua uma missão ou{" "}
              <Link to="/new-report">registre um ponto de coleta</Link>.
            </p>
          ) : (
            <ul className="card journey-history">
              {j.history.map((e) => (
                <HistoryItem key={e.id} event={e} />
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
