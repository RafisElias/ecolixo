import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Suspense, useActionState, useRef, useState } from "react";
import toast from "react-hot-toast";
import MultiSelect from "../components/MultiSelect";
import { useCategories } from "../hooks/useCategories";
import { createPoint } from "../services/pointService";
import type { NewReportState } from "../types";

function CategorySelect({
  selectedIds,
  onToggle,
}: {
  selectedIds: number[];
  onToggle: (ids: number[]) => void;
}) {
  const categories = useCategories();
  return (
    <MultiSelect
      options={categories}
      selected={selectedIds}
      onChange={onToggle}
      placeholder="Selecione as categorias…"
    />
  );
}

export default function NewReport() {
  const [selectedCats, setSelectedCats] = useState<number[]>([]);
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: createPoint,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["points"] });
    },
  });

  const [locating, setLocating] = useState(false);

  const getLocation = () => {
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude.toFixed(7));
        setLng(pos.coords.longitude.toFixed(7));
        setLocating(false);
        toast.success("Localização obtida!");
      },
      () => {
        toast.error("Não foi possível obter localização");
        setLocating(false);
      },
    );
  };

  const formRef = useRef<HTMLFormElement>(null);

  const [state, formAction, isPending] = useActionState<NewReportState, FormData>(
    async (_prev, formData) => {
      if (!lat || !lng) return { error: "Obtenha sua localização antes de enviar", success: false };
      if (selectedCats.length === 0)
        return { error: "Selecione ao menos uma categoria", success: false };

      try {
        const fd = new FormData();
        fd.append("latitude", lat);
        fd.append("longitude", lng);
        fd.append("category_ids", JSON.stringify(selectedCats));
        const desc = formData.get("description") as string;
        if (desc) fd.append("description", desc);
        const photoFile = formData.get("photo") as File | null;
        if (photoFile && photoFile.size > 0) fd.append("photo", photoFile);

        await createMutation.mutateAsync(fd);

        // Side effects seguros aqui: a action roda como event handler, não durante render
        toast.success("Ponto de coleta registrado!");
        setLat("");
        setLng("");
        setSelectedCats([]);
        setPhoto(null);
        setPhotoPreview(null);
        formRef.current?.reset();
        return { success: true, error: null };
      } catch (err: unknown) {
        const detail =
          err && typeof err === "object" && "response" in err
            ? (err as { response: { data: { detail: string } } }).response?.data?.detail
            : "Erro ao registrar";
        return { error: detail || "Erro ao registrar", success: false };
      }
    },
    { success: false, error: null },
  );

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhoto(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  return (
    <div className="page">
      <h2 className="page-title">Cadastrar ponto de coleta</h2>
      <div className="card" style={{ maxWidth: 540, margin: "0 auto" }}>
        <form ref={formRef} action={formAction}>
          {state.error && (
            <p
              style={{
                color: "var(--danger)",
                fontSize: 13,
                marginBottom: 12,
                textAlign: "center",
              }}
            >
              {state.error}
            </p>
          )}

          <div className="form-group">
            <label>Categorias do resíduo</label>
            <Suspense
              fallback={
                <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Carregando categorias…</p>
              }
            >
              <CategorySelect selectedIds={selectedCats} onToggle={setSelectedCats} />
            </Suspense>
          </div>

          <div className="form-group">
            <label>Descrição (opcional)</label>
            <textarea
              name="description"
              rows={3}
              defaultValue=""
              placeholder="Ex: monitor quebrado, pilhas usadas, celular antigo…"
            />
          </div>

          <div className="form-group">
            <label>Foto (opcional)</label>
            <input
              name="photo"
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handlePhoto}
            />
            {photoPreview && (
              <img
                src={photoPreview}
                alt="preview"
                style={{
                  marginTop: 8,
                  width: "100%",
                  borderRadius: 8,
                  maxHeight: 200,
                  objectFit: "cover",
                }}
              />
            )}
          </div>

          <div className="form-group">
            <label>Localização GPS</label>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                readOnly
                value={lat ? `${lat}, ${lng}` : ""}
                placeholder='Clique em "Obter localização"'
                style={{ flex: 1 }}
              />
              <button
                type="button"
                className="btn btn-outline btn-sm"
                onClick={getLocation}
                disabled={locating}
              >
                {locating ? "…" : "📍 Obter"}
              </button>
            </div>
          </div>

          <button
            className="btn btn-primary"
            style={{ width: "100%", justifyContent: "center" }}
            disabled={isPending}
          >
            {isPending ? "Enviando…" : "Cadastrar ponto"}
          </button>
        </form>
      </div>
    </div>
  );
}
